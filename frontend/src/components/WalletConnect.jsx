import { useState } from 'react';
import { Wallet, RefreshCw, Copy, Check, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { createWallet } from '../lib/api';
import { useStore } from '../store/useStore';

export default function WalletConnect() {
  const { wallet, setWallet } = useStore();
  const [loading, setLoading] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(true);

  const connect = async () => {
    setLoading(true);
    try {
      const w = await createWallet();
      setWallet(w);
    } catch {}
    setLoading(false);
  };

  const copyAddr = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    }
  };

  const copyMnemonic = () => {
    if (wallet?.mnemonic) {
      navigator.clipboard.writeText(wallet.mnemonic);
      setCopiedMnemonic(true);
      setTimeout(() => setCopiedMnemonic(false), 2000);
    }
  };

  if (wallet) {
    return (
      <div className="card p-4 space-y-3">
        {/* Address row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 grid place-items-center">
              <Check className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">Wallet Connected</p>
              <p className="text-xs text-slate-400 font-mono">{wallet.address?.slice(0, 12)}…{wallet.address?.slice(-6)}</p>
            </div>
          </div>
          <button onClick={copyAddr} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors">
            {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Mnemonic section */}
        {wallet.mnemonic && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-semibold text-amber-700">Recovery Mnemonic</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowMnemonic(!showMnemonic)}
                  className="p-1.5 rounded-md bg-amber-100 border border-amber-200 text-amber-600 hover:text-amber-800 cursor-pointer transition-colors"
                  title={showMnemonic ? 'Hide' : 'Show'}>
                  {showMnemonic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={copyMnemonic}
                  className="p-1.5 rounded-md bg-amber-100 border border-amber-200 text-amber-600 hover:text-amber-800 cursor-pointer transition-colors"
                  title="Copy mnemonic">
                  {copiedMnemonic ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {showMnemonic && (
              <p className="text-xs text-amber-800 font-mono leading-relaxed break-all select-all bg-white/60 rounded-md px-2.5 py-2 border border-amber-100">
                {wallet.mnemonic}
              </p>
            )}
            <p className="text-[10px] text-amber-600/80">Save this phrase — it's the only way to recover this wallet. Never share it.</p>
          </div>
        )}
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
