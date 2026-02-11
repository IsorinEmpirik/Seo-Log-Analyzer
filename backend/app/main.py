from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import init_db
from app.core.migrate import run_migrations
from app.api import clients, imports, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database and run migrations
    init_db()
    run_migrations()
    yield
    # Shutdown


app = FastAPI(
    title="SEO Log Analyzer",
    description="Analyze bot crawl logs for SEO insights",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(clients.router)
app.include_router(imports.router)
app.include_router(stats.router)


@app.get("/")
def root():
    return {"message": "SEO Log Analyzer API", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
