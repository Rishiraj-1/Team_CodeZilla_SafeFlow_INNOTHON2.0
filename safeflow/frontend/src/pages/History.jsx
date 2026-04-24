import { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Users, AlertTriangle, Activity, Map as MapIcon, Calendar, Filter } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function History() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);

  const [selectedArea, setSelectedArea] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [selectedArea, startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      let url = `${apiUrl}/api/logs/?limit=100`;

      if (selectedArea) url += `&area_name=${selectedArea}`;
      if (startDate) url += `&start_date=${startDate}T00:00:00`;
      if (endDate) url += `&end_date=${endDate}T23:59:59`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      setLogs(data);

      if (areas.length === 0) {
        const uniqueAreas = [...new Set(data.map(log => log.area_name))];
        setAreas(uniqueAreas);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [...logs].reverse().map(log => ({
    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    count: log.person_count,
    density: log.density
  }));

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Metrics Analysis</h1>
        <p className="text-[var(--color-aura-text-muted)] font-medium text-lg">Historical data trends and anomaly detection logs.</p>
      </div>

      {/* Filters */}
      <div className="skeuo-raised p-8 rounded-[2rem] flex flex-wrap gap-6 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-[var(--color-aura-text-muted)] uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-[var(--color-aura-primary)]" /> Sector
          </label>
          <div className="skeuo-sunken rounded-xl p-1">
            <select
              className="w-full bg-transparent border-none px-4 py-3 text-white focus:outline-none focus:ring-0 font-medium appearance-none"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="" className="bg-[var(--color-aura-surface)]">Global View</option>
              {areas.map(area => (
                <option key={area} value={area} className="bg-[var(--color-aura-surface)]">{area}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-[var(--color-aura-text-muted)] uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-aura-secondary)]" /> Epoch Start
          </label>
          <div className="skeuo-sunken rounded-xl p-1">
            <input
              type="date"
              className="w-full bg-transparent border-none px-4 py-3 text-white focus:outline-none focus:ring-0 font-medium"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-[var(--color-aura-text-muted)] uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-aura-secondary)]" /> Epoch End
          </label>
          <div className="skeuo-sunken rounded-xl p-1">
            <input
              type="date"
              className="w-full bg-transparent border-none px-4 py-3 text-white focus:outline-none focus:ring-0 font-medium"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
        <button
          onClick={() => { setSelectedArea(''); setStartDate(''); setEndDate(''); }}
          className="skeuo-button px-8 py-4 rounded-xl text-white font-bold tracking-wide flex items-center gap-2"
        >
          <Filter className="w-5 h-5" /> Reset
        </button>
      </div>

      {/* Chart */}
      <div className="skeuo-raised p-8 rounded-[2rem] relative overflow-hidden">
        {/* Glow effect behind chart */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[var(--color-aura-primary)]/5 blur-[100px] pointer-events-none"></div>

        <h3 className="text-xl font-bold text-white mb-8 tracking-wide flex items-center gap-3">
          <Activity className="w-6 h-6 text-[var(--color-aura-primary)]" /> Entity Frequency
        </h3>

        <div className="h-[450px] w-full skeuo-sunken rounded-2xl p-6 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-aura-primary)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--color-aura-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--color-aura-text-muted)" axisLine={false} tickLine={false} dy={10} />
              <YAxis stroke="var(--color-aura-text-muted)" axisLine={false} tickLine={false} dx={-10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-aura-surface)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '1rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ color: 'var(--color-aura-primary)', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="count" stroke="var(--color-aura-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="skeuo-raised rounded-[2rem] overflow-hidden">
        <div className="p-6 border-b border-white/5">
            <h3 className="text-xl font-bold text-white tracking-wide">Raw Data Feed</h3>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-aura-text-muted)] uppercase tracking-widest border-b border-white/5">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-aura-text-muted)] uppercase tracking-widest border-b border-white/5">Sector</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-aura-text-muted)] uppercase tracking-widest border-b border-white/5">Mode</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-aura-text-muted)] uppercase tracking-widest border-b border-white/5">Metrics</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-aura-text-muted)] uppercase tracking-widest border-b border-white/5">Density</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5 text-sm font-medium text-[var(--color-aura-text-main)]">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-5 font-bold text-white">{log.area_name}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${log.mode === 'tripwire' ? 'bg-[var(--color-aura-primary)]/20 text-[var(--color-aura-primary)] border border-[var(--color-aura-primary)]/30' : 'bg-[var(--color-aura-secondary)]/20 text-[var(--color-aura-secondary)] border border-[var(--color-aura-secondary)]/30'}`}>
                      {log.mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-[var(--color-aura-text-main)]">
                    {log.mode === 'tripwire' ? (
                        <span className="flex items-center gap-2"><span className="text-[var(--color-aura-secondary)]">{log.entries} In</span> / <span className="text-[var(--color-aura-danger)]">{log.exits} Out</span></span>
                    ) : (
                        <span className="text-[var(--color-aura-primary)] text-lg">{log.person_count}</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-[var(--color-aura-text-main)]">
                      {log.density ? <span className="text-[var(--color-aura-accent)]">{log.density.toFixed(2)}</span> : '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[var(--color-aura-text-muted)] font-medium text-lg">
                    No anomalies detected in current parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
