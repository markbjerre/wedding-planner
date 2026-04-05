import { create } from 'zustand';

export type CloudSavePhase =
  | 'idle'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'error'
  | 'offline'
  | 'skipped_no_session';

interface CloudSaveState {
  phase: CloudSavePhase;
  lastSavedAt: number | null;
  lastError: string | null;
  setPending: () => void;
  setSaving: () => void;
  setSaved: () => void;
  setError: (message: string) => void;
  setOffline: () => void;
  setSkippedNoSession: () => void;
  resetIdle: () => void;
}

export const useCloudSaveStore = create<CloudSaveState>((set) => ({
  phase: 'idle',
  lastSavedAt: null,
  lastError: null,
  setPending: () => set({ phase: 'pending', lastError: null }),
  setSaving: () => set({ phase: 'saving', lastError: null }),
  setSaved: () =>
    set({
      phase: 'saved',
      lastSavedAt: Date.now(),
      lastError: null,
    }),
  setError: (message: string) => set({ phase: 'error', lastError: message }),
  setOffline: () => set({ phase: 'offline', lastError: null }),
  setSkippedNoSession: () => set({ phase: 'skipped_no_session', lastError: null }),
  resetIdle: () => set({ phase: 'idle' }),
}));
