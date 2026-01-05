import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function Home() {
  const session = await getSession()

  // Only redirect if we have a valid session with email
  // This prevents redirect loops if session exists but user was deleted
  if (session?.user?.email) {
    // Verify user still exists in database before redirecting
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })
    
    if (user) {
      redirect('/dashboard')
    }
    // If user doesn't exist, don't redirect - let them see the home page
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to ChartsFM
        </h1>
        <p className="text-center text-lg mb-8">
          Connect your Last.fm account and explore your listening habits with beautiful charts and visualizations.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/auth/signin"
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            Sign In
          </a>
          <a
            href="/auth/signup"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Sign Up
          </a>
        </div>
      </div>
    </main>
  );
}

