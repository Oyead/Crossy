import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? null
}
