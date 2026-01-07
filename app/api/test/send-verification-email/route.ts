import { NextResponse } from 'next/server'
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email'

/**
 * Development-only route to test email sending
 * This route is only available in development mode
 */
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This route is only available in development' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { email, name } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const token = generateVerificationToken()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`

    // Send test email
    await sendVerificationEmail(email, token, name || 'Test User')

    return NextResponse.json({
      success: true,
      message: 'Test email sent (check console for preview)',
      token,
      verificationUrl,
      note: 'In development, email content is logged to the console. The verification URL is also returned here for testing.',
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send test email',
      },
      { status: 500 }
    )
  }
}

