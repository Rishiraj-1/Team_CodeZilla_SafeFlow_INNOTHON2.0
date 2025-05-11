from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any

from app.db import database, models # Ensure 'models' is used if CameraMode enum is needed here
from app.schemas import camera as camera_schema, user as user_schema
from app.crud import camera as crud_camera
from app.core.dependencies import get_current_admin_user, get_current_active_user
from app.core.config import settings # Added in case settings.DEFAULT_CAMERA_ID is used in schema defaults
from app.services import live_status_manager
from app.schemas.camera import Camera
router = APIRouter()
@router.get("/live_statuses/", response_model=dict[int, Any]) # Define a proper response model if needed
def get_all_statuses(current_user: user_schema.User = Depends(get_current_active_user)):
    return live_status_manager.get_all_live_statuses()

@router.post("/", response_model=camera_schema.Camera, status_code=status.HTTP_201_CREATED)
def create_camera_route(camera: camera_schema.CameraCreate, db: Session = Depends(database.get_db), current_user: user_schema.User = Depends(get_current_admin_user)): # Renamed to avoid conflict
    db_camera = crud_camera.create_camera(db=db, camera=camera)
    live_status_manager.update_camera_config(db_camera.id, db_camera) # Update manager
    return db_camera

@router.put("/{camera_id}", response_model=camera_schema.Camera)
def update_camera_route(camera_id: int, camera_update: camera_schema.CameraUpdate, db: Session = Depends(database.get_db), current_user: user_schema.User = Depends(get_current_admin_user)):
    db_camera = crud_camera.update_camera(db, camera_id=camera_id, camera_update=camera_update)
    if db_camera:
        live_status_manager.update_camera_config(db_camera.id, db_camera) # Update manager
    return db_camera

@router.delete("/{camera_id}", response_model=camera_schema.Camera)
def delete_camera_route(camera_id: int, db: Session = Depends(database.get_db), current_user: user_schema.User = Depends(get_current_admin_user)):
    deleted_camera = crud_camera.delete_camera(db, camera_id=camera_id)
    if deleted_camera:
        live_status_manager.remove_camera_config(camera_id) # Remove from manager
    return deleted_camera
@router.post("/", response_model=camera_schema.Camera, status_code=status.HTTP_201_CREATED)
def create_camera(
    camera: camera_schema.CameraCreate,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_active_user) # Admin only
):
    # You might want to check if a camera with the same name or source already exists
    return crud_camera.create_camera(db=db, camera=camera)

@router.get("/", response_model=List[camera_schema.Camera])
def read_cameras(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_active_user) # Any active user can see cameras
):
    cameras = crud_camera.get_cameras(db, skip=skip, limit=limit)
    return cameras

@router.get("/{camera_id}", response_model=camera_schema.Camera)
def read_camera(
    camera_id: int,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_active_user)
):
    db_camera = crud_camera.get_camera(db, camera_id=camera_id)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return db_camera

@router.put("/{camera_id}", response_model=camera_schema.Camera)
def update_camera_details(
    camera_id: int,
    camera_update: camera_schema.CameraUpdate,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_admin_user) # Admin only
):
    db_camera = crud_camera.update_camera(db, camera_id=camera_id, camera_update=camera_update)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return db_camera

@router.post("/{camera_id}/set_tripwire", response_model=camera_schema.Camera)
def set_tripwire_for_camera(
    camera_id: int,
    tripwire_coords: camera_schema.TripwireSetup,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_admin_user) # Or any user who can configure
):
    camera_update_data = camera_schema.CameraUpdate(
        tripwire_line_x1=tripwire_coords.x1,
        tripwire_line_y1=tripwire_coords.y1,
        tripwire_line_x2=tripwire_coords.x2,
        tripwire_line_y2=tripwire_coords.y2,
        mode=models.CameraMode.TRIPWIRE # Switch to tripwire mode when setting line
    )
    db_camera = crud_camera.update_camera(db, camera_id=camera_id, camera_update=camera_update_data)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return db_camera

@router.delete("/{camera_id}", response_model=camera_schema.Camera)
def delete_camera(
    camera_id: int,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_admin_user) # Admin only
):
    deleted_camera = crud_camera.delete_camera(db, camera_id=camera_id)
    if deleted_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return deleted_camera