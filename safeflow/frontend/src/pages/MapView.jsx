import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const zoneColors = {
  overcrowded: '#ef4444',
  lockdown: '#f97316',
  conflict: '#a855f7',
  safe: '#22c55e',
  camera: '#3b82f6'
};

const createColoredIcon = (color) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

export default function MapView() {
  const [zones, setZones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default center (can be updated to a specific city later)
  const defaultCenter = [51.505, -0.09];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        const [zonesRes, camerasRes] = await Promise.all([
          axios.get(`${apiUrl}/api/zones/`, { headers }),
          axios.get(`${apiUrl}/api/cameras/`, { headers })
        ]);

        setZones(zonesRes.data);
        setCameras(camerasRes.data.filter(c => c.latitude && c.longitude));
      } catch (error) {
        console.error("Error fetching map data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="text-white">Loading map...</div>;

  // Determine initial center based on data
  let center = defaultCenter;
  if (cameras.length > 0) {
      center = [cameras[0].latitude, cameras[0].longitude];
  } else if (zones.length > 0) {
      center = [zones[0].latitude, zones[0].longitude];
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Live City Map</h1>
        <p className="text-gray-400">Geospatial overview of cameras and safety zones.</p>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border border-gray-700 bg-gray-800 shadow-xl relative min-h-[500px]">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Render Cameras */}
          {cameras.map(camera => (
            <Marker
              key={`cam-${camera.id}`}
              position={[camera.latitude, camera.longitude]}
              icon={createColoredIcon(zoneColors.camera)}
            >
              <Popup className="custom-popup">
                <div className="font-sans">
                  <h3 className="font-bold text-lg mb-1">{camera.area_name}</h3>
                  <p className="text-sm text-gray-600">Camera ID: {camera.id}</p>
                  <p className="text-sm text-gray-600">Mode: <span className="font-semibold">{camera.mode}</span></p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render Zones */}
          {zones.map(zone => (
            <Marker
              key={`zone-${zone.id}`}
              position={[zone.latitude, zone.longitude]}
              icon={createColoredIcon(zoneColors[zone.zone_type] || '#ffffff')}
            >
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-lg mb-1 capitalize">{zone.zone_type} Zone</h3>
                  <p className="text-sm text-gray-600">{zone.description}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-6 right-6 bg-gray-900/90 backdrop-blur border border-gray-700 p-4 rounded-xl z-[1000] shadow-lg">
          <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Legend</h4>
          <div className="space-y-2">
            {Object.entries(zoneColors).map(([key, color]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }}></div>
                <span className="text-gray-300 text-sm capitalize">{key}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
