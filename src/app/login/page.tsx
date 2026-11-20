"use client";

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import SocialSignInButtons from '@/components/auth/SocialSignInButtons';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    'This email already has an account. Please sign in with your email and password.',
  AccessDenied:
    "Sign-in was blocked or cancelled. If this Google/GitHub account hasn't been used here before, it may not be allowed yet by the provider's consent screen settings.",
  github:
    'GitHub sign-in failed. Check that the OAuth callback URL matches this site and try again.',
  google:
    'Google sign-in failed. Check that the OAuth callback URL matches this site and try again.',
  OAuthSignin: 'Could not start sign-in with that provider. Please try again.',
  OAuthCallback: 'The provider could not complete sign-in. Please try again.',
  Configuration: 'Sign-in is not configured correctly on this server.',
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
    <div className="relative z-40 flex min-h-[calc(100vh-6rem)] items-start justify-center bg-[#FAF6EE] px-4 py-6 lg:items-center">
      <div className="w-full max-w-5xl animate-fade-up">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Sign in to Crossy
          </h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="font-bold text-foreground underline underline-offset-4 decoration-foreground/40 transition-colors hover:text-[#4F46E5] hover:decoration-[#4F46E5]">
              Sign up
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
                {errorCode && (
                  <div className="mt-1 text-xs font-medium text-[#dc2626]/70">
                    Error code: {errorCode}
                  </div>
                )}
              </div>
            )}

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
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-xl border-2 border-foreground bg-[#FAF6EE] px-4 py-2.5 pr-12 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
                    placeholder="Enter your password"
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
              </div>

              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs font-bold text-foreground underline underline-offset-4 decoration-foreground/40 transition-colors hover:text-[#4F46E5] hover:decoration-[#4F46E5]">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-[#1a1a15] px-4 py-2.5 text-sm font-bold text-white retro-shadow-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:retro-shadow-sm"
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

          <div className="space-y-4">
            <SocialSignInButtons />
          </div>
        </div>
      </div>
    </div>
  );
}
