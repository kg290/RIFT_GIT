import { Shield, Lock, Database, Eye, FileCheck, Scale, Coins, Megaphone, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    n: '01', icon: Lock, title: 'Evidence Submission',
    items: [
      'Generate an anonymous Algorand wallet — no KYC, no email',
      'Upload evidence files (documents, images, data)',
      'Files encrypted client-side with AES-256 before leaving your browser',
      'Encrypted bundle uploaded to IPFS (decentralized storage)',
      'Content hash and metadata anchored on Algorand blockchain',
    ],
  },
  {
    n: '02', icon: Coins, title: 'Optional Staking',
    items: [
      'Lock ALGO tokens as a credibility signal',
      'Higher stake → priority inspector assignment',
      'Stake held by smart contract — not any person',
      'Automatically returned if evidence is verified',
      'Forfeited only if proven fake (anti-spam)',
    ],
  },
  {
    n: '03', icon: Scale, title: 'Inspector Verification',
    items: [
      'Multiple inspectors assigned per submission',
      'Commit phase: each inspector hashes their verdict + secret',
      'Reveal phase: verdicts are revealed and compared',
      'Blind consensus prevents collusion and bias',
      'Finalization determines the majority verdict',
    ],
  },
  {
    n: '04', icon: FileCheck, title: 'Resolution & Bounty',
    items: [
      'On-chain resolution records the final outcome',
      'Stakes released or forfeited based on verdict',
      'Bounty rewards distributed to accurate inspectors',
      'Complete audit trail generated for public record',
      'Evidence optionally published for transparency',
    ],
  },
];

export default function HowItWorks() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-14 anim-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs mb-5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
          <Shield className="w-3.5 h-3.5" />
          <span className="font-medium">Full Protocol Breakdown</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">How WhistleChain Works</h1>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
          A decentralized protocol for anonymous evidence submission, verification, and resolution — powered by Algorand blockchain.
        </p>
      </div>

      <div className="space-y-6">
        {STEPS.map(({ n, icon: Icon, title, items }) => (
          <div key={n} className="card p-6 anim-fade-up">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-sm font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg w-10 h-10 grid place-items-center shrink-0">
                {n}
              </div>
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold">{title}</h2>
              </div>
            </div>
            <ul className="space-y-2 ml-14">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-400 leading-relaxed">
                  <span className="w-1 h-1 bg-indigo-400 rounded-full mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="card p-6 mt-8 anim-fade-up">
        <h3 className="text-sm font-semibold mb-4">Technology Stack</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Algorand', desc: 'Blockchain layer', icon: Database },
            { label: 'IPFS / Pinata', desc: 'Decentralized storage', icon: Eye },
            { label: 'AES-256', desc: 'Client-side encryption', icon: Lock },
            { label: 'Commit-Reveal', desc: 'Blind consensus', icon: Scale },
          ].map(t => (
            <div key={t.label} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
              <t.icon className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-white">{t.label}</p>
              <p className="text-[11px] text-zinc-500">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-12 anim-fade-up">
        <Link to="/submit"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
          Submit Evidence <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
