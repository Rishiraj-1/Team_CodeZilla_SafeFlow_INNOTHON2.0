const API_BASE_URL = '/api';

function getToken() {
    return localStorage.getItem('safeflow_token');
}

function setToken(token) {
    localStorage.setItem('safeflow_token', token);
}

function removeToken() {
    localStorage.removeItem('safeflow_token');
    localStorage.removeItem('userRole'); // Also clear role
    localStorage.removeItem('userEmail'); // Also clear email
}

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = {
        ...options.headers,
    };
    // Don't set Content-Type for FormData, browser does it
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) { // Unauthorized
        console.warn("fetchWithAuth received 401 Unauthorized for URL:", url);
        removeToken();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            alert("Your session has expired or you are not authorized. Please login again.");
            window.location.href = '/login';
        }
        // Throw an error so the calling function knows it failed
        throw new Error('Unauthorized or token expired.');
    }
    return response;
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutButton');
    const userEmailDisplay = document.getElementById('userEmailDisplay'); // In base.html's nav

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            removeToken();
            window.location.href = '/login';
        });
    }

    // Update user display if token exists and not on login page
    if (userEmailDisplay && getToken() && (window.location.pathname !== '/login' && window.location.pathname !== '/')) {
        // Attempt to fetch user info to validate token and display email/role
        // This might already be done by individual page scripts (dashboard.js, history.js)
        // So, this can be a fallback or primary way to update nav.
        if (!localStorage.getItem('userEmail')) { // Only fetch if not already set by page script
            fetchWithAuth(`${API_BASE_URL}/auth/users/me`)
                .then(response => {
                    if (!response.ok) {
                        // If this fails here, it means token is likely invalid, rely on page script's check
                        removeToken(); // Clean up bad token
                        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                            window.location.href = '/login';
                        }
                        return null;
                    }
                    return response.json();
                })
                .then(user => {
                    if (user) {
                        userEmailDisplay.textContent = `Logged in as: ${user.email} (${user.role})`;
                        localStorage.setItem('userRole', user.role);
                        localStorage.setItem('userEmail', user.email);
                    }
                })
                .catch(error => {
                    console.warn('Error fetching user info in common.js for nav display:', error.message);
                    // removeToken(); // Already handled in fetchWithAuth
                    // if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                    //     window.location.href = '/login';
                    // }
                });
        } else {
            // If email/role already in localStorage, use them
            userEmailDisplay.textContent = `Logged in as: ${localStorage.getItem('userEmail')} (${localStorage.getItem('userRole')})`;
        }
    } else if (userEmailDisplay && (window.location.pathname === '/login' || window.location.pathname === '/')) {
        userEmailDisplay.textContent = ''; // Clear on login page
    }

    // Auto-redirect from login if already logged in and token seems valid
    if ((window.location.pathname === '/login' || window.location.pathname === '/') && getToken()) {
        fetchWithAuth(`${API_BASE_URL}/auth/users/me`) // Verify token
            .then(response => {
                if (response.ok) {
                    window.location.href = '/dashboard';
                } else {
                    removeToken(); // Invalid token
                }
            }).catch(() => removeToken()); // Network error or other issues
    }
});

function displayMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.color = isError ? '#dc3545' : '#28a745'; // Bootstrap colors
        setTimeout(() => { element.textContent = ''; }, 5000);
    }
}

function isAdmin() {
    const role = localStorage.getItem('userRole');
    // console.log("isAdmin() check: localStorage role is", role); // Optional debug
    return role === 'admin';
}

// In static/js/common.js
function openModal(modalId) {
    console.log("Attempting to open modal:", modalId); // You are seeing this
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active'); // Use class to trigger CSS transition
        // modal.style.display = 'flex'; // Old way - commented out
        console.log("Modal class 'active' added to:", modalId); // ADD THIS DEBUG LINE
    } else {
        console.error("Modal with ID not found in openModal:", modalId); // Check if this appears
    }
}

// In static/js/common.js
function closeModal(modalId) {
    console.log("Attempting to close modal:", modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // modal.style.display = 'none'; // Old way - commented out
        console.log("Modal class 'active' removed from:", modalId); // ADD THIS DEBUG LINE
    } else {
        console.error("Modal with ID not found for closing:", modalId);
    }
}