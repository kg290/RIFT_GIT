export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${className}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value, sub, className = '' }) {
  return (
    <div className={`bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-center ${className}`}>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="card p-12 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 grid place-items-center mx-auto mb-4">
          <Icon className="w-6 h-6 text-zinc-500" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-zinc-300 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
  );
}

export function PageHeader({ badge, badgeIcon: BIcon, title, subtitle }) {
  return (
    <div className="text-center mb-8 anim-fade-up">
      {badge && (
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs mb-5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
          {BIcon && <BIcon className="w-3.5 h-3.5" />}
          <span className="font-medium">{badge}</span>
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
      {subtitle && <p className="text-sm text-zinc-400 max-w-lg mx-auto">{subtitle}</p>}
    </div>
  );
}
