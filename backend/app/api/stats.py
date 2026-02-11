from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional, List
from app.core.database import get_db
from app.models.models import Log
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
    bot_family: Optional[str] = Query(None),
    crawler: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get main dashboard statistics"""
    return get_dashboard_stats(db, client_id, start_date, end_date, bot_family, crawler)


@router.get("/{client_id}/orphan-pages", response_model=List[OrphanPage])
def orphan_pages(
    client_id: int,
    bot_family: Optional[str] = Query(None),
    crawler: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get pages crawled by bots but not found in Screaming Frog"""
    return get_orphan_pages(db, client_id, bot_family, crawler)


@router.get("/{client_id}/compare")
def compare(
    client_id: int,
    period_a_start: date = Query(...),
    period_a_end: date = Query(...),
    period_b_start: date = Query(...),
    period_b_end: date = Query(...),
    bot_family: Optional[str] = Query(None),
    crawler: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Compare statistics between two time periods"""
    return compare_periods(
        db, client_id,
        period_a_start, period_a_end,
        period_b_start, period_b_end,
        bot_family, crawler
    )


@router.get("/{client_id}/frequency")
def frequency(
    client_id: int,
    url: Optional[str] = Query(None),
    group_by: str = Query("day", regex="^(day|week)$"),
    bot_family: Optional[str] = Query(None),
    crawler: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get crawl frequency for a page or all pages"""
    return get_page_frequency(db, client_id, url, group_by, bot_family, crawler)


@router.get("/{client_id}/bot-distribution")
def bot_distribution(
    client_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """Get crawl distribution by bot family and individual bot."""
    query = db.query(Log).filter(Log.client_id == client_id)
    if start_date:
        query = query.filter(Log.log_date >= start_date)
    if end_date:
        query = query.filter(Log.log_date <= end_date)

    families = (
        query
        .with_entities(Log.bot_family, func.count(Log.id))
        .group_by(Log.bot_family)
        .order_by(func.count(Log.id).desc())
        .all()
    )

    bots = (
        query
        .with_entities(Log.crawler, Log.bot_family, func.count(Log.id))
        .group_by(Log.crawler, Log.bot_family)
        .order_by(func.count(Log.id).desc())
        .all()
    )

    return {
        "families": [{"family": f, "count": c} for f, c in families if f],
        "bots": [{"bot": b, "family": f, "count": c} for b, f, c in bots if b],
    }


@router.get("/{client_id}/pages")
def get_pages(
    client_id: int,
    http_code: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    bot_family: Optional[str] = Query(None),
    crawler: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of crawled pages with filters"""
    # Get total date range to compute crawl intervals
    base_query = db.query(Log).filter(Log.client_id == client_id)
    if bot_family:
        base_query = base_query.filter(Log.bot_family == bot_family)
    if crawler:
        base_query = base_query.filter(Log.crawler == crawler)

    date_range = (
        base_query
        .with_entities(func.min(Log.log_date), func.max(Log.log_date))
        .first()
    )
    total_days = 0
    if date_range and date_range[0] and date_range[1] and date_range[0] != date_range[1]:
        total_days = (date_range[1] - date_range[0]).days

    query = (
        base_query
        .with_entities(
            Log.url,
            func.count(Log.id).label('crawl_count'),
            func.max(Log.timestamp).label('last_crawl'),
            Log.http_code
        )
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
                "http_code": r.http_code,
                "crawl_interval": round(total_days / r.crawl_count, 1) if total_days > 0 and r.crawl_count > 0 else None
            }
            for r in results
        ]
    }
