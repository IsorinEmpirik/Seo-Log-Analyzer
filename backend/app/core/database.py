from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Absolute path to project root (database.py -> core -> app -> backend -> project root)
_THIS_FILE = os.path.abspath(__file__)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(_THIS_FILE))))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "seo_logs.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Log the database path for debugging
print(f"[DB] Using database: {DB_PATH}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)
