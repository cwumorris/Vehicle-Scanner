from pydantic import BaseModel, validator
from typing import Optional, Literal
from datetime import datetime


class _ExpiresAtMixin(BaseModel):
    expires_at: Optional[str] = None

    @validator("expires_at")
    def _validate_iso(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        try:
            if len(v) <= 10:
                datetime.fromisoformat(v)
            else:
                vv = v.replace("Z", "+00:00")
                datetime.fromisoformat(vv)
            return v
        except Exception:
            raise ValueError("expires_at must be ISO 8601 date or datetime")


class Vehicle(BaseModel):
    id: str
    plate: str
    make: Optional[str] = None
    model: Optional[str] = None
    owner_name: str
    owner_unit: Optional[str] = None
    owner_phone: Optional[str] = None
    status: Literal["active", "inactive"] = "active"
    expires_at: Optional[str] = None


class VehicleCreate(_ExpiresAtMixin):
    id: Optional[str] = None
    plate: str
    make: Optional[str] = None
    model: Optional[str] = None
    owner_name: str
    owner_unit: Optional[str] = None
    owner_phone: Optional[str] = None
    status: Literal["active", "inactive"] = "active"


class VehicleUpdate(_ExpiresAtMixin):
    plate: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    owner_name: Optional[str] = None
    owner_unit: Optional[str] = None
    owner_phone: Optional[str] = None
    status: Optional[Literal["active", "inactive"]] = None


class User(BaseModel):
    id: int
    username: str
    role: Literal["admin", "guard"]
    active: bool = True
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserCreate(BaseModel):
    username: str
    password: str
    role: Literal["admin", "guard"] = "guard"
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str
