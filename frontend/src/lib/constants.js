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
  PENDING:              'bg-amber-500/15 text-amber-400 border-amber-500/25',
  UNDER_VERIFICATION:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
  VERIFIED:             'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  REJECTED:             'bg-red-500/15 text-red-400 border-red-500/25',
  RESOLVED:             'bg-purple-500/15 text-purple-400 border-purple-500/25',
  PUBLISHED:            'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  DISPUTED:             'bg-orange-500/15 text-orange-400 border-orange-500/25',
};

export const PHASE_COLORS = {
  COMMIT:    'bg-amber-500/15 text-amber-400 border-amber-500/25',
  REVEAL:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  FINALIZED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
};
