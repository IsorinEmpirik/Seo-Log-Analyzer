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


def get_dashboard_stats(
    db: Session,
    client_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> DashboardStats:
    """Get main dashboard statistics"""

    query = db.query(Log).filter(Log.client_id == client_id)

    if start_date:
        query = query.filter(Log.log_date >= start_date)
    if end_date:
        query = query.filter(Log.log_date <= end_date)

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

    # Average crawl interval: on average, each page is crawled every X days
    avg_crawl_interval = None
    if min_date and max_date and min_date != max_date and unique_pages and unique_pages > 0:
        total_days = (max_date - min_date).days
        if total_days > 0:
            # For each page: interval = total_days / crawl_count
            # Average across all pages
            page_crawl_counts = (
                query
                .with_entities(Log.url, func.count(Log.id).label('count'))
                .group_by(Log.url)
                .all()
            )
            intervals = [total_days / count for _, count in page_crawl_counts if count > 0]
            if intervals:
                avg_crawl_interval = round(sum(intervals) / len(intervals), 1)

    return DashboardStats(
        total_crawls=total_crawls,
        unique_pages=unique_pages,
        avg_crawl_interval=avg_crawl_interval,
        date_range={"start": str(min_date) if min_date else None, "end": str(max_date) if max_date else None},
        http_codes=http_codes,
        daily_crawls=daily_crawls,
        top_pages=top_pages
    )


def get_orphan_pages(db: Session, client_id: int) -> List[OrphanPage]:
    """
    Find pages crawled by Googlebot but not in Screaming Frog export.
    Only pages whose most recent crawl returned HTTP 200.
    """
    # Get all URLs from logs with total count, last crawl timestamp, and last HTTP code
    from sqlalchemy import case
    from sqlalchemy.sql import literal_column

    # Subquery: for each URL, get the timestamp of the most recent crawl
    latest_ts_subq = (
        db.query(Log.url, func.max(Log.timestamp).label('max_ts'))
        .filter(Log.client_id == client_id)
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
        db.query(Log.url, func.count(Log.id).label('count'), func.max(Log.timestamp).label('last'))
        .filter(Log.client_id == client_id)
        .group_by(Log.url)
        .all()
    )

    # Get all URLs from Screaming Frog, normalized to path only
    # SF stores full URLs like https://domain.com/path, logs store /path
    sf_paths = set()
    for (url,) in db.query(ScreamingFrogUrl.url).filter(ScreamingFrogUrl.client_id == client_id).all():
        parsed = urlparse(url)
        path = parsed.path.rstrip('/')
        if not path:
            path = '/'
        sf_paths.add(path)

    # Find orphans: log URLs not in SF, and whose last crawl was 200
    orphans = []
    for url, count, last_crawl in log_urls:
        normalized_url = url.rstrip('/')
        if not normalized_url:
            normalized_url = '/'

        # Only include if last HTTP code is 200
        if last_code_map.get(url) != 200:
            continue

        if normalized_url not in sf_paths:
            orphans.append(OrphanPage(
                url=url,
                crawl_count=count,
                last_crawl=last_crawl
            ))

    return sorted(orphans, key=lambda x: x.crawl_count, reverse=True)


def compare_periods(
    db: Session,
    client_id: int,
    period_a_start: date,
    period_a_end: date,
    period_b_start: date,
    period_b_end: date
) -> PeriodComparison:
    """Compare stats between two time periods"""

    def get_period_stats(start: date, end: date, name: str) -> PeriodStats:
        query = (
            db.query(Log)
            .filter(Log.client_id == client_id)
            .filter(Log.log_date >= start)
            .filter(Log.log_date <= end)
        )

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
    group_by: str = "day"  # day, week
) -> List[dict]:
    """Get crawl frequency for a specific page or all pages"""

    query = db.query(Log).filter(Log.client_id == client_id)

    if url:
        query = query.filter(Log.url == url)

    if group_by == "week":
        # Group by week
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
        # Group by day
        results = (
            query
            .with_entities(Log.log_date, func.count(Log.id).label('count'))
            .group_by(Log.log_date)
            .order_by(Log.log_date)
            .all()
        )

    return [{"period": str(p), "count": c} for p, c in results if p]
