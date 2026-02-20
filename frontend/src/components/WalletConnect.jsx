import { useState } from 'react';
import { Wallet, RefreshCw, Copy, Check } from 'lucide-react';
import { createWallet } from '../lib/api';
import { useStore } from '../store/useStore';

export default function WalletConnect() {
  const { wallet, setWallet } = useStore();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const connect = async () => {
    setLoading(true);
    try {
      const w = await createWallet();
      setWallet(w);
    } catch {}
    setLoading(false);
  };

  const copy = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (wallet) {
    return (
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 grid place-items-center">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">Wallet Connected</p>
            <p className="text-xs text-slate-400 font-mono">{wallet.address?.slice(0, 12)}…{wallet.address?.slice(-6)}</p>
          </div>
        </div>
        <button onClick={copy} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 grid place-items-center mx-auto mb-3">
        <Wallet className="w-6 h-6 text-indigo-600" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Anonymous Wallet</h3>
      <p className="text-xs text-slate-500 mb-4">Generate a one-time Algorand wallet — no KYC, no identity stored.</p>
      <button onClick={connect} disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium cursor-pointer hover:bg-indigo-500 border-none transition-colors disabled:opacity-40">
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
        {loading ? 'Generating…' : 'Create Wallet'}
      </button>
    </div>
  );
}
