import { useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchRemoteLayout, upsertRemoteLayout } from '../lib/remoteLayout';
import { normalizeLayout } from '../lib/constraints';
import { useEditorStore } from '../store/editor-store';

/**
 * After login, merge server vs local layout by `updated_at` (row) vs `layout.updatedAt`.
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!supabase) return;

    const mergeAfterAuth = async (userId: string) => {
      const local = useEditorStore.getState().layout;
      try {
        const remote = await fetchRemoteLayout(userId);
        if (!remote) {
          await upsertRemoteLayout(userId, local);
          return;
        }
        const remoteMs = new Date(remote.updatedAt).getTime();
        const localMs = new Date(local.updatedAt).getTime();
        if (remoteMs >= localMs) {
          useEditorStore.getState().setLayout(normalizeLayout(remote.layout));
        } else {
          await upsertRemoteLayout(userId, local);
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
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
