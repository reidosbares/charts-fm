import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SafeImage from '@/components/SafeImage'
import PersonalListeningOverview from '@/components/dashboard/PersonalListeningOverview'
import GroupQuickViewCards from '@/components/dashboard/GroupQuickViewCards'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import QuickActionsPanel from '@/components/dashboard/QuickActionsPanel'
import GroupsYouMightLike from '@/components/dashboard/GroupsYouMightLike'

export default async function DashboardPage() {
  const session = await getSession()

  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  // Get minimal user data for header only
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      lastfmUsername: true,
      image: true,
    },
  })

  // If user doesn't exist (e.g., after database wipe), clear session and redirect
  if (!user) {
    redirect('/api/auth/signout')
  }

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 bg-gray-50">
      <div className="max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-2">
            <div className="relative w-16 h-16 flex-shrink-0">
              <SafeImage
                src={user.image}
                alt={user.name || 'Profile'}
                className="rounded-full object-cover w-16 h-16 ring-2 ring-yellow-500"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-gray-600 mt-1">@{user.lastfmUsername}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel - loads its own data */}
        <div className="mb-8">
          <QuickActionsPanel />
        </div>

        {/* Main Content Grid - components load their own data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Personal Listening Overview */}
          <div className="lg:col-span-2">
            <PersonalListeningOverview />
          </div>

          {/* Right Column - Activity Feed */}
          <div>
            <ActivityFeed />
          </div>
        </div>

        {/* Group Quick View Cards - loads its own data */}
        <div className="mb-8">
          <GroupQuickViewCards />
        </div>

        {/* Groups You Might Like - loads its own data */}
        <div className="mb-8">
          <GroupsYouMightLike />
        </div>
      </div>
    </main>
  )
}

