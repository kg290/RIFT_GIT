import { useState, useEffect } from 'react';
import { Gavel, RefreshCw, ExternalLink, Scale } from 'lucide-react';
import { getAllResolutions, getResolutionStats } from '../lib/api';
import { CATEGORY_INFO, VERDICT_LABELS } from '../lib/constants';
import { Badge, Stat, EmptyState, PageHeader } from '../components/UI';

export default function Resolution() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getAllResolutions(), getResolutionStats()])
      .then(([r, s]) => { setRecords(r); setStats(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="On-Chain Resolution" badgeIcon={Gavel} title="Resolution Center"
        subtitle="View how evidence was resolved — verdicts, stakes, and outcomes." />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 anim-fade-up del-1">
          <Stat label="Total Resolved" value={stats.total_resolved || 0} />
          <Stat label="Verified" value={stats.verified || 0} />
          <Stat label="Rejected" value={stats.rejected || 0} />
          <Stat label="Stakes Released" value={`${stats.total_stake_released_algo || 0} ALGO`} />
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end mb-4">
        <button onClick={load} className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Records */}
      {records.length === 0 ? (
        <EmptyState icon={Scale} title="No resolutions yet" description="Resolutions appear here after evidence is verified and finalized." />
      ) : (
        <div className="space-y-3 anim-fade-up del-2">
          {records.map((r) => {
            const cat = CATEGORY_INFO[r.category] || {};
            const verdictLabel = VERDICT_LABELS[r.final_verdict] || r.final_verdict;
            const isVerified = r.outcome === 'verified' || r.final_verdict === 1;
            return (
              <div key={r.evidence_id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.emoji || '📄'}</span>
                    <div>
                      <p className="text-sm font-medium text-white font-mono">{r.evidence_id?.slice(0, 20)}…</p>
                      <p className="text-xs text-zinc-500">{cat.label || r.category} · {r.organization || ''}</p>
                    </div>
                  </div>
                  <Badge className={isVerified ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-red-500/15 text-red-400 border-red-500/25'}>
                    {r.outcome || verdictLabel}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                    <p className="text-zinc-500 mb-0.5">Verdict</p>
                    <p className="text-white font-medium">{verdictLabel}</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                    <p className="text-zinc-500 mb-0.5">Inspectors</p>
                    <p className="text-white font-medium">{r.inspector_count || r.total_inspectors || 'N/A'}</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                    <p className="text-zinc-500 mb-0.5">Stake</p>
                    <p className="text-white font-medium">{r.stake_amount || 0} ALGO</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                    <p className="text-zinc-500 mb-0.5">Stake Action</p>
                    <p className={`font-medium ${r.stake_action === 'released' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.stake_action || 'N/A'}
                    </p>
                  </div>
                </div>
                {r.resolved_at && (
                  <p className="text-[11px] text-zinc-600 mt-3">Resolved: {new Date(r.resolved_at).toLocaleString()}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
