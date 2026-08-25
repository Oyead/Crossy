"use client";

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Loader2, Check, Eye, EyeOff } from 'lucide-react';
import SocialSignInButtons from '@/components/auth/SocialSignInButtons';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeNotice, setCodeNotice] = useState<string | null>(null);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RULES.every((r) => r.test(password))) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Register the email and send a verification code
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        let msg = 'Failed to create account';
        try { const d = await res.json(); msg = d.error || msg; } catch {}
        setError(msg);
        return;
      }
      const data = await res.json();
      if (!data.delivered) {
        setCodeNotice("Email delivery isn't configured on this server - the code was printed in the server console.");
      }
      setAwaitingCode(true);
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);
    try {
      // Step 2: Verify the code to create the account
      const res = await fetch('/api/auth/verify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      let data: any = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }
      // Step 3: Sign in with the new account
      await signIn('credentials', {
        redirect: true,
        callbackUrl: '/',
        email,
        password,
        credentialType: 'email-password',
      });
      // If successful, signIn will redirect to callbackUrl.
    } catch (err: any) {
      setError('Account verified but sign-in failed. Please try logging in.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setCodeNotice(null);
    setError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        let msg = 'Failed to resend code';
        try { const d = await res.json(); msg = d.error || msg; } catch {}
        setError(msg);
        return;
      }
      setCodeNotice('A new code has been sent.');
    } catch {
      setError('Failed to resend code');
    }
  };

  return (
    <div className="fixed inset-0 left-0 right-0 bottom-0 flex items-center justify-center bg-[#FAF6EE] z-40 -mx-4 px-4 pt-24 pb-12 overflow-y-auto">
      <div className="w-full max-w-md space-y-8 animate-fade-up">

        <div className="text-center">
          <h2 className="text-3xl font-black text-foreground tracking-tight">
            Create an account
          </h2>
          <p className="mt-3 text-sm text-muted-foreground font-medium">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-foreground hover:text-[#4F46E5] underline underline-offset-4 decoration-foreground/40 hover:decoration-[#4F46E5] transition-colors">
              Sign in
            </a>
          </p>
        </div>

        {!awaitingCode && (
        <div className="relative border-2 border-foreground bg-white p-8 rounded-2xl retro-shadow-md">
          <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
          <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
          <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
          <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />

          <form className="space-y-5" onSubmit={handleEmailPasswordSubmit}>
            <div>
              <label htmlFor="email-address" className="block text-xs font-black uppercase tracking-widest text-foreground mb-2">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border-2 border-foreground rounded-xl bg-[#FAF6EE] placeholder:text-muted-foreground text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-black uppercase tracking-widest text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-4 py-3 pr-12 border-2 border-foreground rounded-xl bg-[#FAF6EE] placeholder:text-muted-foreground text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#D2E9F9] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
                Confirm password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-4 py-3 border-2 rounded-xl bg-[#FAF6EE] placeholder:text-muted-foreground text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-[#dc2626]'
                    : 'border-foreground'
                }`}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <a href="/forgot-password" className="text-sm font-bold text-foreground hover:text-[#4F46E5] underline underline-offset-4 decoration-foreground/40 hover:decoration-[#4F46E5] transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading || (confirmPassword.length > 0 && confirmPassword !== password)}
              className="relative w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold text-white bg-[#1a1a15] rounded-xl border-2 border-foreground retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:retro-shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Sign up'
              )}
            </button>
          </form>
        </div>
        )}

        {awaitingCode && (
          <div className="relative border-2 border-foreground bg-white p-8 rounded-2xl retro-shadow-md">
            <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />
            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />
            <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />
            <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />

            <form className="space-y-5" onSubmit={handleVerifyCode}>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-foreground">Check your email</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  We sent a 6-digit code to{' '}
                  <span className="font-bold text-foreground">{email}</span>
                </p>
              </div>

              <input
                id="verification-code"
                name="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="appearance-none relative block w-full px-4 py-3 border-2 border-foreground rounded-xl bg-[#FAF6EE] text-center font-black text-2xl tracking-[0.5em] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] transition-all"
              />

              {codeNotice && (
                <p className="text-xs font-medium text-center text-muted-foreground">{codeNotice}</p>
              )}

              <button
                type="submit"
                disabled={isVerifying || code.length !== 6}
                className="relative w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold text-white bg-[#4F46E5] rounded-xl border-2 border-foreground retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify code'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                className="w-full text-sm font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-foreground/30 transition-colors"
              >
                Didn&apos;t get it? Resend code
              </button>
            </form>
          </div>
        )}

        <SocialSignInButtons />

        {error && (
          <div className="border-2 border-[#dc2626] bg-[#fef2f2] rounded-xl p-4 text-sm font-medium text-[#dc2626]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
