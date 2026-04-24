from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from sqlalchemy.orm import Session

from app.db.database import engine, Base, get_db, SessionLocal
from app.api import auth, cameras, logs, zones, stream
from app.core.config import settings
from app.core.dependencies import get_current_user, get_current_admin_user, get_current_active_user
from app.schemas import user as user_schema
from app.crud import user as crud_user
from app.services import live_status_manager
from app.crud import camera as crud_camera # for fetching all cameras
from app.api import diversions # Add this


# --- Initialize App & DB ---


app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static & Template Setup ---
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR.parent / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# --- Routers ---
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(cameras.router, prefix="/api/cameras", tags=["Cameras"])
app.include_router(logs.router, prefix="/api/logs", tags=["Detection Logs"])
app.include_router(zones.router, prefix="/api/zones", tags=["Zones"])
app.include_router(stream.router, prefix="/api/stream", tags=["Video Stream & Processing"])
app.include_router(diversions.router, prefix="/api/diversions", tags=["Diversions"])
# --- Startup Hook ---
@app.on_event("startup")
async def on_startup():
    create_db_and_tables()
    # Load initial camera configs into the live status manager
    db = SessionLocal()
    try:
        all_db_cameras = crud_camera.get_cameras(db, limit=1000) # Get all cameras
        live_status_manager.load_initial_camera_configs(all_db_cameras)
    finally:
        db.close()
    print("SafeFlow Application Started")
def create_db_and_tables():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin_user = crud_user.get_user_by_email(db, email="admin@example.com")
        if not admin_user:
            print("Creating default admin user: admin@example.com / adminpassword")
            admin_in = user_schema.UserCreate(
                email="admin@example.com",
                password="adminpassword",  # WARNING: change this in production
                role=user_schema.UserRole.ADMIN
            )
            crud_user.create_user(db, admin_in)
    finally:
        db.close()

# --- Entry Point for Local Dev ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
