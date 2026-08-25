import { NextResponse } from 'next/server';
import { generateRegistrationOptions, generateAuthenticationOptions } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { setChallenge } from '@/lib/webauthnChallengeStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'registration' or 'authentication'
  const email = searchParams.get('email');

  if (!type || !email) {
    return NextResponse.json({ error: 'Missing type or email' }, { status: 400 });
  }

  try {
    let options;

    if (type === 'registration') {
      // For registration, we need to exclude any existing credentials for this user.
      // In a real app, you would fetch the user's existing credentials from the database.
      options = await generateRegistrationOptions({
        rpName: 'Crossy',
        rpID: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : 'localhost',
        userID: isoBase64URL.toBuffer(email), // Use the email as the user ID for simplicity
        userName: email.split('@')[0], // Use the part before @ as the username
        excludeCredentials: [], // In a real app, you would fetch the user's credentials and exclude them
      });
    } else if (type === 'authentication') {
      // For authentication, we need to get the user's credentials to populate allowCredentials.
      // In a real app, you would fetch the user's credentials from the database.
      // For demonstration, we assume the user has no credentials (so allowCredentials is empty).
      // If the user has no credentials, authentication will fail, which is correct.
      options = await generateAuthenticationOptions({
        rpID: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : 'localhost',
        allowCredentials: [], // In a real app, you would fetch the user's credentials
      });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // The challenge is already a base64url string in @simplewebauthn/server v13
    const challengeBase64 = options.challenge;
    // Store the challenge with an expiration time (e.g., 5 minutes)
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    await setChallenge(challengeBase64, options.challenge, expires);

    // Remove the challenge from the options before sending to the client
    // (the client should not see the challenge)
    const { challenge: _, ...optionsWithoutChallenge } = options;

    return NextResponse.json({
      publicKey: optionsWithoutChallenge,
      challengeBase64, // We send the challengeBase64 as a token to the client
    });
  } catch (error) {
    console.error(`Error generating WebAuthn ${type} options:`, error);
    return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 });
  }
}