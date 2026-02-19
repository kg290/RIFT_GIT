import { useState } from 'react';
import { Wallet, Copy, Check, AlertTriangle, RefreshCw, KeyRound } from 'lucide-react';
import { createWallet } from '../lib/api';
import { useStore } from '../store/useStore';

export default function WalletConnect() {
  const { wallet, setWallet } = useStore();
  const [loading, setLoading] = useState(false);
  const [restoreMode, setRestoreMode] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [copied, setCopied] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const w = await createWallet();
      setWallet(w);
      setShowWarning(true);
    } finally { setLoading(false); }
  };

  const handleRestore = () => {
    if (mnemonic.trim().split(/\s+/).length === 25) {
      setWallet({ address: 'restored', mnemonic: mnemonic.trim() });
      setRestoreMode(false);
    }
  };

  const copyAddr = () => {
    navigator.clipboard.writeText(wallet?.address || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (showWarning && wallet) {
    return (
      <div className="card p-6 border-amber-500/30 anim-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-amber-400 text-sm">Save Your Recovery Phrase</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-3">This is the <strong className="text-white">only way</strong> to access your wallet.</p>
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-4">
          <code className="text-xs text-indigo-300 break-all leading-relaxed">{wallet.mnemonic}</code>
        </div>
        <button onClick={() => setShowWarning(false)}
          className="w-full py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold cursor-pointer hover:bg-amber-400 transition-colors border-none">
          I've Saved It
        </button>
      </div>
    );
  }

  if (wallet) {
    return (
      <div className="card p-5 anim-fade-up flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center">
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">Connected Wallet</p>
            <p className="text-sm font-mono text-white">{wallet.address.slice(0, 8)}…{wallet.address.slice(-6)}</p>
          </div>
        </div>
        <button onClick={copyAddr} className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors">
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  if (restoreMode) {
    return (
      <div className="card p-5 anim-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-sm">Restore Wallet</h3>
        </div>
        <textarea value={mnemonic} onChange={e => setMnemonic(e.target.value)}
          placeholder="25-word recovery phrase…"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white resize-none h-20 focus:outline-none focus:border-indigo-500 transition-colors mb-3" />
        <div className="flex gap-2">
          <button onClick={handleRestore} className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium cursor-pointer hover:bg-indigo-500 transition-colors border-none">Restore</button>
          <button onClick={() => setRestoreMode(false)} className="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-400 text-sm cursor-pointer hover:text-white border border-zinc-700 transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 anim-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-5 h-5 text-indigo-400" />
        <h3 className="font-semibold text-sm">Anonymous Wallet</h3>
      </div>
      <p className="text-xs text-zinc-400 mb-4">Generate a one-time Algorand wallet. No accounts, no emails — fully anonymous.</p>
      <div className="flex gap-2">
        <button onClick={handleCreate} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold cursor-pointer hover:bg-indigo-500 transition-colors border-none disabled:opacity-50">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
          {loading ? 'Creating…' : 'Create Wallet'}
        </button>
        <button onClick={() => setRestoreMode(true)}
          className="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-400 text-sm cursor-pointer hover:text-white border border-zinc-700 transition-colors">
          Restore
        </button>
      </div>
    </div>
  );
}
