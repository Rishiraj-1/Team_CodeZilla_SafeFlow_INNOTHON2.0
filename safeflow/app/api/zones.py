from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db import database
from app.schemas import zone as zone_schema, user as user_schema
from app.crud import zone as crud_zone
from app.core.dependencies import get_current_admin_user, get_current_active_user

router = APIRouter()


@router.post("/", response_model=zone_schema.Zone, status_code=status.HTTP_201_CREATED)
def create_zone(
    zone: zone_schema.ZoneCreate,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_admin_user)  # Admin only
):
    return crud_zone.create_zone(db=db, zone=zone)


@router.get("/", response_model=List[zone_schema.Zone])
def read_zones(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_active_user)  # Any active user
):
    zones = crud_zone.get_zones(db, skip=skip, limit=limit)
    return zones


@router.get("/{zone_id}", response_model=zone_schema.Zone)
def read_zone(
    zone_id: int,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_active_user)
):
    db_zone = crud_zone.get_zone(db, zone_id=zone_id)
    if db_zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    return db_zone


@router.put("/{zone_id}", response_model=zone_schema.Zone)
def update_zone_details(
    zone_id: int,
    zone_update: zone_schema.ZoneUpdate,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_admin_user)  # Admin only
):
    db_zone = crud_zone.update_zone(db, zone_id=zone_id, zone_update=zone_update)
    if db_zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    return db_zone


@router.delete("/{zone_id}", response_model=zone_schema.Zone)
def delete_zone(
    zone_id: int,
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_admin_user)  # Admin only
):
    deleted_zone = crud_zone.delete_zone(db, zone_id=zone_id)
    if deleted_zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    return deleted_zone
