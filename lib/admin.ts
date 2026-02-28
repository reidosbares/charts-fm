import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

/**
 * Check if the current user is a superuser.
 * When impersonating, uses the real (admin) user for the check so admin access is preserved.
 * Returns the user if they are a superuser, null otherwise.
 */
export async function getSuperuser() {
  const session = await getSession()
  if (!session?.user?.id) return null

  const userIdToCheck = session.impersonating && session.realUser
    ? session.realUser.id
    : session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userIdToCheck },
    select: {
      id: true,
      email: true,
      isSuperuser: true,
    },
  })

  if (!user || !user.isSuperuser) return null
  return user
}

/**
 * Require superuser access - redirects to signin if not authenticated or not superuser
 * Use this in page components (server components)
 */
export async function requireSuperuser() {
  const superuser = await getSuperuser()
  
  if (!superuser) {
    redirect("/")
  }
  
  return superuser
}

/**
 * Check superuser access for API routes - throws error if not superuser
 * Use this in API route handlers
 */
export async function requireSuperuserApi() {
  const superuser = await getSuperuser()
  
  if (!superuser) {
    throw new Error("Unauthorized: Superuser access required")
  }
  
  return superuser
}

