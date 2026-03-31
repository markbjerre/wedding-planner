import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getMyProfile, upsertMyDisplayName } from '../../lib/profile';

const INPUT =
  'w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400';
const BTN =
  'w-full h-8 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50';

export function CloudSyncPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionEmail) {
      setDisplayName('');
      setDisplayNameDraft('');
      return;
    }
    if (!supabase) return;
    void supabase.auth.getSession().then(async () => {
      try {
        const p = await getMyProfile();
        const v = p?.display_name?.trim() ?? '';
        setDisplayName(v);
        setDisplayNameDraft(v);
      } catch {
        /* ignore */
      }
    });
  }, [sessionEmail]);

  if (!supabase) {
    return (
      <section className="mb-5 p-3 rounded-lg border border-stone-200 bg-stone-50/80">
        <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Cloud sync</h3>
        <p className="text-[11px] text-stone-500 leading-relaxed">
          Set <code className="text-stone-700">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-stone-700">VITE_SUPABASE_ANON_KEY</code> when building so layouts can be stored in
          Supabase. See <code className="text-stone-700">supabase/001_wedding_planner_layouts.sql</code>.
        </p>
      </section>
    );
  }

  const client = supabase;

  const handleSignIn = async () => {
    setMessage(null);
    setBusy(true);
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setMessage(error.message);
  };

  const handleSignUp = async () => {
    setMessage(null);
    setBusy(true);
    const { error } = await client.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) setMessage(error.message);
    else setMessage('Check your email to confirm the account if required by your Supabase project.');
  };

  const handleSignOut = async () => {
    setMessage(null);
    setBusy(true);
    const { error } = await client.auth.signOut();
    setBusy(false);
    if (error) setMessage(error.message);
  };

  const handleSaveDisplayName = async () => {
    setMessage(null);
    setBusy(true);
    try {
      await upsertMyDisplayName(displayNameDraft);
      setDisplayName(displayNameDraft.trim());
      setMessage('Display name saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save name');
    } finally {
      setBusy(false);
    }
  };

  if (sessionEmail) {
    return (
      <section className="mb-5 p-3 rounded-lg border border-emerald-200 bg-emerald-50/70">
        <h3 className="text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-1">Cloud sync</h3>
        <p className="text-xs text-emerald-800 mb-2 break-all">Signed in as {sessionEmail}</p>
        <p className="text-[11px] text-emerald-700 mb-2">
          Your layout saves to Supabase (debounced) while signed in. This device still keeps a local copy.
        </p>
        <label className="block text-[11px] font-medium text-emerald-800 mb-1">Display name (shared projects)</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="e.g. Alex"
            value={displayNameDraft}
            onChange={(e) => setDisplayNameDraft(e.target.value)}
            maxLength={80}
            className={`${INPUT} flex-1`}
          />
          <button
            type="button"
            disabled={busy || displayNameDraft.trim() === displayName}
            onClick={() => void handleSaveDisplayName()}
            className={`${BTN} px-3 shrink-0 border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100`}
          >
            Save
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSignOut()}
          className={`${BTN} border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100`}
        >
          Sign out
        </button>
        {message && <p className="text-[11px] text-emerald-800 mt-2">{message}</p>}
      </section>
    );
  }

  return (
    <section className="mb-5 p-3 rounded-lg border border-stone-200 bg-stone-50/80">
      <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">Cloud sync</h3>
      <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
        Sign in to load and save your floor plan on any device after deploy. Uses Supabase (email + password).
      </p>
      <div className="space-y-2 mb-2">
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !email.trim() || !password}
          onClick={() => void handleSignIn()}
          className={`flex-1 ${BTN} border-amber-300 bg-amber-600 text-white hover:bg-amber-700`}
        >
          Sign in
        </button>
        <button
          type="button"
          disabled={busy || !email.trim() || !password}
          onClick={() => void handleSignUp()}
          className={`flex-1 ${BTN} border-stone-300 bg-white text-stone-700 hover:bg-stone-100`}
        >
          Sign up
        </button>
      </div>
      {message && <p className="text-[11px] text-stone-600 mt-2">{message}</p>}
    </section>
  );
}
