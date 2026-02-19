import { Link, useLocation } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

const LINKS = [
  { to: '/',           label: 'Home' },
  { to: '/submit',     label: 'Submit' },
  { to: '/dashboard',  label: 'Dashboard' },
  { to: '/inspector',  label: 'Inspector' },
  { to: '/resolution', label: 'Resolution' },
  { to: '/audit',      label: 'Audit Trail' },
  { to: '/admin',      label: 'Admin' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 grid place-items-center">
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-800">
            Whistle<span className="text-indigo-600">Chain</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-0.5">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors
                ${pathname === l.to ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <button onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 px-4 py-2 bg-white/95 anim-slide-down">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium mb-0.5
                ${pathname === l.to ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
