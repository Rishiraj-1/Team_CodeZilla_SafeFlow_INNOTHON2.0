from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db import models
from app.schemas import log as log_schema
import datetime
from sqlalchemy import asc # Add asc import
from typing import Optional # Make sure Optional is imported
from pydantic import BaseModel # Import BaseModel from pydantic

class DetectionLogBase(BaseModel):
    camera_id: Optional[int] = None # Allow None
    area_name: str
    mode: str  # Changed to str, or replace with the correct type if CameraMode is defined elsewhere
    person_count: Optional[int] = 0
    density: Optional[float] = 0.0
    entry_count: Optional[int] = 0
    exit_count: Optional[int] = 0

class DetectionLog(DetectionLogBase):
    id: int
    timestamp: datetime.datetime

    class Config:
        from_attributes = True
def create_log(db: Session, log: log_schema.DetectionLogCreate):
    db_log = models.DetectionLog(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.DetectionLog).order_by(desc(models.DetectionLog.timestamp)).offset(skip).limit(limit).all()

def get_logs_filtered(db: Session, area_name: str = None, start_date: datetime.date = None, end_date: datetime.date = None, order_by: str = None, order_dir: str = "desc", skip: int = 0, limit: int = 100):
    query = db.query(models.DetectionLog)
    if area_name:
        query = query.filter(models.DetectionLog.area_name == area_name)
    if start_date:
        query = query.filter(models.DetectionLog.timestamp >= datetime.datetime.combine(start_date, datetime.time.min))
    if end_date:
        # Add 1 day to end_date to include the whole day
        query = query.filter(models.DetectionLog.timestamp < datetime.datetime.combine(end_date + datetime.timedelta(days=1), datetime.time.min))
    if order_by and hasattr(models.DetectionLog, order_by):
        column_to_order = getattr(models.DetectionLog, order_by)
        if order_dir == "asc":
            query = query.order_by(asc(column_to_order))
        else:
            query = query.order_by(desc(column_to_order)) # Default is already desc(timestamp)
    else:
            query = query.order_by(desc(models.DetectionLog.timestamp)) # Default sort

    return query.offset(skip).limit(limit).all()
