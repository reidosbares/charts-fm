import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { routing } from '@/i18n/routing'

// This route handler catches /groups/[id]/public URLs without locale
// and redirects them to the user's profile locale (if logged in) or default locale
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const groupId = params.id
  
  // Try to get user's locale from their profile
  let locale = routing.defaultLocale
  
  try {
    const session = await getSession()
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { locale: true },
      })
      
      if (user?.locale && routing.locales.includes(user.locale as typeof routing.locales[number])) {
        locale = user.locale as typeof routing.locales[number]
      }
    }
  } catch (error) {
    // If there's an error, just use default locale
    console.error('Error getting user locale:', error)
  }
  
  // Redirect to the locale-specific public page
  return NextResponse.redirect(
    new URL(`/${locale}/groups/${groupId}/public`, request.url),
    307 // Temporary redirect
  )
}

