import { getServerSession } from "next-auth/next"

// Minimal auth options for development
// In a production app, you would configure proper providers, etc.
const authOptions = {
  // providers: [
  //   CredentialsProvider({ ... }),
  //   GoogleProvider({ ... }),
  // ],
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? null
}