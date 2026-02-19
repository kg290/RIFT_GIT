import { useEffect, useState, useCallback } from 'react';
import { Search, FileText, Clock, RefreshCw, AlertCircle, Shield, Hash } from 'lucide-react';
import { getPublicEvidence, getAuditStats, getAuditTrail, getAllResolutions } from '../lib/api';
import { STATUS_COLORS, CATEGORY_INFO } from '../lib/constants';
import { Badge, Stat, EmptyState, PageHeader } from '../components/UI';

export default function AuditTrail() {
  const [evidence, setEvidence] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lookupId, setLookupId] = useState('');
  const [trail, setTrail] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const flash = (m) => { setMsg(m); setErr(null); setTimeout(() => setMsg(null), 5000); };
  const flashErr = (e) => { setErr(typeof e === 'string' ? e : e?.response?.data?.detail || e?.message || 'Error'); setMsg(null); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pub, s] = await Promise.all([getPublicEvidence(), getAuditStats()]);
      setEvidence(Array.isArray(pub) ? pub : []);
      setStats(s);
    } catch (e) { flashErr(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLookup = async () => {
    if (!lookupId.trim()) return;
    try {
      const t = await getAuditTrail(lookupId.trim());
      if (t.error) return flashErr(t.error);
      setTrail(t);
      flash('Audit trail loaded');
    } catch (e) { flashErr(e); }
  };

  const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="Audit Trail" badgeIcon={FileText} title="Transparency Ledger"
        subtitle="Immutable audit trail of all evidence submissions and verification events." />

      {msg && <div className="card p-3 mb-4 border-emerald-200 text-emerald-700 text-sm anim-slide-down">{msg}</div>}
      {err && <div className="card p-3 mb-4 border-red-200 text-red-600 text-sm flex items-center gap-2 anim-slide-down"><AlertCircle className="w-4 h-4" />{err}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 anim-fade-up">
          <Stat label="Total Evidence" value={stats.total_evidence ?? 0} />
          <Stat label="Verified" value={stats.verified ?? 0} />
          <Stat label="Pending" value={stats.pending ?? 0} />
          <Stat label="Blockchain Tx" value={stats.blockchain_transactions ?? stats.total_transactions ?? 0} />
        </div>
      )}

      {/* Lookup */}
      <div className="card p-5 mb-8 anim-fade-up del-1">
        <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-600" /> Evidence Lookup
        </h2>
        <div className="flex gap-2">
          <input value={lookupId} onChange={e => setLookupId(e.target.value)}
            placeholder="Enter evidence ID to view full audit trail…" className={inputCls + ' font-mono flex-1'}
            onKeyDown={e => e.key === 'Enter' && handleLookup()} />
          <button onClick={handleLookup} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold cursor-pointer hover:bg-indigo-500 border-none transition-colors shrink-0 flex items-center gap-1.5">
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
      </div>

      {/* Trail Detail */}
      {trail && (
        <div className="card p-6 mb-8 anim-slide-down">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Audit Trail: <span className="font-mono text-indigo-600">{trail.evidence_id}</span></h3>
            <button onClick={() => setTrail(null)} className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-none">Close ×</button>
          </div>

          {trail.events?.length > 0 ? (
            <div className="relative pl-5 space-y-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200" />
              {trail.events.map((ev, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-indigo-100 border-2 border-indigo-400" />
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{ev.event_type || ev.action || ev.type}</span>
                      <span className="text-[11px] text-slate-400">{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}</span>
                    </div>
                    {ev.description && <p className="text-xs text-slate-500">{ev.description}</p>}
                    {ev.details && <p className="text-xs text-slate-500">{typeof ev.details === 'string' ? ev.details : JSON.stringify(ev.details)}</p>}
                    {ev.tx_id && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Tx: {ev.tx_id}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No events found for this evidence.</p>
          )}

          {trail.blockchain_record && (
            <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Blockchain Record</p>
              <p className="text-[11px] text-indigo-600 font-mono break-all">{typeof trail.blockchain_record === 'string' ? trail.blockchain_record : JSON.stringify(trail.blockchain_record)}</p>
            </div>
          )}
        </div>
      )}

      {/* Public Evidence List */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" /> Public Evidence Records
        </h2>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer bg-transparent border-none">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {evidence.length === 0 && !loading ? (
        <EmptyState icon={FileText} title="No public evidence" description="Published evidence appears here for public audit." />
      ) : (
        <div className="space-y-2 anim-fade-up del-2">
          {evidence.map((e, i) => {
            const cat = CATEGORY_INFO[e.category] || {};
            const statusCls = STATUS_COLORS[e.status] || 'bg-slate-100 text-slate-600 border-slate-200';
            return (
              <div key={i} className="card p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
                onClick={() => { setLookupId(e.evidence_id); }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{cat.emoji || '📄'}</span>
                  <div>
                    <p className="text-sm font-mono text-slate-700">{e.evidence_id}</p>
                    <p className="text-xs text-slate-400">
                      {cat.label || e.category}
                      {e.organization && ` · ${e.organization}`}
                      {e.submitted_at && ` · ${new Date(e.submitted_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <Badge className={statusCls}>{e.status}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
