import NextAuth from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { verifyRegistrationResponse, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { challengeStore } from '@/lib/webauthnChallengeStore';
import { users } from '@/lib/mockUsers';

export const { GET, POST } = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    CredentialsProvider({
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "Credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // We extend the credentials to include a credentialType to differentiate between
      // email/password and WebAuthn flows.
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
        credentialType: { label: "Credential Type", type: "text", placeholder: "email-password|webauthn-registration|webauthn-authentication" },
        // For WebAuthn registration/authentication, we expect:
        //   webauthnToken: the token received from the options endpoint
        //   credentialId: the credential ID (base64url)
        //   credentialResponse: the entire response from the navigator.credentials.get/create() call (as a JSON string)
        webauthnToken: { label: "WebAuthn Token", type: "text" },
        credentialId: { label: "Credential ID", type: "text" },
        credentialResponse: { label: "Credential Response", type: "text" },
      },
      async authorize(credentials) {
        const { email, password, credentialType, webauthnToken, credentialId, credentialResponse } = credentials;

        if (!email) {
          return null;
        }

        // Handle email/password flow
        if (credentialType === "email-password") {
          if (!password) {
            return null;
          }

          const existingUser = Array.from(users.values()).find(u => u.email === email);
          if (!existingUser) {
            return null;
          }

          // In production, verify password hash here.
          return { id: existingUser.id, name: existingUser.name, email: existingUser.email };
        }

        // Handle WebAuthn registration
        if (credentialType === "webauthn-registration") {
          try {
            if (!webauthnToken) {
              console.error("Missing webauthnToken for registration");
              return null;
            }

            // Retrieve the challenge from the challenge store using the token.
            const challengeEntry = challengeStore.get(webauthnToken);
            if (!challengeEntry) {
              console.error("No challenge found for token:", webauthnToken);
              return null;
            }
            const { challenge } = challengeEntry;

            // Parse the credentialResponse (assuming it's a JSON string)
            const credentialResponseJSON = JSON.parse(credentialResponse);

            // Verify the registration response
            const verification = await verifyRegistrationResponse({
              credential: credentialResponseJSON,
              expectedChallenge: challenge,
              expectedOrigin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
              expectedRPID: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost",
            });

            if (verification.verified) {
              // Store the credential in the user's account (in production, save to database)
              const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
              // Update the user's credentials (in production, update the database)
              const user = users.get(email) || { id: email, name: email.split("@")[0], email, credentials: [] };
              user.credentials.push({
                credentialID,
                credentialPublicKey,
                counter,
              });
              users.set(email, user);

              // Remove the challenge from the store (one-time use)
              challengeStore.delete(webauthnToken);

              return { id: user.id, name: user.name, email: user.email };
            } else {
              console.error("WebAuthn registration verification failed:", verification);
              return null;
            }
          } catch (error) {
            console.error("Error during WebAuthn registration verification:", error);
            return null;
          }
        }

        // Handle WebAuthn authentication
        if (credentialType === "webauthn-authentication") {
          try {
            if (!webauthnToken) {
              console.error("Missing webauthnToken for authentication");
              return null;
            }

            // Retrieve the challenge from the challenge store using the token.
            const challengeEntry = challengeStore.get(webauthnToken);
            if (!challengeEntry) {
              console.error("No challenge found for token:", webauthnToken);
              return null;
            }
            const { challenge } = challengeEntry;

            // We need to get the user's credentials to verify the authentication.
            // In a real app, we would fetch the user's credentials from the database.
            const user = users.get(email);
            if (!user || !user.credentials.length) {
              console.error("No user or no credentials found for email:", email);
              return null;
            }

            // We assume the user has one credential for simplicity.
            // In production, you would need to match the credentialId to the stored credential.
            const storedCredential = user.credentials.find(cred =>
              isoBase64URL.fromBuffer(cred.credentialID) === credentialId
            ); // We expect the credentialId sent from the frontend to match one of the user's credentials

            if (!storedCredential) {
              console.error("No matching credential found for the provided credentialId");
              return null;
            }

            // Parse the credentialResponse
            const credentialResponseJSON = JSON.parse(credentialResponse);

            // Verify the authentication response
            const verification = await verifyAuthenticationResponse({
              credential: credentialResponseJSON,
              expectedChallenge: challenge,
              expectedOrigin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
              expectedRPID: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost",
              credentialPublicKey: isoBase64URL.toBuffer(storedCredential.credentialPublicKey), // Convert base64url to buffer
              credentialCurrentCounter: storedCredential.counter,
            });

            if (verification.verified) {
              // Update the counter (in production, update the database)
              storedCredential.counter = verification.authenticatorInfo.newCounter;

              // Remove the challenge from the store (one-time use)
              challengeStore.delete(webauthnToken);

              return { id: user.id, name: user.name, email: user.email };
            } else {
              console.error("WebAuthn authentication verification failed:", verification);
              return null;
            }
          } catch (error) {
            console.error("Error during WebAuthn authentication verification:", error);
            return null;
          }
        }

        // If credentialType is not recognized, fall back to null
        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  // Optional: configure pages
  // pages: {
  //   signIn: "/auth/signin",
  // },
});