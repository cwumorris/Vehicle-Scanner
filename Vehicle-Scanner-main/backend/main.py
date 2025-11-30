from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import qrcode
from io import BytesIO
import base64
from models import Vehicle, VehicleCreate, VehicleUpdate, User, UserCreate, LoginRequest
from database import get_db, get_sa_conn, init_db
import os
from PIL import Image, ImageDraw, ImageFont
import textwrap
import uuid
from datetime import datetime
from passlib.hash import bcrypt
from sqlalchemy import text

app = FastAPI(title="Estate Vehicle Gate Pass")

# =============================================
# CORS — configurable via environment
# =============================================
cors_env = os.getenv("CORS_ALLOWED_ORIGINS")
if cors_env:
    # Comma-separated list in env, e.g. "https://app.squard24.com,http://localhost:3001"
    allowed_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
else:
    # Default: live frontend + local dev
    allowed_origins = [
        "https://app.squard24.com",     # Live frontend
        "http://localhost:3001",        # Local dev
        "http://127.0.0.1:3001",
    ]

# Optional: single extra origin
frontend_origin = os.getenv("FRONTEND_ORIGIN")
if frontend_origin:
    allowed_origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    init_db()
    print("Database ready!")

# =============================================
# AUTH & USER MANAGEMENT
# =============================================


@app.post("/api/login")
def login(payload: LoginRequest):
    """Simple username/password login backed by the users table.

    Returns username and role so the frontend can store them in localStorage.
    """
    with get_sa_conn() as conn:
        result = conn.execute(
            text(
                "SELECT id, username, password_hash, role, active "
                "FROM users WHERE username = :username"
            ),
            {"username": payload.username},
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        active = bool(row[4])
        if not active:
            raise HTTPException(status_code=403, detail="User is inactive")

        password_hash = row[2]
        if not bcrypt.verify(payload.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {"username": row[1], "role": row[3]}


@app.get("/api/users")
def list_users(x_role: str | None = Header(default=None)):
    """List all users (admin-only). Password hashes are never returned."""
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    with get_sa_conn() as conn:
        result = conn.execute(
            text(
                "SELECT id, username, role, active, first_name, last_name "
                "FROM users ORDER BY created_at ASC"
            )
        )
        users = [
            {
                "id": row[0],
                "username": row[1],
                "role": row[2],
                "active": bool(row[3]),
                "first_name": row[4],
                "last_name": row[5],
            }
            for row in result.fetchall()
        ]
    return {"items": users}


@app.post("/api/users")
def create_user(user: UserCreate, x_role: str | None = Header(default=None)):
    """Create a new user (typically a guard). Admin-only."""
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    password_hash = bcrypt.hash(user.password)

    try:
        with get_sa_conn() as conn:
            conn.execute(
                text(
                    "INSERT INTO users (username, password_hash, role, first_name, last_name, active) "
                    "VALUES (:username, :password_hash, :role, :first_name, :last_name, 1)"
                ),
                {
                    "username": user.username,
                    "password_hash": password_hash,
                    "role": user.role,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            )
            result = conn.execute(
                text(
                    "SELECT id, username, role, active, first_name, last_name "
                    "FROM users WHERE username = :username"
                ),
                {"username": user.username},
            )
            row = result.first()
            return {
                "id": row[0],
                "username": row[1],
                "role": row[2],
                "active": bool(row[3]),
                "first_name": row[4],
                "last_name": row[5],
            }
    except Exception as e:
        # Likely a unique constraint violation on username
        raise HTTPException(status_code=400, detail="Could not create user: " + str(e))


@app.patch("/api/users/{user_id}/toggle")
def toggle_user(user_id: int, x_role: str | None = Header(default=None)):
    """Activate/deactivate a user account (admin-only)."""
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    with get_sa_conn() as conn:
        result = conn.execute(
            text("SELECT active FROM users WHERE id = :id"),
            {"id": user_id},
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        current_active = bool(row[0])
        new_active = 0 if current_active else 1
        conn.execute(
            text("UPDATE users SET active = :active WHERE id = :id"),
            {"active": new_active, "id": user_id},
        )

        return {"id": user_id, "active": bool(new_active)}


# =============================================
# VEHICLE & QR ENDPOINTS
# =============================================

@app.post("/api/vehicles")
def create_vehicle(vehicle: VehicleCreate, x_role: str | None = Header(default=None)):
    # Admins and guards can add vehicles
    if x_role not in ("admin", "user", "guard"):
        raise HTTPException(status_code=403, detail="Admin or guard role required")
    try:
        new_id = vehicle.id or ("VEH-" + uuid.uuid4().hex[:8].upper())
        with get_sa_conn() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO vehicles 
                    (id, plate, make, model, owner_name, owner_unit, owner_phone, status, expires_at)
                    VALUES (:id, :plate, :make, :model, :owner_name, :owner_unit, :owner_phone, :status, :expires_at)
                    """
                ),
                {
                    "id": new_id,
                    "plate": vehicle.plate,
                    "make": vehicle.make,
                    "model": vehicle.model,
                    "owner_name": vehicle.owner_name,
                    "owner_unit": vehicle.owner_unit,
                    "owner_phone": vehicle.owner_phone,
                    "status": vehicle.status or "active",
                    "expires_at": vehicle.expires_at,
                },
            )
        return {"message": "Vehicle added successfully", "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/check/{vehicle_id}")
def check_vehicle(vehicle_id: str):
    with get_sa_conn() as conn:
        result = conn.execute(
            text("SELECT * FROM vehicles WHERE id = :id"),
            {"id": vehicle_id},
        )
        row = result.mappings().first()
        if not row:
            return {"approved": False, "message": "Vehicle does not exist"}
        data = dict(row)

        if (data.get("status") or "inactive") != "active":
            return {"approved": False, "message": "Vehicle is inactive"}

        exp = data.get("expires_at")
        if exp:
            try:
                dt = datetime.fromisoformat(exp.replace("Z", "+00:00") if isinstance(exp, str) else exp)
                now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
                if dt <= now:
                    return {"approved": False, "message": "Expired"}
            except Exception:
                return {"approved": False, "message": "Invalid expiry"}

        return {"approved": True, "vehicle": data}


@app.get("/api/vehicles")
def list_vehicles(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    q: Optional[str] = None,
    status: Optional[str] = None,
    x_role: str | None = Header(default=None)
):
    if x_role not in ("admin", "guard"):
        raise HTTPException(status_code=403, detail="Admin or guard role required")

    where = []
    params: dict[str, object] = {}

    if q:
        params["q"] = f"%{q}%"
        where.append("(id LIKE :q OR plate LIKE :q OR owner_name LIKE :q OR owner_unit LIKE :q)")
    if status in ("active", "inactive"):
        params["status"] = status
        where.append("status = :status")

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""

    with get_sa_conn() as conn:
        count_result = conn.execute(
            text("SELECT COUNT(1) FROM vehicles" + where_sql),
            params,
        )
        total = count_result.scalar_one()

        offset = (page - 1) * limit
        query_params = {**params, "limit": limit, "offset": offset}
        rows_result = conn.execute(
            text(
                "SELECT * FROM vehicles"
                + where_sql
                + " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
            ),
            query_params,
        )
        items = [dict(row) for row in rows_result.mappings().all()]

    return {"items": items, "total": total, "page": page, "limit": limit}


@app.patch("/api/vehicles/{vehicle_id}/toggle")
def toggle_vehicle(vehicle_id: str, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    with get_sa_conn() as conn:
        result = conn.execute(
            text("SELECT status FROM vehicles WHERE id = :id"),
            {"id": vehicle_id},
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        current_status = row[0]
        new_status = "inactive" if current_status == "active" else "active"
        conn.execute(
            text("UPDATE vehicles SET status = :status WHERE id = :id"),
            {"status": new_status, "id": vehicle_id},
        )
    return {"id": vehicle_id, "status": new_status}


@app.put("/api/vehicles/{vehicle_id}")
def update_vehicle(vehicle_id: str, vehicle: VehicleUpdate, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    data = vehicle.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    with get_sa_conn() as conn:
        exists_result = conn.execute(
            text("SELECT 1 FROM vehicles WHERE id = :id"),
            {"id": vehicle_id},
        )
        if not exists_result.first():
            raise HTTPException(status_code=404, detail="Vehicle not found")

        sets = ", ".join(f"{key} = :{key}" for key in data.keys())
        params = {**data, "id": vehicle_id}
        conn.execute(
            text(f"UPDATE vehicles SET {sets} WHERE id = :id"),
            params,
        )

        row_result = conn.execute(
            text("SELECT * FROM vehicles WHERE id = :id"),
            {"id": vehicle_id},
        )
        row = row_result.mappings().first()
        return dict(row) if row else None


@app.delete("/api/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: str, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    with get_sa_conn() as conn:
        exists_result = conn.execute(
            text("SELECT 1 FROM vehicles WHERE id = :id"),
            {"id": vehicle_id},
        )
        if not exists_result.first():
            raise HTTPException(status_code=404, detail="Vehicle not found")
        conn.execute(
            text("DELETE FROM vehicles WHERE id = :id"),
            {"id": vehicle_id},
        )
    return {"message": "Vehicle deleted"}


# QR Code generation (unchanged, just cleaned)
def generate_qr_with_plate(vehicle_id: str, plate: str, logo_path: str = None):
    frontend_base = os.getenv("FRONTEND_BASE_URL", "https://app.squard24.com/app/scanner?code=")
    qr_text = f"{frontend_base}{vehicle_id}"

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    qr.add_data(qr_text)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')

    width, height = qr_img.size
    plate_height = 60
    new_img = Image.new('RGB', (width, height + plate_height + 40), 'white')
    new_img.paste(qr_img, (0, plate_height + 30))

    draw = ImageDraw.Draw(new_img)
    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except:
        font = ImageFont.load_default()

    draw.rounded_rectangle([20, 10, width - 20, plate_height + 10], 10, fill="#f0f0f0", outline="#333", width=2)
    text_bbox = draw.textbbox((0, 0), plate, font=font)
    text_x = (width - (text_bbox[2] - text_bbox[0])) // 2
    draw.text((text_x, 25), plate, font=font, fill="black")

    if logo_path and os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path).resize((40, 40), Image.Resampling.LANCZOS)
            new_img.paste(logo, (width - 50, plate_height + 40), logo if logo.mode == 'RGBA' else None)
        except Exception as e:
            print(f"Logo error: {e}")

    buffered = BytesIO()
    new_img.save(buffered, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"


@app.get("/api/qrcode/{vehicle_id}")
def get_qr(vehicle_id: str, plate: str = Query(None)):
    with get_sa_conn() as conn:
        result = conn.execute(
            text("SELECT plate FROM vehicles WHERE id = :id"),
            {"id": vehicle_id},
        )
        row = result.first()
        plate = (row[0] if row else None) or plate or "NO PLATE"
    logo_path = os.path.join(os.path.dirname(__file__), "static", "logo.png")
    qr_data = generate_qr_with_plate(vehicle_id, plate, logo_path)
    return {"qr": qr_data}
