"""Backend tests for SkillSwap chat file sharing feature."""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://learn-trade-54.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _reg_or_login(email, name):
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": name})
    if r.status_code == 400:
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 200, f"auth failed {r.status_code} {r.text}"
    d = r.json()
    return d["user"], d["token"]


@pytest.fixture(scope="module")
def users():
    stamp = uuid.uuid4().hex[:6]
    u1, t1 = _reg_or_login(f"TEST_alice_{stamp}@ex.com", "TEST Alice")
    u2, t2 = _reg_or_login(f"TEST_bob_{stamp}@ex.com", "TEST Bob")
    return {"a": (u1, t1), "b": (u2, t2)}


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def accepted_exchange(users):
    (a, ta), (b, tb) = users["a"], users["b"]
    r = requests.post(f"{API}/exchanges", headers=_h(ta),
                      json={"to_user_id": b["id"], "message": "hi", "offer_skill": "py", "want_skill": "js"})
    assert r.status_code == 200, r.text
    ex = r.json()
    r2 = requests.patch(f"{API}/exchanges/{ex['id']}", headers=_h(tb), json={"status": "accepted"})
    assert r2.status_code == 200
    return ex["id"]


@pytest.fixture(scope="module")
def pending_exchange(users):
    (a, ta), (b, tb) = users["a"], users["b"]
    r = requests.post(f"{API}/exchanges", headers=_h(ta),
                      json={"to_user_id": b["id"], "offer_skill": "py", "want_skill": "js"})
    assert r.status_code == 200
    return r.json()["id"]


# --- 1x1 PNG bytes ---
PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
)


def test_upload_image_and_download(users, accepted_exchange):
    _, ta = users["a"]
    files = {"file": ("hello.png", PNG_BYTES, "image/png")}
    r = requests.post(f"{API}/upload/chat/{accepted_exchange}", headers=_h(ta), files=files)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("path", "url", "name", "content_type", "size"):
        assert k in d
    assert d["name"] == "hello.png"
    assert d["content_type"].startswith("image/")
    # GET file bytes
    g = requests.get(f"{BASE_URL}{d['url']}")
    assert g.status_code == 200
    assert g.headers.get("content-type", "").startswith("image/")
    assert len(g.content) == len(PNG_BYTES)


def test_upload_pdf(users, accepted_exchange):
    _, ta = users["a"]
    pdf = b"%PDF-1.4\n%test\n"
    r = requests.post(f"{API}/upload/chat/{accepted_exchange}", headers=_h(ta),
                      files={"file": ("doc.pdf", pdf, "application/pdf")})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["name"] == "doc.pdf"
    assert "pdf" in d["content_type"]
    g = requests.get(f"{BASE_URL}{d['url']}")
    assert g.status_code == 200


def test_upload_forbidden_non_participant(users, accepted_exchange):
    stamp = uuid.uuid4().hex[:6]
    _, tc = _reg_or_login(f"TEST_carol_{stamp}@ex.com", "TEST Carol")
    r = requests.post(f"{API}/upload/chat/{accepted_exchange}", headers=_h(tc),
                      files={"file": ("x.png", PNG_BYTES, "image/png")})
    assert r.status_code == 403, r.text


def test_upload_before_accept(users, pending_exchange):
    _, ta = users["a"]
    r = requests.post(f"{API}/upload/chat/{pending_exchange}", headers=_h(ta),
                      files={"file": ("x.png", PNG_BYTES, "image/png")})
    assert r.status_code == 400
    assert "accepted" in r.json().get("detail", "").lower()


def test_upload_unsupported_ext(users, accepted_exchange):
    _, ta = users["a"]
    r = requests.post(f"{API}/upload/chat/{accepted_exchange}", headers=_h(ta),
                      files={"file": ("evil.exe", b"MZbinary", "application/octet-stream")})
    assert r.status_code == 400


def test_upload_too_large(users, accepted_exchange):
    _, ta = users["a"]
    big = b"a" * (10 * 1024 * 1024 + 10)
    r = requests.post(f"{API}/upload/chat/{accepted_exchange}", headers=_h(ta),
                      files={"file": ("big.png", big, "image/png")})
    assert r.status_code == 400
    assert "large" in r.json().get("detail", "").lower()


def test_message_with_attachment_and_notification(users, accepted_exchange):
    (a, ta), (b, tb) = users["a"], users["b"]
    up = requests.post(f"{API}/upload/chat/{accepted_exchange}", headers=_h(ta),
                       files={"file": ("hey.png", PNG_BYTES, "image/png")}).json()
    payload = {
        "exchange_id": accepted_exchange,
        "text": "",
        "attachment_path": up["path"],
        "attachment_name": up["name"],
        "attachment_type": up["content_type"],
    }
    r = requests.post(f"{API}/messages", headers=_h(ta), json=payload)
    assert r.status_code == 200, r.text
    m = r.json()
    assert m["attachment_path"] == up["path"]
    assert m["attachment_name"] == "hey.png"
    assert m["attachment_type"].startswith("image/")
    assert m["text"] == ""
    # Verify notification for recipient contains "sent you a file"
    notifs = requests.get(f"{API}/notifications", headers=_h(tb)).json()
    assert any("sent you a file" in (n.get("message") or "") for n in notifs), notifs[:3]


def test_message_empty_no_attachment_400(users, accepted_exchange):
    _, ta = users["a"]
    r = requests.post(f"{API}/messages", headers=_h(ta),
                      json={"exchange_id": accepted_exchange, "text": "   "})
    assert r.status_code == 400


def test_plain_text_message_regression(users, accepted_exchange):
    _, ta = users["a"]
    r = requests.post(f"{API}/messages", headers=_h(ta),
                      json={"exchange_id": accepted_exchange, "text": "hello world"})
    assert r.status_code == 200
    assert r.json()["text"] == "hello world"
