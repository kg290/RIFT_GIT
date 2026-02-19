import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
const g = (u) => api.get(u).then(r => r.data);
const p = (u, d) => api.post(u, d).then(r => r.data);
const pu = (u, d) => api.put(u, d).then(r => r.data);
// POST with query param (FastAPI endpoints that take evidence_id as query)
const pq = (u, params) => api.post(u, null, { params }).then(r => r.data);

// Health
export const checkHealth = () => g('/health');

// Wallet
export const createWallet = () => p('/wallet/create');

// Evidence
export const submitEvidence = async ({ category, organization, description, files, walletMnemonic, stakeAmount }) => {
  const fd = new FormData();
  fd.append('category', category);
  fd.append('organization', organization);
  fd.append('description', description);
  if (walletMnemonic) fd.append('wallet_mnemonic', walletMnemonic);
  fd.append('stake_amount', String(stakeAmount || 0));
  if (files?.length)  files.forEach(f => fd.append('files', f));
  return api.post('/evidence/submit', fd).then(r => r.data);
};
export const getEvidence = (id) => g(`/evidence/${id}`);

// Submissions
export const getAllSubmissions      = () => g('/submissions/all');
export const getSubmissionsByStatus = (s) => g(`/submissions/status/${s}`);
export const getSubmissionsByWallet = (a) => g(`/submissions/wallet/${a}`);

// Inspectors
export const registerInspector      = (d) => p('/verification/register-inspector', d);
export const updateInspectorProfile = (d) => pu('/verification/inspector/profile', d);
export const getInspectorProfile    = (a) => g(`/verification/inspector/${a}/profile`);
export const getInspectorCases      = (a) => g(`/verification/inspector/${a}/cases`);
export const listInspectors         = () => g('/verification/inspectors');
export const getInspectorReputation = (a) => g(`/verification/inspector/${a}`);

// Verification — begin & commit/reveal use JSON body
export const beginVerification       = (d) => p('/verification/begin', d);
export const commitVerdict           = (d) => p('/verification/commit', d);
// advanceToReveal & finalize take evidence_id as query param
export const advanceToReveal         = (evidenceId) => pq('/verification/advance-to-reveal', { evidence_id: evidenceId });
export const revealVerdict           = (d) => p('/verification/reveal', d);
export const finalizeVerification    = (evidenceId) => pq('/verification/finalize', { evidence_id: evidenceId });
export const getVerificationStatus   = (id) => g(`/verification/status/${id}`);
export const getAllVerificationSessions = () => g('/verification/sessions');
// generate-commit: { verdict: int, nonce: string }
export const generateCommitHash      = (d) => p('/verification/generate-commit', d);

// Resolution — resolve takes evidence_id as query param
export const resolveEvidence   = (evidenceId) => pq('/resolution/resolve', { evidence_id: evidenceId });
export const getResolution     = (id) => g(`/resolution/${id}`);
export const getAllResolutions = () => g('/resolution/all/list');
export const getResolutionStats = () => g('/resolution/stats/summary');

// Bounty
export const getBountyInfo      = (c) => g(`/bounty/info/${c}`);
export const getAllBountyInfo    = () => g('/bounty/info');
export const processBounty      = (id) => p(`/bounty/process/${id}`);
export const getBountyPayout    = (id) => g(`/bounty/payout/${id}`);
export const getAllBountyPayouts = () => g('/bounty/payouts');
export const getBountyStats     = () => g('/bounty/stats');

// Publication — publish takes evidence_id as path param
export const publishEvidence     = (id) => p(`/publication/publish/${id}`);
export const getPublication      = (id) => g(`/publication/${id}`);
export const getAllPublications   = () => g('/publication/records/all');
export const getPublicationStats = () => g('/publication/stats/summary');

// Audit — audit/publish takes evidence_id as query param
export const auditPublish      = (evidenceId) => pq('/audit/publish', { evidence_id: evidenceId });
export const getAuditTrail     = (id) => g(`/audit/trail/${id}`);
export const getAllAuditRecords = () => g('/audit/records');
export const getPublicEvidence = () => g('/audit/public');
export const getAuditStats     = () => g('/audit/stats');

// Contract
export const getContractTransparency = () => g('/contract/transparency');
export const getContractBalance      = () => g('/contract/balance');

// Stake
export const getStakeInfo   = (c) => g(`/stake/info/${c}`);
export const getAllStakeInfo = () => g('/stake/info');
