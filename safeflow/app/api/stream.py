from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import cv2
import time
import asyncio
import numpy as np  # Needed for error frame generation

from app.db import database, models
from app.crud import camera as crud_camera, log as crud_log
from app.schemas import camera as camera_schema, log as log_schema, alert as alert_schema, user as user_schema
from app.services import video_processing, alert_service
from app.core.dependencies import get_current_active_user
from app.core.config import settings

router = APIRouter()

# In-memory store for last alert times per camera to avoid spamming
last_alert_times = {}
ALERT_COOLDOWN_SECONDS = 60  # Send alert at most once per minute per camera

async def generate_frames(camera_id: int, db: Session):
    db_camera = crud_camera.get_camera(db, camera_id)
    if not db_camera:
        print(f"Camera {camera_id} not found in DB for streaming.")
        return

    if not db_camera.is_active:
        print(f"Camera {camera_id} is not active.")
        return

    try:
        cam_source = int(db_camera.source)
    except ValueError:
        print(f"Invalid camera source for {db_camera.name}: {db_camera.source}. Assuming it's an IP stream URL.")
        cam_source = db_camera.source

    cap = cv2.VideoCapture(cam_source)
    if not cap.isOpened():
        print(f"Error: Could not open video source for camera ID {camera_id} (source: {cam_source})")
        error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(error_frame, f"Error: Cannot open camera {cam_source}", (50, 240),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        _, encoded_image = cv2.imencode('.jpg', error_frame)
        frame_bytes = encoded_image.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        cap.release()
        return

    frame_count = 0
    log_interval = 30

    while True:
        success, frame = cap.read()
        if not success:
            print(f"Failed to grab frame from camera ID {camera_id}")
            if isinstance(cam_source, int):
                cap.release()
                await asyncio.sleep(1)
                cap = cv2.VideoCapture(cam_source)
                if not cap.isOpened():
                    print(f"Failed to reopen camera ID {camera_id}. Stopping stream.")
                    break
                else:
                    print(f"Reopened camera ID {camera_id}.")
                    continue
            else:
                break

        frame_count += 1

        processed_frame, persons, density, entries, exits, alert, alert_msg, current_occupancy_live = \
            video_processing.process_frame(frame.copy(), db_camera, db_camera_obj=db_camera)

        if frame_count % log_interval == 0:
            log_entry = log_schema.DetectionLogCreate(
                camera_id=db_camera.id,
                area_name=db_camera.area_name,
                mode=db_camera.mode,
                person_count=persons,
                density=density,
                entry_count=entries,
                exit_count=exits
            )
            crud_log.create_log(db, log=log_entry)

            if db_camera.mode == models.CameraMode.TRIPWIRE:
                db.commit()

        if alert:
            current_time = time.time()
            last_alert = last_alert_times.get(db_camera.id, 0)
            if current_time - last_alert > ALERT_COOLDOWN_SECONDS:
                alert_data = alert_schema.AlertData(
                    camera_id=db_camera.id,
                    camera_name=db_camera.name,
                    area_name=db_camera.area_name,
                    mode=db_camera.mode,
                    message=alert_msg,
                    current_value=persons if db_camera.mode == models.CameraMode.GENERAL else current_occupancy_live,
                    threshold_value=db_camera.crowd_threshold if db_camera.mode == models.CameraMode.GENERAL else db_camera.occupancy_threshold
                )
                alert_service.trigger_alerts(alert_data)
                last_alert_times[db_camera.id] = current_time

        try:
            _, encoded_image = cv2.imencode('.jpg', processed_frame)
            frame_bytes = encoded_image.tobytes()
        except Exception as e:
            print(f"Error encoding frame: {e}")
            continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        await asyncio.sleep(0.03)

    cap.release()
    print(f"Released video capture for camera ID {camera_id}")


@router.get("/video_feed/{camera_id}")
async def video_feed(camera_id: int, db: Session = Depends(database.get_db)):
    # current_user: user_schema.User = Depends(get_current_active_user)
    db_camera = crud_camera.get_camera(db, camera_id)
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    if not db_camera.is_active:
        raise HTTPException(status_code=400, detail="Camera is not active")

    return StreamingResponse(generate_frames(camera_id, db),
                             media_type='multipart/x-mixed-replace; boundary=frame')
