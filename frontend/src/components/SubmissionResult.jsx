import { CheckCircle2, Copy, Check, ExternalLink, RotateCcw } from 'lucide-react';
import { useState } from 'react';

function Field({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-zinc-500 mb-0.5">{label}</p>
        <p className="text-sm text-zinc-200 font-mono truncate">{value}</p>
      </div>
      <button onClick={copy} className="ml-3 p-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function SubmissionResult({ result, onReset }) {
  return (
    <div className="card p-6 anim-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 grid place-items-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Evidence Submitted</h3>
          <p className="text-xs text-zinc-400">Encrypted · IPFS · Algorand</p>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <Field label="Evidence ID" value={result.evidence_id} />
        <Field label="IPFS Hash" value={result.ipfs_hash} />
        {result.tx_id && <Field label="Transaction ID" value={result.tx_id} />}
        <Field label="Encryption Key" value={result.encryption_key_hex} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
          <p className="text-[11px] text-zinc-500 mb-1">Status</p>
          <p className="text-sm font-medium text-emerald-400">{result.status}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
          <p className="text-[11px] text-zinc-500 mb-1">Stake</p>
          <p className="text-sm font-medium text-white">{result.stake_amount} ALGO</p>
        </div>
      </div>

      {result.ipfs_url && (
        <a href={result.ipfs_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:text-white transition-colors mb-3">
          View on IPFS <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}

      <button onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-400 hover:text-white cursor-pointer transition-colors">
        <RotateCcw className="w-3.5 h-3.5" /> Submit Another
      </button>
    </div>
  );
}
