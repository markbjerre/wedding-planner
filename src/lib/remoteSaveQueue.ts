import { isSupabaseConfigured, supabase } from './supabaseClient';
import { upsertRemoteLayout } from './remoteLayout';
import { resolveLayoutRowUserId } from './cloudLayoutOwner';
import { useCloudSaveStore } from '../store/cloud-save-store';

let timer: ReturnType<typeof setTimeout> | null = null;

/** Debounce delay before uploading layout JSON to Supabase (ms). */
export const DEBOUNCE_MS = 1500;

let cloudListenersAttached = false;

/** Subscribe to online/offline; call once from `main.tsx`. */
export function initCloudSaveListeners(): void {
  if (typeof window === 'undefined' || cloudListenersAttached) return;
  cloudListenersAttached = true;
  const onOnline = () => {
    useCloudSaveStore.getState().resetIdle();
    void flushRemoteSave();
  };
  const onOffline = () => {
    useCloudSaveStore.getState().setOffline();
  };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  if (!navigator.onLine) onOffline();
}

/** Debounced cloud save; uses dynamic import to avoid circular deps with the editor store. */
export function queueRemoteSave(): void {
  if (!isSupabaseConfigured() || !supabase) return;
  const client = supabase;
  useCloudSaveStore.getState().setPending();
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        useCloudSaveStore.getState().setOffline();
        return;
      }
      useCloudSaveStore.getState().setSaving();
      const { data: { session } } = await client.auth.getSession();
      if (!session?.user) {
        useCloudSaveStore.getState().setSkippedNoSession();
        return;
      }
      const { useEditorStore } = await import('../store/editor-store');
      const { layout, cloudLayoutOwnerId } = useEditorStore.getState();
      const ownerId = resolveLayoutRowUserId(session.user.id, cloudLayoutOwnerId);
      await upsertRemoteLayout(ownerId, layout);
      useCloudSaveStore.getState().setSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      console.error('Cloud save failed', e);
      useCloudSaveStore.getState().setError(msg);
    }
  }, DEBOUNCE_MS);
}

/** Save immediately (e.g. before switching shared project). */
export async function flushRemoteSave(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const client = supabase;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      useCloudSaveStore.getState().setOffline();
      return;
    }
    useCloudSaveStore.getState().setSaving();
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) {
      useCloudSaveStore.getState().setSkippedNoSession();
      return;
    }
    const { useEditorStore } = await import('../store/editor-store');
    const { layout, cloudLayoutOwnerId } = useEditorStore.getState();
    const ownerId = resolveLayoutRowUserId(session.user.id, cloudLayoutOwnerId);
    await upsertRemoteLayout(ownerId, layout);
    useCloudSaveStore.getState().setSaved();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed';
    console.error('Cloud flush save failed', e);
    useCloudSaveStore.getState().setError(msg);
  }
}
