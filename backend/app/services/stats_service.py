from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import date
from typing import List, Optional
from urllib.parse import urlparse
from app.models.models import Log, ScreamingFrogUrl
from app.schemas.schemas import (
    HttpCodeStats, DailyCrawlStats, TopPageStats, DashboardStats,
    OrphanPage, PeriodStats, PeriodComparison
)


def _apply_bot_filters(query, bot_family: Optional[str], crawler: Optional[str]):
    """Apply bot family and/or individual crawler filters to a query."""
    if bot_family:
        query = query.filter(Log.bot_family == bot_family)
    if crawler:
        query = query.filter(Log.crawler == crawler)
    return query


def get_dashboard_stats(
    db: Session,
    client_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    bot_family: Optional[str] = None,
    crawler: Optional[str] = None,
    page_type: Optional[str] = None,
) -> DashboardStats:
    """Get main dashboard statistics"""

    query = db.query(Log).filter(Log.client_id == client_id)

    if start_date:
        query = query.filter(Log.log_date >= start_date)
    if end_date:
        query = query.filter(Log.log_date <= end_date)

    query = _apply_bot_filters(query, bot_family, crawler)

    if page_type:
        query = query.filter(Log.page_type == page_type)

    # Total crawls
    total_crawls = query.count()

    # Unique pages
    unique_pages = query.with_entities(func.count(distinct(Log.url))).scalar()

    # Date range
    min_date = query.with_entities(func.min(Log.log_date)).scalar()
    max_date = query.with_entities(func.max(Log.log_date)).scalar()

    # HTTP codes distribution
    http_codes_raw = (
        query
        .with_entities(Log.http_code, func.count(Log.id).label('count'))
        .group_by(Log.http_code)
        .order_by(func.count(Log.id).desc())
        .all()
    )

    http_codes = [
        HttpCodeStats(
            code=code or 0,
            count=count,
            percentage=round(count / total_crawls * 100, 2) if total_crawls > 0 else 0
        )
        for code, count in http_codes_raw
    ]

    # Daily crawls
    daily_crawls_raw = (
        query
        .with_entities(Log.log_date, func.count(Log.id).label('count'))
        .group_by(Log.log_date)
        .order_by(Log.log_date)
        .all()
    )

    daily_crawls = [
        DailyCrawlStats(date=d, count=c)
        for d, c in daily_crawls_raw if d
    ]

    # Top pages
    top_pages_raw = (
        query
        .with_entities(Log.url, func.count(Log.id).label('count'))
        .group_by(Log.url)
        .order_by(func.count(Log.id).desc())
        .limit(20)
        .all()
    )

    top_pages = [
        TopPageStats(url=url, count=count)
        for url, count in top_pages_raw
    ]

    # Average crawl interval (computed in SQL for performance)
    avg_crawl_interval = None
    if min_date and max_date and min_date != max_date and unique_pages and unique_pages > 0:
        total_days = (max_date - min_date).days
        if total_days > 0:
            subq = (
                query
                .with_entities(
                    (total_days * 1.0 / func.count(Log.id)).label('interval')
                )
                .group_by(Log.url)
                .subquery()
            )
            result = db.query(func.avg(subq.c.interval)).scalar()
            if result is not None:
                avg_crawl_interval = round(float(result), 1)

    return DashboardStats(
        total_crawls=total_crawls,
        unique_pages=unique_pages,
        avg_crawl_interval=avg_crawl_interval,
        date_range={"start": str(min_date) if min_date else None, "end": str(max_date) if max_date else None},
        http_codes=http_codes,
        daily_crawls=daily_crawls,
        top_pages=top_pages
    )


def get_orphan_pages(
    db: Session,
    client_id: int,
    bot_family: Optional[str] = None,
    crawler: Optional[str] = None,
    search: Optional[str] = None,
    page_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """
    Find pages crawled by bots but not in Screaming Frog export.
    Only pages whose most recent crawl returned HTTP 200.
    Returns paginated results with total count.
    """
    base_query = db.query(Log).filter(Log.client_id == client_id)
    base_query = _apply_bot_filters(base_query, bot_family, crawler)

    if page_type:
        base_query = base_query.filter(Log.page_type == page_type)

    # Subquery: for each URL, get the timestamp of the most recent crawl
    latest_ts_subq = (
        base_query
        .with_entities(Log.url, func.max(Log.timestamp).label('max_ts'))
        .group_by(Log.url)
        .subquery()
    )

    # Get the HTTP code of the most recent crawl for each URL
    latest_code = (
        db.query(Log.url, Log.http_code)
        .join(latest_ts_subq, (Log.url == latest_ts_subq.c.url) & (Log.timestamp == latest_ts_subq.c.max_ts))
        .filter(Log.client_id == client_id)
        .all()
    )
    last_code_map = {url: code for url, code in latest_code}

    # Get all URLs with their stats
    log_urls = (
        base_query
        .with_entities(Log.url, func.count(Log.id).label('count'), func.max(Log.timestamp).label('last'))
        .group_by(Log.url)
        .all()
    )

    # Get all URLs from Screaming Frog, normalized to path only
    sf_paths = set()
    for (url,) in db.query(ScreamingFrogUrl.url).filter(ScreamingFrogUrl.client_id == client_id).all():
        parsed = urlparse(url)
        path = parsed.path.rstrip('/')
        if not path:
            path = '/'
        sf_paths.add(path)

    # Find orphans
    orphans = []
    for url, count, last_crawl in log_urls:
        normalized_url = url.rstrip('/')
        if not normalized_url:
            normalized_url = '/'

        if last_code_map.get(url) != 200:
            continue

        if normalized_url not in sf_paths:
            # Apply search filter
            if search and search.lower() not in url.lower():
                continue
            orphans.append(OrphanPage(
                url=url,
                crawl_count=count,
                last_crawl=last_crawl
            ))

    orphans.sort(key=lambda x: x.crawl_count, reverse=True)
    total = len(orphans)

    return {
        "total": total,
        "orphans": orphans[offset:offset + limit]
    }


def compare_periods(
    db: Session,
    client_id: int,
    period_a_start: date,
    period_a_end: date,
    period_b_start: date,
    period_b_end: date,
    bot_family: Optional[str] = None,
    crawler: Optional[str] = None,
) -> PeriodComparison:
    """Compare stats between two time periods"""

    def get_period_stats(start: date, end: date, name: str) -> PeriodStats:
        query = (
            db.query(Log)
            .filter(Log.client_id == client_id)
            .filter(Log.log_date >= start)
            .filter(Log.log_date <= end)
        )
        query = _apply_bot_filters(query, bot_family, crawler)

        total = query.count()
        unique = query.with_entities(func.count(distinct(Log.url))).scalar()

        http_codes_raw = (
            query
            .with_entities(Log.http_code, func.count(Log.id).label('count'))
            .group_by(Log.http_code)
            .all()
        )

        http_codes = [
            HttpCodeStats(
                code=code or 0,
                count=count,
                percentage=round(count / total * 100, 2) if total > 0 else 0
            )
            for code, count in http_codes_raw
        ]

        return PeriodStats(
            period=name,
            total_crawls=total,
            unique_pages=unique,
            http_codes=http_codes
        )

    period_a = get_period_stats(period_a_start, period_a_end, f"{period_a_start} - {period_a_end}")
    period_b = get_period_stats(period_b_start, period_b_end, f"{period_b_start} - {period_b_end}")

    delta = period_b.total_crawls - period_a.total_crawls
    delta_percent = round(delta / period_a.total_crawls * 100, 2) if period_a.total_crawls > 0 else 0

    return PeriodComparison(
        period_a=period_a,
        period_b=period_b,
        crawl_delta=delta,
        crawl_delta_percent=delta_percent
    )


def get_page_frequency(
    db: Session,
    client_id: int,
    url: Optional[str] = None,
    group_by: str = "day",
    bot_family: Optional[str] = None,
    crawler: Optional[str] = None,
) -> List[dict]:
    """Get crawl frequency for a specific page or all pages"""

    query = db.query(Log).filter(Log.client_id == client_id)
    query = _apply_bot_filters(query, bot_family, crawler)

    if url:
        query = query.filter(Log.url == url)

    if group_by == "week":
        results = (
            query
            .with_entities(
                func.strftime('%Y-%W', Log.log_date).label('period'),
                func.count(Log.id).label('count')
            )
            .group_by(func.strftime('%Y-%W', Log.log_date))
            .order_by(func.strftime('%Y-%W', Log.log_date))
            .all()
        )
    else:
        results = (
            query
            .with_entities(Log.log_date, func.count(Log.id).label('count'))
            .group_by(Log.log_date)
            .order_by(Log.log_date)
            .all()
        )

    return [{"period": str(p), "count": c} for p, c in results if p]
