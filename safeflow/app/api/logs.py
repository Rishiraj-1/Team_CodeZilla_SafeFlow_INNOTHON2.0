from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.db import database
from app.schemas import log as log_schema, user as user_schema
from app.crud import log as crud_log
from app.core.dependencies import get_current_active_user
from app.db import models as db_models
router = APIRouter()

@router.get("/", response_model=List[log_schema.DetectionLog]) 
def read_logs(
    skip: int = 0,
    limit: int = 100,
    area_name: Optional[str] = Query(None),
    start_date: Optional[datetime.date] = Query(None),
    end_date: Optional[datetime.date] = Query(None),
    order_by: Optional[str] = Query(None), # If you added sorting
    order_dir: Optional[str] = Query("desc"), # If you added sorting
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_active_user)
):
    # Fetch logs using your CRUD function
    if area_name or start_date or end_date or order_by:
        # Assuming get_logs_filtered now accepts order_by and order_dir
        db_logs_sqla = crud_log.get_logs_filtered(db, area_name=area_name, start_date=start_date, end_date=end_date, order_by=order_by, order_dir=order_dir, skip=skip, limit=limit)
    else:
        # Assuming get_logs now accepts order_by and order_dir
        db_logs_sqla = crud_log.get_logs(db, order_by=order_by, order_dir=order_dir, skip=skip, limit=limit)

    print(f"--- API /logs: Fetched {len(db_logs_sqla)} SQLAlchemy log objects from CRUD ---")
    problematic_logs_found = False
    for index, log_sqla_obj in enumerate(db_logs_sqla):
        if not isinstance(log_sqla_obj.camera_id, int) and log_sqla_obj.camera_id is not None: # Check for non-int but not None (unlikely)
             print(f"!!! API /logs: Log at index {index} has camera_id of type {type(log_sqla_obj.camera_id)} value {log_sqla_obj.camera_id}")
             problematic_logs_found = True
        elif log_sqla_obj.camera_id is None:
            print(f"!!! API /logs: Log at index {index} (ID: {log_sqla_obj.id}) has camera_id = None. Timestamp: {log_sqla_obj.timestamp}")
            problematic_logs_found = True
    
    if problematic_logs_found:
        print("!!! API /logs: Problematic logs (camera_id is None) found before Pydantic validation !!!")
        # For extreme debugging, you could filter them out here, but this hides the root cause:
        # db_logs_sqla = [log for log in db_logs_sqla if log.camera_id is not None]
        # print(f"--- API /logs: After filtering, returning {len(db_logs_sqla)} logs ---")


    # FastAPI will now take db_logs_sqla and try to validate each against log_schema.DetectionLog
    return db_logs_sqla

# Example for prediction support API - serving aggregated data could go here
# For now, just use the filtered logs.
@router.get("/prediction_data", response_model=List[log_schema.DetectionLog])
def get_prediction_input_data(
    area_name: Optional[str] = Query(None),
    start_date: Optional[datetime.date] = Query(None),
    end_date: Optional[datetime.date] = Query(None),
    db: Session = Depends(database.get_db),
    current_user: user_schema.User = Depends(get_current_active_user)
):
    # This could be enhanced to return aggregated counts per hour/day etc.
    logs = crud_log.get_logs_filtered(
        db,
        area_name=area_name,
        start_date=start_date,
        end_date=end_date,
        limit=10000  # Get more data for prediction
    )
    return logs
