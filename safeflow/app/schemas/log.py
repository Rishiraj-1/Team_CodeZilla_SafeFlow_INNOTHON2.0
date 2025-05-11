from pydantic import BaseModel
import datetime
from app.db.models import CameraMode
from typing import Optional


class DetectionLogBase(BaseModel):
    camera_id: int # Stays as int, expecting a value
    area_name: str
    mode: CameraMode # This is your enum
    person_count: int = 0 # Provide defaults if schema allows fewer fields than model
    density: float = 0.0
    entry_count: int = 0
    exit_count: int = 0


class DetectionLogCreate(DetectionLogBase):
    pass


class DetectionLog(DetectionLogBase):
    id: int
    timestamp: datetime.datetime

    class Config:
        from_attributes = True 
