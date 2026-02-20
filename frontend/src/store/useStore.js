import { create } from 'zustand';

export const useStore = create((set) => ({
  wallet: null,
  health: null,
  submissions: [],
  isSubmitting: false,
  setWallet:      (w) => set({ wallet: w }),
  setHealth:      (h) => set({ health: h }),
  setSubmissions: (s) => set({ submissions: s }),
  addSubmission:  (s) => set((st) => ({ submissions: [s, ...st.submissions] })),
  setIsSubmitting:(v) => set({ isSubmitting: v }),
}));
