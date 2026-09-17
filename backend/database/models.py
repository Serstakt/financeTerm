from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime
from .database import Base


class NewsCache(Base):
    __tablename__ = "news_cache"

    ticker = Column(String, primary_key=True, index=True)
    news_data = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
