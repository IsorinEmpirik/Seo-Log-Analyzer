from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    domain = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    import_files = relationship("ImportFile", back_populates="client", cascade="all, delete-orphan")
    logs = relationship("Log", back_populates="client", cascade="all, delete-orphan")
    screaming_frog_urls = relationship("ScreamingFrogUrl", back_populates="client", cascade="all, delete-orphan")


class ImportFile(Base):
    __tablename__ = "import_files"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    file_type = Column(String(50))  # 'logs', 'log_file', or 'screaming_frog'
    imported_at = Column(DateTime, default=datetime.utcnow)
    total_lines = Column(Integer, default=0)
    imported_lines = Column(Integer, default=0)
    skipped_duplicates = Column(Integer, default=0)
    skipped_filtered = Column(Integer, default=0)
    status = Column(String(20), default="completed")  # pending, importing, completed, error
    error_message = Column(Text, nullable=True)

    client = relationship("Client", back_populates="import_files")
    logs = relationship("Log", back_populates="import_file")
    screaming_frog_urls = relationship("ScreamingFrogUrl", back_populates="import_file")


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("import_files.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    ip = Column(String(50))
    url = Column(Text, nullable=False, index=True)
    http_code = Column(Integer, index=True)
    response_size = Column(Integer)
    user_agent = Column(Text)
    crawler = Column(String(100), index=True)       # Individual bot: "Googlebot", "GPTBot"
    bot_family = Column(String(100), index=True)     # Family: "Google", "OpenAI"
    response_time = Column(Integer)                  # Response time in microseconds
    log_date = Column(Date, index=True)
    page_type = Column(String(20), index=True)         # "page", "javascript", "css", "image", "font", "xml", "other"

    import_file = relationship("ImportFile", back_populates="logs")
    client = relationship("Client", back_populates="logs")

    __table_args__ = (
        Index("ix_logs_dedup", "client_id", "timestamp", "ip", "url"),
        Index("ix_logs_client_family", "client_id", "bot_family"),
        Index("ix_logs_client_crawler", "client_id", "crawler"),
        Index("ix_logs_client_date_family", "client_id", "log_date", "bot_family"),
        Index("ix_logs_client_date", "client_id", "log_date"),
        Index("ix_logs_client_url", "client_id", "url"),
        Index("ix_logs_client_http_code", "client_id", "http_code"),
        Index("ix_logs_client_page_type", "client_id", "page_type"),
    )


class ScreamingFrogUrl(Base):
    __tablename__ = "screaming_frog_urls"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("import_files.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    url = Column(Text, nullable=False, index=True)
    http_code = Column(Integer)
    indexability = Column(String(100))

    import_file = relationship("ImportFile", back_populates="screaming_frog_urls")
    client = relationship("Client", back_populates="screaming_frog_urls")
