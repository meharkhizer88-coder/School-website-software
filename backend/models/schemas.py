from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class ApiResponse(BaseModel):
    success: bool
    data: dict[str, Any] = Field(default_factory=dict)
    message: str = ""
    code: int = 200


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class UserSession(BaseModel):
    id: str
    username: str
    role: str


class SchoolInfo(BaseModel):
    school_name: str
    logo: str = ""
    phone: str = ""
    email: EmailStr | None = None
    address: str = ""
    website: str = ""
    registration_no: str = ""
    tagline: str = ""
    currency: str = "USD"
    timezone: str = "UTC"
    language: str = "en"


class UserPreferences(BaseModel):
    nav_position: str = Field(default="left", pattern="^(left|right|top|bottom)$")
    theme: str = "default"
    language: str = "en"


class SystemSettings(BaseModel):
    school_info: SchoolInfo
    user_preferences: UserPreferences
    labels: dict[str, str]


class Notice(BaseModel):
    id: str
    title: str
    category: str
    created_at: datetime
    thumbnail: str = ""
    message: str
