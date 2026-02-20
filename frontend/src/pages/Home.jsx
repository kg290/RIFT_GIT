import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, ArrowRight, Database, Upload, FileCheck, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { checkHealth } from '../lib/api';

const FEATURES = [
  { icon: Lock,     title: 'End-to-End Encrypted',  desc: 'AES-256 encryption in your browser before anything leaves your device.' },
  { icon: Database, title: 'Blockchain Anchored',    desc: 'Evidence hash permanently recorded on Algorand — immutable & timestamped.' },
  { icon: Eye,      title: 'Fully Anonymous',        desc: 'One-time wallets. No accounts, no emails, no KYC. Zero identity linkage.' },
  { icon: Shield,   title: 'Inspector Verified',     desc: 'Blind commit-reveal consensus by multiple inspectors ensures unbiased results.' },
];

const STEPS = [
  { n: '01', icon: Upload,    t: 'Create wallet & upload',  d: 'Generate an anonymous Algorand wallet and upload your evidence files.' },
  { n: '02', icon: Lock,      t: 'Encrypt & pin to IPFS',   d: 'Files encrypted client-side, then pinned to decentralized storage.' },
  { n: '03', icon: Database,  t: 'Anchor on-chain',         d: 'Hash recorded on Algorand with a tamper-proof timestamp.' },
  { n: '04', icon: FileCheck, t: 'Verify & resolve',        d: 'Inspectors verify evidence; stake is resolved automatically on-chain.' },
];

export default function Home() {
  const { health, setHealth } = useStore();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); checkHealth().then(setHealth).catch(() => {}); }, [setHealth]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="pt-24 pb-20 text-center">
        <div className={ready ? 'anim-fade-up' : 'opacity-0'}>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs mb-8 bg-indigo-50 border border-indigo-200 text-indigo-600">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-medium">Decentralized Whistleblower Protection</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>
        <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight text-slate-800 ${ready ? 'anim-fade-up del-1' : 'opacity-0'}`}>
          Expose corruption.<br /><span className="gradient-text">Stay anonymous.</span>
        </h1>
        <p className={`text-base sm:text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed ${ready ? 'anim-fade-up del-2' : 'opacity-0'}`}>
          Submit evidence securely using <span className="text-slate-800 font-medium">Algorand</span>,{' '}
          <span className="text-slate-800 font-medium">IPFS</span>, and{' '}
          <span className="text-slate-800 font-medium">military-grade encryption</span>.
        </p>
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 ${ready ? 'anim-fade-up del-3' : 'opacity-0'}`}>
          <Link to="/submit" className="group flex items-center gap-2 text-white px-8 py-3.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20">
            Submit Evidence <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link to="/how-it-works" className="px-8 py-3.5 rounded-xl font-medium text-sm text-slate-600 hover:text-slate-800 bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all">
            How It Works
          </Link>
        </div>
        {health && (
          <div className="mt-10 inline-flex items-center gap-3 text-xs text-slate-400 anim-fade-in del-4">
            <span className={`w-1.5 h-1.5 rounded-full ${health.algorand_connected ? 'bg-emerald-500' : 'bg-red-400'}`} />
            {health.network} · Round #{health.last_round?.toLocaleString()}
          </div>
        )}
      </section>

      <section className="pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map(({ icon: I, title, desc }) => (
          <div key={title} className="card p-6 hover:border-slate-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 grid place-items-center shrink-0">
                <I className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">How It Works</h2>
          <p className="text-sm text-slate-500">From anonymous submission to immutable record in four steps</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map(({ n, icon: I, t, d }) => (
            <div key={n} className="card p-5 hover:border-slate-300 transition-colors">
              <div className="text-xs font-mono text-indigo-600 mb-3">{n}</div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 grid place-items-center mb-3"><I className="w-4 h-4 text-slate-600" /></div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{t}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="card p-10 sm:p-14 text-center bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">Ready to expose the truth?</h3>
          <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">Your identity is protected by cryptography and decentralized infrastructure.</p>
          <Link to="/submit" className="inline-flex items-center gap-2 text-white px-8 py-3.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
            Submit Evidence <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="pb-10 text-center border-t border-slate-200 pt-8">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 flex-wrap">
          <span>Built on Algorand Testnet</span><span>·</span>
          <span className="font-mono text-slate-500">App ID 755784943</span><span>·</span>
          <a href="https://testnet.explorer.perawallet.app/application/755784943" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-500">Explorer <ExternalLink className="w-3 h-3" /></a>
        </div>
        <p className="text-xs text-slate-400 mt-2">WhistleChain RIFT 2026 — Trust math, not promises.</p>
      </footer>
    </div>
  );
}
