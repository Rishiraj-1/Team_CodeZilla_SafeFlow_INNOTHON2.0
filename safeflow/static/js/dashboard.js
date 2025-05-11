// static/js/dashboard.js (Complete and Integrated)

async function initializeDashboard(loggedInUser) {
    console.log("--- ENTERING initializeDashboard --- User:", loggedInUser);

    // DOM Element Getters
    const alertDisplay = document.getElementById('alertDisplay');

    // Multi-Stream Grid Elements
    const videoFeedGrid = document.getElementById('videoFeedGrid');
    const multiCameraSelect = document.getElementById('multiCameraSelect');
    const addStreamToGridButton = document.getElementById('addStreamToGridButton');
    const clearGridButton = document.getElementById('clearGridButton');
    const streamStatus = document.getElementById('streamStatus');

    // Real-time Data Display
    const liveCameraName = document.getElementById('liveCameraName');
    const liveAreaName = document.getElementById('liveAreaName');
    const liveMode = document.getElementById('liveMode');
    const generalModeData = document.getElementById('generalModeData');
    const tripwireModeData = document.getElementById('tripwireModeData');
    const livePersonCount = document.getElementById('livePersonCount');
    const liveCrowdDensity = document.getElementById('liveCrowdDensity');
    const liveEntryCount = document.getElementById('liveEntryCount');
    const liveExitCount = document.getElementById('liveExitCount');
    const liveOccupancy = document.getElementById('liveOccupancy');

    // Tools & Modals
    const addCameraButton = document.getElementById('addCameraButton');
    console.log("addCameraButton element found in DOM:", !!addCameraButton);
    const addCameraModal = document.getElementById('addCameraModal');
    const addCameraForm = document.getElementById('addCameraForm');

    const manageUserButton = document.getElementById('addUpdateUserButton');
    console.log("manageUserButton (addUpdateUserButton) element found in DOM:", !!manageUserButton);
    const manageUserModal = document.getElementById('manageUserModal');
    const addUserForm = document.getElementById('addUserForm');
    const userListUl = document.getElementById('userList');

    const manageZonesButton = document.getElementById('manageZonesButton');
    console.log("manageZonesButton element found in DOM:", !!manageZonesButton);
    const manageZoneModal = document.getElementById('manageZoneModal');
    const addZoneForm = document.getElementById('addZoneForm');
    const zoneListUl = document.getElementById('zoneList');

    const setupTripwireButton = document.getElementById('setupTripwireButton');
    console.log("setupTripwireButton element found in DOM:", !!setupTripwireButton);
    const deleteCameraButton = document.getElementById('deleteCameraButton');
    console.log("deleteCameraButton element found in DOM:", !!deleteCameraButton);

    // Video File Upload
    const videoFileUpload = document.getElementById('videoFileUpload');
    const processVideoButton = document.getElementById('processVideoButton');
    const fileProcessingStatus = document.getElementById('fileProcessingStatus');
    const fileMaxPersons = document.getElementById('fileMaxPersons');
    const fileAvgDensity = document.getElementById('fileAvgDensity');

    let activeGridStreams = {};
    let focusedCameraIdForData = null;
    let dataUpdateInterval;

    // --- Helper to update "Real-time Data" section ---
    function updateFocusedCameraDataDisplay(cameraDetails, data) {
        // ... (This function remains the same as provided in the previous full dashboard.js)
        if (liveCameraName) liveCameraName.textContent = cameraDetails.name || 'N/A';
        if (liveAreaName) liveAreaName.textContent = cameraDetails.area_name || 'N/A';
        if (liveMode) liveMode.textContent = cameraDetails.mode || 'N/A';
        const mode = typeof cameraDetails.mode === 'object' ? cameraDetails.mode.value : cameraDetails.mode;
        if (mode === 'general') {
            if (generalModeData) generalModeData.style.display = 'block';
            if (tripwireModeData) tripwireModeData.style.display = 'none';
            if (livePersonCount) livePersonCount.textContent = data.person_count !== undefined ? data.person_count : '...';
            if (liveCrowdDensity) liveCrowdDensity.textContent = data.density !== undefined ? data.density.toFixed(2) : '...';
        } else if (mode === 'tripwire') {
            if (generalModeData) generalModeData.style.display = 'none';
            if (tripwireModeData) tripwireModeData.style.display = 'block';
            if (liveEntryCount) liveEntryCount.textContent = data.entry_count !== undefined ? data.entry_count : '...';
            if (liveExitCount) liveExitCount.textContent = data.exit_count !== undefined ? data.exit_count : '...';
            if (liveOccupancy) liveOccupancy.textContent = data.current_occupancy !== undefined ? data.current_occupancy : '...';
        } else {
            if (generalModeData) generalModeData.style.display = 'none';
            if (tripwireModeData) tripwireModeData.style.display = 'none';
        }
    }

    async function fetchAndDisplayFocusedCameraData() {
        // ... (This function remains the same as provided in the previous full dashboard.js)
        if (!focusedCameraIdForData || !activeGridStreams[focusedCameraIdForData]) {
            updateFocusedCameraDataDisplay({ name: 'N/A', area_name: 'N/A', mode: 'N/A' }, {});
            return;
        }
        const camDetailsForData = activeGridStreams[focusedCameraIdForData];
        try {
            const camInfoResponse = await fetchWithAuth(`${API_BASE_URL}/cameras/${focusedCameraIdForData}`);
            if (!camInfoResponse.ok) { console.error("Failed to fetch focused camera details"); return; }
            const camData = await camInfoResponse.json();
            const logResponse = await fetchWithAuth(`${API_BASE_URL}/logs/?limit=1&area_name=${encodeURIComponent(camData.area_name)}`);
            let latestLogData = {};
            if (logResponse.ok) {
                const logs = await logResponse.json();
                const relevantLog = logs.find(log => log.camera_id === parseInt(focusedCameraIdForData));
                if (relevantLog) {
                    latestLogData = {
                        person_count: relevantLog.person_count, density: relevantLog.density,
                        entry_count: relevantLog.entry_count, exit_count: relevantLog.exit_count
                    };
                }
            }
            updateFocusedCameraDataDisplay(camData, { ...latestLogData, current_occupancy: camData.current_occupancy });
            let alertMsg = "No active alerts."; let alertClass = "alert-normal";
            const modeForAlert = typeof camData.mode === 'object' ? camData.mode.value : camData.mode;
            if (modeForAlert === 'general' && latestLogData.person_count > camData.crowd_threshold) {
                alertMsg = `ALERT: Crowd (${latestLogData.person_count}) for ${camData.name} exceeds threshold!`; alertClass = "alert-danger";
            } else if (modeForAlert === 'tripwire' && camData.current_occupancy > camData.occupancy_threshold) {
                alertMsg = `ALERT: Occupancy (${camData.current_occupancy}) for ${camData.name} exceeds threshold!`; alertClass = "alert-danger";
            }
            if (alertDisplay) { alertDisplay.textContent = alertMsg; alertDisplay.className = `alert-bar ${alertClass}`; }
        } catch (error) {
            console.error('Error fetching live data for focused camera:', error);
            updateFocusedCameraDataDisplay({ name: camDetailsForData.name, area_name: camDetailsForData.area, mode: camDetailsForData.mode }, { error: true });
        }
    }

    // --- Camera Grid Management ---
    if (addStreamToGridButton) {
        // ... (This event listener remains the same as provided in the previous full dashboard.js)
        addStreamToGridButton.addEventListener('click', async () => {
            if (!multiCameraSelect || !multiCameraSelect.value) { alert("Please select a camera to add."); return; }
            const cameraId = multiCameraSelect.value;
            const selectedOption = multiCameraSelect.options[multiCameraSelect.selectedIndex];
            const cameraName = selectedOption.dataset.name || `Camera ${cameraId}`;
            const cameraArea = selectedOption.dataset.area;
            const cameraMode = selectedOption.dataset.mode;
            if (activeGridStreams[cameraId]) { alert(`${cameraName} is already in the grid.`); return; }
            if (Object.keys(activeGridStreams).length >= 4) { alert("Maximum 4 streams allowed."); return; }
            const gridItem = document.createElement('div'); gridItem.className = 'video-grid-item'; gridItem.id = `grid-item-${cameraId}`;
            gridItem.addEventListener('click', () => {
                focusedCameraIdForData = cameraId;
                document.querySelectorAll('.video-grid-item.focused').forEach(el => el.classList.remove('focused'));
                gridItem.classList.add('focused');
                fetchAndDisplayFocusedCameraData(); updateToolButtonVisibility(); // Update buttons on focus change
            });
            const img = document.createElement('img'); img.src = `${API_BASE_URL}/stream/video_feed/${cameraId}`; img.alt = `Feed for ${cameraName}`;
            img.onerror = () => {
                console.error(`Error loading stream for ${cameraName} (ID: ${cameraId}) in grid.`);
                gridItem.innerHTML = `<p style="color:red;text-align:center;padding:20px;">Error: ${cameraName}</p>`;
                if (focusedCameraIdForData === cameraId) { focusedCameraIdForData = null; fetchAndDisplayFocusedCameraData(); updateToolButtonVisibility(); }
                delete activeGridStreams[cameraId];
            };
            const nameOverlay = document.createElement('p'); nameOverlay.className = 'camera-name-overlay'; nameOverlay.textContent = cameraName;
            gridItem.appendChild(img); gridItem.appendChild(nameOverlay);
            if (videoFeedGrid) videoFeedGrid.appendChild(gridItem);
            activeGridStreams[cameraId] = { imgElement: img, gridItemElement: gridItem, name: cameraName, area: cameraArea, mode: cameraMode };
            focusedCameraIdForData = cameraId; gridItem.classList.add('focused'); // Focus the new stream
            if (streamStatus) streamStatus.textContent = `${Object.keys(activeGridStreams).length} feed(s) active.`;
            fetchAndDisplayFocusedCameraData();
            if (dataUpdateInterval) clearInterval(dataUpdateInterval);
            dataUpdateInterval = setInterval(fetchAndDisplayFocusedCameraData, 3000);
            updateToolButtonVisibility();
        });
    }

    if (clearGridButton) {
        // ... (This event listener remains the same as provided in the previous full dashboard.js)
        clearGridButton.addEventListener('click', () => {
            if (videoFeedGrid) videoFeedGrid.innerHTML = ''; activeGridStreams = {}; focusedCameraIdForData = null;
            if (streamStatus) streamStatus.textContent = "Select cameras to add to the grid.";
            if (dataUpdateInterval) clearInterval(dataUpdateInterval);
            updateFocusedCameraDataDisplay({ name: 'N/A', area_name: 'N/A', mode: 'N/A' }, {});
            if (alertDisplay) { alertDisplay.textContent = "No active alerts."; alertDisplay.className = "alert-bar alert-normal"; }
            updateToolButtonVisibility();
        });
    }

    // --- Tools Button Visibility (Delete, Setup Tripwire) ---
    function updateToolButtonVisibility() {
        console.log("--- ENTERING updateToolButtonVisibility --- focusedCameraId:", focusedCameraIdForData, "isAdmin:", isAdmin());
        if (isAdmin()) {
            if (deleteCameraButton) {
                deleteCameraButton.style.display = focusedCameraIdForData ? 'inline-block' : 'none';
                console.log("Delete button display set to:", deleteCameraButton.style.display);
            }
            if (setupTripwireButton) { // Check element exists
                if (focusedCameraIdForData && activeGridStreams[focusedCameraIdForData]) {
                    const mode = activeGridStreams[focusedCameraIdForData].mode;
                    setupTripwireButton.style.display = (mode === 'tripwire') ? 'inline-block' : 'none';
                    console.log("Setup Tripwire button display set to:", setupTripwireButton.style.display, "for mode:", mode);
                } else {
                    setupTripwireButton.style.display = 'none';
                    console.log("Setup Tripwire button display set to: none (no focused camera or not tripwire)");
                }
            }
        } else { // Non-admin
            if (deleteCameraButton) deleteCameraButton.style.display = 'none';
            if (setupTripwireButton) setupTripwireButton.style.display = 'none';
            console.log("Non-admin: Delete and Setup Tripwire buttons hidden.");
        }
        console.log("--- EXITING updateToolButtonVisibility ---");
    }


    // --- Delete Camera (acts on focusedCameraIdForData) ---
    if (deleteCameraButton) {
        // ... (This event listener remains the same as provided in the previous full dashboard.js)
        deleteCameraButton.addEventListener('click', async () => {
            if (!focusedCameraIdForData) { alert("No camera focused for deletion."); return; }
            const cameraNameToDelete = activeGridStreams[focusedCameraIdForData]?.name || `Camera ID ${focusedCameraIdForData}`;
            if (confirm(`Are you sure you want to delete "${cameraNameToDelete}"?`)) {
                try {
                    const response = await fetchWithAuth(`${API_BASE_URL}/cameras/${focusedCameraIdForData}`, { method: 'DELETE' });
                    if (response.ok) {
                        alert(`Camera "${cameraNameToDelete}" deleted.`);
                        if (activeGridStreams[focusedCameraIdForData]) {
                            activeGridStreams[focusedCameraIdForData].gridItemElement.remove();
                            delete activeGridStreams[focusedCameraIdForData];
                        }
                        const oldFocusedId = focusedCameraIdForData; focusedCameraIdForData = null;
                        const remainingCamIds = Object.keys(activeGridStreams);
                        if (remainingCamIds.length > 0) { focusedCameraIdForData = remainingCamIds[0]; document.getElementById(`grid-item-${focusedCameraIdForData}`)?.classList.add('focused'); }
                        fetchAndDisplayFocusedCameraData();
                        if (streamStatus) streamStatus.textContent = `${Object.keys(activeGridStreams).length} feed(s) active.`;
                        await loadCamerasForMultiSelect(); updateToolButtonVisibility();
                    } else { const error = await response.json(); alert(`Error: ${error.detail}`); }
                } catch (error) { console.error("Error deleting:", error); alert(`Error: ${error.message}`); }
            }
        });
    }
    
    // --- Setup Tripwire (acts on focusedCameraIdForData) ---
    if (setupTripwireButton) {
        // ... (This event listener remains the same as provided in the previous full dashboard.js)
        setupTripwireButton.addEventListener('click', () => {
            if (focusedCameraIdForData && activeGridStreams[focusedCameraIdForData]?.mode === 'tripwire') {
                window.location.href = `/tripwire-setup/${focusedCameraIdForData}`;
            } else { alert("Select a tripwire camera from grid and ensure it's focused."); }
        });
    }


    // --- "Add Camera" Functionality (Available to ALL users) ---
    if (addCameraButton) {
        console.log("Setting up 'Add Camera' button for all users (visibility).");
        addCameraButton.style.display = 'inline-block';
        addCameraButton.addEventListener('click', () => {
            console.log("Add Camera button was CLICKED by user:", loggedInUser.email);
            openModal('addCameraModal');
        });
    } else {
        console.error("Dashboard: addCameraButton element NOT FOUND in DOM during setup.");
    }

    if (addCameraForm) {
        addCameraForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const cameraData = { /* ... get form data ... */
                name: document.getElementById('camName').value, area_name: document.getElementById('camArea').value,
                source: document.getElementById('camSource').value, mode: document.getElementById('camMode').value,
                crowd_threshold: parseInt(document.getElementById('camCrowdThreshold').value),
                area_sq_meters: parseFloat(document.getElementById('camAreaSqMeters').value),
                occupancy_threshold: parseInt(document.getElementById('camOccupancyThreshold').value),
                latitude: document.getElementById('camLat').value ? parseFloat(document.getElementById('camLat').value) : null,
                longitude: document.getElementById('camLon').value ? parseFloat(document.getElementById('camLon').value) : null,
            };
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/cameras/`, { method: 'POST', body: JSON.stringify(cameraData) });
                if (response.ok) {
                    alert('Camera added successfully!'); closeModal('addCameraModal'); addCameraForm.reset();
                    await loadCamerasForMultiSelect(); // Refresh the multi-select dropdown
                } else {
                    const error = await response.json();
                    alert(`Error adding camera: ${response.status===403 ? "Permission denied. " : ""}${error.detail}`);
                }
            } catch (error) { alert(`An error occurred while adding camera: ${error.message}`); }
        });
    }

    // --- Admin-Specific UI (Manage Users, Manage Zones) ---
    function setupAdminSpecificUI() {
        console.log("--- ENTERING setupAdminSpecificUI ---");
        const userRoleFromStorage = localStorage.getItem('userRole');
        console.log("localStorage userRole for isAdmin check:", userRoleFromStorage);
        console.log("isAdmin() returns:", isAdmin());

        if (isAdmin()) {
            console.log("User IS admin. Setting up admin buttons.");
            if (manageUserButton) {
                console.log("Admin UI: manageUserButton element FOUND.");
                manageUserButton.style.display = 'inline-block';
                manageUserButton.addEventListener('click', () => { console.log("Manage User button CLICKED"); openModal('manageUserModal'); loadUsers(); });
            } else { console.error("Admin UI: manageUserButton (addUpdateUserButton) element NOT FOUND in DOM."); }

            if (manageZonesButton) {
                console.log("Admin UI: manageZonesButton element FOUND.");
                manageZonesButton.style.display = 'inline-block';
                manageZonesButton.addEventListener('click', () => { console.log("Manage Zones button CLICKED"); openModal('manageZoneModal'); loadZones(); });
            } else { console.error("Admin UI: manageZonesButton element NOT FOUND in DOM."); }
        } else {
            console.log("User is NOT admin. Hiding admin-specific buttons.");
            if (manageUserButton) manageUserButton.style.display = 'none';
            if (manageUserModal) manageUserModal.style.display = 'none';
            if (manageZonesButton) manageZonesButton.style.display = 'none';
            if (manageZoneModal) manageZoneModal.style.display = 'none';
        }
        // Visibility for deleteCameraButton and setupTripwireButton is handled by updateToolButtonVisibility
        console.log("--- EXITING setupAdminSpecificUI ---");
    }

    async function loadUsers() { if (!isAdmin() || !userListUl) return; console.log("Loading users..."); try { const r = await fetchWithAuth(`${API_BASE_URL}/auth/users/`); if (!r.ok) throw Error("Failed users fetch"); const users = await r.json(); userListUl.innerHTML = ''; users.forEach(u => { const li = document.createElement('li'); li.textContent = `${u.email} (${u.role})`; if (u.email !== loggedInUser.email) { const btn = document.createElement('button'); btn.textContent = 'Del'; btn.onclick = () => deleteUser(u.id); li.appendChild(btn); } userListUl.appendChild(li); }); } catch (e) { console.error('Err users:', e); userListUl.innerHTML = '<li>Err load</li>'; } }
    async function deleteUser(userId) { if (!confirm('Del user?')) return; try { const r = await fetchWithAuth(`${API_BASE_URL}/auth/users/${userId}`, { method: 'DELETE' }); if (r.ok) { alert('User del.'); loadUsers(); } else { const e = await r.json(); alert(`Err: ${e.detail}`); } } catch (e) { alert(`Err: ${e.message}`); } }
    async function loadZones() { if (!isAdmin() || !zoneListUl) return; console.log("Loading zones..."); try { const r = await fetchWithAuth(`${API_BASE_URL}/zones/`); if (!r.ok) throw Error("Failed zones fetch"); const zones = await r.json(); zoneListUl.innerHTML = ''; zones.forEach(z => { const li = document.createElement('li'); li.textContent = `${z.name} (${z.type})`; const eBtn = document.createElement('button'); eBtn.textContent = 'Edit'; eBtn.onclick = () => populateZoneFormForEdit(z); li.appendChild(eBtn); const dBtn = document.createElement('button'); dBtn.textContent = 'Del'; dBtn.onclick = () => deleteZone(z.id); li.appendChild(dBtn); zoneListUl.appendChild(li); }); } catch (e) { console.error('Err zones:', e); zoneListUl.innerHTML = '<li>Err load</li>'; } }
    function populateZoneFormForEdit(zone) { if(document.getElementById('zoneId')) document.getElementById('zoneId').value = zone.id; /* ... set other form fields ... */ }
    async function deleteZone(zoneId) { if (!confirm('Del zone?')) return; try { const r = await fetchWithAuth(`${API_BASE_URL}/zones/${zoneId}`, { method: 'DELETE' }); if (r.ok) { alert('Zone del.'); loadZones(); } else { const e = await r.json(); alert(`Err: ${e.detail}`); } } catch (e) { alert(`Err: ${e.message}`); } }


    // --- Video File Upload Functionality ---
    if (processVideoButton) { /* ... (same as previously provided: event listener for file processing) ... */ }


    // --- Function to Load Cameras into the "Add to Grid" Select Dropdown ---
        async function loadCamerasForMultiSelect() {
        try {
            console.log("--- loadCamerasForMultiSelect: Attempting to load cameras for multi-select dropdown...");
            const response = await fetchWithAuth(`${API_BASE_URL}/cameras/`);
            console.log("--- loadCamerasForMultiSelect: Cameras API response status:", response.status);
            if (!response.ok) {
                const errorText = await response.text(); // Get more error details
                console.error("--- loadCamerasForMultiSelect: Failed to fetch cameras. Status:", response.status, "Response:", errorText);
                throw new Error(`Failed to fetch cameras. Status: ${response.status}`);
            }
            const cameras = await response.json();
            console.log("--- loadCamerasForMultiSelect: Cameras fetched for multi-select:", JSON.stringify(cameras, null, 2));

            if (multiCameraSelect) { // Ensure the select element itself was found
                console.log("--- loadCamerasForMultiSelect: multiCameraSelect element IS found in DOM.");
                const currentSelectedValue = multiCameraSelect.value; // Preserve current selection if any

                multiCameraSelect.innerHTML = '<option value="">-- Select Camera --</option>'; // Clear existing options
                console.log("--- loadCamerasForMultiSelect: Cleared existing options. InnerHTML now:", multiCameraSelect.innerHTML);

                if (cameras.length === 0) {
                    console.log("--- loadCamerasForMultiSelect: No cameras returned from API for dropdown.");
                    multiCameraSelect.innerHTML += '<option value="" disabled>No cameras available</option>';
                } else {
                    cameras.forEach(cam => {
                        console.log("--- loadCamerasForMultiSelect: Processing camera for dropdown:", JSON.stringify(cam));
                        const option = document.createElement('option');
                        option.value = cam.id;
                        const mode = typeof cam.mode === 'object' ? cam.mode.value : cam.mode;
                        option.dataset.name = cam.name;
                        option.dataset.area = cam.area_name;
                        option.dataset.mode = mode;
                        option.textContent = `${cam.name} (${cam.area_name} - ${mode})`;
                        
                        multiCameraSelect.appendChild(option);
                        console.log("--- loadCamerasForMultiSelect: Appended option for camera ID", cam.id, "-", cam.name, ". Option HTML:", option.outerHTML);
                    });
                }
                // Attempt to re-select the previously selected value if it still exists
                if (multiCameraSelect.querySelector(`option[value="${currentSelectedValue}"]`)) {
                    multiCameraSelect.value = currentSelectedValue;
                }

                console.log("--- loadCamerasForMultiSelect: Dropdown population complete. Final innerHTML:", multiCameraSelect.innerHTML);
                console.log("--- loadCamerasForMultiSelect: Number of options now in select:", multiCameraSelect.options.length);
                // Force a reflow/repaint (sometimes helps with DOM update visibility in some edge cases, though usually not needed)
                // multiCameraSelect.style.display = 'none';
                // multiCameraSelect.offsetHeight; // Trigger reflow
                // multiCameraSelect.style.display = '';


            } else {
                console.error("--- loadCamerasForMultiSelect: multiCameraSelect element was NOT found in DOM initially!");
            }
        } catch (error) {
            console.error("--- loadCamerasForMultiSelect: Error caught:", error);
            if (multiCameraSelect) multiCameraSelect.innerHTML = '<option value="">Error loading cameras</option>';
        }
    }

    // Initial calls within initializeDashboard
    await loadCamerasForMultiSelect();
    setupAdminSpecificUI();
    updateToolButtonVisibility(); // Set initial state based on no focused camera
    fetchAndDisplayFocusedCameraData(); // Will show N/A initially
    console.log("--- EXITING initializeDashboard ---");

} // End of initializeDashboard


// --- Main Entry Point for dashboard.js (DOM Loaded) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("--- Dashboard DOMContentLoaded. Starting auth check... ---");
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/auth/users/me`);
        if (!response.ok) {
            console.error("Dashboard auth check failed. Status:", response.status);
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
            throw new Error('Not authenticated, redirecting to login.');
        }
        const user = await response.json();
        console.log("User data fetched for dashboard init:", user);

        const userEmailDisplay = document.getElementById('userEmailDisplay');
        if (userEmailDisplay) {
            userEmailDisplay.textContent = `Logged in as: ${user.email} (${user.role})`;
        }
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('userEmail', user.email);

        await initializeDashboard(user);

    } catch (error) {
        console.error("Dashboard auth check/init failed:", error.message);
        if (!getToken() && window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
        }
    }
});