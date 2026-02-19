import { useState, useEffect } from 'react';
import { FileSearch, RefreshCw, Search, ExternalLink, Shield, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { getPublicEvidence, getAuditStats, getAuditTrail, getAllResolutions } from '../lib/api';
import { CATEGORY_INFO, VERDICT_LABELS } from '../lib/constants';
import { Badge, Stat, EmptyState, PageHeader } from '../components/UI';

export default function AuditTrail() {
  const [evidence, setEvidence] = useState([]);
  const [stats, setStats] = useState(null);
  const [resolutions, setResolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getPublicEvidence(), getAuditStats(), getAllResolutions()])
      .then(([e, s, r]) => { setEvidence(e); setStats(s); setResolutions(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleLookup = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setDetailLoading(true);
    getAuditTrail(search.trim())
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  // Find resolution for an evidence
  const getRes = (id) => resolutions.find(r => r.evidence_id === id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="Public Transparency" badgeIcon={FileSearch} title="Audit Trail"
        subtitle="Publicly verifiable record of all evidence, verification, and resolution." />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 anim-fade-up del-1">
          <Stat label="Public Evidence" value={stats.total_public || 0} />
          <Stat label="Verified" value={stats.total_verified || 0} />
          <Stat label="Auditable" value={stats.total_auditable || stats.total_public || 0} />
          <Stat label="Integrity" value={stats.integrity_score || '100%'} />
        </div>
      )}

      {/* Lookup */}
      <form onSubmit={handleLookup} className="card p-4 mb-6 flex gap-2 anim-fade-up del-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Look up evidence by ID…"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono" />
        </div>
        <button type="submit" disabled={detailLoading}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium cursor-pointer hover:bg-indigo-500 border-none transition-colors disabled:opacity-40">
          {detailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lookup'}
        </button>
      </form>

      {/* Detail panel */}
      {detail && (
        <div className="card p-6 mb-6 anim-slide-down">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Audit Detail</h3>
            <button onClick={() => setDetail(null)} className="text-xs text-zinc-500 hover:text-white cursor-pointer bg-transparent border-none">Close</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              <p className="text-[11px] text-zinc-500 mb-1">Evidence ID</p>
              <p className="font-mono text-xs text-zinc-200 break-all">{detail.evidence_id}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              <p className="text-[11px] text-zinc-500 mb-1">Status</p>
              <p className="text-emerald-400 font-medium">{detail.status}</p>
            </div>
            {detail.ipfs_hash && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <p className="text-[11px] text-zinc-500 mb-1">IPFS Hash</p>
                <p className="font-mono text-xs text-zinc-200 break-all">{detail.ipfs_hash}</p>
              </div>
            )}
            {detail.tx_id && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <p className="text-[11px] text-zinc-500 mb-1">Transaction</p>
                <p className="font-mono text-xs text-zinc-200 break-all">{detail.tx_id}</p>
              </div>
            )}
          </div>
          {detail.timeline && detail.timeline.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-zinc-500 font-medium">Timeline</p>
              {detail.timeline.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 grid place-items-center shrink-0 mt-0.5">
                    <Clock className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{ev.event || ev.action}</p>
                    <p className="text-[11px] text-zinc-500">{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}</p>
                    {ev.details && <p className="text-[11px] text-zinc-400 mt-0.5">{typeof ev.details === 'string' ? ev.details : JSON.stringify(ev.details)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end mb-4">
        <button onClick={load} className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Public evidence list */}
      {evidence.length === 0 ? (
        <EmptyState icon={Shield} title="No public evidence" description="Published evidence appears here for public audit." />
      ) : (
        <div className="space-y-3 anim-fade-up del-3">
          {evidence.map((e) => {
            const cat = CATEGORY_INFO[e.category] || {};
            const res = getRes(e.evidence_id);
            const isVerified = res?.outcome === 'verified' || e.status === 'verified';
            return (
              <div key={e.evidence_id} className="card p-5 hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.emoji || '📄'}</span>
                    <div>
                      <p className="text-sm font-medium text-white font-mono">{e.evidence_id?.slice(0, 20)}…</p>
                      <p className="text-xs text-zinc-500">{cat.label || e.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isVerified ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600">
                        {e.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  {e.timestamp && <span>{new Date(e.timestamp).toLocaleDateString()}</span>}
                  {e.organization && <span>· {e.organization}</span>}
                  {e.ipfs_url && (
                    <a href={e.ipfs_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 ml-auto">
                      IPFS <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {res && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-zinc-500">Verdict:</span> <span className="text-white ml-1">{VERDICT_LABELS[res.final_verdict] || res.final_verdict}</span></div>
                    <div><span className="text-zinc-500">Inspectors:</span> <span className="text-white ml-1">{res.inspector_count || res.total_inspectors || 0}</span></div>
                    <div><span className="text-zinc-500">Stake:</span> <span className={`ml-1 ${res.stake_action === 'released' ? 'text-emerald-400' : 'text-red-400'}`}>{res.stake_action}</span></div>
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
