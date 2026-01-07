import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const redirectParam = searchParams.get('redirect') // Check if client wants redirect

    if (!token) {
      if (redirectParam === 'true') {
        return NextResponse.redirect(
          new URL('/auth/verify-email?error=missing_token', request.url)
        )
      }
      return NextResponse.json(
        { error: 'No verification token provided' },
        { status: 400 }
      )
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpires: {
          gt: new Date(), // Token not expired
        },
      },
    })

    if (!user) {
      if (redirectParam === 'true') {
        return NextResponse.redirect(
          new URL('/auth/verify-email?error=invalid_token', request.url)
        )
      }
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Verify the email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpires: null,
      },
    })

    // If redirect is requested (from direct email link), redirect
    if (redirectParam === 'true') {
      return NextResponse.redirect(
        new URL('/?verified=true', request.url)
      )
    }

    // Otherwise return JSON for client-side handling
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    })
  } catch (error) {
    console.error('Email verification error:', error)
    const redirectParam = new URL(request.url).searchParams.get('redirect')
    if (redirectParam === 'true') {
      return NextResponse.redirect(
        new URL('/auth/verify-email?error=server_error', request.url)
      )
    }
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}

