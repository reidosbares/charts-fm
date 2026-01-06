import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const lastfmSigninCookie = cookieStore.get('lastfm_signin')

  if (!lastfmSigninCookie) {
    return NextResponse.json(
      { error: 'Session expired or not found' },
      { status: 400 }
    )
  }

  try {
    const { sessionKey, username } = JSON.parse(lastfmSigninCookie.value)

    // Clear the cookie after reading
    cookieStore.delete('lastfm_signin')

    return NextResponse.json({ sessionKey, username })
  } catch (error) {
    console.error('Error parsing Last.fm signin cookie:', error)
    return NextResponse.json(
      { error: 'Invalid session data' },
      { status: 400 }
    )
  }
}

