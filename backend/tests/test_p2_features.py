"""Backend tests for P2 features: password reset, smart match, reports, websocket chat."""
import os
import uuid
import json
import asyncio
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://learn-trade-54.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


def _reg(email, name, password="password123"):
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name})
    if r.status_code == 400:
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"auth failed {r.status_code} {r.text}"
    d = r.json()
    return d["user"], d["token"]


def _login(email, password):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": password})


@pytest.fixture(scope="module")
def stamp():
    return uuid.uuid4().hex[:6]


# ============ PASSWORD RESET ============
class TestPasswordReset:
    def test_forgot_unknown_email_returns_ok(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "TEST_nonexistent_zzz@ex.com"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_forgot_returns_reset_link_for_real_user(self, stamp):
        email = f"TEST_pwreset_{stamp}@ex.com"
        _reg(email, "TEST PwReset")
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and "reset_link" in d
        assert len(d["token"]) > 10

    def test_reset_password_and_login_with_new(self, stamp):
        email = f"TEST_pwreset2_{stamp}@ex.com"
        _reg(email, "TEST PwReset2")
        tok = requests.post(f"{API}/auth/forgot-password", json={"email": email}).json()["token"]
        r = requests.post(f"{API}/auth/reset-password", json={"token": tok, "new_password": "newpass456"})
        assert r.status_code == 200
        # old password should now fail
        assert _login(email, "password123").status_code == 401
        # new one works
        assert _login(email, "newpass456").status_code == 200

    def test_reuse_token_returns_400(self, stamp):
        email = f"TEST_pwreset3_{stamp}@ex.com"
        _reg(email, "TEST PwReset3")
        tok = requests.post(f"{API}/auth/forgot-password", json={"email": email}).json()["token"]
        r1 = requests.post(f"{API}/auth/reset-password", json={"token": tok, "new_password": "newpass456"})
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/reset-password", json={"token": tok, "new_password": "newpass789"})
        assert r2.status_code == 400
        assert "used" in r2.json().get("detail", "").lower()

    def test_invalid_token_returns_400(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "notarealtoken_xyz", "new_password": "abcdef"})
        assert r.status_code == 400

    def test_short_password_validation(self, stamp):
        email = f"TEST_pwreset4_{stamp}@ex.com"
        _reg(email, "TEST PwReset4")
        tok = requests.post(f"{API}/auth/forgot-password", json={"email": email}).json()["token"]
        r = requests.post(f"{API}/auth/reset-password", json={"token": tok, "new_password": "abc"})
        assert r.status_code == 422


# ============ SMART MATCH ============
class TestSmartMatch:
    def test_matches_empty_when_no_skills(self, stamp):
        email = f"TEST_match_empty_{stamp}@ex.com"
        _, tok = _reg(email, "TEST MatchEmpty")
        r = requests.get(f"{API}/matches", headers=_h(tok))
        assert r.status_code == 200
        assert r.json() == []

    def test_matches_with_complementary_skills(self, stamp):
        # user A wants python, knows react
        emailA = f"TEST_matchA_{stamp}@ex.com"
        userA, tokA = _reg(emailA, "TEST MatchA")
        # user B wants react, knows python  => score should be 2
        emailB = f"TEST_matchB_{stamp}@ex.com"
        userB, tokB = _reg(emailB, "TEST MatchB")
        # update skills
        requests.put(f"{API}/users/me", headers=_h(tokA), json={"skills_known": ["React"], "skills_wanted": ["python"]})
        requests.put(f"{API}/users/me", headers=_h(tokB), json={"skills_known": ["Python"], "skills_wanted": ["react"]})
        # A queries matches
        r = requests.get(f"{API}/matches", headers=_h(tokA))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        b_match = next((m for m in data if m["id"] == userB["id"]), None)
        assert b_match is not None, f"B not in matches: {data}"
        assert b_match["match_score"] == 2
        # case-insensitive
        assert [s.lower() for s in b_match["can_teach_you"]] == ["python"]
        assert [s.lower() for s in b_match["wants_from_you"]] == ["react"]
        # admin should not appear
        assert all(m.get("role") != "admin" for m in data)


# ============ REPORTS ============
class TestReports:
    def test_create_and_admin_flow(self, stamp):
        emailA = f"TEST_reporter_{stamp}@ex.com"
        userA, tokA = _reg(emailA, "TEST Reporter")
        emailB = f"TEST_target_{stamp}@ex.com"
        userB, tokB = _reg(emailB, "TEST Target")

        # cannot report self
        r_self = requests.post(f"{API}/reports", headers=_h(tokA),
                               json={"reported_user_id": userA["id"], "reason": "spam"})
        assert r_self.status_code == 400

        # non-existent
        r_ne = requests.post(f"{API}/reports", headers=_h(tokA),
                             json={"reported_user_id": "507f1f77bcf86cd799439011", "reason": "spam"})
        assert r_ne.status_code == 404

        # create valid
        r_c = requests.post(f"{API}/reports", headers=_h(tokA),
                            json={"reported_user_id": userB["id"], "reason": "TEST spam behavior"})
        assert r_c.status_code == 200
        rep = r_c.json()
        assert rep["status"] == "open"
        rep_id = rep["id"]

        # non-admin cannot list
        r_na = requests.get(f"{API}/admin/reports", headers=_h(tokA))
        assert r_na.status_code == 403

        # admin login
        admin_login = _login("admin@skillswap.com", "admin123")
        assert admin_login.status_code == 200
        admin_tok = admin_login.json()["token"]

        r_l = requests.get(f"{API}/admin/reports", headers=_h(admin_tok))
        assert r_l.status_code == 200
        assert any(x["id"] == rep_id for x in r_l.json())

        # filter open
        r_open = requests.get(f"{API}/admin/reports?status=open", headers=_h(admin_tok))
        assert r_open.status_code == 200
        assert all(x["status"] == "open" for x in r_open.json())

        # patch dismiss
        r_d = requests.patch(f"{API}/admin/reports/{rep_id}", headers=_h(admin_tok),
                             json={"status": "dismissed"})
        assert r_d.status_code == 200
        assert r_d.json()["status"] == "dismissed"

        # patch actioned
        r_a = requests.patch(f"{API}/admin/reports/{rep_id}", headers=_h(admin_tok),
                             json={"status": "actioned"})
        assert r_a.status_code == 200
        assert r_a.json()["status"] == "actioned"

        # invalid status
        r_i = requests.patch(f"{API}/admin/reports/{rep_id}", headers=_h(admin_tok),
                             json={"status": "bogus"})
        assert r_i.status_code == 400


# ============ WEBSOCKET ============
@pytest.mark.asyncio
class TestWebSocketChat:
    async def _make_accepted_exchange(self, stamp):
        emailA = f"TEST_ws_a_{stamp}_{uuid.uuid4().hex[:4]}@ex.com"
        userA, tokA = _reg(emailA, "TEST WsA")
        emailB = f"TEST_ws_b_{stamp}_{uuid.uuid4().hex[:4]}@ex.com"
        userB, tokB = _reg(emailB, "TEST WsB")
        r = requests.post(f"{API}/exchanges", headers=_h(tokA),
                          json={"to_user_id": userB["id"], "offer_skill": "py", "want_skill": "js"})
        ex_id = r.json()["id"]
        requests.patch(f"{API}/exchanges/{ex_id}", headers=_h(tokB), json={"status": "accepted"})
        return userA, tokA, userB, tokB, ex_id

    async def test_ws_valid_receives_ready_and_message(self, stamp):
        userA, tokA, userB, tokB, ex_id = await self._make_accepted_exchange(stamp)
        url = f"{WS_BASE}/api/ws/chat/{ex_id}?token={tokA}"
        async with websockets.connect(url) as ws:
            ready = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            assert ready["type"] == "ready"
            # Second connection for B
            urlB = f"{WS_BASE}/api/ws/chat/{ex_id}?token={tokB}"
            async with websockets.connect(urlB) as wsB:
                await asyncio.wait_for(wsB.recv(), timeout=5)  # ready
                # A posts a message via REST
                r = requests.post(f"{API}/messages", headers=_h(tokA),
                                  json={"exchange_id": ex_id, "text": "hello ws"})
                assert r.status_code == 200
                # B should receive it via ws
                msg = json.loads(await asyncio.wait_for(wsB.recv(), timeout=5))
                assert msg["type"] == "message"
                assert msg["message"]["text"] == "hello ws"

    async def test_ws_invalid_token_closes(self, stamp):
        userA, tokA, userB, tokB, ex_id = await self._make_accepted_exchange(stamp)
        url = f"{WS_BASE}/api/ws/chat/{ex_id}?token=badtoken"
        with pytest.raises(Exception):
            async with websockets.connect(url) as ws:
                await asyncio.wait_for(ws.recv(), timeout=5)

    async def test_ws_non_participant_closes(self, stamp):
        userA, tokA, userB, tokB, ex_id = await self._make_accepted_exchange(stamp)
        emailC = f"TEST_ws_c_{stamp}_{uuid.uuid4().hex[:4]}@ex.com"
        userC, tokC = _reg(emailC, "TEST WsC")
        url = f"{WS_BASE}/api/ws/chat/{ex_id}?token={tokC}"
        with pytest.raises(Exception):
            async with websockets.connect(url) as ws:
                await asyncio.wait_for(ws.recv(), timeout=5)
