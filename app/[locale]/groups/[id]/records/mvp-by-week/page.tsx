import { getGroupAccess } from '@/lib/group-auth'
import { Link } from '@/i18n/routing'
import GroupPageHero from '@/components/groups/GroupPageHero'
import MVPByWeekClient from './MVPByWeekClient'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getGroupImageUrl } from '@/lib/group-image-utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id } = await params
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com'
  const defaultOgImage = `${siteUrl}/social-preview.png`
  const t = await getTranslations('records.mvpByWeek')
  const tRecords = await getTranslations('records')
  const tSite = await getTranslations('site')
  try {
    const { group } = await getGroupAccess(id)
    const tGroups = await getTranslations('groups')
    return {
      title: `${t('pageTitle')} - ${group?.name || tGroups('title')} - ${tRecords('title')}`,
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: { images: [defaultOgImage] },
    }
  } catch {
    return {
      title: `${t('pageTitle')} - ${tRecords('title')}`,
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: { images: [defaultOgImage] },
    }
  }
}

export default async function MVPByWeekPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params
  const { group } = await getGroupAccess(id)
  const t = await getTranslations('records')
  const tGroups = await getTranslations('groups')
  const tMvpByWeek = await getTranslations('records.mvpByWeek')

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-24">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">{t('notFound')}</h1>
          <Link href="/groups" className="text-[var(--text-secondary)] hover:underline text-sm md:text-base">
            {t('backToGroups')}
          </Link>
        </div>
      </main>
    )
  }

  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  const dynamicGroupImage = await getGroupImageUrl({
    id: group.id,
    image: group.image,
    dynamicIconEnabled: group.dynamicIconEnabled,
    dynamicIconSource: group.dynamicIconSource,
  })

  return (
    <main className={`flex min-h-screen flex-col pt-4 md:pt-8 pb-24 px-3 sm:px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
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
            { label: t('breadcrumb'), href: `/groups/${group.id}/records` },
            { label: tMvpByWeek('breadcrumb') },
          ]}
          subheader={tMvpByWeek('pageTitle')}
        />

        <MVPByWeekClient groupId={group.id} />
      </div>
    </main>
  )
}
