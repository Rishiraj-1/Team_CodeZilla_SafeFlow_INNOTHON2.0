document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('tripwireCanvas');
        const ctx = canvas.getContext('2d');
        const videoFeed = document.getElementById('tripwireFeed');
        const saveButton = document.getElementById('saveTripwireButton');
        const clearButton = document.getElementById('clearTripwireButton');
        const statusP = document.getElementById('tripwireStatus');
        const lineCoordsP = document.getElementById('lineCoords');
    
        let points = [];
        let currentLine = initialLine.x1 !== null ? [ // From template
            {x: initialLine.x1, y: initialLine.y1},
            {x: initialLine.x2, y: initialLine.y2}
        ] : [];

        // Ensure canvas is same size as video
        // The HTML sets fixed size, but good practice if dynamic
        function resizeCanvas() {
            canvas.width = videoFeed.clientWidth;
            canvas.height = videoFeed.clientHeight;
            if (currentLine.length === 2) drawLine(currentLine[0], currentLine[1]);
        }
        
        videoFeed.onload = () => { // Or onloadedmetadata if it were a <video> element
            resizeCanvas();
        };
        window.onresize = resizeCanvas; // If layout is responsive
        resizeCanvas(); // Initial call
    
    
        function drawLine(p1, p2) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Draw points
            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }

        if (currentLine.length === 2) {
            drawLine(currentLine[0], currentLine[1]);
        }
    
        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
    
            if (points.length < 2) {
                points.push({ x, y });
                ctx.fillStyle = 'blue';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();
    
                if (points.length === 2) {
                    drawLine(points[0], points[1]);
                    currentLine = [...points]; // Store the drawn line
                    lineCoordsP.textContent = `(${points[0].x.toFixed(0)}, ${points[0].y.toFixed(0)}) to (${points[1].x.toFixed(0)}, ${points[1].y.toFixed(0)})`;
                }
            } else {
                // If 2 points already exist, clear and start over with this click as first point
                points = [{ x, y }];
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'blue';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();
                currentLine = [];
                lineCoordsP.textContent = `Point 1: (${x.toFixed(0)}, ${y.toFixed(0)}) - Click second point`;
            }
        });
    
        clearButton.addEventListener('click', () => {
            points = [];
            currentLine = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            statusP.textContent = 'Line cleared. Click two points to draw a new line.';
            lineCoordsP.textContent = 'Not set';
        });
    
        saveButton.addEventListener('click', async () => {
            if (currentLine.length !== 2) {
                statusP.textContent = 'Please draw a complete line (2 points) first.';
                statusP.style.color = 'red';
                return;
            }
    
            const tripwireData = {
                x1: Math.round(currentLine[0].x),
                y1: Math.round(currentLine[0].y),
                x2: Math.round(currentLine[1].x),
                y2: Math.round(currentLine[1].y)
            };
    
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/cameras/${cameraIdForTripwire}/set_tripwire`, {
                    method: 'POST',
                    body: JSON.stringify(tripwireData),
                });
    
                if (response.ok) {
                    statusP.textContent = 'Tripwire line saved successfully!';
                    statusP.style.color = 'green';
                    // Optionally redirect or update UI
                } else {
                    const error = await response.json();
                    statusP.textContent = `Error saving tripwire: ${error.detail}`;
                    statusP.style.color = 'red';
                }
            } catch (error) {
                statusP.textContent = `An error occurred: ${error.message}`;
                statusP.style.color = 'red';
                console.error('Error saving tripwire:', error);
            }
        });
    });