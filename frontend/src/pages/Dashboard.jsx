import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, FileText, ExternalLink } from 'lucide-react';
import { getAllSubmissions, checkHealth } from '../lib/api';
import { useStore } from '../store/useStore';
import { CATEGORY_INFO, STATUS_COLORS } from '../lib/constants';
import { Badge, Stat, EmptyState, PageHeader } from '../components/UI';

export default function Dashboard() {
  const { health, setHealth } = useStore();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getAllSubmissions(), checkHealth()])
      .then(([s, h]) => { setSubs(s); setHealth(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [setHealth]);

  const byStatus = (s) => subs.filter(x => x.status === s).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="Live Data" badgeIcon={BarChart3} title="Dashboard"
        subtitle="Real-time overview of all evidence submissions and platform health." />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 anim-fade-up del-1">
        <Stat label="Total Submissions" value={subs.length} />
        <Stat label="Verified" value={byStatus('VERIFIED')} />
        <Stat label="Pending" value={byStatus('PENDING')} />
        <Stat label="Rejected" value={byStatus('REJECTED')} />
      </div>

      {health && (
        <div className="card p-4 mb-8 flex items-center justify-between anim-fade-up del-2">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${health.algorand_connected ? 'bg-emerald-500' : 'bg-red-400'}`} />
            <span className="text-sm text-slate-600">{health.status === 'healthy' ? 'Algorand Connected' : 'Degraded'}</span>
            <span className="text-xs text-slate-400">{health.network} · Round #{health.last_round?.toLocaleString()}</span>
          </div>
          <button onClick={load} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {subs.length === 0 ? (
        <EmptyState icon={FileText} title="No submissions yet" description="Submit evidence to see it here." />
      ) : (
        <div className="card overflow-hidden anim-fade-up del-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Stake</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">IPFS</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => {
                  const cat = CATEGORY_INFO[s.category] || {};
                  const sc = STATUS_COLORS[s.status] || STATUS_COLORS.PENDING;
                  return (
                    <tr key={s.evidence_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.evidence_id?.slice(0, 12)}…</td>
                      <td className="px-4 py-3"><span className="text-xs">{cat.emoji} {cat.label || s.category}</span></td>
                      <td className="px-4 py-3 text-slate-600">{s.organization}</td>
                      <td className="px-4 py-3"><Badge className={sc}>{s.status}</Badge></td>
                      <td className="px-4 py-3 text-slate-600">{s.stake_amount} ALGO</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(s.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {s.ipfs_url && (
                          <a href={s.ipfs_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
