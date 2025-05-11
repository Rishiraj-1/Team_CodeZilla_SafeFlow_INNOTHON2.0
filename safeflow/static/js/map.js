// static/js/map.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Map page DOMContentLoaded. Starting auth check...");
    try {
        const authResponse = await fetchWithAuth(`${API_BASE_URL}/auth/users/me`);
        if (!authResponse.ok) {
            console.error("Map page auth check failed. Status:", authResponse.status);
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
            throw new Error('Not authenticated for map, redirecting to login.');
        }
        const user = await authResponse.json();
        console.log("User authenticated for map page:", user.email);
        initializeMap(user); // Pass user if needed for any map logic
    } catch (error) {
        console.error("Map page initialization error:", error.message);
        if (!getToken() && window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
        }
    }
});

function initializeMap(loggedInUser) {
    console.log("Initializing Leaflet map for Indore...");

    const indoreLat = 22.7196;
    const indoreLng = 75.8577;
    const initialZoomLevel = 12;

    const map = L.map('map').setView([indoreLat, indoreLng], initialZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Layer Groups
    const zoneLayerGroup = L.layerGroup().addTo(map);
    const cameraLayerGroup = L.layerGroup().addTo(map);
    const poiLayerGroup = L.layerGroup().addTo(map);
    const pathLayerGroup = L.layerGroup().addTo(map); // For conceptual alternate paths from zones
    let diversionRouteLayer = null; // To store the OSRM route layer

    // UI Elements
    const pathInstructionsUl = document.getElementById('pathInstructions');
    const alternatePathsDiv = document.getElementById('alternatePaths');
    const routeStartSelect = document.getElementById('routeStartSelect');
    const routeEndSelect = document.getElementById('routeEndSelect');
    const findRouteButton = document.getElementById('findRouteButton');

    let allPlottablePoints = []; // Stores {id, name, lat, lon, type} for routing dropdowns & live status
    let cameraMarkers = {}; // Stores { cameraId: leafletMarker } for easy update

    // --- Icon Definitions ---
    const cameraIconDefault = L.icon({
        iconUrl: '/static/icons/camera-icon.png',
        iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -30]
    });
    const cameraIconCrowded = L.icon({
        iconUrl: '/static/icons/camera-crowded-icon.png', // You need to create this
        iconSize: [35, 35], iconAnchor: [17, 35], popupAnchor: [0, -33] // Slightly larger
    });
    const defaultPOIIcon = L.icon({
        iconUrl: '/static/icons/default-marker.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
    });

    // --- Styling Function for Zones ---
    function getZoneStyle(zoneType) { /* ... (same as your existing good version) ... */ 
        let style = { color: 'grey', fillColor: 'grey', weight: 2, opacity: 1, fillOpacity: 0.5, radius: 8 };
        switch (zoneType) {
            case 'camera_active': style = { ...style, color: 'blue', fillColor: 'blue', fillOpacity: 0.3, radius: 6 }; break;
            case 'overcrowded': style = { ...style, color: 'red', fillColor: 'red' }; break;
            case 'lockdown': style = { ...style, color: 'orange', fillColor: 'orange' }; break;
            case 'conflict': style = { ...style, color: 'black', fillColor: 'black' }; break;
            case 'safe': style = { ...style, color: 'green', fillColor: 'green' }; break;
        }
        return style;
    }

    // --- Data Loading Functions ---
    async function loadZonesData() {
        console.log("Loading zones for map...");
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/zones/`);
            if (!response.ok) throw new Error('Failed to fetch zones');
            const zones = await response.json();
            zoneLayerGroup.clearLayers(); // Clear previous zones
            zones.forEach(zone => {
                const style = getZoneStyle(zone.type);
                let marker;
                if (zone.radius && zone.radius > 0) {
                    marker = L.circle([zone.latitude, zone.longitude], { ...style, radius: zone.radius });
                } else {
                    marker = L.circleMarker([zone.latitude, zone.longitude], style);
                }
                marker.bindPopup(`<b>${zone.name}</b><br>Type: ${zone.type}${zone.description ? '<br>' + zone.description : ''}`);
                marker.addTo(zoneLayerGroup);
                allPlottablePoints.push({ id: `zone-${zone.id}`, name: `Zone: ${zone.name}`, lat: zone.latitude, lon: zone.longitude, type: 'zone' });
            });
            console.log("Zones loaded and displayed:", zones.length);
        } catch (error) { console.error("Error loading zones:", error); }
    }

    async function loadCamerasData() {
        console.log("Loading camera locations for map...");
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/cameras/`);
            if (!response.ok) throw new Error('Failed to fetch cameras');
            const cameras = await response.json();
            cameraLayerGroup.clearLayers(); // Clear previous cameras
            cameraMarkers = {}; // Reset camera markers object

            cameras.forEach(camera => {
                if (camera.latitude != null && camera.longitude != null && camera.is_active) {
                    const marker = L.marker([camera.latitude, camera.longitude], { icon: cameraIconDefault })
                        .addTo(cameraLayerGroup);
                    // Store original camera data with marker for popup updates
                    marker.customData = camera; 
                    // Initial popup content
                    let popupContent = `<b>Cam: ${camera.name}</b><br>Area: ${camera.area_name}<br>Mode: ${camera.mode}`;
                    if (isAdmin()) { // Only add button for admins
                        popupContent += `<br><button class="suggest-diversion-btn" data-cameraid="${camera.id}" style="margin-top:5px; padding: 3px 6px; font-size:0.8em;">Suggest Diversion</button>`;
                    }
                    marker.bindPopup(popupContent);
                    
                    allPlottablePoints.push({ id: camera.id, name: `Cam: ${camera.name}`, lat: camera.latitude, lon: camera.longitude, type: 'camera' });
                    cameraMarkers[camera.id] = marker; // Store marker for live updates
                }
            });
            console.log("Cameras loaded and displayed:", Object.keys(cameraMarkers).length);
        } catch (error) { console.error("Error loading cameras for map:", error); }
    }

    function displayPOIsData() {
        console.log("Displaying hardcoded POIs...");
        const indorePOIs = [
            { name: "Rajwada Palace", lat: 22.7175, lon: 75.8555, description: "Historic palace." },
            { name: "Khajrana Ganesh Temple", lat: 22.7400, lon: 75.9070, description: "Famous temple." }
        ];
        poiLayerGroup.clearLayers(); // Clear previous POIs
        indorePOIs.forEach(poi => {
            const marker = L.marker([poi.lat, poi.lon], { icon: defaultPOIIcon }).addTo(poiLayerGroup);
            marker.bindPopup(`<b>${poi.name}</b>${poi.description ? '<br>' + poi.description : ''}`);
            allPlottablePoints.push({ id: `poi-${poi.name.replace(/\s+/g, '-')}`, name: `POI: ${poi.name}`, lat: poi.lat, lon: poi.lon, type: 'poi' });
        });
        console.log("POIs displayed:", indorePOIs.length);
    }

    function populateRoutingSelects() {
        if (!routeStartSelect || !routeEndSelect) { console.warn("Routing select elements not found."); return; }
        routeStartSelect.innerHTML = '<option value="">-- Select Start Point --</option>';
        routeEndSelect.innerHTML = '<option value="">-- Select End Point --</option>';
        allPlottablePoints.sort((a, b) => a.name.localeCompare(b.name));
        allPlottablePoints.forEach(point => {
            const option = document.createElement('option');
            option.value = `${point.lat},${point.lon}`;
            option.textContent = point.name;
            option.dataset.id = point.id; // Store ID if needed
            option.dataset.type = point.type;
            routeStartSelect.appendChild(option.cloneNode(true));
            routeEndSelect.appendChild(option);
        });
        console.log("Routing dropdowns populated.");
    }

    async function updateLiveCameraStatusesOnMap() {
        console.log("Updating live camera statuses on map...");
        try {
            // THIS ENDPOINT NEEDS TO BE CREATED ON YOUR BACKEND (/api/cameras/live_statuses/)
            // It should return data from your live_status_manager
            const response = await fetchWithAuth(`${API_BASE_URL}/cameras/live_statuses/`);
            if (!response.ok) { console.warn("Failed to fetch live camera statuses."); return; }
            const liveStatuses = await response.json(); // Expected format: { camera_id: {is_over_threshold: true/false, person_count: X, ...}, ... }
            console.log("Live statuses received:", liveStatuses);

            for (const camId in liveStatuses) {
                if (cameraMarkers[camId] && liveStatuses.hasOwnProperty(camId)) {
                    const status = liveStatuses[camId];
                    const marker = cameraMarkers[camId];
                    const newIcon = status.is_over_threshold ? cameraIconCrowded : cameraIconDefault;
                    if (marker.getIcon() !== newIcon) { // Avoid unnecessary icon redraw
                        marker.setIcon(newIcon);
                    }
                    // Update popup content if needed (more complex, as popup needs to be open or reopened)
                    // For simplicity, we'll just update the icon for now.
                    // A better way is to update marker.customData and rebuild popup on open.
                    marker.customData.is_over_threshold = status.is_over_threshold; // Store for diversion button logic
                    marker.customData.person_count = status.person_count; // Store for popup
                    
                    // Update existing popup if open
                    if (marker.isPopupOpen()) {
                        let newPopupContent = `<b>Cam: ${marker.customData.name}</b><br>Area: ${marker.customData.area_name}<br>Mode: ${marker.customData.mode}`;
                        newPopupContent += `<br>Persons: ${status.person_count || 'N/A'}`;
                        if (status.is_over_threshold) newPopupContent += ` <span style="color:red;">(Crowded!)</span>`;
                        if (isAdmin()) {
                           newPopupContent += `<br><button class="suggest-diversion-btn" data-cameraid="${camId}" style="margin-top:5px; padding: 3px 6px; font-size:0.8em;">Suggest Diversion</button>`;
                        }
                        marker.setPopupContent(newPopupContent);
                    }
                }
            }
        } catch (error) {
            console.error("Error updating live camera statuses on map:", error);
        }
    }


    // --- Diversion Logic ---
    async function getDiversionSuggestionFromServer(crowdedCamId) {
        console.log("Requesting diversion suggestion for camera ID:", crowdedCamId);
        if (diversionRouteLayer) map.removeLayer(diversionRouteLayer);
        if (pathInstructionsUl) pathInstructionsUl.innerHTML = '';
        if (alternatePathsDiv) alternatePathsDiv.style.display = 'none';

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/diversions/suggest_diversion/`, {
                 method: 'POST',
                 headers: {'Content-Type': 'application/json'},
                 body: JSON.stringify({ crowded_camera_id: parseInt(crowdedCamId) }) // Ensure ID is int
            });
            if (!response.ok) { const err = await response.json(); throw new Error(err.detail || "Failed to get suggestion"); }
            const suggestion = await response.json();
            console.log("Diversion suggestion received:", suggestion);
            displayDiversionOnMap(suggestion);
        } catch (error) {
            console.error("Error getting diversion suggestion:", error);
            alert("Could not calculate diversion: " + error.message);
        }
    }

    function displayDiversionOnMap(suggestion) {
        // Clear previous highlights or routes
        if (diversionRouteLayer) map.removeLayer(diversionRouteLayer);
        pathLayerGroup.clearLayers(); // Clear conceptual alternate paths too
        
        // Highlight crowded camera marker
        if (suggestion.crowded_camera && cameraMarkers[suggestion.crowded_camera.id]) {
            // cameraMarkers[suggestion.crowded_camera.id].setIcon(cameraIconCrowded); // Already set by live status
        }
        // Highlight target camera marker
        if (suggestion.target_camera && cameraMarkers[suggestion.target_camera.id]) {
            // Consider a 'target' icon or a temporary circle
             L.circleMarker([suggestion.target_camera.latitude, suggestion.target_camera.longitude], {
                color: 'lime', fillColor: 'lime', fillOpacity: 0.7, radius: 10, weight:3
            }).bindPopup(`Target: ${suggestion.target_camera.name}`).addTo(pathLayerGroup); // Add to path layer
        }

        if (suggestion.route_geojson) {
            diversionRouteLayer = L.geoJSON(suggestion.route_geojson, {
                style: () => ({ color: "#00e676", weight: 6, opacity: 0.85 }) // Bright green route
            }).addTo(map);
            if (diversionRouteLayer.getBounds().isValid()) {
                map.fitBounds(diversionRouteLayer.getBounds().pad(0.2));
            }
        }

        if (alternatePathsDiv && pathInstructionsUl) {
            alternatePathsDiv.style.display = 'block';
            pathInstructionsUl.innerHTML = `<li><b>${suggestion.message}</b></li>`;
            if (suggestion.target_camera) {
                 pathInstructionsUl.innerHTML += `<li>Target: ${suggestion.target_camera.name} (Currently: ${suggestion.target_camera.person_count || suggestion.target_camera.current_crowd || 'N/A'} people)</li>`;
            }
            // OSRM often returns distance/time in the GeoJSON properties or directly if structured by backend
            // This part depends on the exact structure of `route_geojson` from your backend
            if (suggestion.route_geojson && suggestion.route_geojson.properties && suggestion.route_geojson.properties.summary) {
                const summary = suggestion.route_geojson.properties.summary; // Assuming OSRM-like structure
                pathInstructionsUl.innerHTML += `<li>Route: Approx. ${(summary.totalDistance / 1000).toFixed(1)} km, ${Math.round(summary.totalTime / 60)} min.</li>`;
            } else if (suggestion.route_geojson && suggestion.route_geojson.summary) { // If backend puts it at top level
                 const summary = suggestion.route_geojson.summary;
                 pathInstructionsUl.innerHTML += `<li>Route: Approx. ${(summary.totalDistance / 1000).toFixed(1)} km, ${Math.round(summary.totalTime / 60)} min.</li>`;
            }
        }
        if(!suggestion.route_geojson && suggestion.message) {
            alert(suggestion.message); // Show message if no route but suggestion exists
        }
    }


    // --- Event Listeners ---
    map.on('popupopen', function(e) { // Event delegation for buttons inside popups
        const diversionButton = e.popup._contentNode.querySelector('.suggest-diversion-btn');
        if (diversionButton) {
            diversionButton.addEventListener('click', function(event) {
                event.preventDefault(); // Prevent any default action if button is in a form
                const camId = this.dataset.cameraid;
                console.log("Suggest Diversion button in popup clicked for camera ID:", camId);
                getDiversionSuggestionFromServer(camId);
                map.closePopup();
            });
        }
    });

    if (findRouteButton) {
        findRouteButton.addEventListener('click', () => { /* ... (same as your existing routing logic) ... */ });
    }


    // --- Main Data Loading Orchestration ---
    async function loadAllMapFeaturesAndFitView() {
        console.log("Loading all map features...");
        allPlottablePoints = []; // Reset for fresh load

        // Show loading state (optional simple text)
        const mapLoadingMessage = L.control({position: 'topright'});
        mapLoadingMessage.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'map-loading-message');
            this._div.innerHTML = '<h4>Loading Map Data...</h4>';
            return this._div;
        };
        mapLoadingMessage.addTo(map);


        await Promise.all([ // Load zones and cameras in parallel
            loadZonesData(),
            loadCamerasData()
        ]);
        displayPOIsData(); // POIs are static, load after async data

        populateRoutingSelects();

        map.removeControl(mapLoadingMessage); // Hide loading message

        let bounds = L.latLngBounds();
        allPlottablePoints.forEach(p => {
            if (typeof p.lat === 'number' && typeof p.lon === 'number') {
                bounds.extend([p.lat, p.lon]);
            }
        });

        if (bounds.isValid() && allPlottablePoints.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40] });
        } else {
            map.setView([indoreLat, indoreLng], initialZoomLevel);
        }
        
        // Start live status updates after initial load
        await updateLiveCameraStatusesOnMap(); // Initial status update
        setInterval(updateLiveCameraStatusesOnMap, 15000); // Then update every 15 seconds
    }

    // Initial Load
    loadAllMapFeaturesAndFitView();
    console.log("Leaflet map initialized for Indore and initial features loaded.");
}

// Leaflet Destination Point Helper (if not part of your Leaflet version)
// Ensure L.CRS.EPSG3857.toRadians and toDegrees are available.
if (L.CRS && L.CRS.EPSG3857 && typeof L.CRS.EPSG3857.toRadians === 'undefined') {
    L.CRS.EPSG3857.toRadians = function(angleDegrees) { return angleDegrees * Math.PI / 180; };
    L.CRS.EPSG3857.toDegrees = function(angleRadians) { return angleRadians * 180 / Math.PI; };
}

if (typeof L.LatLng.prototype.destinationPoint === 'undefined') {
    L.LatLng.prototype.destinationPoint = function (bearing, distance) {
        const R = 6371e3; // Earth's radius in meters
        const CRS = this.options && this.options.crs ? this.options.crs : (L.CRS.EPSG3857 || L.CRS.Earth); // Be more robust
        const b = CRS.toRadians(bearing);
        const d = distance;
        const lat1 = CRS.toRadians(this.lat);
        const lon1 = CRS.toRadians(this.lng);
        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) +
            Math.cos(lat1) * Math.sin(d / R) * Math.cos(b));
        const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d / R) * Math.cos(lat1),
            Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));
        return L.latLng(CRS.toDegrees(lat2), CRS.toDegrees(lon2));
    };
}