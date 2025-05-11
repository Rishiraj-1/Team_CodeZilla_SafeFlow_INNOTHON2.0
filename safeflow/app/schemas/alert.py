from pydantic import BaseModel
from app.db.models import CameraMode

class AlertData(BaseModel):
    camera_id: int
    camera_name: str
    area_name: str
    mode: CameraMode
    message: str
    current_value: float  # or int
    threshold_value: float  # or int
