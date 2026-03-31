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
