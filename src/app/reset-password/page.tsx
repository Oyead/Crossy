"use client";

import { useEffect, useState } from 'react';
import { Loader2, Check, ShieldAlert } from 'lucide-react';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    setToken(t);
    setReady(true);
  }, []);

  const allRulesMet = PASSWORD_RULES.every((rule) => rule.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RULES.every((r) => r.test(password))) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }
      setResetDone(true);
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="fixed inset-0 left-0 right-0 bottom-0 flex items-center justify-center bg-[#FAF6EE] z-40 -mx-4 px-4 pt-24 pb-12 overflow-y-auto">
      <div className="w-full max-w-md space-y-8 animate-fade-up">

        {!token ? (
          <div className="relative border-2 border-foreground bg-white p-8 rounded-2xl retro-shadow-md text-center space-y-4">
            <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#E8C5C8] border border-foreground" />
            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#E8C5C8] border border-foreground" />
            <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#E8C5C8] border border-foreground" />
            <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#E8C5C8] border border-foreground" />

            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-xl border-2 border-foreground bg-[#E8C5C8] flex items-center justify-center shadow-[2px_2px_0px_#1a1a15]">
                <ShieldAlert className="h-8 w-8 text-foreground" />
              </div>
            </div>

            <h3 className="text-lg font-black text-foreground">Invalid reset link</h3>
            <p className="text-sm text-muted-foreground font-medium">
              This password reset link is missing or malformed. Please request a new one.
            </p>

            <a
              href="/forgot-password"
              className="relative w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold text-white bg-[#1a1a15] rounded-xl border-2 border-foreground retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
            >
              Request a new link
            </a>
          </div>
        ) : resetDone ? (
          <div className="relative border-2 border-foreground bg-white p-8 rounded-2xl retro-shadow-md text-center space-y-4">
            <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />
            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />
            <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />
            <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />

            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-xl border-2 border-foreground bg-[#D2E9F9] flex items-center justify-center shadow-[2px_2px_0px_#1a1a15]">
                <Check className="h-8 w-8 text-[#2d8a4e]" strokeWidth={3} />
              </div>
            </div>

            <h3 className="text-lg font-black text-foreground">Password updated</h3>
            <p className="text-sm text-muted-foreground font-medium">
              Your password has been changed. Sign in with your new password to continue.
            </p>

            <a
              href="/login"
              className="relative w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold text-white bg-[#1a1a15] rounded-xl border-2 border-foreground retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
            >
              Go to sign in
            </a>
          </div>
        ) : (
          <div className="relative border-2 border-foreground bg-white p-8 rounded-2xl retro-shadow-md">
            <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
            <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
            <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <h3 className="text-lg font-black text-foreground">Choose a new password</h3>
                <p className="mt-1 text-sm text-muted-foreground font-medium">
                  Pick a strong password you haven&apos;t used before.
                </p>
              </div>

              <div>
                <label htmlFor="new-password" className="block text-xs font-black uppercase tracking-widest text-foreground mb-2">
                  New password
                </label>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border-2 border-foreground rounded-xl bg-[#FAF6EE] placeholder:text-muted-foreground text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(password);
                      return (
                        <li
                          key={rule.label}
                          className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                            met ? 'text-[#2d8a4e]' : 'text-muted-foreground'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              met
                                ? 'border-[#2d8a4e] bg-[#2d8a4e] text-white'
                                : 'border-foreground/30 bg-[#FAF6EE]'
                            }`}
                          >
                            {met && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                          </span>
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-black uppercase tracking-widest text-foreground mb-2">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={`appearance-none relative block w-full px-4 py-3 border-2 rounded-xl bg-[#FAF6EE] placeholder:text-muted-foreground text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-[#dc2626]'
                      : 'border-foreground'
                  }`}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !allRulesMet}
                className="relative w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold text-white bg-[#4F46E5] rounded-xl border-2 border-foreground retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset password'
                )}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="border-2 border-[#dc2626] bg-[#fef2f2] rounded-xl p-4 text-sm font-medium text-[#dc2626]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
