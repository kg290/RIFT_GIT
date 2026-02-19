import { Shield, FileText, Eye, Gavel, Megaphone, Lock, Link2, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/UI';

const STEPS = [
  { num: 1, icon: FileText, title: 'Submit Evidence', description: 'Whistleblowers encrypt and upload corruption evidence with supporting documents. Evidence is stored on IPFS for decentralized, tamper-proof storage.', color: 'indigo' },
  { num: 2, icon: Lock, title: 'Stake & Encrypt', description: 'Submitters stake ALGO tokens as a bond for genuine evidence. All evidence is encrypted with AES-256 before upload — only authorized inspectors can decrypt.', color: 'amber' },
  { num: 3, icon: Link2, title: 'Blockchain Registration', description: 'An evidence hash is registered on Algorand blockchain via smart contract. This creates an immutable, timestamped proof of submission.', color: 'emerald' },
  { num: 4, icon: Users, title: 'Inspector Assignment', description: 'A minimum of 3 government-authorized inspectors with matching specializations are randomly assigned to verify the evidence.', color: 'blue' },
  { num: 5, icon: Eye, title: 'Commit-Reveal Verification', description: 'Inspectors independently commit hashed verdicts, then reveal them. This two-phase protocol prevents collusion and ensures unbiased verification.', color: 'purple' },
  { num: 6, icon: Gavel, title: 'Resolution & Stakes', description: 'When ≥67% consensus is reached, evidence is verified or rejected. Stakes are returned to genuine submitters or slashed for false reports.', color: 'rose' },
  { num: 7, icon: Megaphone, title: 'Publication', description: 'Verified corruption evidence is automatically published to Twitter/X, Telegram, Email alerts, and RTI portals for maximum transparency.', color: 'orange' },
];

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', ring: 'ring-indigo-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', ring: 'ring-amber-100' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', ring: 'ring-blue-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', ring: 'ring-purple-100' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', ring: 'ring-rose-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', ring: 'ring-orange-100' },
};

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader badge="How It Works" badgeIcon={Shield} title="The WhistleChain Process"
        subtitle="A fully decentralized, 7-step pipeline for submitting, verifying, and publishing corruption evidence." />

      <div className="space-y-4 anim-fade-up del-1">
        {STEPS.map((step, i) => {
          const colors = COLOR_MAP[step.color];
          return (
            <div key={step.num} className="card p-5 flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl ${colors.bg} ${colors.border} border grid place-items-center shrink-0`}>
                <step.icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-bold ${colors.text} ${colors.bg} px-2 py-0.5 rounded-full border ${colors.border}`}>Step {step.num}</span>
                  <h3 className="text-sm font-semibold text-slate-800">{step.title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Features */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 anim-fade-up del-2">
        <div className="card p-5 text-center">
          <p className="text-2xl mb-2">🔐</p>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">End-to-End Encryption</h4>
          <p className="text-xs text-slate-500">AES-256 encryption ensures only authorized parties can access evidence</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-2xl mb-2">⛓️</p>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">Blockchain Immutability</h4>
          <p className="text-xs text-slate-500">Algorand smart contract provides tamper-proof evidence registration</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-2xl mb-2">🗳️</p>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">Multi-Inspector Consensus</h4>
          <p className="text-xs text-slate-500">67% threshold across 3+ inspectors prevents manipulation</p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10 text-center anim-fade-up del-3">
        <button onClick={() => navigate('/submit')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold cursor-pointer hover:bg-indigo-500 transition-colors border-none">
          Submit Evidence Now <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-xs text-slate-400 mt-2">Your identity is protected by military-grade encryption</p>
      </div>
    </div>
  );
}
