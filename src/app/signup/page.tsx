"use client";

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Loader2, Check, Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RULES.every((r) => r.test(password))) return;
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Create the account
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create account');
        return;
      }
      // Step 2: Sign in with the new account
      await signIn('credentials', {
        redirect: true,
        callbackUrl: '/',
        email,
        password,
        credentialType: 'email-password',
      });
      // If successful, signIn will redirect to callbackUrl.
      // If there's an error, it will throw.
    } catch (err: any) {
      setError('Account created but sign-in failed. Please try logging in.');
    } finally {
      setIsLoading(false);
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 border-2 border-foreground rounded bg-[#FAF6EE] text-[#1a1a15] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 cursor-pointer accent-[#1a1a15]"
                />
                <span className="text-sm font-medium text-foreground">Remember me</span>
              </label>

              <a href="#" className="text-sm font-bold text-foreground hover:text-[#4F46E5] underline underline-offset-4 decoration-foreground/40 hover:decoration-[#4F46E5] transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
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

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t-2 border-foreground/20"></div>
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Or continue with
            </span>
            <div className="flex-1 border-t-2 border-foreground/20"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href="/api/auth/signin/github"
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-foreground rounded-xl bg-white font-bold text-sm text-foreground hover:bg-[#D2E9F9] retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] transition-all"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 4.25 2.426 7.865 5.813 9.173.425.09.58-.214.58-.477v-1.85c-2.357.51-2.855-1.043-2.855-1.043-.385-.98-.94-1.245-.94-1.245-.77-.526.059-.516.059-.516.853.06 1.302.874 1.302.874.695 1.293 2.002.918 2.49 1.402.024-1.096.09-1.847.14-2.283-1.872-.208-3.84-.936-3.84-4.17 0-.92.33-1.668.87-2.257-.085-.214-.367-1.076.08-2.242 0 0 .71-.229 2.33.866a10.296 10.296 0 012.04-.261c.698-.09 1.446-.136 2.162-.136.716 0 1.464.046 2.162.136 1.62-1.095 2.33-.866 2.33-.866.447 1.166.165 2.028.08 2.242.54.589.87 1.337.87 2.257 0 3.234-1.968 3.962-3.84 4.17.3.26.57.773.57 1.558v2.96c0 .263.155.567.58.477 3.387-1.308 5.813-4.923 5.813-9.173C21.75 6.615 17.385 2.25 12 2.25z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
            <a
              href="/api/auth/signin/google"
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-foreground rounded-xl bg-white font-bold text-sm text-foreground hover:bg-[#E8C5C8] retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] transition-all"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </a>
          </div>
        </div>

        {error && (
          <div className="border-2 border-[#dc2626] bg-[#fef2f2] rounded-xl p-4 text-sm font-medium text-[#dc2626]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
