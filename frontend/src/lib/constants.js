// Backend categories (must match MIN_STAKE_MICROALGOS keys)
export const CATEGORY_INFO = {
  FINANCIAL:    { label: 'Financial Fraud',    emoji: '💰', minStake: 25,  color: 'text-red-400' },
  CONSTRUCTION: { label: 'Construction Fraud', emoji: '🏗️', minStake: 50,  color: 'text-amber-400' },
  FOOD:         { label: 'Food Safety',        emoji: '🍽️', minStake: 25,  color: 'text-emerald-400' },
  ACADEMIC:     { label: 'Academic Fraud',     emoji: '🎓', minStake: 15,  color: 'text-cyan-400' },
};

export const CATEGORIES = Object.entries(CATEGORY_INFO).map(([k, v]) => ({ value: k, ...v }));

export const STAKE_RULES = { minStakeAlgo: 15, maxStakeAlgo: 500 };

export const BOUNTY_REWARDS = {
  FINANCIAL:    { base: 100, max: 500 },
  CONSTRUCTION: { base: 80,  max: 400 },
  FOOD:         { base: 70,  max: 350 },
  ACADEMIC:     { base: 90,  max: 450 },
};

export const VERDICT_LABELS = { 1: 'Authentic', 2: 'Fake / Fabricated', 3: 'Inconclusive' };

// Backend returns UPPERCASE statuses
export const STATUS_COLORS = {
  PENDING:              'bg-amber-50 text-amber-700 border-amber-200',
  UNDER_VERIFICATION:   'bg-blue-50 text-blue-700 border-blue-200',
  VERIFIED:             'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED:             'bg-red-50 text-red-700 border-red-200',
  RESOLVED:             'bg-purple-50 text-purple-700 border-purple-200',
  PUBLISHED:            'bg-cyan-50 text-cyan-700 border-cyan-200',
  DISPUTED:             'bg-orange-50 text-orange-700 border-orange-200',
};

export const PHASE_COLORS = {
  COMMIT:    'bg-amber-50 text-amber-700 border-amber-200',
  REVEAL:    'bg-blue-50 text-blue-700 border-blue-200',
  FINALIZED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
