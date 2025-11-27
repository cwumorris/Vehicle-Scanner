from pydantic import BaseModel, validator
from typing import Optional, Literal
from datetime import datetime

class Vehicle(BaseModel):
    id: str
    plate: str
    make: Optional[str] = None
    model: Optional[str] = None
    owner_name: str
    owner_unit: Optional[str] = None
    owner_phone: Optional[str] = None
    status: Literal["active", "inactive"] = "active"
    # ISO 8601 string, e.g. 2025-12-31T23:59:59
    expires_at: Optional[str] = None

    @validator("expires_at")
    def _validate_iso(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        try:
            # allow date-only or full datetime
            # normalize to ISO parsing
            if len(v) <= 10:
                datetime.fromisoformat(v)
            else:
                # support 'Z' suffix by replacing with +00:00 if present
                vv = v.replace("Z", "+00:00")
                datetime.fromisoformat(vv)
            return v
        except Exception:
            raise ValueError("expires_at must be ISO 8601 date or datetime")
