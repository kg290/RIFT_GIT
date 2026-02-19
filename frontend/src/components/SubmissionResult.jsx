import { CheckCircle2, Copy, ExternalLink, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

export default function SubmissionResult({ result, onReset }) {
  const [copied, setCopied] = useState(false);

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-8 text-center anim-fade-up">
      <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center mx-auto mb-4">
        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">Evidence Submitted Successfully</h3>
      <p className="text-sm text-slate-500 mb-6">Your evidence is encrypted, pinned to IPFS, and anchored on Algorand.</p>

      <div className="space-y-3 text-left mb-6">
        {result.evidence_id && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <div><p className="text-[11px] text-slate-400">Evidence ID</p><p className="text-sm font-mono text-slate-700">{result.evidence_id}</p></div>
            <button onClick={() => copy(result.evidence_id)} className="p-1.5 rounded bg-white border border-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        {result.ipfs_hash && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[11px] text-slate-400">IPFS Hash</p>
            <p className="text-sm font-mono text-slate-700 break-all">{result.ipfs_hash}</p>
          </div>
        )}
        {result.tx_id && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[11px] text-slate-400">Transaction ID</p>
            <p className="text-sm font-mono text-slate-700 break-all">{result.tx_id}</p>
          </div>
        )}
        {result.status && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[11px] text-slate-400">Status</p>
            <p className="text-sm font-medium text-emerald-600">{result.status}</p>
          </div>
        )}
      </div>

      {result.ipfs_url && (
        <a href={result.ipfs_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500 mb-4">
          View on IPFS <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}

      <div className="pt-2">
        <button onClick={onReset}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium cursor-pointer hover:bg-indigo-500 border-none transition-colors">
          Submit Another <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
