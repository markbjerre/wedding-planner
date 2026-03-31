import { isSupabaseConfigured, supabase } from './supabaseClient';
import { upsertRemoteLayout } from './remoteLayout';

let timer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 1500;

/** Debounced cloud save; uses dynamic import to avoid circular deps with the editor store. */
export function queueRemoteSave(): void {
  if (!isSupabaseConfigured() || !supabase) return;
  const client = supabase;
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session?.user) return;
      const { useEditorStore } = await import('../store/editor-store');
      const layout = useEditorStore.getState().layout;
      await upsertRemoteLayout(session.user.id, layout);
    } catch (e) {
      console.error('Cloud save failed', e);
    }
  }, DEBOUNCE_MS);
}
