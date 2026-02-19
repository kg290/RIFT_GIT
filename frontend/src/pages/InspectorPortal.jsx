import { useState, useEffect, useCallback } from 'react';
import { Scale, Shield, Search, RefreshCw, Eye, Hash, Send, ChevronRight, AlertCircle } from 'lucide-react';
import {
  registerInspector, getInspectorProfile, getInspectorCases,
  commitVerdict, advanceToReveal, revealVerdict, finalizeVerification,
  generateCommitHash, getVerificationStatus, beginVerification,
} from '../lib/api';
import { VERDICT_LABELS, CATEGORY_INFO } from '../lib/constants';
import { Badge, EmptyState, PageHeader } from '../components/UI';

export default function InspectorPortal() {
  const [address, setAddress] = useState('');
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Verdict form state
  const [activeCase, setActiveCase] = useState(null);
  const [verdict, setVerdict] = useState(1);
  const [secret, setSecret] = useState('');
  const [commitHash, setCommitHash] = useState('');

  const flash = (m) => { setMsg(m); setErr(null); setTimeout(() => setMsg(null), 4000); };
  const flashErr = (e) => { setErr(typeof e === 'string' ? e : e?.response?.data?.detail || e?.message || 'Error'); setMsg(null); };

  const loadProfile = useCallback(async (addr) => {
    try {
      const p = await getInspectorProfile(addr);
      setProfile(p);
      const c = await getInspectorCases(addr);
      setCases(c);
    } catch { setProfile(null); setCases([]); }
  }, []);

  const handleAuth = async () => {
    if (!address.trim()) return;
    setLoading(true);
    try {
      await loadProfile(address);
      setAuthed(true);
    } catch {
      // Not registered — register first
      try {
        await registerInspector({ address, name: 'Inspector ' + address.slice(0, 6), specializations: ['general'] });
        await loadProfile(address);
        setAuthed(true);
        flash('Registered & authenticated');
      } catch (e) { flashErr(e); }
    }
    setLoading(false);
  };

  const refresh = () => address && loadProfile(address);

  // ── Actions ──
  const doBegin = async (evidenceId) => {
    try {
      await beginVerification({ evidence_id: evidenceId, inspector_addresses: [address] });
      flash('Verification session started');
      refresh();
    } catch (e) { flashErr(e); }
  };

  const doCommit = async (evidenceId) => {
    if (!secret) return flashErr('Enter a secret phrase');
    try {
      const h = await generateCommitHash({ verdict_code: verdict, secret_phrase: secret });
      setCommitHash(h.commit_hash);
      await commitVerdict({ evidence_id: evidenceId, inspector_address: address, commit_hash: h.commit_hash });
      flash('Verdict committed');
      refresh();
    } catch (e) { flashErr(e); }
  };

  const doAdvance = async (evidenceId) => {
    try {
      await advanceToReveal({ evidence_id: evidenceId });
      flash('Advanced to reveal phase');
      refresh();
    } catch (e) { flashErr(e); }
  };

  const doReveal = async (evidenceId) => {
    if (!secret) return flashErr('Enter your secret');
    try {
      await revealVerdict({ evidence_id: evidenceId, inspector_address: address, verdict_code: verdict, secret_phrase: secret });
      flash('Verdict revealed');
      refresh();
    } catch (e) { flashErr(e); }
  };

  const doFinalize = async (evidenceId) => {
    try {
      await finalizeVerification({ evidence_id: evidenceId });
      flash('Verification finalized');
      refresh();
    } catch (e) { flashErr(e); }
  };

  // ── Auth Screen ──
  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center mx-auto mb-4">
            <Scale className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Inspector Portal</h1>
          <p className="text-sm text-zinc-400">Enter your Algorand address to authenticate</p>
        </div>
        <div className="card p-6 space-y-4">
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="ALGO address…"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors font-mono" />
          <button onClick={handleAuth} disabled={loading || !address.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 text-black text-sm font-semibold cursor-pointer hover:bg-amber-400 transition-colors border-none disabled:opacity-40">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {loading ? 'Authenticating…' : 'Authenticate'}
          </button>
          {err && <p className="text-xs text-red-400 text-center">{err}</p>}
        </div>
      </div>
    );
  }

  // ── Main Portal ──
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="Inspector Access" badgeIcon={Scale} title="Inspector Portal"
        subtitle="Review evidence, commit verdicts, and finalize verification sessions." />

      {/* Alerts */}
      {msg && <div className="card p-3 mb-4 border-emerald-500/30 text-emerald-400 text-sm anim-slide-down">{msg}</div>}
      {err && <div className="card p-3 mb-4 border-red-500/30 text-red-400 text-sm flex items-center gap-2 anim-slide-down"><AlertCircle className="w-4 h-4" />{err}</div>}

      {/* Profile bar */}
      {profile && (
        <div className="card p-4 mb-6 flex items-center justify-between anim-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 grid place-items-center">
              <Scale className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{profile.name || 'Inspector'}</p>
              <p className="text-xs text-zinc-500 font-mono">{address.slice(0, 10)}…{address.slice(-6)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>Cases: <strong className="text-white">{profile.total_cases || 0}</strong></span>
            <span>Accuracy: <strong className="text-emerald-400">{profile.accuracy || 'N/A'}</strong></span>
            <button onClick={refresh} className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Cases */}
      {cases.length === 0 ? (
        <EmptyState icon={Eye} title="No assigned cases" description="Cases appear here when evidence is assigned for verification." />
      ) : (
        <div className="space-y-3 anim-fade-up del-1">
          {cases.map((c) => {
            const cat = CATEGORY_INFO[c.category] || {};
            const isActive = activeCase === c.evidence_id;
            return (
              <div key={c.evidence_id} className="card overflow-hidden">
                {/* Header row */}
                <button onClick={() => setActiveCase(isActive ? null : c.evidence_id)}
                  className="w-full flex items-center justify-between px-5 py-4 cursor-pointer bg-transparent border-none text-left hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.emoji || '📄'}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{c.evidence_id?.slice(0, 16)}…</p>
                      <p className="text-xs text-zinc-500">{cat.label || c.category} · {c.organization || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={c.phase === 'finalized' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : c.phase === 'reveal' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' : 'bg-amber-500/15 text-amber-400 border-amber-500/25'}>
                      {c.phase || c.status}
                    </Badge>
                    <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Expanded actions */}
                {isActive && (
                  <div className="px-5 pb-5 border-t border-zinc-800 pt-4 space-y-4 anim-slide-down">
                    {/* Verdict selector */}
                    <div>
                      <label className="block text-xs text-zinc-500 mb-2">Verdict</label>
                      <div className="flex gap-2">
                        {Object.entries(VERDICT_LABELS).map(([code, label]) => (
                          <button key={code} type="button" onClick={() => setVerdict(Number(code))}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer border transition-all
                              ${verdict === Number(code) ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Secret */}
                    <div>
                      <label className="block text-xs text-zinc-500 mb-2">Secret Phrase</label>
                      <input value={secret} onChange={e => setSecret(e.target.value)} placeholder="Your secret for commit-reveal…"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>

                    {commitHash && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs text-zinc-400 font-mono truncate">{commitHash}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => doBegin(c.evidence_id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium cursor-pointer hover:bg-indigo-500 border-none transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Begin
                      </button>
                      <button onClick={() => doCommit(c.evidence_id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-medium cursor-pointer hover:bg-amber-400 border-none transition-colors">
                        <Send className="w-3.5 h-3.5" /> Commit
                      </button>
                      <button onClick={() => doAdvance(c.evidence_id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-700 text-white text-xs font-medium cursor-pointer hover:bg-zinc-600 border-none transition-colors">
                        Advance
                      </button>
                      <button onClick={() => doReveal(c.evidence_id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer hover:bg-blue-500 border-none transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Reveal
                      </button>
                      <button onClick={() => doFinalize(c.evidence_id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium cursor-pointer hover:bg-emerald-500 border-none transition-colors">
                        Finalize
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
