import { useState } from 'react';
import { Shield, AlertCircle, Lock, Upload, Database } from 'lucide-react';
import WalletConnect from '../components/WalletConnect';
import EvidenceForm from '../components/EvidenceForm';
import SubmissionResult from '../components/SubmissionResult';
import { useStore } from '../store/useStore';
import { submitEvidence } from '../lib/api';
import { PageHeader } from '../components/UI';

export default function Submit() {
  const { wallet, isSubmitting, setIsSubmitting, addSubmission } = useStore();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (data) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await submitEvidence({ ...data, walletMnemonic: wallet?.mnemonic });
      setResult(res);
      addSubmission(res);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <PageHeader badge="Encrypted & Anonymous" badgeIcon={Shield} title="Submit Evidence"
        subtitle="Files are encrypted locally, uploaded to IPFS, and anchored on Algorand." />

      <div className="flex items-center justify-center gap-3 mb-8 anim-fade-up del-1">
        {[
          { icon: Lock, label: 'Encrypt', on: true },
          { icon: Upload, label: 'IPFS', on: !!wallet },
          { icon: Database, label: 'On-Chain', on: !!result },
        ].map(({ icon: I, label, on }, i) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${on ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
              <I className="w-3.5 h-3.5" />{label}
            </div>
            {i < 2 && <div className={`w-6 h-px ${on ? 'bg-indigo-300' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {result ? (
        <SubmissionResult result={result} onReset={() => { setResult(null); setError(null); }} />
      ) : (
        <div className="space-y-5 anim-fade-up del-2">
          <WalletConnect />
          {error && (
            <div className="card p-4 flex items-start gap-3 border-red-200">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-600 font-medium">Submission Failed</p>
                <p className="text-xs text-slate-500 mt-1">{error}</p>
              </div>
            </div>
          )}
          <EvidenceForm onSubmit={handleSubmit} isSubmitting={isSubmitting} walletConnected={!!wallet} />
        </div>
      )}
    </div>
  );
}
