import { useState, useCallback } from 'react';
import { Scale, Shield, RefreshCw, Eye, Hash, Send, ChevronRight, AlertCircle, UserPlus, LogIn, Play } from 'lucide-react';
import {
  registerInspector, getInspectorProfile, getInspectorCases,
  commitVerdict, advanceToReveal, revealVerdict, finalizeVerification,
  generateCommitHash, getVerificationStatus, beginVerification, listInspectors,
  getAllSubmissions,
} from '../lib/api';
import { VERDICT_LABELS, CATEGORY_INFO, CATEGORIES, PHASE_COLORS, STATUS_COLORS } from '../lib/constants';
import { Badge, EmptyState, PageHeader } from '../components/UI';

const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors';

export default function InspectorPortal() {
  const [mode, setMode] = useState('choose');
  const [address, setAddress] = useState('');
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [cases, setCases] = useState([]);
  const [pendingSubs, setPendingSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Registration form
  const [regName, setRegName] = useState('');
  const [regDept, setRegDept] = useState('');
  const [regEmpId, setRegEmpId] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regJurisdiction, setRegJurisdiction] = useState('');
  const [regExperience, setRegExperience] = useState(0);
  const [regEmail, setRegEmail] = useState('');
  const [regSpecs, setRegSpecs] = useState([]);

  // Verdict form
  const [activeCase, setActiveCase] = useState(null);
  const [verdict, setVerdict] = useState(1);
  const [nonce, setNonce] = useState('');
  const [justificationIpfs, setJustificationIpfs] = useState('');
  const [commitHash, setCommitHash] = useState('');

  const flash = (m) => { setMsg(m); setErr(null); setTimeout(() => setMsg(null), 5000); };
  const flashErr = (e) => { setErr(typeof e === 'string' ? e : e?.response?.data?.detail || e?.message || 'Error'); setMsg(null); };

  const loadProfile = useCallback(async (addr) => {
    const p = await getInspectorProfile(addr);
    if (p.error) throw new Error(p.error);
    setProfile(p);
    const c = await getInspectorCases(addr);
    setCases(Array.isArray(c) ? c : []);
    // Also load pending submissions so inspector can begin verification
    try {
      const allSubs = await getAllSubmissions();
      setPendingSubs(allSubs.filter(s => s.status === 'PENDING'));
    } catch { setPendingSubs([]); }
  }, []);

  const handleLogin = async () => {
    if (!address.trim()) return;
    setLoading(true); setErr(null);
    try { await loadProfile(address); setAuthed(true); flash('Authenticated successfully'); }
    catch { flashErr('Inspector not found. Please register first.'); }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!address.trim() || !regName.trim()) return flashErr('Address and name are required');
    if (regSpecs.length === 0) return flashErr('Select at least one specialization');
    setLoading(true); setErr(null);
    try {
      await registerInspector({
        address: address.trim(), name: regName.trim(), specializations: regSpecs,
        department: regDept.trim(), employee_id: regEmpId.trim(), designation: regDesignation.trim(),
        jurisdiction: regJurisdiction.trim(), experience_years: regExperience, contact_email: regEmail.trim(),
      });
      await loadProfile(address);
      setAuthed(true); flash('Inspector account created successfully');
    } catch (e) { flashErr(e); }
    setLoading(false);
  };

  const toggleSpec = (cat) => setRegSpecs(p => p.includes(cat) ? p.filter(s => s !== cat) : [...p, cat]);
  const refresh = () => { if (address) loadProfile(address).catch(() => {}); };

  // ── Begin verification on a pending submission ──
  const doBegin = async (evidenceId, category) => {
    try {
      const result = await beginVerification({ evidence_id: evidenceId, category });
      if (result.error) return flashErr(result.error);
      flash(`Verification started for ${evidenceId.slice(0, 12)}… — ${result.inspectors_assigned} inspectors assigned`);
      refresh();
    } catch (e) { flashErr(e); }
  };

  const doCommit = async (evidenceId) => {
    if (!nonce) return flashErr('Enter a secret nonce for commit-reveal');
    try {
      const h = await generateCommitHash({ verdict, nonce });
      setCommitHash(h.commit_hash);
      await commitVerdict({ evidence_id: evidenceId, inspector_address: address, commit_hash: h.commit_hash });
      flash('Verdict committed — save your nonce to reveal later!');
      refresh();
    } catch (e) { flashErr(e); }
  };

  const doReveal = async (evidenceId) => {
    if (!nonce) return flashErr('Enter the same nonce you used to commit');
    if (!justificationIpfs) return flashErr('Enter IPFS hash of your inspection evidence');
    try {
      await revealVerdict({ evidence_id: evidenceId, inspector_address: address, verdict, nonce, justification_ipfs: justificationIpfs });
      flash('Verdict revealed successfully');
      refresh();
    } catch (e) { flashErr(e); }
  };

  const doAdvance = async (evidenceId) => {
    try { await advanceToReveal(evidenceId); flash('Advanced to reveal phase'); refresh(); }
    catch (e) { flashErr(e); }
  };

  const doFinalize = async (evidenceId) => {
    try { await finalizeVerification(evidenceId); flash('Verification finalized'); refresh(); }
    catch (e) { flashErr(e); }
  };

  const logout = () => { setAuthed(false); setProfile(null); setCases([]); setPendingSubs([]); setAddress(''); setMode('choose'); setErr(null); setMsg(null); };

  // ── Choose Mode ──
  if (!authed && mode === 'choose') {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="text-center mb-8 anim-fade-up">
          <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-200 grid place-items-center mx-auto mb-4">
            <Scale className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Inspector Portal</h1>
          <p className="text-sm text-slate-500">Government-authorized inspectors verify evidence submissions</p>
        </div>
        <div className="space-y-3 anim-fade-up del-1">
          <button onClick={() => setMode('login')}
            className="w-full card p-5 flex items-center gap-4 cursor-pointer hover:border-slate-300 transition-colors text-left border-none">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 grid place-items-center shrink-0">
              <LogIn className="w-5 h-5 text-indigo-600" />
            </div>
            <div><p className="text-sm font-semibold text-slate-800">Sign In</p><p className="text-xs text-slate-400">Already registered — enter your Algorand address</p></div>
          </button>
          <button onClick={() => setMode('register')}
            className="w-full card p-5 flex items-center gap-4 cursor-pointer hover:border-slate-300 transition-colors text-left border-none">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 grid place-items-center shrink-0">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div><p className="text-sm font-semibold text-slate-800">Register New Account</p><p className="text-xs text-slate-400">Create your inspector profile with credentials</p></div>
          </button>
        </div>
      </div>
    );
  }

  // ── Login ──
  if (!authed && mode === 'login') {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="text-center mb-8 anim-fade-up">
          <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-200 grid place-items-center mx-auto mb-4">
            <LogIn className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Inspector Sign In</h1>
          <p className="text-sm text-slate-500">Enter your registered Algorand address</p>
        </div>
        <div className="card p-6 space-y-4 anim-fade-up del-1">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Algorand Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your ALGO address…" className={inputCls + ' font-mono'} />
          </div>
          <button onClick={handleLogin} disabled={loading || !address.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold cursor-pointer hover:bg-indigo-500 transition-colors border-none disabled:opacity-40">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Authenticating…' : 'Sign In'}
          </button>
          {err && <p className="text-xs text-red-500 text-center">{err}</p>}
          <button onClick={() => { setMode('choose'); setErr(null); }} className="w-full text-center text-xs text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-none py-1">← Back</button>
        </div>
      </div>
    );
  }

  // ── Registration ──
  if (!authed && mode === 'register') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8 anim-fade-up">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center mx-auto mb-4">
            <UserPlus className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Inspector Registration</h1>
          <p className="text-sm text-slate-500">Create your verified inspector account</p>
        </div>
        <div className="card p-6 space-y-4 anim-fade-up del-1">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Algorand Address <span className="text-red-500">*</span></label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Your ALGO address…" className={inputCls + ' font-mono'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-500 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g. Dr. Ram Sharma" className={inputCls} /></div>
            <div><label className="block text-xs text-slate-500 mb-1.5">Department</label>
              <input value={regDept} onChange={e => setRegDept(e.target.value)} placeholder="e.g. Municipal Corp" className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-500 mb-1.5">Employee ID</label>
              <input value={regEmpId} onChange={e => setRegEmpId(e.target.value)} placeholder="e.g. GOV-12345" className={inputCls} /></div>
            <div><label className="block text-xs text-slate-500 mb-1.5">Designation</label>
              <input value={regDesignation} onChange={e => setRegDesignation(e.target.value)} placeholder="e.g. Senior Inspector" className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-500 mb-1.5">Jurisdiction</label>
              <input value={regJurisdiction} onChange={e => setRegJurisdiction(e.target.value)} placeholder="e.g. Maharashtra" className={inputCls} /></div>
            <div><label className="block text-xs text-slate-500 mb-1.5">Experience (years)</label>
              <input type="number" min={0} value={regExperience} onChange={e => setRegExperience(Number(e.target.value))} className={inputCls} /></div>
          </div>
          <div><label className="block text-xs text-slate-500 mb-1.5">Contact Email</label>
            <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="inspector@gov.in" className={inputCls} /></div>
          <div>
            <label className="block text-xs text-slate-500 mb-2">Specializations <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => toggleSpec(cat.value)}
                  className={`p-3 rounded-lg text-left text-xs font-medium cursor-pointer border transition-all
                    ${regSpecs.includes(cat.value) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  <span className="mr-1.5">{cat.emoji}</span>{cat.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleRegister} disabled={loading || !address.trim() || !regName.trim() || regSpecs.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold cursor-pointer hover:bg-emerald-500 transition-colors border-none disabled:opacity-40">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Creating Account…' : 'Create Inspector Account'}
          </button>
          {err && <p className="text-xs text-red-500 text-center">{err}</p>}
          <button onClick={() => { setMode('choose'); setErr(null); }} className="w-full text-center text-xs text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-none py-1">← Back</button>
        </div>
      </div>
    );
  }

  // ── Main Portal (Authenticated) ──
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="Inspector Access" badgeIcon={Scale} title="Inspector Portal"
        subtitle="Review evidence, commit verdicts, and finalize verification sessions." />

      {msg && <div className="card p-3 mb-4 border-emerald-200 text-emerald-700 text-sm anim-slide-down">{msg}</div>}
      {err && <div className="card p-3 mb-4 border-red-200 text-red-600 text-sm flex items-center gap-2 anim-slide-down"><AlertCircle className="w-4 h-4" />{err}</div>}

      {/* Profile bar */}
      {profile && (
        <div className="card p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 anim-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 grid place-items-center">
              <Scale className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{profile.name}</p>
              <p className="text-xs text-slate-400 font-mono">{address.slice(0, 10)}…{address.slice(-6)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {profile.department && <span className="text-xs text-slate-500">Dept: <strong className="text-slate-800">{profile.department}</strong></span>}
            {profile.designation && <span className="text-xs text-slate-500">{profile.designation}</span>}
            <span className="text-xs text-slate-500">Cases: <strong className="text-slate-800">{profile.total_inspections || 0}</strong></span>
            {profile.reputation && (
              <span className="text-xs text-slate-500">Score: <strong className="text-emerald-600">{(profile.reputation.consistency_score * 100).toFixed(0)}%</strong></span>
            )}
            <button onClick={refresh} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Specializations */}
      {profile?.specializations?.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {profile.specializations.map(s => {
            const cat = CATEGORY_INFO[s] || {};
            return (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                {cat.emoji || '📋'} {cat.label || s}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Pending Submissions — Begin Verification ── */}
      {pendingSubs.length > 0 && (
        <div className="mb-8 anim-fade-up">
          <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Play className="w-4 h-4 text-amber-600" /> Pending Evidence — Start Verification
          </h2>
          <div className="space-y-2">
            {pendingSubs.map(sub => {
              const cat = CATEGORY_INFO[sub.category] || {};
              return (
                <div key={sub.evidence_id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.emoji || '📄'}</span>
                    <div>
                      <p className="text-sm font-mono text-slate-700">{sub.evidence_id}</p>
                      <p className="text-xs text-slate-400">{cat.label || sub.category} · {sub.organization || 'Unknown'} · {sub.stake_amount || 0} ALGO</p>
                    </div>
                  </div>
                  <button onClick={() => doBegin(sub.evidence_id, sub.category)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold cursor-pointer hover:bg-amber-400 border-none transition-colors">
                    <Play className="w-3.5 h-3.5" /> Begin Verification
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Assigned Cases ── */}
      <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Eye className="w-4 h-4 text-indigo-600" /> Your Assigned Cases
      </h2>

      {cases.length === 0 ? (
        <EmptyState icon={Eye} title="No assigned cases" description="Cases appear here when evidence is assigned to you for verification." />
      ) : (
        <div className="space-y-3 anim-fade-up del-1">
          {cases.map((c) => {
            const cat = CATEGORY_INFO[c.category] || {};
            const isActive = activeCase === c.evidence_id;
            const phaseColor = PHASE_COLORS[c.phase] || 'bg-slate-100 text-slate-500 border-slate-200';
            return (
              <div key={c.evidence_id} className="card overflow-hidden">
                <button onClick={() => setActiveCase(isActive ? null : c.evidence_id)}
                  className="w-full flex items-center justify-between px-5 py-4 cursor-pointer bg-transparent border-none text-left hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.emoji || '📄'}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800 font-mono">{c.evidence_id}</p>
                      <p className="text-xs text-slate-400">
                        {cat.label || c.category}
                        {c.has_committed && ' · Committed'}
                        {c.has_revealed && ' · Revealed'}
                        {c.your_verdict && ` · Verdict: ${c.your_verdict}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={phaseColor}>{c.phase}</Badge>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {isActive && (
                  <div className="px-5 pb-5 border-t border-slate-200 pt-4 space-y-4 anim-slide-down">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <p className="text-slate-400 mb-0.5">Phase</p><p className="text-slate-800 font-medium">{c.phase}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <p className="text-slate-400 mb-0.5">Deadline</p><p className="text-slate-800 font-medium text-[11px]">{c.window_deadline || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <p className="text-slate-400 mb-0.5">Committed</p><p className={`font-medium ${c.has_committed ? 'text-emerald-600' : 'text-slate-400'}`}>{c.has_committed ? 'Yes' : 'No'}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <p className="text-slate-400 mb-0.5">Revealed</p><p className={`font-medium ${c.has_revealed ? 'text-emerald-600' : 'text-slate-400'}`}>{c.has_revealed ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-2">Your Verdict</label>
                      <div className="flex gap-2">
                        {Object.entries(VERDICT_LABELS).map(([code, label]) => (
                          <button key={code} type="button" onClick={() => setVerdict(Number(code))}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-medium cursor-pointer border transition-all
                              ${verdict === Number(code) ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5">Secret Nonce <span className="text-red-500">*</span></label>
                      <input value={nonce} onChange={e => setNonce(e.target.value)} placeholder="A secret phrase only you know — save this!" className={inputCls} />
                      <p className="text-[11px] text-slate-400 mt-1">Used in commit-reveal protocol. You MUST remember this to reveal your verdict.</p>
                    </div>

                    {c.phase === 'REVEAL' && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Justification IPFS Hash <span className="text-red-500">*</span></label>
                        <input value={justificationIpfs} onChange={e => setJustificationIpfs(e.target.value)}
                          placeholder="Qm… (IPFS hash of your inspection evidence)" className={inputCls + ' font-mono'} />
                      </div>
                    )}

                    {commitHash && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500 font-mono truncate">{commitHash}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">(your commit hash)</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {c.phase === 'COMMIT' && !c.has_committed && (
                        <button onClick={() => doCommit(c.evidence_id)}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-amber-500 text-white text-xs font-semibold cursor-pointer hover:bg-amber-400 border-none transition-colors">
                          <Send className="w-3.5 h-3.5" /> Commit Verdict
                        </button>
                      )}
                      {c.phase === 'COMMIT' && c.has_committed && (
                        <>
                          <span className="text-xs text-emerald-600 flex items-center gap-1.5 px-4 py-2.5">✓ Committed — waiting for others</span>
                          <button onClick={() => doAdvance(c.evidence_id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer hover:bg-slate-200 border border-slate-200 transition-colors">
                            Advance to Reveal →
                          </button>
                        </>
                      )}
                      {c.phase === 'REVEAL' && !c.has_revealed && (
                        <button onClick={() => doReveal(c.evidence_id)}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:bg-blue-500 border-none transition-colors">
                          <Eye className="w-3.5 h-3.5" /> Reveal Verdict
                        </button>
                      )}
                      {c.phase === 'REVEAL' && c.has_revealed && (
                        <>
                          <span className="text-xs text-emerald-600 flex items-center gap-1.5 px-4 py-2.5">✓ Revealed — waiting for finalization</span>
                          <button onClick={() => doFinalize(c.evidence_id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium cursor-pointer hover:bg-emerald-500 border-none transition-colors">
                            Finalize ✓
                          </button>
                        </>
                      )}
                      {c.phase === 'FINALIZED' && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1.5 px-4 py-2.5">
                          ✓ Case finalized {c.your_verdict && `— Your verdict: ${c.your_verdict}`}
                        </span>
                      )}
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
