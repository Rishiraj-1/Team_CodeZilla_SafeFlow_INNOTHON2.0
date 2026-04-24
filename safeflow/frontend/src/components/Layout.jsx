import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, Map as MapIcon, LogOut, Menu, X, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Terminal', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Metrics', path: '/history', icon: History },
    { name: 'Topology', path: '/map', icon: MapIcon },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-aura-bg)] flex text-[var(--color-aura-text-main)] overflow-hidden">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex flex-col w-72 skeuo-raised m-4 rounded-3xl z-20">
        <div className="p-8 pb-4">
          <Link to="/" className="text-3xl font-extrabold flex items-center gap-3">
             <div className="p-2 skeuo-sunken rounded-xl">
               <ShieldCheck className="w-8 h-8 text-[var(--color-aura-secondary)]" />
             </div>
            <span className="aura-text-gradient">SafeFlow</span>
          </Link>
        </div>

        <div className="px-8 py-4">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        <nav className="flex-1 px-6 space-y-4 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
                  isActive
                    ? 'skeuo-sunken text-[var(--color-aura-secondary)]'
                    : 'text-[var(--color-aura-text-muted)] hover:text-white hover:skeuo-raised'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 px-5 py-4 w-full rounded-2xl skeuo-button text-[var(--color-aura-danger)] font-bold tracking-wide"
          >
            <LogOut className="w-6 h-6" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-20 skeuo-raised z-50 flex items-center justify-between px-6 rounded-b-3xl">
        <Link to="/" className="text-2xl font-extrabold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[var(--color-aura-secondary)]" />
          <span className="aura-text-gradient">SafeFlow</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 skeuo-sunken rounded-xl text-[var(--color-aura-text-muted)] hover:text-white"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[var(--color-aura-bg)] pt-24 px-4">
          <nav className="space-y-4 skeuo-sunken p-6 rounded-3xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
                    isActive
                      ? 'bg-[var(--color-aura-surface)] text-[var(--color-aura-secondary)] border border-white/5'
                      : 'text-[var(--color-aura-text-muted)]'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xl">{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 px-5 py-4 w-full rounded-2xl text-[var(--color-aura-danger)] font-bold mt-8"
            >
              <LogOut className="w-6 h-6" />
              <span className="text-xl">Terminate Session</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:pt-0 pt-24 h-screen overflow-y-auto relative">
         {/* Ambient glow in content area */}
         <div className="absolute top-[-10%] right-[-5%] w-[30%] h-[30%] bg-[var(--color-aura-primary)]/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="p-4 md:p-8 flex-1 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
