import { requireGroupMembership } from '@/lib/group-auth'
import { getGroupRecords } from '@/lib/group-records'
import Link from 'next/link'
import RecordsClient from './RecordsClient'
import GroupPageHero from '@/components/groups/GroupPageHero'

export default async function RecordsPage({ params }: { params: { id: string } }) {
  const { user, group } = await requireGroupMembership(params.id)

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Link href="/groups" className="text-gray-600 hover:underline">
            Back to Groups
          </Link>
        </div>
      </main>
    )
  }

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get records data
  const records = await getGroupRecords(group.id)

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: group.image,
          }}
          breadcrumbs={[
            { label: 'Groups', href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: 'Records' },
          ]}
          subheader="Chart Records & Achievements"
        />

        {/* Records Content - Client Component */}
        <RecordsClient 
          groupId={group.id}
          initialRecords={records}
        />
      </div>
    </main>
  )
}

