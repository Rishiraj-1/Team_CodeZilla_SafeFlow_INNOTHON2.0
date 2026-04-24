import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function Login({ setIsAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/api/auth/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      localStorage.setItem('token', response.data.access_token);
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failure.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-aura-bg)] flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-aura-primary)]/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-aura-secondary)]/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-lg relative z-10">

        <Link to="/" className="inline-flex items-center gap-2 text-[var(--color-aura-text-muted)] hover:text-white font-medium mb-8 pl-2">
            <ArrowLeft className="w-5 h-5" /> Retreat
        </Link>

        <div className="skeuo-raised rounded-[2rem] p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 skeuo-sunken rounded-2xl mb-6">
                <ShieldCheck className="w-10 h-10 text-[var(--color-aura-secondary)]" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Access Nexus</h1>
            <p className="text-[var(--color-aura-text-muted)] font-medium">Authenticate to initiate protocol</p>
          </div>

          {error && (
            <div className="bg-[var(--color-aura-danger)]/10 border border-[var(--color-aura-danger)]/30 text-[var(--color-aura-danger)] rounded-xl p-4 mb-8 text-sm font-bold text-center skeuo-sunken">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="block text-sm font-bold text-[var(--color-aura-text-muted)] mb-3 uppercase tracking-wider ml-1">Identity</label>
              <div className="relative skeuo-sunken rounded-xl p-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[var(--color-aura-text-muted)]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-transparent border-none text-white placeholder-[var(--color-aura-text-muted)] focus:outline-none focus:ring-0 font-medium"
                  placeholder="operator@safeflow.net"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--color-aura-text-muted)] mb-3 uppercase tracking-wider ml-1">Passcode</label>
              <div className="relative skeuo-sunken rounded-xl p-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[var(--color-aura-text-muted)]" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-transparent border-none text-white placeholder-[var(--color-aura-text-muted)] focus:outline-none focus:ring-0 font-medium"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full skeuo-button-primary py-4 rounded-xl text-lg font-bold tracking-wide mt-4"
            >
              {loading ? 'Authenticating...' : 'Initialize'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
