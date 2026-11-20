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
      await signIn('credentials', {
        redirect: true,
        callbackUrl: '/',
        email,
        password,
        credentialType: 'email-password',
      });
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
    <div className="relative z-40 flex min-h-[calc(100vh-6rem)] items-start justify-center bg-[#FAF6EE] px-4 py-6 lg:items-center">
      <div className="w-full max-w-5xl animate-fade-up">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Create an account
          </h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-foreground underline underline-offset-4 decoration-foreground/40 transition-colors hover:text-[#4F46E5] hover:decoration-[#4F46E5]">
              Sign in
            </a>
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="relative border-2 border-foreground bg-white p-6 rounded-2xl retro-shadow-md sm:p-7">
            <span className="absolute -top-1.5 -left-1.5 h-2.5 w-2.5 border border-foreground bg-[#FFEAA7]" />
            <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 border border-foreground bg-[#FFEAA7]" />
            <span className="absolute -bottom-1.5 -left-1.5 h-2.5 w-2.5 border border-foreground bg-[#FFEAA7]" />
            <span className="absolute -bottom-1.5 -right-1.5 h-2.5 w-2.5 border border-foreground bg-[#FFEAA7]" />

            {error && (
              <div className="mb-5 border-2 border-[#dc2626] bg-[#fef2f2] rounded-xl p-3 text-sm font-bold text-[#dc2626]">
                {error}
              </div>
            )}

            {!awaitingCode ? (
              <form className="space-y-4" onSubmit={handleEmailPasswordSubmit}>
                <div>
                  <label htmlFor="email-address" className="mb-1.5 block text-xs font-black uppercase tracking-widest text-foreground">
                    Email address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-xl border-2 border-foreground bg-[#FAF6EE] px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-black uppercase tracking-widest text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className="block w-full rounded-xl border-2 border-foreground bg-[#FAF6EE] px-4 py-2.5 pr-12 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-[#D2E9F9] hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {PASSWORD_RULES.map((rule) => {
                        const met = rule.test(password);
                        return (
                          <li
                            key={rule.label}
                            className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                              met ? 'text-[#2d8a4e]' : 'text-muted-foreground'
                            }`}
                          >
                            <span
                              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
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
                  <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-black uppercase tracking-widest text-foreground">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className={`block w-full rounded-xl border-2 bg-[#FAF6EE] px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all ${
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
                  <a href="/forgot-password" className="text-xs font-bold text-foreground underline underline-offset-4 decoration-foreground/40 transition-colors hover:text-[#4F46E5] hover:decoration-[#4F46E5]">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || (confirmPassword.length > 0 && confirmPassword !== password)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-[#1a1a15] px-4 py-2.5 text-sm font-bold text-white retro-shadow-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:retro-shadow-sm"
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
            ) : (
              <form className="space-y-4" onSubmit={handleVerifyCode}>
                <div className="space-y-1 text-center">
                  <h3 className="text-lg font-black text-foreground">Check your email</h3>
                  <p className="text-sm font-medium text-muted-foreground">
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
                  className="block w-full rounded-xl border-2 border-foreground bg-[#FAF6EE] px-4 py-2.5 text-center font-black text-2xl tracking-[0.5em] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] transition-all"
                />

                {codeNotice && (
                  <p className="text-center text-xs font-medium text-muted-foreground">{codeNotice}</p>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || code.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-[#4F46E5] px-4 py-2.5 text-sm font-bold text-white retro-shadow-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
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
                  className="w-full text-sm font-bold text-muted-foreground underline underline-offset-4 decoration-foreground/30 transition-colors hover:text-foreground"
                >
                  Didn&apos;t get it? Resend code
                </button>
              </form>
            )}
          </div>

          <div className="space-y-4">
            <SocialSignInButtons />
          </div>
        </div>
      </div>
    </div>
  );
}
