from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Float, Enum as SAEnum
from sqlalchemy.orm import relationship
from .database import Base
import datetime
import enum
from app.core.config import settings

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"

class CameraMode(str, enum.Enum):
    GENERAL = "general"
    TRIPWIRE = "tripwire"

class ZoneType(str, enum.Enum):
    OVERCROWDED = "overcrowded"
    LOCKDOWN = "lockdown"
    CONFLICT = "conflict" # missile hit, damaged
    SAFE = "safe" # bunkers
    CAMERA_ACTIVE = "camera_active" # For showing active camera locations

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)

    cameras_owned = relationship("Camera", back_populates="owner") # If you want to assign cameras to users

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    source = Column(String, default=f"{settings.DEFAULT_CAMERA_ID}") # e.g., "0" for webcam, or IP
    area_name = Column(String, index=True, nullable=False)
    mode = Column(SAEnum(CameraMode), default=CameraMode.GENERAL, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    last_person_count = Column(Integer, nullable=True)
    last_density = Column(Float, nullable=True)
    last_status_update_time = Column(DateTime, nullable=True)
    is_over_threshold = Column(Boolean, default=False, nullable=True)
    
    # General Mode
    crowd_threshold = Column(Integer, default=10)
    area_sq_meters = Column(Float, default=settings.DEFAULT_AREA_SQ_METERS) # For density calculation

    # Tripwire Mode
    occupancy_threshold = Column(Integer, default=5)
    current_occupancy = Column(Integer, default=0) # Live occupancy for closed areas
    tripwire_line_x1 = Column(Integer, nullable=True)
    tripwire_line_y1 = Column(Integer, nullable=True)
    tripwire_line_x2 = Column(Integer, nullable=True)
    tripwire_line_y2 = Column(Integer, nullable=True)
    
    is_active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Optional: if cameras are user-specific

    owner = relationship("User", back_populates="cameras_owned")
    logs = relationship("DetectionLog", back_populates="camera", cascade="all, delete-orphan")


class DetectionLog(Base):
    __tablename__ = "detection_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False) # ENSURE THIS IS nullable=False
    area_name = Column(String, index=True, nullable=False)
    mode = Column(SAEnum(CameraMode), nullable=False) # ENSURE THIS IS nullable=False
    person_count = Column(Integer, default=0, nullable=False)
    density = Column(Float, default=0.0, nullable=False)
    entry_count = Column(Integer, default=0, nullable=False)
    exit_count = Column(Integer, default=0, nullable=False)
    camera = relationship("Camera", back_populates="logs")
class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    type = Column(SAEnum(ZoneType), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius = Column(Float, nullable=True) # For circular zones
    description = Column(String, nullable=True)