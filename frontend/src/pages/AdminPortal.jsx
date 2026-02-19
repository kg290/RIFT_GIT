import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Users, FileCheck, BarChart3, ExternalLink, Play, DollarSign, Send } from 'lucide-react';
import {
  getAllSubmissions, listInspectors, getAllVerificationSessions,
  getResolutionStats, getBountyStats, getContractTransparency,
  resolveEvidence, processBounty, publishEvidence, beginVerification,
} from '../lib/api';
import { CATEGORY_INFO, STATUS_COLORS, PHASE_COLORS, VERDICT_LABELS } from '../lib/constants';
import { Badge, Stat, EmptyState, PageHeader } from '../components/UI';

export default function AdminPortal() {
  const [tab, setTab] = useState('overview');
  const [subs, setSubs] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [resStats, setResStats] = useState(null);
  const [bountyStats, setBountyStats] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };

  const load = () => {
    setLoading(true);
    Promise.all([
      getAllSubmissions(), listInspectors(), getAllVerificationSessions(),
      getResolutionStats(), getBountyStats(), getContractTransparency(),
    ])
      .then(([s, i, v, rs, bs, c]) => {
        setSubs(s); setInspectors(i); setSessions(v);
        setResStats(rs); setBountyStats(bs); setContract(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const doResolve = async (id) => {
    try { await resolveEvidence({ evidence_id: id }); flash('Resolved: ' + id.slice(0, 12)); load(); } catch {}
  };
  const doBounty = async (id) => {
    try { await processBounty(id); flash('Bounty processed: ' + id.slice(0, 12)); load(); } catch {}
  };
  const doPublish = async (id) => {
    try { await publishEvidence(id); flash('Published: ' + id.slice(0, 12)); load(); } catch {}
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'submissions', label: 'Submissions', icon: FileCheck },
    { id: 'inspectors', label: 'Inspectors', icon: Users },
    { id: 'sessions', label: 'Verification', icon: Play },
    { id: 'contract', label: 'Contract', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="Admin Access" badgeIcon={Settings} title="Admin Portal"
        subtitle="Manage submissions, inspectors, verification, resolution, and bounties." />

      {msg && <div className="card p-3 mb-4 border-emerald-500/30 text-emerald-400 text-sm anim-slide-down">{msg}</div>}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto anim-fade-up">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer border transition-all whitespace-nowrap
              ${tab === t.id ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={load} className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-6 anim-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Submissions" value={subs.length} />
            <Stat label="Inspectors" value={inspectors.length} />
            <Stat label="Verifications" value={sessions.length} />
            <Stat label="Resolved" value={resStats?.total_resolved || 0} />
          </div>
          {bountyStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Bounties Paid" value={bountyStats.total_payouts || 0} />
              <Stat label="Total Paid" value={`${bountyStats.total_paid_algo || 0} ALGO`} />
              <Stat label="Avg Payout" value={`${bountyStats.average_payout_algo || 0} ALGO`} />
            </div>
          )}
          {contract && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-3">Smart Contract</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div><span className="text-zinc-500">App ID:</span> <span className="text-white ml-1">{contract.app_id}</span></div>
                <div><span className="text-zinc-500">Network:</span> <span className="text-white ml-1">{contract.network}</span></div>
                <div><span className="text-zinc-500">Balance:</span> <span className="text-white ml-1 font-medium">{contract.balance_algo} ALGO</span></div>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono mt-2 break-all">{contract.app_address}</p>
              {contract.explorer_url && (
                <a href={contract.explorer_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-2">
                  View on Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Submissions ── */}
      {tab === 'submissions' && (
        subs.length === 0 ? <EmptyState icon={FileCheck} title="No submissions" description="Evidence submissions will appear here." /> : (
          <div className="card overflow-hidden anim-fade-up">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="px-4 py-3">ID</th><th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th><th className="px-4 py-3">Stake</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map(s => {
                    const cat = CATEGORY_INFO[s.category] || {};
                    return (
                      <tr key={s.evidence_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">{s.evidence_id?.slice(0, 12)}…</td>
                        <td className="px-4 py-3 text-xs">{cat.emoji} {cat.label || s.category}</td>
                        <td className="px-4 py-3"><Badge className={STATUS_COLORS[s.status] || 'bg-zinc-700/50 text-zinc-400 border-zinc-600'}>{s.status}</Badge></td>
                        <td className="px-4 py-3 text-zinc-300">{s.stake_amount} ALGO</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button onClick={() => doResolve(s.evidence_id)} className="px-2.5 py-1 rounded bg-purple-600 text-white text-[11px] font-medium cursor-pointer hover:bg-purple-500 border-none">Resolve</button>
                            <button onClick={() => doBounty(s.evidence_id)} className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-medium cursor-pointer hover:bg-emerald-500 border-none">Bounty</button>
                            <button onClick={() => doPublish(s.evidence_id)} className="px-2.5 py-1 rounded bg-cyan-600 text-white text-[11px] font-medium cursor-pointer hover:bg-cyan-500 border-none">Publish</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Inspectors ── */}
      {tab === 'inspectors' && (
        inspectors.length === 0 ? <EmptyState icon={Users} title="No inspectors" description="Registered inspectors appear here." /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 anim-fade-up">
            {inspectors.map(ins => (
              <div key={ins.address} className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 grid place-items-center">
                    <Users className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{ins.name || 'Inspector'}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">{ins.address?.slice(0, 10)}…{ins.address?.slice(-6)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span>Cases: <strong className="text-white">{ins.total_cases || 0}</strong></span>
                  <span>Accuracy: <strong className="text-emerald-400">{ins.accuracy || 'N/A'}</strong></span>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">{ins.status || 'active'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Verification Sessions ── */}
      {tab === 'sessions' && (
        sessions.length === 0 ? <EmptyState icon={Play} title="No sessions" description="Verification sessions appear here." /> : (
          <div className="space-y-3 anim-fade-up">
            {sessions.map(s => (
              <div key={s.evidence_id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-mono text-white">{s.evidence_id?.slice(0, 20)}…</p>
                  <Badge className={PHASE_COLORS[s.phase] || 'bg-zinc-700/50 text-zinc-400'}>{s.phase}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span>Inspectors: {s.inspectors?.length || 0}</span>
                  <span>Commits: {s.commits_received || 0}/{s.required_commits || 0}</span>
                  <span>Reveals: {s.reveals_received || 0}/{s.required_reveals || 0}</span>
                  {s.final_verdict && <span>Verdict: <strong className="text-white">{VERDICT_LABELS[s.final_verdict] || s.final_verdict}</strong></span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Contract ── */}
      {tab === 'contract' && contract && (
        <div className="space-y-4 anim-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="App ID" value={contract.app_id} />
            <Stat label="Balance" value={`${contract.balance_algo} ALGO`} />
            <Stat label="Total Resolved" value={contract.total_resolved || 0} />
            <Stat label="Refund Rate" value={contract.refund_rate || 'N/A'} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3">Contract Address</h3>
            <p className="text-xs text-zinc-400 font-mono break-all mb-3">{contract.app_address}</p>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span>Network: <strong className="text-white">{contract.network}</strong></span>
              <span>Stakes Released: <strong className="text-emerald-400">{contract.stakes_released || 0}</strong></span>
              <span>Stakes Forfeited: <strong className="text-red-400">{contract.stakes_forfeited || 0}</strong></span>
            </div>
            {contract.explorer_url && (
              <a href={contract.explorer_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-3">
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
