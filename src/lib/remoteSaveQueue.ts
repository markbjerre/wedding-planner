import { isSupabaseConfigured, supabase } from './supabaseClient';
import { upsertRemoteLayout } from './remoteLayout';

let timer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 1500;

function resolveLayoutRowUserId(
  sessionUserId: string,
  cloudLayoutOwnerId: 'self' | string
): string {
  return cloudLayoutOwnerId === 'self' ? sessionUserId : cloudLayoutOwnerId;
}

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
      const { layout, cloudLayoutOwnerId } = useEditorStore.getState();
      const ownerId = resolveLayoutRowUserId(session.user.id, cloudLayoutOwnerId);
      await upsertRemoteLayout(ownerId, layout);
    } catch (e) {
      console.error('Cloud save failed', e);
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
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) return;
    const { useEditorStore } = await import('../store/editor-store');
    const { layout, cloudLayoutOwnerId } = useEditorStore.getState();
    const ownerId = resolveLayoutRowUserId(session.user.id, cloudLayoutOwnerId);
    await upsertRemoteLayout(ownerId, layout);
  } catch (e) {
    console.error('Cloud flush save failed', e);
  }
}
