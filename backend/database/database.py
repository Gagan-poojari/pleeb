"""
SQLAlchemy engine + session for SQLite.
The .db file is created automatically next to main.py.
"""

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Read the connection string from environment variables (set in production)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # If no URL is provided, default to the local SQLite database
    DB_PATH = Path(__file__).resolve().parent.parent / "pleeb.db"
    DATABASE_URL = f"sqlite:///{DB_PATH}"

# SQLite requires a special argument to work properly with FastAPI.
# PostgreSQL does not need this and will throw an error if we include it.
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Sometimes cloud providers use 'postgres://' instead of 'postgresql://', SQLAlchemy needs 'postgresql'
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    connect_args = {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()