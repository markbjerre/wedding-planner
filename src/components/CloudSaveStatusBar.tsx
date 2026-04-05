import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { useCloudSaveStore } from '../store/cloud-save-store';

function formatSavedAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function CloudSaveStatusBar() {
  const phase = useCloudSaveStore((s) => s.phase);
  const lastSavedAt = useCloudSaveStore((s) => s.lastSavedAt);
  const lastError = useCloudSaveStore((s) => s.lastError);
  const [, tick] = useState(0);

  useEffect(() => {
    if (phase !== 'saved' || !lastSavedAt) return;
    const id = window.setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, [phase, lastSavedAt]);

  if (!isSupabaseConfigured()) {
    return (
      <span className="text-[11px] text-stone-400 whitespace-nowrap" title="Cloud sync not configured in this build">
        Local only
      </span>
    );
  }

  let label: string;
  let tone = 'text-stone-500';
  switch (phase) {
    case 'idle':
      label = 'Cloud: ready';
      break;
    case 'pending':
      label = 'Autosave pending…';
      tone = 'text-amber-700';
      break;
    case 'saving':
      label = 'Saving to cloud…';
      tone = 'text-amber-800';
      break;
    case 'saved':
      label = lastSavedAt ? `Saved ${formatSavedAgo(lastSavedAt)}` : 'Saved';
      tone = 'text-emerald-700';
      break;
    case 'error':
      label = lastError ? `Save failed: ${lastError.slice(0, 48)}` : 'Save failed';
      tone = 'text-red-600';
      break;
    case 'offline':
      label = 'Offline — will sync when back online';
      tone = 'text-amber-800';
      break;
    case 'skipped_no_session':
      label = 'Sign in to sync';
      tone = 'text-stone-400';
      break;
    default:
      label = '';
  }

  return (
    <span
      className={`text-[11px] ${tone} whitespace-nowrap max-w-[14rem] md:max-w-[20rem] truncate`}
      title={phase === 'error' && lastError ? lastError : label}
    >
      {label}
    </span>
  );
}
