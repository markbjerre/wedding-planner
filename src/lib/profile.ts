import { supabase } from './supabaseClient';

const TABLE = 'wedding_planner_profiles';

export interface WeddingPlannerProfile {
  user_id: string;
  display_name: string;
  updated_at: string;
}

/** Returns map user_id -> trimmed display name (may be empty). */
export async function fetchProfilesByUserIds(
  ids: string[]
): Promise<Record<string, string>> {
  if (!supabase || ids.length === 0) return {};
  const unique = [...new Set(ids)];
  const { data, error } = await supabase
    .from(TABLE)
    .select('user_id, display_name')
    .in('user_id', unique);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const r = row as { user_id: string; display_name: string | null };
    map[r.user_id] = (r.display_name ?? '').trim();
  }
  return map;
}

export async function getMyProfile(): Promise<WeddingPlannerProfile | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('user_id, display_name, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as WeddingPlannerProfile | null;
}

export async function upsertMyDisplayName(displayName: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not signed in');
  const trimmed = displayName.trim().slice(0, 80);
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: session.user.id,
      display_name: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

/** Label for lists: name, or short id if unset. */
export function formatUserLabel(userId: string, nameMap: Record<string, string>): string {
  const n = nameMap[userId]?.trim();
  if (n) return n;
  return userId.length <= 12 ? userId : `${userId.slice(0, 8)}…`;
}
