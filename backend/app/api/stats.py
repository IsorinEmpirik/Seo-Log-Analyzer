from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional, List
from app.core.database import get_db
from app.schemas.schemas import DashboardStats, OrphanPage, PeriodComparison
from app.services.stats_service import (
    get_dashboard_stats,
    get_orphan_pages,
    compare_periods,
    get_page_frequency
)

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/{client_id}/dashboard", response_model=DashboardStats)
def dashboard(
    client_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """Get main dashboard statistics"""
    return get_dashboard_stats(db, client_id, start_date, end_date)


@router.get("/{client_id}/orphan-pages", response_model=List[OrphanPage])
def orphan_pages(client_id: int, db: Session = Depends(get_db)):
    """Get pages crawled by Googlebot but not found in Screaming Frog"""
    return get_orphan_pages(db, client_id)


@router.get("/{client_id}/compare")
def compare(
    client_id: int,
    period_a_start: date = Query(...),
    period_a_end: date = Query(...),
    period_b_start: date = Query(...),
    period_b_end: date = Query(...),
    db: Session = Depends(get_db)
):
    """Compare statistics between two time periods"""
    return compare_periods(
        db, client_id,
        period_a_start, period_a_end,
        period_b_start, period_b_end
    )


@router.get("/{client_id}/frequency")
def frequency(
    client_id: int,
    url: Optional[str] = Query(None),
    group_by: str = Query("day", regex="^(day|week)$"),
    db: Session = Depends(get_db)
):
    """Get crawl frequency for a page or all pages"""
    return get_page_frequency(db, client_id, url, group_by)


@router.get("/{client_id}/pages")
def get_pages(
    client_id: int,
    http_code: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    """Get list of crawled pages with filters"""
    from sqlalchemy import func, distinct
    from app.models.models import Log

    query = (
        db.query(
            Log.url,
            func.count(Log.id).label('crawl_count'),
            func.max(Log.timestamp).label('last_crawl'),
            Log.http_code
        )
        .filter(Log.client_id == client_id)
        .group_by(Log.url)
    )

    if http_code:
        query = query.filter(Log.http_code == http_code)

    if search:
        query = query.filter(Log.url.ilike(f"%{search}%"))

    total = query.count()

    results = (
        query
        .order_by(func.count(Log.id).desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "pages": [
            {
                "url": r.url,
                "crawl_count": r.crawl_count,
                "last_crawl": r.last_crawl,
                "http_code": r.http_code
            }
            for r in results
        ]
    }
