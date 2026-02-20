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
      <fieldset>
        <legend className="text-sm font-medium text-slate-700 mb-2">Category</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map(c => (
            <button key={c.value} type="button" onClick={() => setCategory(c.value)}
              className={`p-3 rounded-lg text-left text-xs font-medium cursor-pointer border transition-all
                ${category === c.value
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <span className="mr-1.5">{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Organization / Entity</label>
        <input type="text" value={organization} onChange={e => setOrganization(e.target.value)}
          placeholder="e.g. Acme Corp, City Council…"
          className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe the wrongdoing and supporting context…" rows={4}
          className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Evidence Files</label>
        <label className="flex items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-indigo-400 transition-colors">
          <Upload className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">Click to upload</span>
          <input type="file" multiple onChange={addFiles} className="hidden" />
        </label>
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 text-xs text-slate-600"><FileText className="w-3.5 h-3.5 text-slate-400" />{f.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 cursor-pointer bg-transparent border-none"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Stake <span className="text-slate-400 font-normal">(optional, min {minStake} ALGO)</span></label>
        <div className="flex gap-2">
          {[0, minStake, minStake * 2, minStake * 3].map(a => (
            <button key={a} type="button" onClick={() => setStakeAmount(a)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer border transition-all
                ${stakeAmount === a ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {a === 0 ? 'Free' : `${a} ALGO`}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={isSubmitting || !walletConnected || !category || !organization || !description}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold cursor-pointer hover:bg-indigo-500 transition-colors border-none disabled:opacity-40 disabled:cursor-not-allowed">
        {isSubmitting
          ? <><Loader2 className="w-4 h-4 animate-spin" />Encrypting & Submitting…</>
          : <><Upload className="w-4 h-4" />Submit Evidence</>}
      </button>

      {!walletConnected && <p className="text-xs text-center text-slate-400">Connect a wallet above to submit</p>}
    </form>
  );
}
