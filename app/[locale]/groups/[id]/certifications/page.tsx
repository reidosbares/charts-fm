import { redirect } from '@/i18n/routing'
import { getGroupAccess } from '@/lib/group-auth'
import { Link } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { withDefaultOgImage } from '@/lib/metadata'
import GroupPageHero from '@/components/groups/GroupPageHero'
import { getGroupImageUrl } from '@/lib/group-image-utils'
import CertificationsPageClient from './CertificationsPageClient'

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id } = await params
  const t = await getTranslations('certificationsPage')

  try {
    const { group } = await getGroupAccess(id)
    if (!group) return withDefaultOgImage({ title: t('title') })
    return withDefaultOgImage({ title: `${t('title')} - ${group.name}` })
  } catch {
    return withDefaultOgImage({ title: t('title') })
  }
}

export default async function CertificationsPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params
  const { user, group, isMember } = await getGroupAccess(id)
  const t = await getTranslations('certificationsPage')
  const tGroups = await getTranslations('groups')

  if (!user) {
    redirect({ href: `/groups/${id}/public`, locale: locale as 'en' | 'pt' })
  }

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
          <Link href="/groups" className="text-gray-600 hover:underline">
            {t('backToGroup')}
          </Link>
        </div>
      </main>
    )
  }

  const certSettings = await prisma.group.findUnique({
    where: { id: group.id },
    select: { certificationsEnabled: true, creatorId: true },
  })

  if (!certSettings?.certificationsEnabled) {
    redirect({ href: `/groups/${id}`, locale: locale as 'en' | 'pt' })
  }

  const isCreator = user?.id === certSettings!.creatorId
  const colorTheme = (group.colorTheme || 'yellow') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  const dynamicGroupImage = await getGroupImageUrl({
    id: group.id,
    image: group.image,
    dynamicIconEnabled: group.dynamicIconEnabled,
    dynamicIconSource: group.dynamicIconSource,
  })

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: dynamicGroupImage,
          }}
          breadcrumbs={[
            { label: tGroups('hero.breadcrumb'), href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: t('title') },
          ]}
          subheader={t('title')}
        />

        <CertificationsPageClient
          groupId={group.id}
          isCreator={isCreator}
        />
      </div>
    </main>
  )
}
