export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${className}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value, sub, className = '' }) {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-lg p-4 text-center ${className}`}>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="card p-12 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center mx-auto mb-4">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}

export function PageHeader({ badge, badgeIcon: BIcon, title, subtitle }) {
  return (
    <div className="text-center mb-8 anim-fade-up">
      {badge && (
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs mb-5 bg-indigo-50 border border-indigo-200 text-indigo-600">
          {BIcon && <BIcon className="w-3.5 h-3.5" />}
          <span className="font-medium">{badge}</span>
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 max-w-lg mx-auto">{subtitle}</p>}
    </div>
  );
}
