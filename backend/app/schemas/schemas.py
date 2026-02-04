from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List


# Client schemas
class ClientBase(BaseModel):
    name: str
    domain: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class Client(ClientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Import file schemas
class ImportFileBase(BaseModel):
    filename: str
    file_type: Optional[str] = None


class ImportFile(ImportFileBase):
    id: int
    client_id: int
    imported_at: datetime

    class Config:
        from_attributes = True


# Log schemas
class LogBase(BaseModel):
    timestamp: datetime
    ip: Optional[str] = None
    url: str
    http_code: Optional[int] = None
    response_size: Optional[int] = None
    log_date: Optional[date] = None


class Log(LogBase):
    id: int
    file_id: int
    client_id: int

    class Config:
        from_attributes = True


# Dashboard stats schemas
class HttpCodeStats(BaseModel):
    code: int
    count: int
    percentage: float


class DailyCrawlStats(BaseModel):
    date: date
    count: int


class TopPageStats(BaseModel):
    url: str
    count: int


class DashboardStats(BaseModel):
    total_crawls: int
    unique_pages: int
    date_range: dict
    http_codes: List[HttpCodeStats]
    daily_crawls: List[DailyCrawlStats]
    top_pages: List[TopPageStats]


# Orphan pages
class OrphanPage(BaseModel):
    url: str
    crawl_count: int
    last_crawl: Optional[datetime] = None


# Period comparison
class PeriodStats(BaseModel):
    period: str
    total_crawls: int
    unique_pages: int
    http_codes: List[HttpCodeStats]


class PeriodComparison(BaseModel):
    period_a: PeriodStats
    period_b: PeriodStats
    crawl_delta: int
    crawl_delta_percent: float
