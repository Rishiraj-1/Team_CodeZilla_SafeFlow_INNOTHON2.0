from pydantic import BaseModel
from typing import Optional
from app.db.models import CameraMode
from app.core.config import settings  # Assuming you're using settings.DEFAULT_CAMERA_ID
import datetime
class CameraBase(BaseModel):
    name: str
    area_name: str
    mode: CameraMode = CameraMode.GENERAL
    crowd_threshold: Optional[int] = 10
    area_sq_meters: Optional[float] = 20.0
    occupancy_threshold: Optional[int] = 5
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = True
    last_person_count: Optional[int] = None
    last_density: Optional[float] = None
    last_status_update_time: Optional[datetime.datetime] = None
    is_over_threshold: Optional[bool] = False

class CameraCreate(CameraBase):
    source: Optional[str] = f"{settings.DEFAULT_CAMERA_ID}"  # Default to webcam 0

class CameraUpdate(CameraBase):
    name: Optional[str] = None
    area_name: Optional[str] = None
    mode: Optional[CameraMode] = None
    crowd_threshold: Optional[int] = None
    area_sq_meters: Optional[float] = None
    occupancy_threshold: Optional[int] = None
    is_active: Optional[bool] = None
    last_person_count: Optional[int] = None
    last_density: Optional[float] = None
    last_status_update_time: Optional[datetime.datetime] = None
    is_over_threshold: Optional[bool] = False
    tripwire_line_x1: Optional[int] = None
    tripwire_line_y1: Optional[int] = None
    tripwire_line_x2: Optional[int] = None
    tripwire_line_y2: Optional[int] = None

class Camera(CameraBase):
    id: int
    source: str
    current_occupancy: int
    tripwire_line_x1: Optional[int]
    tripwire_line_y1: Optional[int]
    tripwire_line_x2: Optional[int]
    tripwire_line_y2: Optional[int]

    class Config:
        from_attributes = True

class TripwireSetup(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int
