import type { Layout } from '../types';
import { normalizeLayout } from './constraints';
import { supabase } from './supabaseClient';

const TABLE = 'wedding_planner_layouts';

export async function fetchRemoteLayout(
  userId: string
): Promise<{ layout: Layout; updatedAt: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.data == null) return null;
  return {
    layout: normalizeLayout(data.data as Layout),
    updatedAt: data.updated_at as string,
  };
}

export async function upsertRemoteLayout(userId: string, layout: Layout): Promise<void> {
  if (!supabase) return;
  const payload = { ...layout, updatedAt: new Date().toISOString() };
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      data: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

const SHARES = 'wedding_planner_layout_shares';

export interface LayoutShareRow {
  owner_user_id: string;
  shared_with_user_id: string;
  created_at: string;
}

/** Layouts shared with the current user (they can open and edit). */
export async function listLayoutsSharedWithMe(): Promise<LayoutShareRow[]> {
  if (!supabase) return [];
  const uid = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from(SHARES)
    .select('owner_user_id, shared_with_user_id, created_at')
    .eq('shared_with_user_id', uid);
  if (error) throw error;
  return (data ?? []) as LayoutShareRow[];
}

/** Collaborators who can edit the current user's layout. */
export async function listMyCollaborators(): Promise<LayoutShareRow[]> {
  if (!supabase) return [];
  const uid = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from(SHARES)
    .select('owner_user_id, shared_with_user_id, created_at')
    .eq('owner_user_id', uid);
  if (error) throw error;
  return (data ?? []) as LayoutShareRow[];
}

export async function shareExists(ownerUserId: string, myUserId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from(SHARES)
    .select('owner_user_id')
    .eq('owner_user_id', ownerUserId)
    .eq('shared_with_user_id', myUserId)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

export async function createShareInvite(): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('create_wedding_planner_share_invite');
  if (error) throw error;
  return data as string;
}

export async function acceptShareInvite(code: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('accept_wedding_planner_share_invite', {
    p_code: code.trim(),
  });
  if (error) throw error;
}

export async function revokeCollaborator(sharedWithUserId: string): Promise<void> {
  if (!supabase) return;
  const uid = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from(SHARES)
    .delete()
    .eq('owner_user_id', uid)
    .eq('shared_with_user_id', sharedWithUserId);
  if (error) throw error;
}

export async function leaveSharedProject(ownerUserId: string): Promise<void> {
  if (!supabase) return;
  const uid = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from(SHARES)
    .delete()
    .eq('owner_user_id', ownerUserId)
    .eq('shared_with_user_id', uid);
  if (error) throw error;
}
