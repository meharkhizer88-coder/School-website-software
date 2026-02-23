from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import jwt
from passlib.context import CryptContext

from backend.config.settings import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Production would use persisted users in PostgreSQL.
USER_DB = {
    "admin": {
        "password_hash": pwd_context.hash("admin1234"),
        "role": "Super Admin",
        "id": "user-1",
    }
}


def authenticate_user(username: str, password: str) -> dict:
    user = USER_DB.get(username)
    if not user or not pwd_context.verify(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"id": user["id"], "username": username, "role": user["role"]}


def generate_token(payload: dict) -> str:
    settings = get_settings()
    expires_at = datetime.now(tz=timezone.utc) + timedelta(minutes=settings.jwt_expiry_minutes)
    token_payload = {**payload, "exp": expires_at}
    return jwt.encode(token_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
