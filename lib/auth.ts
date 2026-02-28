import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export const IMPERSONATE_COOKIE = "impersonate_user_id"

export async function getSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return session

  const cookieStore = await cookies()
  const impersonateUserId = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (!impersonateUserId) return session

  const realUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperuser: true },
  })
  if (!realUser?.isSuperuser) return session

  const impersonatedUser = await prisma.user.findUnique({
    where: { id: impersonateUserId },
    select: { id: true, email: true, name: true, image: true, isSuperuser: true },
  })
  if (!impersonatedUser) return session
  if (impersonatedUser.isSuperuser) return session

  return {
    ...session,
    user: {
      id: impersonatedUser.id,
      email: impersonatedUser.email,
      name: impersonatedUser.name,
      image: impersonatedUser.image,
    },
    impersonating: true,
    realUser: {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    },
  }
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

/**
 * Get the current user from the database using the session user ID.
 * This is safer than using session.user.email because email can change,
 * but the user ID in the session remains constant.
 * 
 * @returns The user from the database, or null if not found/not authenticated
 */
export async function getCurrentUserFromDB() {
  const session = await getSession()
  
  if (!session?.user?.id) {
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })
    return user
  } catch (error) {
    console.error('Error fetching current user from database:', error)
    return null
  }
}

