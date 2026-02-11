"""
Database migration for existing data.
Adds new columns and reclassifies existing logs with the bot registry.
Safe to run multiple times (idempotent).
"""
from sqlalchemy import text
from app.core.database import engine
from app.services.bot_registry import classify_bot


def run_migrations():
    """Run all pending migrations."""
    with engine.connect() as conn:
        _add_columns(conn)
        _reclassify_existing_logs(conn)
        _create_indexes(conn)
        print("[MIGRATE] Migrations completed")


def _add_columns(conn):
    """Add new columns to existing tables (safe if already exist)."""
    # Log table new columns
    for col, col_type in [
        ("bot_family", "VARCHAR(100)"),
        ("response_time", "INTEGER"),
    ]:
        try:
            conn.execute(text(f"ALTER TABLE logs ADD COLUMN {col} {col_type}"))
            conn.commit()
            print(f"[MIGRATE] Added logs.{col}")
        except Exception:
            conn.rollback()

    # ImportFile table new columns
    for col, col_type, default in [
        ("total_lines", "INTEGER", "0"),
        ("imported_lines", "INTEGER", "0"),
        ("skipped_duplicates", "INTEGER", "0"),
        ("skipped_filtered", "INTEGER", "0"),
        ("status", "VARCHAR(20)", "'completed'"),
        ("error_message", "TEXT", "NULL"),
    ]:
        try:
            conn.execute(text(
                f"ALTER TABLE import_files ADD COLUMN {col} {col_type} DEFAULT {default}"
            ))
            conn.commit()
            print(f"[MIGRATE] Added import_files.{col}")
        except Exception:
            conn.rollback()


def _reclassify_existing_logs(conn):
    """Reclassify existing logs using the new bot registry."""
    result = conn.execute(text(
        "SELECT COUNT(*) FROM logs WHERE bot_family IS NULL"
    ))
    count = result.scalar()
    if count == 0:
        return

    print(f"[MIGRATE] Reclassifying {count} existing logs...")

    rows = conn.execute(text(
        "SELECT id, user_agent FROM logs WHERE bot_family IS NULL"
    ))
    batch = []
    for row in rows:
        log_id, ua = row[0], row[1]
        bot_name, family = classify_bot(ua or "")
        batch.append({
            "id": log_id,
            "bot": bot_name or "Unknown",
            "family": family or "Unknown",
        })

        if len(batch) >= 5000:
            _update_batch(conn, batch)
            batch = []

    if batch:
        _update_batch(conn, batch)

    conn.commit()
    print(f"[MIGRATE] Reclassified {count} logs")


def _update_batch(conn, batch):
    """Update a batch of logs with new classification."""
    for item in batch:
        conn.execute(text(
            "UPDATE logs SET crawler = :bot, bot_family = :family WHERE id = :id"
        ), item)


def _create_indexes(conn):
    """Create composite indexes for performance."""
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_logs_dedup ON logs(client_id, timestamp, ip, url)",
        "CREATE INDEX IF NOT EXISTS ix_logs_client_family ON logs(client_id, bot_family)",
        "CREATE INDEX IF NOT EXISTS ix_logs_client_crawler ON logs(client_id, crawler)",
        "CREATE INDEX IF NOT EXISTS ix_logs_client_date_family ON logs(client_id, log_date, bot_family)",
    ]
    for idx_sql in indexes:
        try:
            conn.execute(text(idx_sql))
            conn.commit()
        except Exception:
            conn.rollback()
