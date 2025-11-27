import sqlite3
import os
from contextlib import contextmanager

# DB path can be overridden via env DATABASE_PATH; default to backend folder/vehicles.db
DB_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "vehicles.db"))

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            plate TEXT NOT NULL,
            make TEXT,
            model TEXT,
            owner_name TEXT NOT NULL,
            owner_unit TEXT,
            owner_phone TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )
    ''')
    # Helpful indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at)")
    conn.commit()

    conn.close()
    print(f"Database initialized at {DB_PATH}")

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn.cursor()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()