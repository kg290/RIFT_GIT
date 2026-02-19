import { useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { CATEGORIES, STAKE_RULES, CATEGORY_INFO } from '../lib/constants';

export default function EvidenceForm({ onSubmit, isSubmitting, walletConnected }) {
  const [category, setCategory] = useState('');
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [stakeAmount, setStakeAmount] = useState(0);

  const minStake = category ? CATEGORY_INFO[category]?.minStake : STAKE_RULES.minStakeAlgo;

  const addFiles = (e) => setFiles(p => [...p, ...Array.from(e.target.files || [])]);
  const removeFile = (i) => setFiles(p => p.filter((_, idx) => idx !== i));

  const submit = (e) => {
    e.preventDefault();
    if (!category || !organization || !description) return;
    onSubmit({ category, organization, description, files, stakeAmount });
  };

  return (
    <form onSubmit={submit} className="card p-6 space-y-5 anim-fade-up">
      {/* Category */}
      <fieldset>
        <legend className="text-sm font-medium text-zinc-300 mb-2">Category</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map(c => (
            <button key={c.value} type="button" onClick={() => setCategory(c.value)}
              className={`p-3 rounded-lg text-left text-xs font-medium cursor-pointer border transition-all
                ${category === c.value
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
              <span className="mr-1.5">{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Organization */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Organization / Entity</label>
        <input type="text" value={organization} onChange={e => setOrganization(e.target.value)}
          placeholder="e.g. Acme Corp, City Council…"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors" />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe the wrongdoing and supporting context…" rows={4}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none" />
      </div>

      {/* Files */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Evidence Files</label>
        <label className="flex items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-950/50 cursor-pointer hover:border-indigo-500/40 transition-colors">
          <Upload className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-500">Click to upload</span>
          <input type="file" multiple onChange={addFiles} className="hidden" />
        </label>
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 text-xs text-zinc-300"><FileText className="w-3.5 h-3.5 text-zinc-500" />{f.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="text-zinc-500 hover:text-red-400 cursor-pointer bg-transparent border-none"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stake */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Stake <span className="text-zinc-500 font-normal">(optional, min {minStake} ALGO)</span></label>
        <div className="flex gap-2">
          {[0, minStake, minStake * 2, minStake * 3].map(a => (
            <button key={a} type="button" onClick={() => setStakeAmount(a)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer border transition-all
                ${stakeAmount === a ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}>
              {a === 0 ? 'Free' : `${a} ALGO`}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={isSubmitting || !walletConnected || !category || !organization || !description}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold cursor-pointer hover:bg-indigo-500 transition-colors border-none disabled:opacity-40 disabled:cursor-not-allowed">
        {isSubmitting
          ? <><Loader2 className="w-4 h-4 animate-spin" />Encrypting & Submitting…</>
          : <><Upload className="w-4 h-4" />Submit Evidence</>}
      </button>

      {!walletConnected && <p className="text-xs text-center text-zinc-500">Connect a wallet above to submit</p>}
    </form>
  );
}
