import sqlite3
import os
from contextlib import contextmanager
from passlib.hash import bcrypt
from sqlalchemy import create_engine

# DB path can be overridden via env DATABASE_PATH; default to backend folder/vehicles.db
DB_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "vehicles.db"))

# Primary database URL: prefer DATABASE_URL (e.g. Postgres), fall back to SQLite file
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
else:
    # Use a SQLite URL that points at the same file DB_PATH
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create a SQLAlchemy engine. For SQLite we need special connect args; Postgres etc. work as-is.
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)


def init_db():
    # NOTE: For now, schema management is implemented only for the SQLite
    # fallback database (DB_PATH). When we fully migrate to SQLAlchemy for
    # Postgres, this function will be updated accordingly.
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Vehicles table
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

    # Users table (for admins and guards)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'guard')),
            first_name TEXT,
            last_name TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Ensure first_name/last_name columns exist on older DBs
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN first_name TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_name TEXT")
    except Exception:
        pass

    # Seed default admin user if none exists
    cursor.execute("SELECT id FROM users WHERE username = ?", ("admin",))
    row = cursor.fetchone()
    if not row:
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
        password_hash = bcrypt.hash(admin_password)
        cursor.execute(
            "INSERT INTO users (username, password_hash, role, active) VALUES (?, ?, 'admin', 1)",
            ("admin", password_hash),
        )

    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

@contextmanager
def get_db():
    """Yield a DB cursor for request handlers.

    Currently this uses the SQLite fallback (DB_PATH) for all operations.
    A future step will switch this to use the SQLAlchemy engine for Postgres
    when DATABASE_URL is configured.
    """

    # If we're using the SQLite fallback URL, keep the existing sqlite3 path.
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
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
    else:
        # Placeholder: Postgres support will be wired through SQLAlchemy in a
        # subsequent step. For now, make it explicit that this path is not
        # yet supported so it's not silently misused.
        raise RuntimeError(
            "Postgres DATABASE_URL is configured but get_db is not yet "
            "wired to use SQLAlchemy for queries. Keep DATABASE_URL unset "
            "until the migration is complete."
        )


@contextmanager
def get_sa_conn():
    """Yield a SQLAlchemy connection inside a transaction.

    This works for both SQLite and Postgres via the shared `engine`.
    """
    with engine.begin() as conn:
        yield conn