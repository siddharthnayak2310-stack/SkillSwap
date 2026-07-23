from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import secrets
import asyncio
import logging
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Annotated, Dict

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query, Header, WebSocket, WebSocketDisconnect
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr, BeforeValidator

# ------------------ Setup ------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "skillswap"

storage_key = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skillswap")


def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    r.raise_for_status()
    return r.json()


def get_object(path: str):
    key = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ------------------ Auth Helpers ------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def sanitize_user(user: dict) -> dict:
    user = dict(user)
    if "_id" in user:
        user["id"] = str(user["_id"])
        del user["_id"]
    user.pop("password_hash", None)
    return user


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # Update last_seen
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}},
        )
        return sanitize_user(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ------------------ Models ------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    experience_level: Optional[str] = None  # Beginner / Intermediate / Expert
    skills_known: Optional[List[str]] = None
    skills_wanted: Optional[List[str]] = None
    category: Optional[str] = None
    photo_url: Optional[str] = None


class ExchangeRequestCreate(BaseModel):
    to_user_id: str
    message: Optional[str] = ""
    offer_skill: Optional[str] = ""
    want_skill: Optional[str] = ""
    scheduled_at: Optional[str] = None


class ExchangeStatusUpdate(BaseModel):
    status: str  # accepted / rejected / completed


class MessageCreate(BaseModel):
    exchange_id: str
    text: Optional[str] = ""
    attachment_path: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = None


class ReviewCreate(BaseModel):
    exchange_id: str
    to_user_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = ""


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


class ReportCreate(BaseModel):
    reported_user_id: str
    reason: str = Field(min_length=1, max_length=500)


# ------------------ Startup ------------------
app = FastAPI()
api_router = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.exchanges.create_index([("from_user_id", 1), ("to_user_id", 1)])
    await db.messages.create_index("exchange_id")
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.reviews.create_index("to_user_id")
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.reports.create_index([("status", 1), ("created_at", -1)])

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@skillswap.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one(
            {
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "name": "Admin",
                "role": "admin",
                "bio": "Platform administrator",
                "college": "",
                "experience_level": "Expert",
                "skills_known": [],
                "skills_wanted": [],
                "category": "",
                "photo_url": "",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_seen": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.info("Admin seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )

    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.warning(f"Storage init deferred: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ------------------ Auth Routes ------------------
def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


@api_router.post("/auth/register")
async def register(payload: RegisterRequest, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": "user",
        "bio": "",
        "college": "",
        "experience_level": "Beginner",
        "skills_known": [],
        "skills_wanted": [],
        "category": "",
        "photo_url": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_seen": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token(str(res.inserted_id), email, "user")
    set_auth_cookie(response, token)
    return {"user": sanitize_user(doc), "token": token}


@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(user["_id"]), email, user.get("role", "user"))
    set_auth_cookie(response, token)
    return {"user": sanitize_user(user), "token": token}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    # Always return ok to avoid email enumeration
    if not user:
        return {"ok": True, "message": "If the email exists, a reset link has been created."}
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_reset_tokens.insert_one(
        {
            "token": token,
            "user_id": str(user["_id"]),
            "email": email,
            "expires_at": expires,
            "used": False,
            "created_at": datetime.now(timezone.utc),
        }
    )
    frontend = os.environ.get("FRONTEND_URL", "").rstrip("/")
    reset_link = f"{frontend}/reset-password/{token}" if frontend else f"/reset-password/{token}"
    logger.info(f"[PASSWORD RESET] {email} -> {reset_link}")
    # For demo (no email service), return the reset link so the user can proceed.
    return {"ok": True, "message": "Reset link generated.", "reset_link": reset_link, "token": token}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    record = await db.password_reset_tokens.find_one({"token": payload.token})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    if record.get("used"):
        raise HTTPException(status_code=400, detail="Token already used")
    exp = record.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Token expired")
    try:
        uid = ObjectId(record["user_id"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")
    await db.users.update_one({"_id": uid}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    await db.password_reset_tokens.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
    return {"ok": True, "message": "Password reset successful"}


# ------------------ Users ------------------
@api_router.get("/users")
async def list_users(
    q: Optional[str] = None,
    skill: Optional[str] = None,
    category: Optional[str] = None,
    college: Optional[str] = None,
    online: Optional[bool] = None,
    user: dict = Depends(get_current_user),
):
    query = {"role": {"$ne": "admin"}}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"bio": {"$regex": q, "$options": "i"}},
            {"skills_known": {"$regex": q, "$options": "i"}},
            {"skills_wanted": {"$regex": q, "$options": "i"}},
        ]
    if skill:
        query["skills_known"] = {"$regex": skill, "$options": "i"}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if college:
        query["college"] = {"$regex": college, "$options": "i"}

    users = await db.users.find(query).to_list(200)
    result = []
    threshold = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    for u in users:
        s = sanitize_user(u)
        s["is_online"] = (u.get("last_seen") or "") > threshold
        if online and not s["is_online"]:
            continue
        result.append(s)
    return result


@api_router.get("/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    try:
        u = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    s = sanitize_user(u)
    threshold = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    s["is_online"] = (u.get("last_seen") or "") > threshold
    # Average rating
    reviews = await db.reviews.find({"to_user_id": user_id}).to_list(500)
    if reviews:
        s["avg_rating"] = round(sum(r["rating"] for r in reviews) / len(reviews), 2)
        s["review_count"] = len(reviews)
    else:
        s["avg_rating"] = 0
        s["review_count"] = 0
    return s


@api_router.put("/users/me")
async def update_me(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if updates:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": updates})
    updated = await db.users.find_one({"_id": ObjectId(user["id"])})
    return sanitize_user(updated)


# ------------------ File Upload ------------------
@api_router.post("/upload/photo")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin").lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    path = f"{APP_NAME}/photos/{user['id']}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or f"image/{ext}"
    result = put_object(path, data, content_type)
    await db.files.insert_one(
        {
            "storage_path": result["path"],
            "user_id": user["id"],
            "content_type": content_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


ALLOWED_CHAT_EXT = {
    "jpg", "jpeg", "png", "webp", "gif",
    "pdf", "txt", "md", "csv", "json",
    "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "zip",
}


@api_router.post("/upload/chat/{exchange_id}")
async def upload_chat_attachment(
    exchange_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    try:
        ex = await db.exchanges.find_one({"_id": ObjectId(exchange_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Exchange not found")
    if not ex:
        raise HTTPException(status_code=404, detail="Exchange not found")
    if user["id"] not in (ex["from_user_id"], ex["to_user_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    if ex["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Exchange not accepted yet")

    fname = file.filename or "file"
    ext = (fname.rsplit(".", 1)[-1] if "." in fname else "bin").lower()
    if ext not in ALLOWED_CHAT_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type .{ext}")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    content_type = file.content_type or "application/octet-stream"
    path = f"{APP_NAME}/chat/{exchange_id}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    await db.files.insert_one(
        {
            "storage_path": result["path"],
            "user_id": user["id"],
            "exchange_id": exchange_id,
            "content_type": content_type,
            "original_filename": fname,
            "size": result.get("size", len(data)),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {
        "path": result["path"],
        "url": f"/api/files/{result['path']}",
        "name": fname,
        "content_type": content_type,
        "size": result.get("size", len(data)),
    }


@api_router.get("/files/{path:path}")
async def download_file(path: str):
    try:
        data, content_type = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return FastAPIResponse(content=data, media_type=content_type)


# ------------------ Exchange Requests ------------------
async def create_notification(user_id: str, message: str, link: str = "", kind: str = "info"):
    await db.notifications.insert_one(
        {
            "user_id": user_id,
            "message": message,
            "link": link,
            "kind": kind,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )


@api_router.post("/exchanges")
async def create_exchange(payload: ExchangeRequestCreate, user: dict = Depends(get_current_user)):
    if payload.to_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot request yourself")
    try:
        to_user = await db.users.find_one({"_id": ObjectId(payload.to_user_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if not to_user:
        raise HTTPException(status_code=404, detail="Recipient not found")
    doc = {
        "from_user_id": user["id"],
        "to_user_id": payload.to_user_id,
        "from_user_name": user["name"],
        "to_user_name": to_user.get("name", ""),
        "message": payload.message,
        "offer_skill": payload.offer_skill,
        "want_skill": payload.want_skill,
        "scheduled_at": payload.scheduled_at,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.exchanges.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    await create_notification(
        payload.to_user_id,
        f"{user['name']} sent you a skill exchange request",
        f"/requests",
        "request",
    )
    return doc


@api_router.get("/exchanges")
async def list_exchanges(user: dict = Depends(get_current_user)):
    q = {"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}
    items = await db.exchanges.find(q).sort("created_at", -1).to_list(500)
    for it in items:
        it["id"] = str(it["_id"])
        del it["_id"]
    return items


@api_router.patch("/exchanges/{exchange_id}")
async def update_exchange(exchange_id: str, payload: ExchangeStatusUpdate, user: dict = Depends(get_current_user)):
    if payload.status not in ("accepted", "rejected", "completed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    try:
        ex = await db.exchanges.find_one({"_id": ObjectId(exchange_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    if not ex:
        raise HTTPException(status_code=404, detail="Not found")
    # Only recipient can accept/reject; either party can mark complete
    if payload.status in ("accepted", "rejected") and ex["to_user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    if payload.status == "completed" and user["id"] not in (ex["from_user_id"], ex["to_user_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.exchanges.update_one({"_id": ObjectId(exchange_id)}, {"$set": {"status": payload.status}})
    # Notify the other party
    other = ex["from_user_id"] if user["id"] == ex["to_user_id"] else ex["to_user_id"]
    await create_notification(
        other,
        f"{user['name']} {payload.status} your exchange",
        "/requests",
        payload.status,
    )
    updated = await db.exchanges.find_one({"_id": ObjectId(exchange_id)})
    updated["id"] = str(updated["_id"])
    del updated["_id"]
    return updated


# ------------------ Messages ------------------
@api_router.post("/messages")
async def send_message(payload: MessageCreate, user: dict = Depends(get_current_user)):
    try:
        ex = await db.exchanges.find_one({"_id": ObjectId(payload.exchange_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Exchange not found")
    if not ex:
        raise HTTPException(status_code=404, detail="Exchange not found")
    if user["id"] not in (ex["from_user_id"], ex["to_user_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    if ex["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Exchange not accepted yet")
    text = (payload.text or "").strip()
    if not text and not payload.attachment_path:
        raise HTTPException(status_code=400, detail="Message must have text or an attachment")
    doc = {
        "exchange_id": payload.exchange_id,
        "from_user_id": user["id"],
        "from_user_name": user["name"],
        "text": text,
        "attachment_path": payload.attachment_path,
        "attachment_name": payload.attachment_name,
        "attachment_type": payload.attachment_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.messages.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    other = ex["from_user_id"] if user["id"] == ex["to_user_id"] else ex["to_user_id"]
    notif_text = f"New message from {user['name']}"
    if payload.attachment_path and not text:
        notif_text = f"{user['name']} sent you a file"
    await create_notification(other, notif_text, f"/chat/{payload.exchange_id}", "message")
    # Real-time broadcast (silent no-op if no listeners)
    try:
        await ws_manager.broadcast(payload.exchange_id, {"type": "message", "message": doc})
    except Exception:
        pass
    return doc


@api_router.get("/messages/{exchange_id}")
async def get_messages(exchange_id: str, user: dict = Depends(get_current_user)):
    try:
        ex = await db.exchanges.find_one({"_id": ObjectId(exchange_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Exchange not found")
    if not ex:
        raise HTTPException(status_code=404, detail="Exchange not found")
    if user["id"] not in (ex["from_user_id"], ex["to_user_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    msgs = await db.messages.find({"exchange_id": exchange_id}).sort("created_at", 1).to_list(1000)
    for m in msgs:
        m["id"] = str(m["_id"])
        del m["_id"]
    return msgs


# ------------------ Reviews ------------------
@api_router.post("/reviews")
async def create_review(payload: ReviewCreate, user: dict = Depends(get_current_user)):
    try:
        ex = await db.exchanges.find_one({"_id": ObjectId(payload.exchange_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Exchange not found")
    if not ex:
        raise HTTPException(status_code=404, detail="Exchange not found")
    if user["id"] not in (ex["from_user_id"], ex["to_user_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    if ex["status"] != "completed":
        raise HTTPException(status_code=400, detail="Complete the exchange first")
    existing = await db.reviews.find_one({"exchange_id": payload.exchange_id, "from_user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    doc = {
        "exchange_id": payload.exchange_id,
        "from_user_id": user["id"],
        "from_user_name": user["name"],
        "to_user_id": payload.to_user_id,
        "rating": payload.rating,
        "comment": payload.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.reviews.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    await create_notification(payload.to_user_id, f"{user['name']} gave you {payload.rating}★", "/dashboard", "review")
    return doc


@api_router.get("/reviews/user/{user_id}")
async def get_user_reviews(user_id: str, user: dict = Depends(get_current_user)):
    items = await db.reviews.find({"to_user_id": user_id}).sort("created_at", -1).to_list(500)
    for i in items:
        i["id"] = str(i["_id"])
        del i["_id"]
    return items


# ------------------ Notifications ------------------
@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).limit(50).to_list(50)
    for i in items:
        i["id"] = str(i["_id"])
        del i["_id"]
    return items


@api_router.post("/notifications/{notif_id}/read")
async def read_notification(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_id": user["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ------------------ Dashboard ------------------
@api_router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    uid = user["id"]
    all_ex = await db.exchanges.find({"$or": [{"from_user_id": uid}, {"to_user_id": uid}]}).to_list(1000)
    active = [e for e in all_ex if e["status"] == "accepted"]
    completed = [e for e in all_ex if e["status"] == "completed"]
    pending = [e for e in all_ex if e["status"] == "pending"]
    taught = sum(1 for e in completed if e["from_user_id"] == uid)
    learned = sum(1 for e in completed if e["to_user_id"] == uid)
    reviews = await db.reviews.find({"to_user_id": uid}).to_list(500)
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 2) if reviews else 0
    return {
        "skills_taught": taught,
        "skills_learned": learned,
        "active_exchanges": len(active),
        "pending_requests": len(pending),
        "total_exchanges": len(all_ex),
        "avg_rating": avg,
        "review_count": len(reviews),
    }


# ------------------ Admin ------------------
@api_router.get("/admin/users")
async def admin_list_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}).to_list(1000)
    return [sanitize_user(u) for u in users]


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(require_admin)):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    try:
        res = await db.users.delete_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_exchanges = await db.exchanges.count_documents({})
    completed = await db.exchanges.count_documents({"status": "completed"})
    active = await db.exchanges.count_documents({"status": "accepted"})
    pending = await db.exchanges.count_documents({"status": "pending"})
    total_messages = await db.messages.count_documents({})
    total_reviews = await db.reviews.count_documents({})
    return {
        "total_users": total_users,
        "total_exchanges": total_exchanges,
        "completed_exchanges": completed,
        "active_exchanges": active,
        "pending_exchanges": pending,
        "total_messages": total_messages,
        "total_reviews": total_reviews,
    }


# ------------------ Smart Match ------------------
@api_router.get("/matches")
async def matches(limit: int = 10, user: dict = Depends(get_current_user)):
    """Return recommended users based on complementary skills.
    Score = |their.known ∩ my.wanted| + |their.wanted ∩ my.known| (case-insensitive)."""
    my_known = {s.lower() for s in (user.get("skills_known") or []) if s}
    my_wanted = {s.lower() for s in (user.get("skills_wanted") or []) if s}
    if not my_known and not my_wanted:
        return []
    candidates = await db.users.find({"role": {"$ne": "admin"}, "_id": {"$ne": ObjectId(user["id"])}}).to_list(500)
    scored = []
    for c in candidates:
        c_known = {s.lower() for s in (c.get("skills_known") or []) if s}
        c_wanted = {s.lower() for s in (c.get("skills_wanted") or []) if s}
        can_teach_me = my_wanted & c_known
        wants_from_me = my_known & c_wanted
        score = len(can_teach_me) + len(wants_from_me)
        if score == 0:
            continue
        s = sanitize_user(c)
        s["match_score"] = score
        s["can_teach_you"] = sorted(list(can_teach_me))
        s["wants_from_you"] = sorted(list(wants_from_me))
        scored.append(s)
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored[:limit]


# ------------------ Reports (Spam / Abuse) ------------------
@api_router.post("/reports")
async def create_report(payload: ReportCreate, user: dict = Depends(get_current_user)):
    if payload.reported_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    try:
        target = await db.users.find_one({"_id": ObjectId(payload.reported_user_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    doc = {
        "reported_user_id": payload.reported_user_id,
        "reported_user_name": target.get("name", ""),
        "reported_user_email": target.get("email", ""),
        "reporter_id": user["id"],
        "reporter_name": user["name"],
        "reason": payload.reason,
        "status": "open",  # open / dismissed / actioned
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.reports.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/admin/reports")
async def admin_list_reports(status: Optional[str] = None, user: dict = Depends(require_admin)):
    q = {}
    if status:
        q["status"] = status
    items = await db.reports.find(q).sort("created_at", -1).to_list(500)
    for i in items:
        i["id"] = str(i["_id"])
        del i["_id"]
    return items


@api_router.patch("/admin/reports/{report_id}")
async def admin_update_report(report_id: str, payload: dict, user: dict = Depends(require_admin)):
    new_status = payload.get("status")
    if new_status not in ("open", "dismissed", "actioned"):
        raise HTTPException(status_code=400, detail="Invalid status")
    try:
        res = await db.reports.update_one({"_id": ObjectId(report_id)}, {"$set": {"status": new_status}})
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    updated = await db.reports.find_one({"_id": ObjectId(report_id)})
    updated["id"] = str(updated["_id"])
    del updated["_id"]
    return updated


# ------------------ WebSocket Chat ------------------
class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, room: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room, []).append(ws)

    def disconnect(self, room: str, ws: WebSocket):
        conns = self.rooms.get(room, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self.rooms.pop(room, None)

    async def broadcast(self, room: str, message: dict):
        conns = list(self.rooms.get(room, []))
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(room, ws)


ws_manager = ConnectionManager()


async def _authenticate_ws_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        u = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        return u
    except Exception:
        return None


@app.websocket("/api/ws/chat/{exchange_id}")
async def websocket_chat(websocket: WebSocket, exchange_id: str, token: Optional[str] = Query(None)):
    # Auth via query token (browsers can't attach headers to ws)
    if not token:
        token = websocket.cookies.get("access_token")
    user = await _authenticate_ws_token(token) if token else None
    if not user:
        await websocket.close(code=4401)
        return
    try:
        ex = await db.exchanges.find_one({"_id": ObjectId(exchange_id)})
    except Exception:
        ex = None
    if not ex or str(user["_id"]) not in (ex["from_user_id"], ex["to_user_id"]):
        await websocket.close(code=4403)
        return

    await ws_manager.connect(exchange_id, websocket)
    try:
        # Send a ready ping so client knows we're live
        await websocket.send_json({"type": "ready", "exchange_id": exchange_id})
        while True:
            # Keep connection open; ignore any client payloads (messages are POSTed via REST)
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(exchange_id, websocket)
    except Exception:
        ws_manager.disconnect(exchange_id, websocket)


# ------------------ App wire-up ------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
