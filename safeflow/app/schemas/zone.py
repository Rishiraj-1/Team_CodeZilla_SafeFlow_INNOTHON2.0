from pydantic import BaseModel
from app.db.models import ZoneType
from typing import Optional

class ZoneBase(BaseModel):
    name: str
    type: ZoneType
    latitude: float
    longitude: float
    radius: Optional[float] = None
    description: Optional[str] = None

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(ZoneBase):
    name: Optional[str] = None
    type: Optional[ZoneType] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius: Optional[float] = None
    description: Optional[str] = None

class Zone(ZoneBase):
    id: int

    class Config:
        from_attributes = True
