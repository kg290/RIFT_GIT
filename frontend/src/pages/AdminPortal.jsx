import { useEffect, useState, useCallback } from 'react';
import { Settings, Users, FileText, Activity, RefreshCw, AlertCircle, Play, Gavel, Megaphone, Search, Cpu, Shield, Image } from 'lucide-react';
import {
  getAllSubmissions, listInspectors, getAllVerificationSessions,
  beginVerification, resolveEvidence, publishEvidence, getResolutionStats, getContractTransparency,
} from '../lib/api';
import { CATEGORY_INFO, STATUS_COLORS, PHASE_COLORS } from '../lib/constants';
import { Badge, Stat, EmptyState, PageHeader } from '../components/UI';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'submissions', label: 'Submissions', icon: FileText },
  { key: 'inspectors', label: 'Inspectors', icon: Users },
  { key: 'sessions', label: 'Sessions', icon: Cpu },
  { key: 'contract', label: 'Contract', icon: Shield },
];

export default function AdminPortal() {
  const [tab, setTab] = useState('overview');
  const [subs, setSubs] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [resStats, setResStats] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [publishResult, setPublishResult] = useState(null);

  const flash = (m) => { setMsg(m); setErr(null); setTimeout(() => setMsg(null), 6000); };
  const flashErr = (e) => { setErr(typeof e === 'string' ? e : e?.response?.data?.detail || e?.message || 'Error'); setMsg(null); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ins, sess, rs, ci] = await Promise.all([
        getAllSubmissions(), listInspectors(), getAllVerificationSessions(),
        getResolutionStats().catch(() => null), getContractTransparency().catch(() => null),
      ]);
      setSubs(Array.isArray(s) ? s : []);
      setInspectors(Array.isArray(ins) ? ins : []);
      setSessions(Array.isArray(sess) ? sess : []);
      setResStats(rs);
      setContract(ci);
    } catch (e) { flashErr(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const doBegin = async (evidenceId, category) => {
    try {
      const r = await beginVerification({ evidence_id: evidenceId, category });
      if (r.error) return flashErr(r.error);
      flash(`Verification started — ${r.inspectors_assigned} inspectors assigned`);
      load();
    } catch (e) { flashErr(e); }
  };

  const doResolve = async (evidenceId) => {
    try {
      const r = await resolveEvidence(evidenceId);
      if (r.error) return flashErr(r.error);
      flash(`Evidence resolved — ${r.resolution?.resolution_action || 'done'}`);
      load();
    } catch (e) { flashErr(e); }
  };

  const doPublish = async (evidenceId) => {
    try {
      const r = await publishEvidence(evidenceId);
      if (r.error) return flashErr(r.error);
      setPublishResult(r);
      flash(`Published to ${r.publications?.length || 0} platforms`);
      load();
    } catch (e) { flashErr(e); }
  };

  const pending = subs.filter(s => s.status === 'PENDING');
  const underVer = subs.filter(s => s.status === 'UNDER_VERIFICATION');
  const verified = subs.filter(s => s.status === 'VERIFIED');
  const resolved = subs.filter(s => s.status === 'RESOLVED' || s.status === 'PUBLISHED');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="Admin Panel" badgeIcon={Settings} title="Admin Portal"
        subtitle="Manage submissions, inspectors, verification sessions, and resolutions." />

      {msg && <div className="card p-3 mb-4 border-emerald-200 text-emerald-700 text-sm anim-slide-down">{msg}</div>}
      {err && <div className="card p-3 mb-4 border-red-200 text-red-600 text-sm flex items-center gap-2 anim-slide-down"><AlertCircle className="w-4 h-4" />{err}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer border transition-all whitespace-nowrap
              ${tab === t.key ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
        <button onClick={load} className="ml-auto flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-800 cursor-pointer bg-transparent border-none">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ═══ Overview ═══ */}
      {tab === 'overview' && (
        <div className="space-y-6 anim-fade-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total Submissions" value={subs.length} />
            <Stat label="Pending" value={pending.length} />
            <Stat label="Under Verification" value={underVer.length} />
            <Stat label="Verified / Resolved" value={verified.length + resolved.length} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat label="Inspectors" value={inspectors.length} />
            <Stat label="Active Sessions" value={sessions.length} />
            <Stat label="Resolutions" value={resStats?.total_resolutions ?? 0} />
          </div>
        </div>
      )}

      {/* ═══ Submissions ═══ */}
      {tab === 'submissions' && (
        <div className="space-y-3 anim-fade-up">
          {subs.length === 0 && <EmptyState icon={FileText} title="No submissions" description="Evidence submissions will appear here." />}
          {subs.map(sub => {
            const cat = CATEGORY_INFO[sub.category] || {};
            const statusCls = STATUS_COLORS[sub.status] || 'bg-slate-100 text-slate-600 border-slate-200';
            return (
              <div key={sub.evidence_id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.emoji || '📄'}</span>
                    <div>
                      <p className="text-sm font-mono text-slate-700">{sub.evidence_id}</p>
                      <p className="text-xs text-slate-400">
                        {cat.label || sub.category} · {sub.organization || 'N/A'} · Stake: {sub.stake_amount || 0} ALGO
                        {sub.submitted_at && ` · ${new Date(sub.submitted_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusCls}>{sub.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {sub.status === 'PENDING' && (
                    <button onClick={() => doBegin(sub.evidence_id, sub.category)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium cursor-pointer hover:bg-amber-400 border-none transition-colors">
                      <Play className="w-3 h-3" /> Begin Verification
                    </button>
                  )}
                  {sub.status === 'VERIFIED' && (
                    <>
                      <button onClick={() => doResolve(sub.evidence_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium cursor-pointer hover:bg-indigo-500 border-none transition-colors">
                        <Gavel className="w-3 h-3" /> Resolve
                      </button>
                      <button onClick={() => doPublish(sub.evidence_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium cursor-pointer hover:bg-rose-500 border-none transition-colors">
                        <Megaphone className="w-3 h-3" /> Publish Social
                      </button>
                    </>
                  )}
                  {sub.status === 'RESOLVED' && (
                    <button onClick={() => doPublish(sub.evidence_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium cursor-pointer hover:bg-rose-500 border-none transition-colors">
                      <Megaphone className="w-3 h-3" /> Publish Social
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Inspectors ═══ */}
      {tab === 'inspectors' && (
        <div className="space-y-3 anim-fade-up">
          {inspectors.length === 0 && <EmptyState icon={Users} title="No inspectors" description="Registered inspectors will appear here." />}
          {inspectors.map((ins, i) => (
            <div key={i} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 grid place-items-center">
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{ins.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{ins.address?.slice(0, 12)}…</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex gap-1 justify-end flex-wrap">
                  {ins.specializations?.map(s => {
                    const cat = CATEGORY_INFO[s] || {};
                    return <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">{cat.emoji || ''} {cat.label || s}</span>;
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {ins.total_inspections ?? 0} inspections · {ins.department || ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Sessions ═══ */}
      {tab === 'sessions' && (
        <div className="space-y-3 anim-fade-up">
          {sessions.length === 0 && <EmptyState icon={Cpu} title="No sessions" description="Verification sessions appear here when evidence verification begins." />}
          {sessions.map((sess, i) => {
            const phaseColor = PHASE_COLORS[sess.phase] || 'bg-slate-100 text-slate-500 border-slate-200';
            return (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-mono text-slate-700">{sess.evidence_id}</p>
                  <Badge className={phaseColor}>{sess.phase}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>Inspectors: {sess.assigned_inspectors?.length || 0}</span>
                  <span>Commits: {sess.total_commits ?? Object.keys(sess.commits || {}).length}</span>
                  <span>Reveals: {sess.total_reveals ?? Object.keys(sess.reveals || {}).length}</span>
                  {sess.final_verdict && <span>Verdict: <strong className={sess.final_verdict === 'VERIFIED' ? 'text-emerald-600' : 'text-red-500'}>{sess.final_verdict}</strong></span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Contract ═══ */}
      {tab === 'contract' && (
        <div className="anim-fade-up">
          {contract ? (
            <div className="card p-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Smart Contract Info</h3>
              {Object.entries(contract).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-500">{k.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-slate-800 font-mono">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Shield} title="Contract info unavailable" description="Could not load smart contract details." />
          )}
        </div>
      )}

      {/* Publication Result Modal */}
      {publishResult && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm grid place-items-center z-50" onClick={() => setPublishResult(null)}>
          <div className="card max-w-lg w-full mx-4 p-6 space-y-4 anim-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 grid place-items-center">
                <Megaphone className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Published to Social Media</h3>
                <p className="text-xs text-slate-400">Evidence shared across {publishResult.publications?.length || 0} platforms</p>
              </div>
            </div>
            <div className="space-y-2">
              {publishResult.publications?.map((pub, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 grid place-items-center text-sm shrink-0">
                    {pub.platform === 'twitter' ? '𝕏' : pub.platform === 'telegram' ? '✈' : pub.platform === 'email' ? '✉' : pub.platform === 'rti' ? '📋' : '📢'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 capitalize">{pub.platform}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{pub.content || pub.message || 'Published'}</p>
                    {pub.url && <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-600 hover:underline">{pub.url}</a>}
                    {pub.image_url && (
                      <div className="mt-1 flex items-center gap-1">
                        <Image className="w-3 h-3 text-slate-400" />
                        <a href={pub.image_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-600 hover:underline">View image</a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setPublishResult(null)}
              className="w-full py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium cursor-pointer border border-slate-200 hover:bg-slate-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
