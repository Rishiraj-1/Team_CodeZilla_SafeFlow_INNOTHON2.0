# SafeFlow - Smart City Crowd Management System

SafeFlow is a real-time, local crowd monitoring system designed for smart city safety. It utilizes local webcam feeds, object detection (YOLOv8n), and various alert mechanisms to manage and monitor crowd density and movement. The system features an admin dashboard for managing cameras and users, different monitoring modes, data logging, and a map-based visualization of zones.

## Features

*   **Authentication System:**
    *   Login system with Admin and User roles (email & password).
    *   Admins can add/delete cameras and users.
*   **Live Camera Integration (Local Webcam):**
    *   Uses local webcam (default camera 0) for live video feed.
    *   YOLOv8n and OpenCV for real-time person detection and counting.
    *   **General Mode:**
        *   Define an area name for the camera.
        *   Counts people and calculates crowd density (people per square meter).
        *   Alerts when a configurable crowd count threshold is exceeded.
    *   **Tripwire Mode:**
        *   Allows drawing a virtual line on the video feed via an interactive tool.
        *   Counts people crossing the line in both directions.
        *   Shows real-time occupancy for defined closed areas.
        *   Alerts when occupancy exceeds a configurable threshold.
*   **Alert System:**
    *   Raises alerts when crowd count or occupancy exceeds thresholds.
    *   **Alert Channels:**
        *   On-screen visual alerts (color-coded indicators on the dashboard).
        *   Telegram bot notifications.
        *   Email alerts via Gmail SMTP.
*   **Data Storage (SQLite via SQLAlchemy):**
    *   Saves detection logs: timestamp, area name, camera ID, mode, person count, entry/exit counts, density.
*   **API Endpoints:**
    *   Exposes API for CRUD operations on users, cameras, zones.
    *   API for retrieving all detection logs with filtering by area or date.
    *   Endpoints to support future prediction modules.
    *   Serves live video streams (MJPEG).
*   **Zone Management (Admin):**
    *   Mark geographical areas on a map as:
        *   Overcrowded
        *   Lockdown
        *   Conflict/Damaged
        *   Safe zones (e.g., bunkers)
        *   Active Camera locations
*   **Frontend (Plain HTML, CSS, JavaScript):**
    *   **Login Page:** Basic login form.
    *   **Dashboard Page:**
        *   View multiple live webcam streams in a grid.
        *   Select cameras to add to the grid.
        *   Real-time display of person count/density or entry/exit/occupancy (for a focused camera).
        *   Visual alert indicators.
        *   Admin-only buttons: Add Camera, Manage Users, Manage Zones, Delete Camera, Setup Tripwire.
        *   Option to upload and process a video file for crowd analysis.
    *   **Tripwire Setup Page:** Interactive tool to draw a tripwire on a camera feed.
    *   **History Page:**
        *   Lists past detection logs from the database.
        *   Filter logs by area name and date range.
        *   Integrated Chart.js to visualize crowd trends for filtered areas.
    *   **Map Page (Leaflet.js + OpenStreetMap):**
        *   Displays markers for defined zones (overcrowded, lockdown, conflict, safe, active cameras).
        *   Option to find routes between plotted points using Leaflet Routing Machine (via OSRM).
        *   UI to trigger diversion suggestions from crowded cameras (requires backend logic for suggestion and OSRM call).
*   **Dark Mode Theme:** Cohesive dark theme implemented with plain CSS variables.

## Tech Stack

*   **Backend:**
    *   Python 3.10+
    *   FastAPI
    *   SQLAlchemy (for SQLite ORM)
    *   SQLite (as the database)
    *   OpenCV (cv2)
    *   YOLOv8n (via `ultralytics` package)
    *   `smtplib` (for email alerts)
    *   `python-telegram-bot` (or `pyTelegramBotAPI` for Telegram alerts)
    *   Uvicorn (ASGI server)
*   **Frontend:**
    *   HTML5
    *   CSS3 (Plain CSS with variables for theming)
    *   JavaScript (Vanilla JS, no frameworks)
    *   Leaflet.js (for interactive maps)
    *   OpenStreetMap (as the map tile provider)
    *   Chart.js (for data visualization on the history page)
    *   Leaflet Routing Machine (for displaying routes on the map)

## Project Structure
safeflow/
├── app/
│ ├── init.py
│ ├── main.py # FastAPI app initialization, routes for HTML pages
│ ├── api/ # API endpoint routers (auth, cameras, logs, etc.)
│ ├── core/ # Core logic (config, security, dependencies)
│ ├── crud/ # CRUD operations for database models
│ ├── db/ # Database setup (SQLAlchemy models, session)
│ ├── services/ # Business logic (video processing, alerts, live status)
│ ├── schemas/ # Pydantic schemas for data validation & serialization
│ └── templates/ # Jinja2 HTML templates
├── static/
│ ├── css/style.css # Main stylesheet
│ ├── js/ # JavaScript files for each page
│ └── icons/ # Placeholder for custom map icons (e.g., camera-icon.png)
├── uploaded_videos/ # Directory for temporarily storing uploaded videos (if feature enabled)
├── processed_videos/ # Directory for storing processed video outputs (if feature enabled)
├── .env # Environment variables (DATABASE_URL, API keys, etc.)
├── requirements.txt # Python dependencies
└── safeflow.db # SQLite database file (created on first run)
└── yolov8n.pt # YOLO model weights (downloaded on first run if not present)
└── README.md # This file


## Setup and Installation

**Prerequisites:**
*   Python 3.10 or newer
*   `pip` (Python package installer)
*   A local webcam accessible as camera 0 (or modify `DEFAULT_CAMERA_ID` in `.env`).

**Steps:**

1.  **Clone/Download the Project:**
    If this were on a repository:
    ```bash
    git clone <repository_url>
    cd safeflow
    ```
    Otherwise, ensure you have all the project files in a directory named `safeflow`.

2.  **Create a Virtual Environment (Recommended):**
    ```bash
    python -m venv venv
    # On Windows
    venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *Note: The `ultralytics` package will download YOLOv8 model weights (`yolov8n.pt`) on its first use if not already present in the project root.*

4.  **Create and Configure `.env` File:**
    *   In the root of the `safeflow` project directory, create a file named `.env`.
    *   Copy the content from the example below and **fill in your actual credentials and preferences**:

    ```env
    DATABASE_URL=sqlite:///./safeflow.db
    SECRET_KEY=YOUR_VERY_STRONG_RANDOM_SECRET_KEY_FOR_JWT # Generate one (e.g., openssl rand -hex 32)
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=1440 # 24 hours for easier testing, reduce for production

    # Email Alerts (Gmail SMTP - Use App Password if 2FA is enabled)
    SMTP_SERVER=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USERNAME=your_gmail_address@gmail.com
    SMTP_PASSWORD=your_gmail_app_password # From Google Account App Passwords
    ALERT_EMAIL_RECEIVER=receiver_email@example.com # Who gets the email alerts

    # Telegram Alerts
    TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN # From Telegram BotFather
    TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID # Your user ID or a group ID

    # YOLO model - yolov8n.pt will be downloaded automatically to project root if not found
    # YOLO_MODEL_PATH=yolov8n.pt

    # Default values for Camera Model and Video Processing
    DEFAULT_AREA_SQ_METERS=20
    DEFAULT_CAMERA_ID=0 # Default webcam index
    ```

5.  **Create Necessary Directories (if not auto-created by app):**
    Although the application might create these, it's good to be aware:
    ```bash
    mkdir uploaded_videos
    mkdir processed_videos
    mkdir static/icons
    ```
    Place any custom icons like `camera-icon.png`, `camera-crowded-icon.png`, `default-marker.png` into `static/icons/`.

## Running the Application

1.  **Ensure your virtual environment is activated.**
2.  **Navigate to the project root directory (`safeflow/`).**
3.  **Run the Uvicorn server:**
    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
    *   `--reload`: Enables auto-reloading when code changes (for development).
    *   `--host 0.0.0.0`: Makes the server accessible on your local network (your machine's IP address).
    *   `--port 8000`: Runs the server on port 8000.

4.  **Access the Application:**
    Open your web browser and go to: `http://localhost:8000` or `http://<your_machine_ip>:8000`.

5.  **Default Admin User:**
    On the first run, if no users exist in the database, a default admin user will be created:
    *   **Email:** `admin@example.com`
    *   **Password:** `adminpassword`
    It is highly recommended to log in with this user and change the password or create a new admin user and delete this default one.

## Usage

*   **Login:** Access the system using your credentials.
*   **Dashboard (Admin):**
    *   **Add Camera:** Define new camera sources (use `0` for the default webcam, or provide an IP camera stream URL), set area names, modes, and thresholds. Add latitude/longitude for map display.
    *   **Manage Users:** Add new users or delete existing ones.
    *   **Manage Zones:** Define geographical zones on the map with types (Overcrowded, Safe, etc.) and descriptions.
    *   **Add to Grid:** Select cameras from the "Add Camera to Grid" dropdown to view multiple live feeds.
    *   **Delete Focused Camera:** If a camera is "focused" in the grid (by clicking on it), an admin can delete it.
    *   **Setup Tripwire:** If a "tripwire" mode camera is focused in the grid, an admin can click to go to the tripwire drawing page for that camera.
    *   **Process Video File:** Upload a video file for crowd analysis.
*   **Dashboard (User):**
    *   View live camera feeds added to the grid.
    *   "Add Camera" button is visible, but actual camera creation permission is controlled by the backend (default: admin-only).
*   **History Page:**
    *   View a table of past detection logs.
    *   Filter logs by area name and date.
    *   View a Chart.js graph showing person count trends for the filtered area.
*   **Map Page:**
    *   View zones and camera locations.
    *   Use dropdowns to select start/end points (from available cameras, zones, POIs) and click "Find Route" to see a route drawn by Leaflet Routing Machine (using public OSRM).
    *   Click on a camera marker's popup "Suggest Diversion" button (admin only) to trigger a backend call that (if implemented) calculates and displays a diversion route from a crowded camera to a less crowded one.
*   **Tripwire Setup Page (Admin):**
    *   Accessed via the dashboard for a specific camera.
    *   Interactively draw a line on the video feed to define the tripwire.
    *   Save the line coordinates.

## Troubleshooting Common Issues

*   **CSS Not Applying / UI Looks Bad:**
    *   Ensure `style.css` is correctly linked in `base.html`.
    *   Perform a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) and clear browser cache.
    *   Check the browser's Network tab to ensure `style.css` is loading with a `200 OK` status and `Content-Type: text/css`.
    *   Verify CSS selectors match HTML element IDs/classes.
*   **JavaScript Errors / Buttons Not Working:**
    *   Open the browser's Developer Console (F12) for error messages.
    *   Ensure all element IDs in HTML templates match those used in `document.getElementById()` calls in the JS files.
    *   Verify that all JS files (`common.js`, `dashboard.js`, etc.) are loading correctly (Network tab).
*   **"Module Not Found" (Python):** Make sure you have installed all dependencies from `requirements.txt` in your active virtual environment.
*   **Database Errors (SQLAlchemy / SQLite):**
    *   If you make changes to SQLAlchemy models (`app/db/models.py`), you may need to delete the `safeflow.db` file and restart the server to let it recreate the database with the new schema (you will lose existing data). For production, use database migration tools like Alembic.
*   **Video Stream Not Showing:**
    *   Ensure your webcam is connected and accessible as camera index `0` (or the index you specified for the camera source).
    *   Check the Uvicorn server console for errors from OpenCV (`cv2.VideoCapture()`) when a stream is requested.
    *   If using an IP camera, ensure the URL is correct and the camera is reachable from the machine running the server.
*   **YOLO Model Download Issues:** The `ultralytics` library should download `yolov8n.pt` automatically. If it fails, check your internet connection. You can also manually download it and place it in the project root.

## Future Enhancements (Potential)

*   Support for multiple IP cameras.
*   Advanced prediction modules for crowd behavior.
*   User-specific camera assignments and permissions.
*   More sophisticated UI/UX with a frontend framework.
*   Database migrations (e.g., using Alembic).
*   Containerization with Docker for easier deployment.
*   More robust error handling and logging.
*   Implementing the backend for the OSRM routing calls in the diversion suggestion.
*   Notifications for when a camera goes offline.

---