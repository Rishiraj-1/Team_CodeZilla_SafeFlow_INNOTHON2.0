import { Link } from 'react-router-dom';
import { Activity, Map, ArrowRight, Video, ShieldCheck, Zap } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--color-aura-bg)] text-[var(--color-aura-text-main)] overflow-hidden relative">

      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--color-aura-primary)]/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-aura-secondary)]/15 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Navbar */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="text-3xl font-extrabold flex items-center gap-2 tracking-tight">
          <ShieldCheck className="w-8 h-8 text-[var(--color-aura-secondary)]" />
          <span className="aura-text-gradient">SafeFlow</span>
        </div>
        <div className="flex items-center gap-8">
          <Link to="/about" className="text-[var(--color-aura-text-muted)] hover:text-white transition-colors font-medium">
            Discover
          </Link>
          <Link
            to="/login"
            className="skeuo-button-primary px-8 py-2.5 rounded-xl font-bold tracking-wide"
          >
            Enter Node
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full skeuo-sunken text-sm font-semibold text-[var(--color-aura-secondary)] mb-8">
          <Zap className="w-4 h-4" /> Next-Gen Urban Security
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-tight text-white drop-shadow-2xl">
          Omniscient <br />
          <span className="aura-text-gradient">Crowd Analytics.</span>
        </h1>

        <p className="text-xl md:text-2xl text-[var(--color-aura-text-muted)] max-w-3xl mb-14 font-light">
          Harness the visceral power of YOLOv8 object detection. SafeFlow delivers real-time density mapping and autonomous alerts within a meticulously crafted, tactile interface.
        </p>

        <div className="flex flex-col sm:flex-row gap-6">
          <Link
            to="/login"
            className="skeuo-button-primary px-10 py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3"
          >
            Initialize Dashboard <ArrowRight className="w-6 h-6" />
          </Link>
          <Link
            to="/about"
            className="skeuo-button px-10 py-5 rounded-2xl font-bold text-xl flex items-center justify-center text-[var(--color-aura-text-main)] hover:text-[var(--color-aura-secondary)]"
          >
            System Architecture
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 relative z-10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-10">
            <FeatureCard
              icon={Video}
              title="Neural Vision"
              description="Ingest local streams and deploy edge-based neural networks to map entities with absolute precision."
              color="var(--color-aura-primary)"
            />
            <FeatureCard
              icon={Activity}
              title="Tactile Alerts"
              description="Feel the pulse of your environment. Receive visceral notifications when dimensional thresholds are breached."
              color="var(--color-aura-secondary)"
            />
            <FeatureCard
              icon={Map}
              title="Spatial Mapping"
              description="Navigate a dynamic topology. Visualize active zones and coordinate tactical routing seamlessly."
              color="var(--color-aura-accent)"
            />
          </div>
        </div>
      </div>

      <footer className="py-12 mt-auto relative z-10 border-t border-white/5 bg-[var(--color-aura-bg)]/80 backdrop-blur-md">
          <div className="container mx-auto px-6 text-center font-medium text-[var(--color-aura-text-muted)]">
              &copy; {new Date().getFullYear()} SafeFlow Nexus. Operating seamlessly.
          </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }) {
  return (
    <div className="skeuo-raised p-10 rounded-3xl group">
      <div className="w-16 h-16 skeuo-sunken rounded-2xl flex items-center justify-center mb-8">
        <Icon className="w-8 h-8" style={{ color: color }} />
      </div>
      <h3 className="text-2xl font-bold text-white mb-4 tracking-wide">{title}</h3>
      <p className="text-[var(--color-aura-text-muted)] leading-relaxed text-lg">{description}</p>
    </div>
  );
}
