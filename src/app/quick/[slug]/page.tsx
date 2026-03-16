'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase';

export default function QuickLoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, passphrase }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid passphrase');
        setIsLoading(false);
        return;
      }

      if (data.accessToken && data.refreshToken) {
        // Set the session using the tokens
        const supabase = createClientSupabase();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          setError('Failed to establish session. Please try again.');
          setIsLoading(false);
          return;
        }

        // Session established! Redirect to home
        router.push('/');
      } else {
        setError('Unexpected response from server');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Quick login error:', err);
      setError('Failed to connect. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              Neil&apos;s Reels
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Quick Login: <span className="font-medium text-gray-700 dark:text-gray-300">{slug}</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Passphrase
              </label>
              <input
                type="password"
                id="passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter your household passphrase"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                disabled={isLoading}
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !passphrase.trim()}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              This is a quick login for your household. If you don&apos;t know the passphrase,
              ask your household owner or{' '}
              <a href="/login" className="text-green-600 dark:text-green-400 hover:underline">
                use regular login
              </a>
              .
            </p>
          </div>
        </div>

        {/* Bookmark Reminder */}
        <div className="mt-4 p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            💡 <strong>Tip:</strong> Bookmark this page for easy access!
          </p>
        </div>
      </div>
    </div>
  );
}
