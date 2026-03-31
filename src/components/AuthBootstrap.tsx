import { useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchRemoteLayout, shareExists, upsertRemoteLayout } from '../lib/remoteLayout';
import { normalizeLayout } from '../lib/constraints';
import { useEditorStore } from '../store/editor-store';
import { layoutStorageOwnerKey } from '../lib/cloudLayoutOwner';
import { loadFromLocalStorage } from '../lib/storage';

/**
 * After login, merge server vs local layout by `updated_at` (row) vs `layout.updatedAt`.
 * Respects shared-project context: loads the active owner's row when the user is a collaborator.
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!supabase) return;

    const mergeAfterAuth = async (userId: string) => {
      const owner = useEditorStore.getState().cloudLayoutOwnerId;
      const remoteUuid = owner === 'self' ? userId : owner;
      if (owner !== 'self') {
        const ok = await shareExists(remoteUuid, userId);
        if (!ok) {
          await useEditorStore.getState().setCloudLayoutOwnerId('self');
          return;
        }
      }
      const local = useEditorStore.getState().layout;
      try {
        const remote = await fetchRemoteLayout(remoteUuid);
        if (!remote) {
          await upsertRemoteLayout(remoteUuid, local);
          return;
        }
        const remoteMs = new Date(remote.updatedAt).getTime();
        const localMs = new Date(local.updatedAt).getTime();
        if (remoteMs >= localMs) {
          useEditorStore.getState().setLayout(normalizeLayout(remote.layout));
        } else {
          await upsertRemoteLayout(remoteUuid, local);
        }
      } catch (e) {
        console.error('Cloud layout merge failed', e);
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) void mergeAfterAuth(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        void mergeAfterAuth(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        const owner = useEditorStore.getState().cloudLayoutOwnerId;
        const local = loadFromLocalStorage(layoutStorageOwnerKey(owner));
        if (local) {
          useEditorStore.getState().setLayout(normalizeLayout(local));
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
