import { useEffect, useState, useCallback } from 'react';
import { Gavel, RefreshCw, AlertCircle, CheckCircle, XCircle, Share2, Megaphone, Image } from 'lucide-react';
import { getAllResolutions, getResolutionStats, resolveEvidence, publishEvidence, getAllSubmissions, getVerificationStatus } from '../lib/api';
import { STATUS_COLORS } from '../lib/constants';
import { Badge, Stat, EmptyState, PageHeader } from '../components/UI';

export default function Resolution() {
  const [resolutions, setResolutions] = useState([]);
  const [stats, setStats] = useState(null);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [publishResult, setPublishResult] = useState(null);

  const flash = (m) => { setMsg(m); setErr(null); setTimeout(() => setMsg(null), 6000); };
  const flashErr = (e) => { setErr(typeof e === 'string' ? e : e?.response?.data?.detail || e?.message || 'Error'); setMsg(null); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s, allSubs] = await Promise.all([getAllResolutions(), getResolutionStats(), getAllSubmissions()]);
      setResolutions(Array.isArray(r) ? r : []);
      setStats(s);
      // Show finalized but not yet resolved submissions
      const finalized = [];
      for (const sub of allSubs) {
        if (sub.status === 'UNDER_VERIFICATION') {
          try {
            const vs = await getVerificationStatus(sub.evidence_id);
            if (vs.phase === 'FINALIZED') finalized.push({ ...sub, verification: vs });
          } catch { /* skip */ }
        }
        if (sub.status === 'VERIFIED' || sub.status === 'REJECTED') {
          finalized.push(sub);
        }
      }
      setSubs(finalized);
    } catch (e) { flashErr(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (evidenceId) => {
    try {
      const result = await resolveEvidence(evidenceId);
      if (result.error) return flashErr(result.error);
      flash(`Evidence ${evidenceId.slice(0, 12)}… resolved — ${result.resolution?.resolution_action || 'completed'}`);
      load();
    } catch (e) { flashErr(e); }
  };

  const handlePublish = async (evidenceId) => {
    try {
      const result = await publishEvidence(evidenceId);
      if (result.error) return flashErr(result.error);
      setPublishResult(result);
      flash(`Evidence published to ${result.publications?.length || 0} platforms!`);
      load();
    } catch (e) { flashErr(e); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="Resolution Center" badgeIcon={Gavel} title="Resolution & Publication"
        subtitle="Resolve finalized cases, enforce outcomes, and publish verified fraud to social media." />

      {msg && <div className="card p-3 mb-4 border-emerald-200 text-emerald-700 text-sm anim-slide-down">{msg}</div>}
      {err && <div className="card p-3 mb-4 border-red-200 text-red-600 text-sm flex items-center gap-2 anim-slide-down"><AlertCircle className="w-4 h-4" />{err}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 anim-fade-up">
          <Stat label="Total Resolved" value={stats.total_resolutions ?? 0} />
          <Stat label="Verified True" value={stats.verified_count ?? stats.verified ?? 0} />
          <Stat label="Rejected" value={stats.rejected_count ?? stats.rejected ?? 0} />
          <Stat label="Stakes Distributed" value={`${stats.total_stake_distributed ?? 0} ALGO`} />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-800">Actionable Cases</h2>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer bg-transparent border-none">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Finalized submissions ready for resolution */}
      {subs.length > 0 && (
        <div className="space-y-3 mb-8 anim-fade-up del-1">
          {subs.map(sub => {
            const statusCls = STATUS_COLORS[sub.status] || 'bg-slate-100 text-slate-600 border-slate-200';
            const isFinalized = sub.verification?.phase === 'FINALIZED' || sub.status === 'VERIFIED' || sub.status === 'REJECTED';
            const needsResolve = sub.status === 'UNDER_VERIFICATION' && sub.verification?.phase === 'FINALIZED';
            const canPublish = sub.status === 'VERIFIED';

            return (
              <div key={sub.evidence_id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-mono text-slate-700 font-medium">{sub.evidence_id}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {sub.category} · {sub.organization || 'Unknown Org'} · {sub.stake_amount || 0} ALGO
                    </p>
                  </div>
                  <Badge className={statusCls}>{sub.status}</Badge>
                </div>

                {sub.verification?.final_verdict && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      {sub.verification.final_verdict === 'VERIFIED' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-semibold text-slate-800">Verdict: {sub.verification.final_verdict}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Consensus: {((sub.verification.consensus_score || 0) * 100).toFixed(0)}%
                      · {sub.verification.total_commits || 0} commits
                      · {sub.verification.total_reveals || 0} reveals
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {needsResolve && (
                    <button onClick={() => handleResolve(sub.evidence_id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer hover:bg-indigo-500 border-none transition-colors">
                      <Gavel className="w-3.5 h-3.5" /> Resolve Case
                    </button>
                  )}

                  {canPublish && (
                    <button onClick={() => handlePublish(sub.evidence_id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer hover:bg-rose-500 border-none transition-colors">
                      <Megaphone className="w-3.5 h-3.5" /> Publish to Social Media
                    </button>
                  )}

                  {sub.status === 'PUBLISHED' && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1.5 px-3 py-2">
                      <Share2 className="w-3.5 h-3.5" /> Already published
                    </span>
                  )}
                  {sub.status === 'REJECTED' && (
                    <span className="text-xs text-red-500 flex items-center gap-1.5 px-3 py-2">
                      <XCircle className="w-3.5 h-3.5" /> Rejected — no action needed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subs.length === 0 && !loading && (
        <EmptyState icon={Gavel} title="No actionable cases" description="Cases appear here when verification is finalized." />
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
                <h3 className="text-lg font-bold text-slate-800">Published Successfully!</h3>
                <p className="text-xs text-slate-400">Evidence shared across platforms</p>
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
                      <div className="mt-1.5 flex items-center gap-1.5">
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

      {/* Past Resolutions */}
      {resolutions.length > 0 && (
        <div className="mt-8 anim-fade-up del-2">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Resolution History</h2>
          <div className="space-y-2">
            {resolutions.map((r, i) => (
              <div key={i} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono text-slate-700">{r.evidence_id}</p>
                  <p className="text-xs text-slate-400">
                    Verdict: <strong className={r.verification_verdict === 'VERIFIED' ? 'text-emerald-600' : 'text-red-500'}>{r.verification_verdict}</strong>
                    {' · '}{r.resolution_action}
                    {r.stake_action && ` · Stake: ${r.stake_action}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">{r.resolved_at ? new Date(r.resolved_at).toLocaleString() : ''}</p>
                  {r.inspector_count && <p className="text-[11px] text-slate-400">{r.inspector_count} inspectors</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
