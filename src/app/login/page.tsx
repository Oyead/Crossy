"use client";

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import SocialSignInButtons from '@/components/auth/SocialSignInButtons';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    'This email already has an account. Please sign in with your email and password.',
  AccessDenied:
    "Sign-in with this account was blocked or cancelled. If this Google/GitHub account hasn't been used here before, it may not be allowed yet by the provider's consent screen settings.",
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    const errorCodeParam = new URLSearchParams(window.location.search).get('error');
    if (!errorCodeParam) return;
    setErrorCode(errorCodeParam);
    setError(
      OAUTH_ERROR_MESSAGES[errorCodeParam] ??
        'Sign-in failed. Please try again.'
    );
  }, []);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        credentialType: 'email-password',
      });
      if (result?.error) {
        setError('Invalid email or password');
        return;
      }
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 left-0 right-0 bottom-0 flex items-center justify-center bg-[#FAF6EE] z-40 -mx-4 px-4 pt-24 pb-12 overflow-y-auto">
      <div className="w-full max-w-md space-y-8 animate-fade-up">

        <div className="text-center">
          <h2 className="text-3xl font-black text-foreground tracking-tight">
            Sign in to Crossy
          </h2>
          <p className="mt-3 text-sm text-muted-foreground font-medium">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="font-bold text-foreground hover:text-[#4F46E5] underline underline-offset-4 decoration-foreground/40 hover:decoration-[#4F46E5] transition-colors">
              Sign up
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
                  autoComplete="current-password"
                  required
                  className="appearance-none relative block w-full px-4 py-3 pr-12 border-2 border-foreground rounded-xl bg-[#FAF6EE] placeholder:text-muted-foreground text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
                  placeholder="Enter your password"
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
            </div>

            <div className="flex justify-end">
              <a href="/forgot-password" className="text-sm font-bold text-foreground hover:text-[#4F46E5] underline underline-offset-4 decoration-foreground/40 hover:decoration-[#4F46E5] transition-colors">
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <SocialSignInButtons />

        {error && (
          <div className="border-2 border-[#dc2626] bg-[#fef2f2] rounded-xl p-4 text-sm font-medium text-[#dc2626]">
            {error}
            {errorCode && (
              <div className="mt-1 text-xs text-[#dc2626]/70">Error code: {errorCode}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
