'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const privyFetch = usePrivyAuthedFetch();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const validateUsername = useCallback((val: string) => {
    if (val.length < 3) return 'Must be at least 3 characters';
    if (val.length > 20) return 'Must be 20 characters or less';
    if (!USERNAME_REGEX.test(val)) return 'Only letters, numbers, and underscores';
    return '';
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(val);
    setError(val ? validateUsername(val) : '');
  };

  const handleSubmit = async () => {
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = { username };
      if (displayName.trim()) body.displayName = displayName.trim();

      const res = await privyFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await refreshUser();
        router.push('/marketplace');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to set username');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Check availability on blur
  const checkAvailability = async () => {
    if (!username || username.length < 3) return;
    setChecking(true);
    try {
      const res = await privyFetch(`/api/users/search?q=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.data || data || [];
        const taken = results.some((u: { username: string; id: string }) =>
          u.username.toLowerCase() === username.toLowerCase() && u.id !== user?.id
        );
        if (taken) setError('Username is already taken');
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-10 text-center" hover={false}>
          <h1 className="text-2xl font-black text-white mb-4">Sign in required</h1>
          <Link href="/login">
            <Button size="lg" className="w-full">Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-black text-3xl">P</span>
            </div>
          </div>
        </div>

        <Card className="p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl" hover={false}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-3">Choose Your Username</h1>
            <p className="text-slate-400 font-medium">
              This is how other traders will find you on Persona.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">@</span>
                <Input
                  value={username}
                  onChange={handleUsernameChange}
                  onBlur={checkAvailability}
                  placeholder="your_username"
                  className="pl-9 bg-slate-950/50"
                  autoFocus
                />
              </div>
              {checking && (
                <p className="text-xs text-slate-500 mt-1.5">Checking availability...</p>
              )}
              {error && (
                <p className="text-xs text-red-400 mt-1.5 font-medium">{error}</p>
              )}
              {username.length >= 3 && !error && !checking && (
                <p className="text-xs text-emerald-400 mt-1.5 font-medium">Looks good!</p>
              )}
              <p className="text-xs text-slate-600 mt-1.5">3-20 characters. Letters, numbers, and underscores only.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">
                Display Name <span className="text-slate-600 font-normal">(optional)</span>
              </label>
              <Input
                value={displayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                className="bg-slate-950/50"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!username || !!error || saving || checking}
              isLoading={saving}
              className="w-full shadow-lg shadow-indigo-500/20"
              size="lg"
            >
              {saving ? 'Setting up...' : 'Continue to Persona'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
