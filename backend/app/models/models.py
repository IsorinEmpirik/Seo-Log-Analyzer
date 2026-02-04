from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    domain = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    import_files = relationship("ImportFile", back_populates="client")
    logs = relationship("Log", back_populates="client")
    screaming_frog_urls = relationship("ScreamingFrogUrl", back_populates="client")


class ImportFile(Base):
    __tablename__ = "import_files"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    file_type = Column(String(50))  # 'logs' or 'screaming_frog'
    imported_at = Column(DateTime, default=datetime.utcnow)

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
    crawler = Column(String(100), index=True)  # Googlebot, Bingbot, etc.
    log_date = Column(Date, index=True)

    import_file = relationship("ImportFile", back_populates="logs")
    client = relationship("Client", back_populates="logs")


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
