#!/bin/sh
set -e

echo "Waiting for database..."
python - <<'PYEOF'
import time
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

deadline = time.time() + 60
last_err = None
while time.time() < deadline:
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database is ready.")
        sys.exit(0)
    except Exception as e:  # noqa: BLE001
        last_err = e
        time.sleep(2)

print(f"Database did not become ready in time: {last_err}")
sys.exit(1)
PYEOF

echo "Running database migrations..."
alembic upgrade head

echo "Starting SaleDay API..."
exec "$@"
