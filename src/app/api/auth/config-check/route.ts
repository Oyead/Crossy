import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const githubClientId =
  process.env.GITHUB_ID ||
  process.env.GITHUB_CLIENT_ID ||
  process.env.AUTH_GITHUB_ID;
const githubClientSecret =
  process.env.GITHUB_SECRET ||
  process.env.GITHUB_CLIENT_SECRET ||
  process.env.AUTH_GITHUB_SECRET;
const googleClientId =
  process.env.GOOGLE_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  process.env.AUTH_GOOGLE_ID;
const googleClientSecret =
  process.env.GOOGLE_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.AUTH_GOOGLE_SECRET;

export function GET() {
  const rawNextAuthUrl = process.env.NEXTAUTH_URL?.trim() || null;
  const baseUrl = rawNextAuthUrl ? rawNextAuthUrl.replace(/\/+$/, "") : null;
  const warnings: string[] = [];

  if (!rawNextAuthUrl) {
    warnings.push("NEXTAUTH_URL is not set");
  } else {
    if (rawNextAuthUrl !== baseUrl) {
      warnings.push("NEXTAUTH_URL has a trailing slash");
    }
    if (!/^https?:\/\//.test(rawNextAuthUrl)) {
      warnings.push("NEXTAUTH_URL must start with http:// or https://");
    }
  }

  if (!githubClientId || !githubClientSecret) {
    warnings.push("GitHub OAuth credentials are incomplete");
  }
  if (!googleClientId || !googleClientSecret) {
    warnings.push("Google OAuth credentials are incomplete");
  }

  return NextResponse.json({
    nextAuthUrl: rawNextAuthUrl,
    normalizedBaseUrl: baseUrl,
    callbackUrls: baseUrl
      ? {
          github: `${baseUrl}/api/auth/callback/github`,
          google: `${baseUrl}/api/auth/callback/google`,
        }
      : null,
    oauthConfigured: {
      github: Boolean(githubClientId && githubClientSecret),
      google: Boolean(googleClientId && googleClientSecret),
    },
    warnings,
  });
}
