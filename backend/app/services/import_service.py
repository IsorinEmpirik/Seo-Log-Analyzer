"""
Background import service with progress tracking.
Handles streaming import of large .log files with deduplication.
"""
import os
import asyncio
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.models import ImportFile, Log
from app.services.log_parser import stream_log_file, count_lines

# Global progress tracker: import_id -> progress dict
_import_progress = {}

BATCH_SIZE = 5000


async def import_log_file(client_id: int, import_file_id: int, file_path: str):
    """
    Background task: stream-parse and import a .log file.
    Updates _import_progress for SSE consumers.
    """
    progress = {
        "import_id": import_file_id,
        "status": "counting",
        "total_lines": 0,
        "processed_lines": 0,
        "imported": 0,
        "skipped_duplicates": 0,
        "skipped_filtered": 0,
        "percent": 0,
        "error": None,
    }
    _import_progress[import_file_id] = progress

    db = SessionLocal()
    try:
        # Update status to importing
        imp = db.query(ImportFile).filter(ImportFile.id == import_file_id).first()
        if imp:
            imp.status = "counting"
            db.commit()

        # Phase 1: Count total lines (fast binary read)
        total = count_lines(file_path)
        progress["total_lines"] = total
        progress["status"] = "importing"

        if imp:
            imp.status = "importing"
            imp.total_lines = total
            db.commit()

        # Phase 2: Lazy dedup set - load existing keys per-date as encountered
        existing_keys = set()
        loaded_dates = set()

        def load_existing_for_date(log_date):
            if log_date in loaded_dates:
                return
            rows = db.execute(text(
                "SELECT timestamp, ip, url FROM logs "
                "WHERE client_id = :cid AND log_date = :d"
            ), {"cid": client_id, "d": log_date})
            for row in rows:
                existing_keys.add((str(row[0]), row[1], row[2]))
            loaded_dates.add(log_date)

        # Phase 3: Stream parse and batch insert
        batch = []
        for line_num, parsed in stream_log_file(file_path):
            progress["processed_lines"] = line_num
            if total > 0:
                progress["percent"] = min(99, int(line_num / total * 100))

            if parsed is None:
                progress["skipped_filtered"] += 1
                continue

            # Dedup check
            log_date = parsed["log_date"]
            load_existing_for_date(log_date)

            dedup_key = (str(parsed["timestamp"]), parsed["ip"], parsed["url"])
            if dedup_key in existing_keys:
                progress["skipped_duplicates"] += 1
                continue

            existing_keys.add(dedup_key)
            batch.append({
                "file_id": import_file_id,
                "client_id": client_id,
                **parsed,
            })

            if len(batch) >= BATCH_SIZE:
                _insert_batch(db, batch)
                progress["imported"] += len(batch)
                batch = []
                # Yield to event loop so SSE can send updates
                await asyncio.sleep(0)

        # Insert remaining batch
        if batch:
            _insert_batch(db, batch)
            progress["imported"] += len(batch)

        # Update import file record
        imp = db.query(ImportFile).filter(ImportFile.id == import_file_id).first()
        if imp:
            imp.status = "completed"
            imp.total_lines = total
            imp.imported_lines = progress["imported"]
            imp.skipped_duplicates = progress["skipped_duplicates"]
            imp.skipped_filtered = progress["skipped_filtered"]
        db.commit()

        progress["status"] = "completed"
        progress["percent"] = 100

    except Exception as e:
        progress["status"] = "error"
        progress["error"] = str(e)
        try:
            imp = db.query(ImportFile).filter(ImportFile.id == import_file_id).first()
            if imp:
                imp.status = "error"
                imp.error_message = str(e)
            db.commit()
        except Exception:
            pass
    finally:
        db.close()
        # Clean up temp file
        try:
            os.unlink(file_path)
        except Exception:
            pass


def _insert_batch(db, batch: list):
    """Bulk insert a batch of log dicts for maximum speed."""
    if not batch:
        return
    db.execute(Log.__table__.insert(), batch)
    db.commit()


def get_import_progress(import_id: int) -> dict:
    """Get current progress for an active import."""
    return _import_progress.get(import_id)


def remove_import_progress(import_id: int):
    """Clean up progress tracking after client has consumed it."""
    _import_progress.pop(import_id, None)
