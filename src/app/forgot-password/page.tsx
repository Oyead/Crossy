"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send reset email');
        return;
      }
      setSent(true);
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
            Reset your password
          </h2>
          <p className="mt-3 text-sm text-muted-foreground font-medium">
            Remembered it?{' '}
            <a href="/login" className="font-bold text-foreground hover:text-[#4F46E5] underline underline-offset-4 decoration-foreground/40 hover:decoration-[#4F46E5] transition-colors">
              Sign in
            </a>
          </p>
        </div>

        {sent ? (
          <div className="relative border-2 border-foreground bg-white p-8 rounded-2xl retro-shadow-md text-center space-y-4">
            <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />
            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />
            <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />
            <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#D2E9F9] border border-foreground" />

            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-xl border-2 border-foreground bg-[#D2E9F9] flex items-center justify-center shadow-[2px_2px_0px_#1a1a15]">
                <MailCheck className="h-8 w-8 text-foreground" />
              </div>
            </div>

            <h3 className="text-lg font-black text-foreground">Check your inbox</h3>
            <p className="text-sm text-muted-foreground font-medium">
              If an account exists for{' '}
              <span className="font-bold text-foreground">{email}</span>, we sent a
              link to reset your password. It expires in 15 minutes.
            </p>

            <a
              href="/login"
              className="relative w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold text-white bg-[#1a1a15] rounded-xl border-2 border-foreground retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <div className="relative border-2 border-foreground bg-white p-8 rounded-2xl retro-shadow-md">
            <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
            <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />
            <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#FFEAA7] border border-foreground" />

            <form className="space-y-5" onSubmit={handleSubmit}>
              <p className="text-sm text-muted-foreground font-medium">
                Enter your email address and we&apos;ll send you a link to set a new password.
              </p>

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

              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold text-white bg-[#1a1a15] rounded-xl border-2 border-foreground retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:retro-shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
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
