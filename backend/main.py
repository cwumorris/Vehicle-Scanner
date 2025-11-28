from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Header, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import qrcode
from io import BytesIO
import base64
from models import Vehicle, VehicleCreate, VehicleUpdate
from database import get_db, init_db
import os
from PIL import Image, ImageDraw, ImageFont
import textwrap
import uuid
from datetime import datetime

app = FastAPI(title="Estate Vehicle Gate Pass")

# =============================================
# CORS — THIS IS THE CRITICAL FIX FOR FRONTEND
# =============================================
# Allow your live frontend domain + localhost for testing
allowed_origins = [
    "https://app.squard24.com",     # Live frontend
    "http://localhost:3001",        # Local dev
    "http://127.0.0.1:3001",
]

# Optional: Allow from env var too (for future changes)
if os.getenv("FRONTEND_ORIGIN"):
    allowed_origins.append(os.getenv("FRONTEND_ORIGIN"))

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
# REST OF YOUR ENDPOINTS (unchanged logic, just cleaned up)
# =============================================

@app.post("/api/vehicles")
def create_vehicle(vehicle: VehicleCreate, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        new_id = vehicle.id or ("VEH-" + uuid.uuid4().hex[:8].upper())
        with get_db() as db:
            db.execute(
                """
                INSERT INTO vehicles 
                (id, plate, make, model, owner_name, owner_unit, owner_phone, status, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    new_id, vehicle.plate, vehicle.make, vehicle.model,
                    vehicle.owner_name, vehicle.owner_unit, vehicle.owner_phone,
                    vehicle.status or "active", vehicle.expires_at
                ),
            )
        return {"message": "Vehicle added successfully", "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/check/{vehicle_id}")
def check_vehicle(vehicle_id: str):
    with get_db() as db:
        db.execute("SELECT * FROM vehicles WHERE id = ?", (vehicle_id,))
        row = db.fetchone()
        if not row:
            return {"approved": False, "message": "Not found or inactive"}
        data = dict(row)

        if (data.get("status") or "inactive") != "active":
            return {"approved": False, "message": "Not found or inactive"}

        exp = data.get("expires_at")
        if exp:
            try:
                dt = datetime.fromisoformat(exp.replace("Z", "+00:00") if isinstance(exp, str) else exp)
                now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
                if dt <= now:
                    return {"approved": False, "message": "Expired"}
            except:
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
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    where = []
    params = []

    if q:
        like = f"%{q}%"
        where.append("(id LIKE ? OR plate LIKE ? OR owner_name LIKE ? OR owner_unit LIKE ?)")
        params.extend([like, like, like, like])
    if status in ("active", "inactive"):
        where.append("status = ?")
        params.append(status)

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""

    with get_db() as db:
        db.execute(f"SELECT COUNT(1) FROM vehicles{where_sql}", params)
        total = db.fetchone()[0]

        offset = (page - 1) * limit
        db.execute(
            f"SELECT * FROM vehicles{where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (*params, limit, offset)
        )
        rows = db.fetchall()
        items = [dict(row) for row in rows]

    return {"items": items, "total": total, "page": page, "limit": limit}


@app.patch("/api/vehicles/{vehicle_id}/toggle")
def toggle_vehicle(vehicle_id: str, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    with get_db() as db:
        db.execute("SELECT status FROM vehicles WHERE id = ?", (vehicle_id,))
        row = db.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        new_status = "inactive" if row["status"] == "active" else "active"
        db.execute("UPDATE vehicles SET status = ? WHERE id = ?", (new_status, vehicle_id))
    return {"id": vehicle_id, "status": new_status}


@app.put("/api/vehicles/{vehicle_id}")
def update_vehicle(vehicle_id: str, vehicle: VehicleUpdate, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    data = vehicle.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    with get_db() as db:
        db.execute("SELECT 1 FROM vehicles WHERE id = ?", (vehicle_id,))
        if not db.fetchone():
            raise HTTPException(status_code=404, detail="Vehicle not found")

        sets = ", ".join(f"{k} = ?" for k in data.keys())
        db.execute(f"UPDATE vehicles SET {sets} WHERE id = ?", (*data.values(), vehicle_id))

        db.execute("SELECT * FROM vehicles WHERE id = ?", (vehicle_id,))
        row = db.fetchone()
        return dict(row)


@app.delete("/api/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: str, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    with get_db() as db:
        db.execute("SELECT 1 FROM vehicles WHERE id = ?", (vehicle_id,))
        if not db.fetchone():
            raise HTTPException(status_code=404, detail="Vehicle not found")
        db.execute("DELETE FROM vehicles WHERE id = ?", (vehicle_id,))
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
    with get_db() as db:
        db.execute("SELECT plate FROM vehicles WHERE id = ?", (vehicle_id,))
        row = db.fetchone()
        plate = (row["plate"] if row else None) or plate or "NO PLATE"
    logo_path = os.path.join(os.path.dirname(__file__), "static", "logo.png")
    qr_data = generate_qr_with_plate(vehicle_id, plate, logo_path)
    return {"qr": qr_data}
