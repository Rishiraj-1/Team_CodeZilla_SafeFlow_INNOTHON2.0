// static/js/history.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log("--- history.js: DOMContentLoaded ---");
    // Authentication check first
    try {
        const authResponse = await fetchWithAuth(`${API_BASE_URL}/auth/users/me`);
        if (!authResponse.ok) {
            console.error("--- history.js: Auth check failed. Status:", authResponse.status);
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
            throw new Error('Not authenticated for history page, redirecting to login.');
        }
        const user = await authResponse.json();
        console.log("--- history.js: User authenticated:", user.email);

        // If authenticated, proceed to initialize the history page functionality
        await initializeHistoryPage(user);

    } catch (error) {
        console.error("--- history.js: Auth check/init error:", error.message);
        if (!getToken() && window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
        }
    }
});


async function initializeHistoryPage(loggedInUser) {
    console.log("--- initializeHistoryPage: Initializing for user:", loggedInUser.email);

    const historyTableBody = document.getElementById('historyTableBody');
    const areaFilter = document.getElementById('areaFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const applyFilterButton = document.getElementById('applyFilterButton');
    const clearFilterButton = document.getElementById('clearFilterButton');

    const prevPageButton = document.getElementById('prevPageButton');
    const nextPageButton = document.getElementById('nextPageButton');
    const currentPageSpan = document.getElementById('currentPage');

    // Chart variables
    const chartCanvas = document.getElementById('historyAreaChart');
    let historyChart = null; // To store the Chart.js instance

    console.log("--- initializeHistoryPage: historyTableBody element found:", !!historyTableBody);
    console.log("--- initializeHistoryPage: chartCanvas element found:", !!chartCanvas);
    console.log("--- initializeHistoryPage: areaFilter element found:", !!areaFilter);


    let currentPage = 1;
    const limit = 20; // Records per page for the table

    async function populateAreaFilter() {
        console.log("--- populateAreaFilter: Attempting to load areas...");
        if (!areaFilter) {
            console.warn("--- populateAreaFilter: areaFilter element not found in DOM.");
            return;
        }
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/cameras/`);
            if (!response.ok) {
                console.error("--- populateAreaFilter: Failed to fetch cameras. Status:", response.status);
                throw new Error('Failed to fetch cameras for area filter');
            }
            const cameras = await response.json();
            console.log("--- populateAreaFilter: Cameras fetched for filter:", cameras.length);

            const areaNames = [...new Set(cameras.map(cam => cam.area_name))].sort();
            areaFilter.innerHTML = '<option value="">All Areas</option>'; // Default option
            if (areaNames.length === 0) {
                areaFilter.innerHTML += '<option value="" disabled>No areas defined</option>';
            } else {
                areaNames.forEach(area => {
                    const option = document.createElement('option');
                    option.value = area;
                    option.textContent = area;
                    areaFilter.appendChild(option);
                });
            }
            console.log("--- populateAreaFilter: Area filter populated.");
        } catch (error) {
            console.error("--- populateAreaFilter: Error caught:", error);
            areaFilter.innerHTML = '<option value="">Error loading areas</option>';
        }
    }

    function updateChart(chartFormattedData) {
        console.log("--- updateChart: Attempting to update chart. Data received:", !!chartFormattedData);
        if (!chartCanvas) {
            console.warn("--- updateChart: Chart canvas not found, skipping chart update.");
            return;
        }
        if (historyChart) {
            console.log("--- updateChart: Destroying previous chart instance.");
            historyChart.destroy();
            historyChart = null;
        }

        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height); // Clear previous content

        if (!chartFormattedData || !chartFormattedData.labels || chartFormattedData.labels.length === 0) {
            console.log("--- updateChart: No data to display in chart or data format incorrect.");
            ctx.font = "16px Arial";
            ctx.fillStyle = "#888"; // Darker grey for message
            ctx.textAlign = "center";
            ctx.fillText("No data available for chart with current filters.", chartCanvas.width / 2, chartCanvas.height / 2);
            return;
        }

        console.log("--- updateChart: Creating new chart with labels:", chartFormattedData.labels.length, "and data points:", chartFormattedData.personCounts.length);
        historyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartFormattedData.labels,
                datasets: [{
                    label: `Person Count: ${chartFormattedData.areaName || 'Selected Area'}`,
                    data: chartFormattedData.personCounts,
                    borderColor: 'rgb(54, 162, 235)', // Blue
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.2, // Smoother line
                    fill: true,
                    pointRadius: 3, // Smaller points
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Time', font: {size: 14} },
                        ticks: { autoSkip: true, maxTicksLimit: 12, font: {size: 10} } // Adjust for readability
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Person Count', font: {size: 14} },
                        ticks: { font: {size: 10} }
                    }
                },
                plugins: {
                    legend: { display: true, position: 'top' },
                    title: {
                        display: true,
                        text: `Crowd Trend for ${chartFormattedData.areaName || 'All Areas (Aggregated)'}`,
                        font: { size: 16 }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                hover: {
                    mode: 'nearest',
                    intersect: true
                }
            }
        });
        console.log("--- updateChart: Chart created/updated for area:", chartFormattedData.areaName);
    }


    async function fetchHistoryAndChartData(page = 1) {
        console.log(`--- fetchHistoryAndChartData: Fetching for page ${page} ---`);
        const area = areaFilter ? areaFilter.value : '';
        const startDate = startDateFilter ? startDateFilter.value : '';
        const endDate = endDateFilter ? endDateFilter.value : '';

        // Fetch data for the table (paginated)
        let tableUrl = `${API_BASE_URL}/logs/?skip=${(page - 1) * limit}&limit=${limit}`;
        if (area) tableUrl += `&area_name=${encodeURIComponent(area)}`;
        if (startDate) tableUrl += `&start_date=${startDate}`;
        if (endDate) tableUrl += `&end_date=${endDate}`;

        console.log("--- fetchHistoryAndChartData: Fetching table data from URL:", tableUrl);
        try {
            const tableResponse = await fetchWithAuth(tableUrl);
            if (!tableResponse.ok) {
                const errText = await tableResponse.text();
                console.error("--- fetchHistoryAndChartData: Table data fetch HTTP error:", tableResponse.status, errText);
                throw new Error(`Table data fetch failed: ${tableResponse.status}`);
            }
            const logs = await tableResponse.json();
            console.log("--- fetchHistoryAndChartData: Logs received for table:", logs.length);
            populateHistoryTable(logs);

            if (currentPageSpan) currentPageSpan.textContent = `Page: ${page}`;
            if (prevPageButton) prevPageButton.disabled = (page === 1);
            if (nextPageButton) nextPageButton.disabled = (logs.length < limit);
            currentPage = page;

        } catch (error) {
            console.error('--- fetchHistoryAndChartData: Error fetching/populating history table:', error);
            if (historyTableBody) historyTableBody.innerHTML = `<tr><td colspan="8">Error loading history: ${error.message}</td></tr>`;
        }

        // Fetch data for the chart
        if (area && chartCanvas) {
            console.log(`--- fetchHistoryAndChartData: Fetching chart data for area: ${area}`);
            // Fetch more data for chart, ensure it's sorted by timestamp ascending from backend if possible.
            // Otherwise, sort on frontend. Max 500 points for performance for now.
            let chartDataUrl = `${API_BASE_URL}/logs/?area_name=${encodeURIComponent(area)}&limit=500&order_by=timestamp&order_dir=asc`;
            if (startDate) chartDataUrl += `&start_date=${startDate}`;
            if (endDate) chartDataUrl += `&end_date=${endDate}`;

            console.log("--- fetchHistoryAndChartData: Fetching chart data from URL:", chartDataUrl);
            try {
                const chartResponse = await fetchWithAuth(chartDataUrl);
                if (!chartResponse.ok) {
                    const errText = await chartResponse.text();
                    console.error("--- fetchHistoryAndChartData: Chart data fetch HTTP error:", chartResponse.status, errText);
                    throw new Error(`Chart data fetch failed: ${chartResponse.status}`);
                }
                let chartLogs = await chartResponse.json();
                console.log("--- fetchHistoryAndChartData: Logs received for chart:", chartLogs.length);

                // If backend doesn't sort, sort here (ensure your API supports order_by and order_dir)
                // If API already sorts ascending, this isn't strictly needed but harmless.
                chartLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const chartFormattedData = {
                    labels: chartLogs.map(log => {
                        const date = new Date(log.timestamp);
                        // Format: HH:MM (Mon DD)
                        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} (${date.toLocaleString('default', { month: 'short' })} ${date.getDate()})`;
                    }),
                    personCounts: chartLogs.map(log => log.person_count),
                    areaName: area
                };
                updateChart(chartFormattedData);

            } catch (error) {
                console.error('--- fetchHistoryAndChartData: Error fetching/processing data for chart:', error);
                updateChart(null); // Clear or show error on chart
            }
        } else if (chartCanvas) {
            console.log("--- fetchHistoryAndChartData: No area selected for chart, or canvas missing. Clearing chart.");
            updateChart(null);
        }
    }


    function populateHistoryTable(logs) {
        if (!historyTableBody) {
            console.warn("--- populateHistoryTable: historyTableBody element not found.");
            return;
        }
        historyTableBody.innerHTML = ''; // Clear existing rows
        console.log("--- populateHistoryTable: Populating table with logs count:", logs.length);

        if (logs.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No detection logs found for the selected criteria.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const row = historyTableBody.insertRow();
            row.insertCell().textContent = new Date(log.timestamp).toLocaleString();
            row.insertCell().textContent = log.camera_id;
            row.insertCell().textContent = log.area_name;
            row.insertCell().textContent = log.mode;
            row.insertCell().textContent = log.person_count !== null ? log.person_count : 'N/A';
            row.insertCell().textContent = log.density !== null ? log.density.toFixed(2) : 'N/A';
            row.insertCell().textContent = log.entry_count !== null ? log.entry_count : 'N/A';
            row.insertCell().textContent = log.exit_count !== null ? log.exit_count : 'N/A';
        });
    }

    // Event Listeners
    if (applyFilterButton) {
        applyFilterButton.addEventListener('click', () => {
            console.log("--- EventListener: Apply Filter button clicked.");
            fetchHistoryAndChartData(1); // Reset to page 1 for table, and update chart
        });
    } else { console.warn("Apply Filter button not found."); }

    if (clearFilterButton) {
        clearFilterButton.addEventListener('click', () => {
            console.log("--- EventListener: Clear Filter button clicked.");
            if (areaFilter) areaFilter.value = '';
            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';
            fetchHistoryAndChartData(1);
        });
    } else { console.warn("Clear Filter button not found."); }

    if (prevPageButton) {
        prevPageButton.addEventListener('click', () => {
            if (currentPage > 1) {
                console.log("--- EventListener: Previous Page button clicked.");
                fetchHistoryAndChartData(currentPage - 1);
            }
        });
    } else { console.warn("Previous Page button not found."); }

    if (nextPageButton) {
        nextPageButton.addEventListener('click', () => {
            // The disabled state of nextPageButton should prevent fetching beyond last page
            // if (nextPageButton.disabled === false) { // This check isn't strictly needed due to disabled logic
            console.log("--- EventListener: Next Page button clicked.");
            fetchHistoryAndChartData(currentPage + 1);
            // }
        });
    } else { console.warn("Next Page button not found."); }

    // Initial load
    console.log("--- initializeHistoryPage: Performing initial data load...");
    await populateAreaFilter();
    await fetchHistoryAndChartData(); // Initial fetch for table, chart will be blank until area selected
    console.log("--- initializeHistoryPage: Initial data load complete.");
}