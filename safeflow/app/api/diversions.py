from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import math
import requests # For OSRM if you use it

from app.db.database import get_db
from app.schemas import user as user_schema # For auth
# from app.schemas.diversion import DiversionSuggestionResponse # Define this Pydantic model
from app.core.dependencies import get_current_active_user
from app.services import live_status_manager # Your live status manager
# from app.crud import camera as crud_camera # If you need to fetch from DB too

router = APIRouter()

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Radius of Earth in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    a = math.sin(dLat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dLon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c # Distance in km

class DiversionSuggestionResponse(BaseModel): # Example schema
    crowded_camera: Dict[str, Any]
    target_camera: Optional[Dict[str, Any]] = None
    route_geojson: Optional[Dict[str, Any]] = None # GeoJSON LineString
    message: str

OSRM_ROUTE_URL = "http://router.project-osrm.org/route/v1/driving/" # Public demo server

@router.post("/suggest_diversion/", response_model=DiversionSuggestionResponse)
async def suggest_diversion_route(
    crowded_camera_id: int, # Pass as body or query param
    db: Session = Depends(get_db),
    current_user: user_schema.User = Depends(get_current_active_user)
):
    all_statuses = live_status_manager.get_all_live_statuses()
    crowded_cam_status = all_statuses.get(crowded_camera_id)

    if not crowded_cam_status or not crowded_cam_status.get("is_active"):
        raise HTTPException(status_code=404, detail="Crowded camera not found or inactive.")
    
    # Ensure it's actually over threshold (or allow override for manual trigger)
    # if not crowded_cam_status.get("is_over_threshold"):
    #     return DiversionSuggestionResponse(crowded_camera=crowded_cam_status, message="Selected camera is not currently over threshold.")


    candidate_targets = []
    for cam_id, status in all_statuses.items():
        if cam_id == crowded_camera_id or not status.get("is_active") or status.get("is_over_threshold"):
            continue # Skip self, inactive, or already crowded cameras

        if status.get("latitude") is None or status.get("longitude") is None:
            continue # Skip cameras without location

        distance = haversine(
            crowded_cam_status["latitude"], crowded_cam_status["longitude"],
            status["latitude"], status["longitude"]
        )
        
        # Simple scoring: lower distance is better, more capacity is better
        # Capacity score: (threshold - current_count) / threshold (normalized)
        # Distance score: 1 / (1 + distance) (normalized, smaller distance -> higher score)
        
        # For simplicity: just find closest non-crowded for now
        candidate_targets.append({"id": cam_id, **status, "distance": distance})

    if not candidate_targets:
        return DiversionSuggestionResponse(crowded_camera=crowded_cam_status, message="No suitable alternative cameras found nearby or all are crowded.")

    # Sort by distance to find the closest
    candidate_targets.sort(key=lambda x: x["distance"])
    best_target_cam = candidate_targets[0]

    # Get route using OSRM
    route_geojson = None
    try:
        start_coords = f"{crowded_cam_status['longitude']},{crowded_cam_status['latitude']}"
        end_coords = f"{best_target_cam['longitude']},{best_target_cam['latitude']}"
        osrm_request_url = f"{OSRM_ROUTE_URL}{start_coords};{end_coords}?overview=full&geometries=geojson&steps=true"
        print(f"OSRM Request URL: {osrm_request_url}")
        osrm_response = requests.get(osrm_request_url, timeout=10)
        osrm_response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        route_data = osrm_response.json()
        if route_data.get("routes") and len(route_data["routes"]) > 0:
            route_geometry = route_data["routes"][0]["geometry"] # This is a GeoJSON LineString
            # OSRM also returns 'legs' and 'steps' for turn-by-turn if steps=true
            route_geojson = route_geometry
        else:
            print(f"OSRM found no route: {route_data.get('code')}")
    except requests.RequestException as e:
        print(f"OSRM request failed: {e}")
    except Exception as e:
        print(f"Error processing OSRM response: {e}")


    return DiversionSuggestionResponse(
        crowded_camera=crowded_cam_status,
        target_camera=best_target_cam,
        route_geojson=route_geojson,
        message=f"Divert from {crowded_cam_status['name']} towards {best_target_cam['name']}."
    )