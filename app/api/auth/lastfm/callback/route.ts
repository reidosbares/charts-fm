import { NextResponse } from 'next/server'
import { createLastFMSession } from '@/lib/lastfm-auth'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { detectLocale, getLocalizedPath } from '@/lib/locale-utils'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  // Detect locale for redirects (Last.fm callback doesn't include locale in URL)
  const locale = await detectLocale(request)
  
  // Get mode and locale from cookies (set during authorization)
  const cookieStore = await cookies()
  const modeCookie = cookieStore.get('lastfm_auth_mode')
  const localeCookie = cookieStore.get('lastfm_auth_locale')
  const mode = modeCookie?.value || 'signup' // 'signin' or 'signup'
  
  // Clear the cookies after reading
  if (modeCookie) {
    cookieStore.delete('lastfm_auth_mode')
  }
  if (localeCookie) {
    cookieStore.delete('lastfm_auth_locale')
  }

  if (!token) {
    const errorPath = mode === 'signin' 
      ? '/?error=no_token&signin=true'
      : '/auth/signup?error=no_token'
    const errorUrl = getLocalizedPath(errorPath, locale)
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  const apiKey = process.env.LASTFM_API_KEY
  const apiSecret = process.env.LASTFM_API_SECRET

  if (!apiKey || !apiSecret) {
    console.error('Missing Last.fm API credentials')
    const errorPath = mode === 'signin'
      ? '/?error=config&signin=true'
      : '/auth/signup?error=config'
    const errorUrl = getLocalizedPath(errorPath, locale)
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  try {
    // Create Last.fm session from token
    const { sessionKey, username } = await createLastFMSession(
      token,
      apiKey,
      apiSecret
    )

    // Always check if user already exists first, regardless of mode
    // This prevents redirecting existing users to signup if the mode cookie is lost
    const existingUser = await prisma.user.findUnique({
      where: { lastfmUsername: username },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        lastfmSessionKey: true,
      }
    })

    if (existingUser) {
      // User exists - handle signin flow
      // Allow login regardless of email verification status
      
      // Update session key
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastfmSessionKey: sessionKey }
      })

      // Store credentials temporarily for client-side signin
      const cookieStore = await cookies()
      cookieStore.set('lastfm_signin', JSON.stringify({ sessionKey, username }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 5, // 5 minutes
        path: '/',
      })

      // Redirect to a page that will handle the client-side signin
      const signinPath = getLocalizedPath('/auth/signin/lastfm', locale)
      return NextResponse.redirect(new URL(signinPath, request.url))
    }

    // User doesn't exist - proceed with signup flow
    // If the user tried to sign in but doesn't have an account yet, send them directly
    // to the account creation form with the session pre-filled (cookie-based).
    //
    // This avoids a confusing dead-end where "Login with Last.fm" fails even though
    // the user successfully authenticated with Last.fm.
    const cookieStore = await cookies()
    cookieStore.set('lastfm_session', JSON.stringify({ sessionKey, username }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour (tokens are valid for 60 minutes)
      path: '/',
    })

    // Redirect to account completion page
    const completePath = getLocalizedPath(
      mode === 'signin'
        ? `/auth/signup/complete?source=signin&lastfm_username=${encodeURIComponent(username)}`
        : '/auth/signup/complete',
      locale
    )
    return NextResponse.redirect(new URL(completePath, request.url))
  } catch (error) {
    console.error('Last.fm callback error:', error)
    const errorPath = mode === 'signin'
      ? `/?error=${encodeURIComponent(error instanceof Error ? error.message : 'authentication_failed')}&signin=true`
      : `/auth/signup?error=${encodeURIComponent(error instanceof Error ? error.message : 'authentication_failed')}`
    const errorUrl = getLocalizedPath(errorPath, locale)
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }
}

