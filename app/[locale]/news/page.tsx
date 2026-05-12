import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { getAllPosts } from '@/lib/news'
import { withDefaultOgImage } from '@/lib/metadata'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'news' })
  const tSite = await getTranslations({ locale, namespace: 'site' })
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com'

  return withDefaultOgImage({
    title: t('title'),
    description: t('subtitle'),
    openGraph: {
      type: 'website',
      locale: locale === 'pt' ? 'pt_BR' : 'en_US',
      url: `${siteUrl}/${locale}/news`,
      siteName: tSite('name'),
      title: t('title'),
      description: t('subtitle'),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('subtitle'),
    },
  })
}

function formatDate(date: string, locale: string): string {
  try {
    return new Date(date).toLocaleDateString(locale === 'pt' ? 'pt-BR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return date
  }
}

export default async function NewsListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'news' })
  const posts = await getAllPosts(locale)

  return (
    <main className="flex min-h-screen flex-col pt-4 sm:pt-6 md:pt-8 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 relative">
      <div className="max-w-4xl w-full mx-auto relative z-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2 sm:mb-3">
          {t('title')}
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-6 sm:mb-8 md:mb-10">
          {t('subtitle')}
        </p>

        {posts.length === 0 ? (
          <div className="bg-[var(--surface-card)] rounded-lg p-8 sm:p-10 text-center">
            <p className="text-[var(--text-muted)]">{t('empty')}</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/news/${post.slug}`}
                className="block bg-[var(--surface-card)] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-[var(--border-subtle)] hover:border-[var(--theme-primary)]"
              >
                <article className="flex flex-col sm:flex-row">
                  {post.cover && (
                    <div className="relative w-full sm:w-56 md:w-64 aspect-[16/9] sm:aspect-auto sm:self-stretch flex-shrink-0 bg-[var(--surface-base)]">
                      <Image
                        src={post.cover}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 256px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-5 sm:p-6 md:p-7">
                    <time
                      dateTime={post.date}
                      className="text-xs sm:text-sm text-[var(--text-muted)] block mb-1.5"
                    >
                      {formatDate(post.date, locale)}
                    </time>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
