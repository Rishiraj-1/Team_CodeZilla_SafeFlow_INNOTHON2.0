from sqlalchemy.orm import Session
from app.db import models
from app.schemas import zone as zone_schema

def get_zone(db: Session, zone_id: int):
    return db.query(models.Zone).filter(models.Zone.id == zone_id).first()

def get_zones(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Zone).offset(skip).limit(limit).all()

def create_zone(db: Session, zone: zone_schema.ZoneCreate):
    db_zone = models.Zone(**zone.dict())
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone

def update_zone(db: Session, zone_id: int, zone_update: zone_schema.ZoneUpdate):
    db_zone = get_zone(db, zone_id)
    if db_zone:
        update_data = zone_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_zone, key, value)
        db.commit()
        db.refresh(db_zone)
    return db_zone

def delete_zone(db: Session, zone_id: int):
    db_zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if db_zone:
        db.delete(db_zone)
        db.commit()
        return db_zone
    return None
