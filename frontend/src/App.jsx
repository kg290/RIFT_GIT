import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Submit from './pages/Submit';
import Dashboard from './pages/Dashboard';
import InspectorPortal from './pages/InspectorPortal';
import Resolution from './pages/Resolution';
import AuditTrail from './pages/AuditTrail';
import AdminPortal from './pages/AdminPortal';
import HowItWorks from './pages/HowItWorks';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-slate-800 overflow-x-hidden">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inspector" element={<InspectorPortal />} />
            <Route path="/resolution" element={<Resolution />} />
            <Route path="/audit" element={<AuditTrail />} />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
