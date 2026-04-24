import re

with open("safeflow/README.md", "r") as f:
    content = f.read()

content = re.sub(
    r"\* \*\*Frontend:\*\*.*?Leaflet Routing Machine \(for displaying routes on the map\)",
    "* **Frontend:**\n    * Vite\n    * React.js\n    * Tailwind CSS (Aura & Skeuomorphic themes)\n    * Recharts (for data visualization)\n    * React Router DOM\n    * Lucide React (Icons)\n    * Leaflet & React-Leaflet",
    content,
    flags=re.DOTALL
)

content = re.sub(
    r"4\. \*\*Access the Application:\*\*.*?http://<your_machine_ip>:8000`\.",
    "4. **Run the React Frontend:**\n    In a new terminal window, navigate to the `frontend/` directory and run the dev server:\n    ```bash\n    cd safeflow/frontend\n    npm install\n    npm run dev\n    ```\n\n5. **Access the Application:**\n    Open your web browser and go to the local Vite URL (e.g., `http://localhost:5173`).",
    content,
    flags=re.DOTALL
)

content = content.replace("*   More sophisticated UI/UX with a frontend framework.\n", "")

with open("safeflow/README.md", "w") as f:
    f.write(content)
