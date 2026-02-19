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
    <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 grid place-items-center">
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-sm font-bold tracking-tight">
            Whistle<span className="text-indigo-400">Chain</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-0.5">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors
                ${pathname === l.to ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white'}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <button onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-zinc-800 px-4 py-2 bg-zinc-950/95 anim-slide-down">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium mb-0.5
                ${pathname === l.to ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white'}`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
