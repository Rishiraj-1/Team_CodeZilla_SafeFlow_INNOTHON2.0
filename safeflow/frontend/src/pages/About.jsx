import { Link } from 'react-router-dom';
import { ArrowLeft, Cpu, ShieldAlert, Eye, Network } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 pb-20">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center">
          <Link to="/" className="flex items-center text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 pt-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-white">How SafeFlow Works</h1>
        <p className="text-xl text-gray-400 mb-16 leading-relaxed">
          SafeFlow is engineered to provide actionable intelligence for crowd management, ensuring safety in public spaces through advanced computer vision and real-time data analysis.
        </p>

        <div className="space-y-16">
          <Section
            icon={Eye}
            title="Vision AI Integration"
            content="SafeFlow connects seamlessly to local webcams or IP streams. We utilize OpenCV to capture frames in real-time, feeding them into our high-performance inference engine."
          />
          <Section
            icon={Cpu}
            title="YOLOv8 Object Detection"
            content="At the core of SafeFlow is the state-of-the-art YOLOv8 (You Only Look Once) neural network. It accurately identifies individuals within the camera's frame, calculating crowd density (people per square meter) and identifying bottlenecks instantly."
          />
          <Section
            icon={Network}
            title="Tripwire & Analytics"
            content="Beyond simple counting, SafeFlow features a virtual Tripwire mode. By drawing interactive lines on the video feed, the system tracks the directional flow of crowds, monitoring entries, exits, and total occupancy of closed areas."
          />
          <Section
            icon={ShieldAlert}
            title="Automated Alert Pipeline"
            content="When thresholds are breached, our backend instantly triggers a multi-channel alert system. Dashboard indicators flash red, emails are dispatched via SMTP, and Telegram bots notify field personnel, ensuring rapid response times."
          />
        </div>

        <div className="mt-20 bg-blue-600/10 border border-blue-500/20 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to secure your premises?</h3>
            <Link to="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
                Access Dashboard
            </Link>
        </div>
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, content }) {
  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start">
      <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
        <Icon className="w-8 h-8 text-blue-400" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
        <p className="text-lg text-gray-400 leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
