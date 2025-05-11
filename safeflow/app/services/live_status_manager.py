# app/services/live_status_manager.py
import datetime
from typing import Dict, Any, Optional

# In-memory store for live camera statuses
# Structure: { camera_id: {"person_count": X, "density": Y, "timestamp": Z, "is_over_threshold": Bool, "name": "CamName", "lat": ..., "lon": ...} }
_live_camera_statuses: Dict[int, Dict[str, Any]] = {}
_camera_configs: Dict[int, Any] = {} # To store camera thresholds etc.

def update_camera_config(camera_id: int, config_data: Any): # config_data could be a Pydantic model or dict
    _camera_configs[camera_id] = {
        "crowd_threshold": config_data.crowd_threshold,
        "occupancy_threshold": config_data.occupancy_threshold, # If applicable
        "name": config_data.name,
        "area_name": config_data.area_name,
        "latitude": config_data.latitude,
        "longitude": config_data.longitude,
        "mode": config_data.mode.value if hasattr(config_data.mode, 'value') else config_data.mode,
        "is_active": config_data.is_active
    }
    # Initialize status if not present
    if camera_id not in _live_camera_statuses:
        _live_camera_statuses[camera_id] = {
            "person_count": 0, "density": 0.0, "current_occupancy": 0,
            "timestamp": datetime.datetime.utcnow(), "is_over_threshold": False,
            **_camera_configs[camera_id] # Add config details directly to status for easy access
        }


def remove_camera_config(camera_id: int):
    if camera_id in _camera_configs:
        del _camera_configs[camera_id]
    if camera_id in _live_camera_statuses:
        del _live_camera_statuses[camera_id]

def update_live_status(camera_id: int, person_count: int, density: float, current_occupancy: int = 0):
    if camera_id not in _camera_configs or not _camera_configs[camera_id]["is_active"]:
        return # Don't update status for unknown or inactive cameras

    config = _camera_configs[camera_id]
    is_over = False
    if config["mode"] == "general" and person_count > config["crowd_threshold"]:
        is_over = True
    elif config["mode"] == "tripwire" and current_occupancy > config["occupancy_threshold"]:
        is_over = True

    _live_camera_statuses[camera_id] = {
        "person_count": person_count,
        "density": density,
        "current_occupancy": current_occupancy,
        "timestamp": datetime.datetime.utcnow(),
        "is_over_threshold": is_over,
        **config # Include config details
    }
    # print(f"Updated live status for Cam ID {camera_id}: {person_count} persons, OverThreshold: {is_over}")


def get_all_live_statuses() -> Dict[int, Dict[str, Any]]:
    # Return a copy to prevent direct modification
    active_statuses = {
        cam_id: status for cam_id, status in _live_camera_statuses.items()
        if cam_id in _camera_configs and _camera_configs[cam_id]["is_active"]
    }
    return active_statuses

def get_live_status(camera_id: int) -> Optional[Dict[str, Any]]:
    if camera_id in _camera_configs and _camera_configs[camera_id]["is_active"]:
        return _live_camera_statuses.get(camera_id)
    return None

# Load initial camera configs when the app starts or when cameras are fetched
# This needs to be called from main.py or when cameras are created/updated/deleted
def load_initial_camera_configs(db_cameras: list): # pass list of Camera SQLAlchemy objects
    print(f"Loading initial camera configs for {len(db_cameras)} cameras...")
    for cam in db_cameras:
        if cam.is_active: # Only consider active cameras
             update_camera_config(cam.id, cam) # cam object should have needed attributes
    print("Live status manager initialized with camera configs.")