'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

/**
 * Account settings page — requires sign-in.
 * Currently provides account information display and account deletion.
 */
export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'deleting' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <p className="text-secondary">You must be signed in to access settings.</p>
          <Link
            href="/sign-in?callbackUrl=/settings"
            className="inline-block px-5 py-2 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  async function handleDeleteAccount() {
    if (deleteState !== 'confirm') {
      setDeleteState('confirm');
      return;
    }
    setDeleteState('deleting');
    try {
      const res = await fetch('/api/user', { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      setDeleteState('done');
      // Sign out after account deletion — session is now invalid.
      await signOut({ callbackUrl: '/' });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Deletion failed. Please try again.');
      setDeleteState('error');
    }
  }

  function cancelDelete() {
    setDeleteState('idle');
    setErrorMessage('');
  }

  return (
    <main className="min-h-screen bg-background text-primary">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-secondary hover:text-primary transition-colors">
            ← Back to home
          </Link>
        </div>

        <h1 className="text-2xl font-semibold mb-8">Account Settings</h1>

        {/* Account info */}
        <section className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-base font-medium mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-secondary">Name</span>
              <span className="text-primary">{session.user.name ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-secondary">Email</span>
              <span className="text-primary">{session.user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-secondary">Sign-in method</span>
              <span className="text-primary">Google</span>
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="bg-card border border-red-500/20 rounded-xl p-6">
          <h2 className="text-base font-medium text-red-400 mb-1">Danger Zone</h2>
          <p className="text-sm text-secondary mb-5">
            Permanently delete your account and all associated data — analyses, skill records, and usage history.
            Community trend entries derived from your analyses are anonymized and will remain.
            This action cannot be undone.
          </p>

          {deleteState === 'idle' && (
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 text-sm font-medium hover:border-red-500 hover:bg-red-500/10 transition-colors"
            >
              Delete Account
            </button>
          )}

          {deleteState === 'confirm' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-300">
                Are you sure? This will permanently delete your account and all your analyses. There is no undo.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-colors"
                >
                  Yes, delete my account
                </button>
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 rounded-lg border border-border text-secondary text-sm font-medium hover:text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteState === 'deleting' && (
            <div className="flex items-center gap-3 text-sm text-secondary">
              <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              Deleting account…
            </div>
          )}

          {deleteState === 'done' && (
            <p className="text-sm text-green-400">Account deleted. Redirecting…</p>
          )}

          {deleteState === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-red-400">{errorMessage}</p>
              <button
                onClick={cancelDelete}
                className="text-sm text-secondary hover:text-primary transition-colors underline-offset-2 hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </section>

        <div className="mt-10 pt-6 border-t border-border flex gap-6 text-sm">
          <Link href="/privacy" className="text-secondary hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-secondary hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </main>
  );
}
