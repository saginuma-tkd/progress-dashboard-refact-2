import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

database_url = settings.DATABASE_URL
if database_url.startswith("sqlite:///./"):
    # backend/app/db/database.py から backend ディレクトリの絶対パスを取得
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_file = database_url.replace("sqlite:///./", "")
    database_url = f"sqlite:///{os.path.join(base_dir, db_file)}"

# Using synchronous engine for compatibility with existing sync logic if needed,
# and simplicity with psycopg2
engine = create_engine(database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
