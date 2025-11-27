from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Header, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import qrcode
from io import BytesIO
import base64
from models import Vehicle
from database import get_db, init_db
import os
from PIL import Image, ImageDraw, ImageFont
import textwrap

app = FastAPI(title="Estate Vehicle Gate Pass")

# Allow React frontend to talk to backend - restrictable via env FRONTEND_ORIGIN
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3001")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    init_db()
    print("Database ready!")

@app.post("/api/vehicles")
def create_vehicle(vehicle: Vehicle, x_role: str | None = Header(default=None)):
    # Gate admin-only action
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        with get_db() as db:
            db.execute(
                """
                INSERT INTO vehicles 
                (id, plate, make, model, owner_name, owner_unit, owner_phone, status, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    vehicle.id,
                    vehicle.plate,
                    vehicle.make,
                    vehicle.model,
                    vehicle.owner_name,
                    vehicle.owner_unit,
                    vehicle.owner_phone,
                    vehicle.status,
                    vehicle.expires_at,
                ),
            )
        return {"message": "Vehicle added successfully", "id": vehicle.id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/check/{vehicle_id}")
def check_vehicle(vehicle_id: str):
    from datetime import datetime
    with get_db() as db:
        db.execute("SELECT * FROM vehicles WHERE id = ?", (vehicle_id,))
        row = db.fetchone()
        if not row:
            return {"approved": False, "message": "Not found or inactive"}
        data = dict(row)
        # status must be active
        if (data.get("status") or "inactive") != "active":
            return {"approved": False, "message": "Not found or inactive"}
        # if expires_at set and in the past, deny
        exp = data.get("expires_at")
        if exp:
            try:
                vv = exp.replace("Z", "+00:00") if isinstance(exp, str) else exp
                dt = datetime.fromisoformat(vv)
                now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
                if dt <= now:
                    return {"approved": False, "message": "Expired"}
            except Exception:
                # if invalid format, treat as expired for safety
                return {"approved": False, "message": "Invalid expiry"}
        return {"approved": True, "vehicle": data}

@app.get("/api/vehicles")
def list_vehicles(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    x_role: str | None = Header(default=None)
):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        base_sql = "SELECT * FROM vehicles"
        params: list[object] = []
        where = []
        if q:
            where.append("(id LIKE ? OR plate LIKE ? OR owner_name LIKE ? OR owner_unit LIKE ?)")
            like = f"%{q}%"
            params.extend([like, like, like, like])
        if status in ("active", "inactive"):
            where.append("status = ?")
            params.append(status)

        order = " ORDER BY created_at DESC"
        where_sql = (" WHERE " + " AND ".join(where)) if where else ""
        # total count
        with get_db() as db:
            db.execute(f"SELECT COUNT(1) as c FROM vehicles{where_sql}", params)
            total_row = db.fetchone()
            total = int(total_row["c"]) if total_row else 0
            offset = (page - 1) * limit
            db.execute(f"{base_sql}{where_sql}{order} LIMIT ? OFFSET ?", (*params, limit, offset))
            rows = db.fetchall()
            items = [dict(row) for row in rows]
        return {"items": items, "total": total, "page": page, "limit": limit}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/vehicles/{vehicle_id}/toggle")
def toggle_vehicle(vehicle_id: str, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        with get_db() as db:
            db.execute("SELECT status FROM vehicles WHERE id = ?", (vehicle_id,))
            row = db.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Vehicle not found")
            current = row["status"] or "inactive"
            new_status = "inactive" if current == "active" else "active"
            db.execute("UPDATE vehicles SET status = ? WHERE id = ?", (new_status, vehicle_id))
        return {"id": vehicle_id, "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/vehicles/{vehicle_id}")
def update_vehicle(vehicle_id: str, vehicle: Vehicle, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        with get_db() as db:
            # Check if vehicle exists
            db.execute("SELECT id FROM vehicles WHERE id = ?", (vehicle_id,))
            if not db.fetchone():
                raise HTTPException(status_code=404, detail="Vehicle not found")
            
            # Update vehicle
            db.execute(
                """
                UPDATE vehicles 
                SET plate = ?, make = ?, model = ?, owner_name = ?, 
                    owner_unit = ?, owner_phone = ?, status = ?, expires_at = ?
                WHERE id = ?
                """,
                (
                    vehicle.plate,
                    vehicle.make,
                    vehicle.model,
                    vehicle.owner_name,
                    vehicle.owner_unit,
                    vehicle.owner_phone,
                    vehicle.status,
                    vehicle.expires_at,
                    vehicle_id,
                ),
            )
        return vehicle
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: str, x_role: str | None = Header(default=None)):
    if x_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        with get_db() as db:
            # Check if vehicle exists
            db.execute("SELECT id FROM vehicles WHERE id = ?", (vehicle_id,))
            if not db.fetchone():
                raise HTTPException(status_code=404, detail="Vehicle not found")
            
            # Delete vehicle
            db.execute("DELETE FROM vehicles WHERE id = ?", (vehicle_id,))
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_qr_with_plate(vehicle_id: str, plate: str, logo_path: str = None):
    # Generate QR code
    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:3001/app/scanner?code=")
    qr_text = f"{frontend_base}{vehicle_id}"
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)
    
    # Create QR code image
    qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    
    # Create a new image with space for plate number
    width, height = qr_img.size
    padding = 20
    plate_height = 60  # Space for plate number
    new_img = Image.new('RGB', (width, height + plate_height + 20), 'white')
    
    # Add QR code to the new image
    new_img.paste(qr_img, (0, plate_height + 20))
    
    # Add plate number
    draw = ImageDraw.Draw(new_img)
    try:
        # Try to load a font (you may need to adjust the path)
        font = ImageFont.truetype("arial.ttf", 24)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Draw plate background (like a license plate)
    plate_rect = [padding, 10, width - padding, plate_height + 10]
    draw.rounded_rectangle(plate_rect, 10, fill="#f0f0f0", outline="#333", width=2)
    
    # Draw plate text
    text_bbox = draw.textbbox((0, 0), plate, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_x = (width - text_width) // 2
    text_y = plate_height // 2 - (text_bbox[3] - text_bbox[1]) // 2 + 10
    draw.text((text_x, text_y), plate, font=font, fill="black")
    
    # Add company logo if provided
    if logo_path and os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path)
            # Resize logo to fit in the top-right corner
            logo_size = 40
            logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            
            # Add logo to the top-right corner of the QR code
            logo_pos = (width - logo_size - 10, plate_height + 30)
            new_img.paste(logo, logo_pos, logo if logo.mode == 'RGBA' else None)
        except Exception as e:
            print(f"Error adding logo: {e}")
    
    # Convert to base64
    buffered = BytesIO()
    new_img.save(buffered, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"

@app.get("/api/qrcode/{vehicle_id}")
def get_qr(vehicle_id: str, plate: str = Query(None, description="Vehicle plate number")):
    # Get vehicle details if plate is not provided
    if not plate:
        with get_db() as db:
            db.execute("SELECT plate FROM vehicles WHERE id = ?", (vehicle_id,))
            row = db.fetchone()
            if row:
                plate = row["plate"] or "NO PLATE"
            else:
                plate = "NO PLATE"
    
    # Path to your company logo (update this path)
    logo_path = os.path.join(os.path.dirname(__file__), "static", "logo.png")
    
    try:
        qr_data = generate_qr_with_plate(vehicle_id, plate, logo_path)
        return {"qr": qr_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {str(e)}")