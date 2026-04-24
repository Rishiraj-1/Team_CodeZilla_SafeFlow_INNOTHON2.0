import { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Users, AlertTriangle, Activity, ScanLine } from 'lucide-react';

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [liveStatuses, setLiveStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchCameras = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await axios.get(`${apiUrl}/api/cameras/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCameras(response.data);
    } catch (error) {
      console.error("Error fetching cameras:", error);
    }
  };

  const fetchLiveStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await axios.get(`${apiUrl}/api/cameras/live_statuses/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLiveStatuses(response.data);
    } catch (error) {
      console.error("Error fetching live statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
    fetchLiveStatuses();

    const interval = setInterval(fetchLiveStatuses, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Activity className="w-12 h-12 text-[var(--color-aura-primary)] animate-pulse" />
                <p className="text-[var(--color-aura-text-muted)] font-bold tracking-widest uppercase">Initializing Nexus...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Central Terminal</h1>
          <p className="text-[var(--color-aura-text-muted)] font-medium text-lg">Real-time surveillance and entity tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
        {cameras.map((camera) => {
          const status = liveStatuses[camera.id] || {};
          const isAlert = status.is_alert;

          return (
            <div key={camera.id} className={`skeuo-raised rounded-[2rem] overflow-hidden transition-all duration-500 ${isAlert ? 'border-[var(--color-aura-danger)] shadow-[0_0_30px_rgba(255,103,103,0.2)]' : ''}`}>
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center relative overflow-hidden">
                {isAlert && <div className="absolute inset-0 bg-[var(--color-aura-danger)]/10 animate-pulse"></div>}

                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 skeuo-sunken rounded-lg">
                    <Camera className="w-5 h-5 text-[var(--color-aura-primary)]" />
                  </div>
                  <h3 className="font-bold text-white text-xl tracking-wide">{camera.area_name}</h3>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                   <span className={`px-3 py-1.5 text-xs font-bold rounded-lg border uppercase tracking-wider ${camera.mode === 'tripwire' ? 'bg-[var(--color-aura-accent)]/10 text-[var(--color-aura-accent)] border-[var(--color-aura-accent)]/30' : 'bg-[var(--color-aura-secondary)]/10 text-[var(--color-aura-secondary)] border-[var(--color-aura-secondary)]/30'}`}>
                      {camera.mode}
                   </span>
                   {isAlert && (
                     <span className="flex items-center gap-1.5 text-xs font-bold bg-[var(--color-aura-danger)] text-white px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-[0_0_15px_var(--color-aura-danger)] animate-pulse">
                        <AlertTriangle className="w-4 h-4" /> Breach
                     </span>
                   )}
                </div>
              </div>

              {/* Video Feed */}
              <div className="relative aspect-video bg-[#050505] p-2 skeuo-sunken m-4 rounded-2xl overflow-hidden group">
                <div className="absolute inset-0 flex items-center justify-center text-[var(--color-aura-text-muted)] z-0 flex-col gap-2">
                  <ScanLine className="w-10 h-10 animate-ping opacity-50" />
                  <span className="text-xs uppercase tracking-widest font-bold opacity-50">Establishing Link</span>
                </div>

                {/* Scanner line effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-aura-secondary)]/10 to-transparent w-full h-[10%] opacity-0 group-hover:opacity-100 z-20 animate-[scan_2s_ease-in-out_infinite] pointer-events-none mix-blend-overlay"></div>

                <img
                  src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/stream/video_feed/${camera.id}?token=${localStorage.getItem('token')}`}
                  alt={`Live feed from ${camera.area_name}`}
                  className="w-full h-full object-cover relative z-10 rounded-xl"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>

              {/* Metrics */}
              <div className="p-6 pt-2 grid grid-cols-2 gap-4">
                <div className="skeuo-sunken rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-aura-primary)]"></div>
                  <p className="text-xs font-bold text-[var(--color-aura-text-muted)] mb-2 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {camera.mode === 'tripwire' ? 'Occupancy' : 'Entities'}
                  </p>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {camera.mode === 'tripwire' ? (status.occupancy || 0) : (status.person_count || 0)}
                  </p>
                </div>

                <div className="skeuo-sunken rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-aura-secondary)]"></div>
                  <p className="text-xs font-bold text-[var(--color-aura-text-muted)] mb-2 uppercase tracking-widest">
                    {camera.mode === 'tripwire' ? 'Flow (In/Out)' : 'Density'}
                  </p>
                  <p className="text-2xl font-black text-white tracking-tighter flex items-baseline gap-1 mt-2">
                     {camera.mode === 'tripwire' ? (
                       <span className="text-xl"><span className="text-[var(--color-aura-secondary)]">{status.total_entries || 0}</span> <span className="text-[var(--color-aura-text-muted)]">/</span> <span className="text-[var(--color-aura-danger)]">{status.total_exits || 0}</span></span>
                     ) : (
                       <span>{status.density !== undefined ? status.density.toFixed(2) : '0.00'} <span className="text-sm text-[var(--color-aura-text-muted)] font-bold ml-1">p/m²</span></span>
                     )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {cameras.length === 0 && (
          <div className="col-span-full py-24 text-center skeuo-sunken rounded-[3rem] border border-white/5">
             <div className="w-20 h-20 bg-[var(--color-aura-surface)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Camera className="w-10 h-10 text-[var(--color-aura-text-muted)]" />
             </div>
             <h3 className="text-2xl font-bold text-white tracking-wide mb-2">No Active Nodes</h3>
             <p className="text-[var(--color-aura-text-muted)] font-medium text-lg max-w-md mx-auto">Please configure camera sources via the system administrator interface to begin monitoring.</p>
          </div>
        )}
      </div>
    </div>
  );
}
