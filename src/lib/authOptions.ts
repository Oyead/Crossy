import type { NextAuthOptions } from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { verifyRegistrationResponse, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { getChallenge, deleteChallenge } from '@/lib/webauthnChallengeStore';
import bcrypt from 'bcryptjs';
import prisma from '@/server/db/prisma';

function safePrismaAdapter() {
  const adapter = PrismaAdapter(prisma);
  return {
    ...adapter,
    linkAccount: async (account: any) => {
      const { refresh_token_expires_in, ...rest } = account;
      return adapter.linkAccount!(rest);
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: safePrismaAdapter(),
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

          const lowerEmail = email.toLowerCase();
          const existingUser = await prisma.user.findUnique({
            where: { email: lowerEmail },
          });
          if (!existingUser) {
            return null;
          }

          // Verify password hash
          const passwordValid = await bcrypt.compare(password, existingUser.password);
          if (!passwordValid) {
            return null;
          }

          return { id: existingUser.id, name: existingUser.name, email: existingUser.email };
        }

        // Handle WebAuthn registration
        if (credentialType === "webauthn-registration") {
          try {
            if (!webauthnToken) {
              return null;
            }

            // Retrieve the challenge from the challenge store using the token.
            const challengeEntry = await getChallenge(webauthnToken);
            if (!challengeEntry) {
              return null;
            }
            const { challenge } = challengeEntry;

            // Parse the credentialResponse (assuming it's a JSON string)
            const credentialResponseJSON = JSON.parse(credentialResponse);

            // Verify the registration response
            const verification = await verifyRegistrationResponse({
              response: credentialResponseJSON,
              expectedChallenge: challenge,
              expectedOrigin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
              expectedRPID: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost",
            });

            if (verification.verified) {
              const lowerEmail = email.toLowerCase();

              let user = await prisma.user.findUnique({
                where: { email: lowerEmail },
              });

              if (!user) {
                user = await prisma.user.create({
                  data: {
                    email: lowerEmail,
                    name: email.split("@")[0],
                  },
                });
              }

              await deleteChallenge(webauthnToken);

              return { id: user.id, name: user.name, email: user.email };
            } else {
              return null;
            }
          } catch (error) {
            console.error("WebAuthn registration error:", error);
            return null;
          }
        }

        // Handle WebAuthn authentication
        if (credentialType === "webauthn-authentication") {
          try {
            if (!webauthnToken) {
              return null;
            }

            // Retrieve the challenge from the challenge store using the token.
            const challengeEntry = await getChallenge(webauthnToken);
            if (!challengeEntry) {
              return null;
            }

            const lowerEmail = email.toLowerCase();
            const user = await prisma.user.findUnique({
              where: { email: lowerEmail },
            });

            if (user) {
              await deleteChallenge(webauthnToken);
              return { id: user.id, name: user.name, email: user.email };
            } else {
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
  pages: {
    // Send OAuth errors (e.g. OAuthAccountNotLinked) to our own login page
    signIn: "/login",
  },
};
