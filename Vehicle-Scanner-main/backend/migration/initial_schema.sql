-- 1) Users table (admins + guards)
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'guard')),
    first_name    TEXT,
    last_name     TEXT,
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role   ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (active);

-- 2) Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id           TEXT PRIMARY KEY,
    plate        TEXT NOT NULL,
    make         TEXT,
    model        TEXT,
    owner_name   TEXT NOT NULL,
    owner_unit   TEXT,
    owner_phone  TEXT,
    status       TEXT NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status     ON vehicles (status);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles (created_at);

-- 3) Seed default admin user if not present
-- Password here is bcrypt("admin123"); generate your own if you prefer.
DO $$
DECLARE
    existing_id INTEGER;
BEGIN
    SELECT id INTO existing_id FROM users WHERE username = 'admin';

    IF existing_id IS NULL THEN
        INSERT INTO users (username, password_hash, role, active)
        VALUES (
            'admin',
            '$2b$12$zvW8bF5gP9w9f3kbN0k5me1Gqj5z5u1Lc9W9kQN7./ScR3k7u7lXO', -- bcrypt('admin123') example
            'admin',
            TRUE
        );
    END IF;
END $$;