import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserGroups, getUserGroupInvites } from '@/lib/group-queries'
import Link from 'next/link'
import GroupsTabs from './GroupsTabs'

export default async function GroupsPage() {
  const session = await getSession()
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const groups = await getUserGroups(user.id)
  const invites = await getUserGroupInvites(user.id)

  // Separate groups into owned groups (where user is owner) and member groups
  const adminGroups = groups.filter((group: any) => group.creatorId === user.id)
  const memberGroups = groups.filter((group: any) => group.creatorId !== user.id)

  return (
    <main className="flex min-h-screen flex-col p-24">
      <div className="max-w-6xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Groups</h1>
          <Link
            href="/groups/create"
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            Create Group
          </Link>
        </div>

        <GroupsTabs
          ownedGroups={adminGroups}
          memberGroups={memberGroups}
          invites={invites}
          userId={user.id}
        />
      </div>
    </main>
  )
}

