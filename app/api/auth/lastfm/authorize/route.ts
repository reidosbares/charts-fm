import { NextResponse } from 'next/server'
import { getLastFMAuthUrl } from '@/lib/lastfm-auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'signup' // 'signin' or 'signup'

  const apiKey = process.env.LASTFM_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Last.fm API key not configured' },
      { status: 500 }
    )
  }

  // Store mode in a cookie so we can retrieve it in the callback
  // (Last.fm callback URL is configured in app settings, so we can't pass it as a parameter)
  const cookieStore = await cookies()
  cookieStore.set('lastfm_auth_mode', mode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  // Generate Last.fm authorization URL
  const authUrl = getLastFMAuthUrl(apiKey)

  return NextResponse.json({ authUrl })
}

