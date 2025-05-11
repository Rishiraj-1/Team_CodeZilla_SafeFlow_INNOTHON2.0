from sqlalchemy.orm import Session
from app.db import models
from app.schemas import camera as camera_schema

def get_camera(db: Session, camera_id: int):
    return db.query(models.Camera).filter(models.Camera.id == camera_id).first()

def get_cameras(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Camera).offset(skip).limit(limit).all()

def create_camera(db: Session, camera: camera_schema.CameraCreate):
    db_camera = models.Camera(**camera.dict())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

def update_camera(db: Session, camera_id: int, camera_update: camera_schema.CameraUpdate):
    db_camera = get_camera(db, camera_id)
    if db_camera:
        update_data = camera_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_camera, key, value)
        db.commit()
        db.refresh(db_camera)
    return db_camera

def update_camera_occupancy(db: Session, camera_id: int, new_occupancy: int):
    db_camera = get_camera(db, camera_id)
    if db_camera:
        db_camera.current_occupancy = new_occupancy
        db.commit()
        db.refresh(db_camera)
    return db_camera

def delete_camera(db: Session, camera_id: int):
    db_camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if db_camera:
        db.delete(db_camera)
        db.commit()
        return db_camera
    return None
