import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useEditorStore } from '../../store/editor-store';
import {
  acceptShareInvite,
  createShareInvite,
  leaveSharedProject,
  listLayoutsSharedWithMe,
  listMyCollaborators,
  revokeCollaborator,
  type LayoutShareRow,
} from '../../lib/remoteLayout';
import { fetchProfilesByUserIds, formatUserLabel } from '../../lib/profile';

const INPUT =
  'w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400';
const BTN =
  'w-full h-8 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50';

export function ShareProjectsPanel() {
  const cloudLayoutOwnerId = useEditorStore((s) => s.cloudLayoutOwnerId);
  const setCloudLayoutOwnerId = useEditorStore((s) => s.setCloudLayoutOwnerId);

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sharedWithMe, setSharedWithMe] = useState<LayoutShareRow[]>([]);
  const [collaborators, setCollaborators] = useState<LayoutShareRow[]>([]);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  const refreshLists = useCallback(async () => {
    if (!supabase || !sessionUserId) {
      setSharedWithMe([]);
      setCollaborators([]);
      return;
    }
    try {
      const [swm, cols] = await Promise.all([
        listLayoutsSharedWithMe(),
        listMyCollaborators(),
      ]);
      setSharedWithMe(swm);
      setCollaborators(cols);
    } catch (e) {
      console.error(e);
    }
  }, [sessionUserId]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUserId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists, sessionUserId]);

  useEffect(() => {
    const ids = [
      sessionUserId,
      ...sharedWithMe.map((r) => r.owner_user_id),
      ...collaborators.map((c) => c.shared_with_user_id),
      ...(cloudLayoutOwnerId !== 'self' ? [cloudLayoutOwnerId] : []),
    ].filter(Boolean) as string[];
    const uniq = [...new Set(ids)];
    if (uniq.length === 0) {
      setNameMap({});
      return;
    }
    void fetchProfilesByUserIds(uniq)
      .then(setNameMap)
      .catch((e) => console.error(e));
  }, [sessionUserId, sharedWithMe, collaborators, cloudLayoutOwnerId]);

  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  if (!sessionUserId) {
    return (
      <section className="mb-5 p-3 rounded-lg border border-stone-200 bg-stone-50/80">
        <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Shared projects</h3>
        <p className="text-[11px] text-stone-500">Sign in to invite collaborators or open layouts shared with you.</p>
      </section>
    );
  }

  const editingShared = cloudLayoutOwnerId !== 'self';

  const handleGenerateInvite = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const code = await createShareInvite();
      setGeneratedCode(code);
      setMessage('Send this code to your collaborator. It expires in 7 days.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not create invite');
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptInvite = async () => {
    setMessage(null);
    const code = inviteCodeInput.trim();
    if (!code) return;
    setBusy(true);
    try {
      await acceptShareInvite(code);
      setInviteCodeInput('');
      setMessage('You now have access to their layout. Pick it below.');
      await refreshLists();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (sharedWithUserId: string) => {
    setBusy(true);
    try {
      await revokeCollaborator(sharedWithUserId);
      await refreshLists();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not remove');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async (ownerUserId: string) => {
    setBusy(true);
    try {
      await leaveSharedProject(ownerUserId);
      if (cloudLayoutOwnerId === ownerUserId) {
        await setCloudLayoutOwnerId('self');
      }
      await refreshLists();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not leave');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-5 p-3 rounded-lg border border-stone-200 bg-stone-50/80">
      <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Shared projects</h3>
      <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
        Invite someone with a one-time code so they can open and edit the same floor plan. You can also switch between
        your layout and projects others shared with you.
      </p>

      {editingShared && (
        <div className="mb-3 px-2 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
          Editing shared project ({formatUserLabel(cloudLayoutOwnerId, nameMap)}). Changes save to their cloud layout.
          <button
            type="button"
            disabled={busy}
            onClick={() => void setCloudLayoutOwnerId('self')}
            className="mt-2 w-full h-7 rounded border border-amber-300 bg-white text-amber-900 text-xs font-medium hover:bg-amber-100"
          >
            Back to my layout
          </button>
        </div>
      )}

      <div className="space-y-2 mb-3">
        <label className="text-[11px] font-medium text-stone-600">Active project</label>
        <select
          value={cloudLayoutOwnerId === 'self' ? 'self' : cloudLayoutOwnerId}
          disabled={busy}
          onChange={(e) => {
            const v = e.target.value;
            void setCloudLayoutOwnerId(v === 'self' ? 'self' : v);
          }}
          className={`${INPUT} cursor-pointer`}
        >
          <option value="self">My layout</option>
          {sharedWithMe.map((row) => (
            <option key={row.owner_user_id} value={row.owner_user_id}>
              Shared · {formatUserLabel(row.owner_user_id, nameMap)}
            </option>
          ))}
        </select>
      </div>

      {!editingShared && (
        <>
          <p className="text-[11px] font-medium text-stone-600 mb-1">Invite collaborator</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerateInvite()}
            className={`${BTN} border-amber-300 bg-amber-600 text-white hover:bg-amber-700 mb-2`}
          >
            Generate invite code
          </button>
          {generatedCode && (
            <div className="mb-2 px-2 py-1.5 bg-white border border-stone-200 rounded font-mono text-xs break-all">
              {generatedCode}
            </div>
          )}
        </>
      )}

      <p className="text-[11px] font-medium text-stone-600 mb-1 mt-2">Accept invite</p>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Paste code"
          value={inviteCodeInput}
          onChange={(e) => setInviteCodeInput(e.target.value)}
          className={`${INPUT} flex-1`}
        />
        <button
          type="button"
          disabled={busy || !inviteCodeInput.trim()}
          onClick={() => void handleAcceptInvite()}
          className={`${BTN} px-3 shrink-0 border-stone-300 bg-white text-stone-700 hover:bg-stone-100`}
        >
          Redeem
        </button>
      </div>

      {!editingShared && collaborators.length > 0 && (
        <div className="mb-2">
          <p className="text-[11px] font-medium text-stone-600 mb-1">Can edit your layout</p>
          <ul className="space-y-1">
            {collaborators.map((c) => (
              <li
                key={c.shared_with_user_id}
                className="flex items-center justify-between gap-2 text-[11px] text-stone-700"
              >
                <span className="truncate" title={c.shared_with_user_id}>
                  {formatUserLabel(c.shared_with_user_id, nameMap)}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRevoke(c.shared_with_user_id)}
                  className="shrink-0 text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sharedWithMe.length > 0 && (
        <div className="mt-2 pt-2 border-t border-stone-200">
          <p className="text-[11px] font-medium text-stone-600 mb-1">Leave a shared project</p>
          <ul className="space-y-1">
            {sharedWithMe.map((row) => (
              <li key={row.owner_user_id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-stone-600 truncate" title={row.owner_user_id}>
                  {formatUserLabel(row.owner_user_id, nameMap)}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleLeave(row.owner_user_id)}
                  className="shrink-0 text-red-600 hover:underline"
                >
                  Leave
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && <p className="text-[11px] text-stone-600 mt-2">{message}</p>}
    </section>
  );
}
