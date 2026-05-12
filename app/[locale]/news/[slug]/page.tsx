import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { getPost, getAllSlugs } from '@/lib/news'
import { withDefaultOgImage } from '@/lib/metadata'
import ThemeSwitch from '@/components/news/ThemeSwitch'
import ThemePreview from '@/components/news/ThemePreview'
import { NewsThemeProvider } from '@/components/news/NewsThemeProvider'

const mdxComponents = {
  ThemeSwitch,
  ThemePreview,
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs()
  return slugs.flatMap((slug) => [
    { locale: 'en', slug },
    { locale: 'pt', slug },
  ])
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getPost(slug, locale)
  if (!post) return {}

  const tSite = await getTranslations({ locale, namespace: 'site' })
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com'

  return withDefaultOgImage({
    title: post.title,
    description: post.excerpt ?? tSite('description'),
    openGraph: {
      type: 'article',
      locale: locale === 'pt' ? 'pt_BR' : 'en_US',
      url: `${siteUrl}/${locale}/news/${slug}`,
      siteName: tSite('name'),
      title: post.title,
      description: post.excerpt ?? tSite('description'),
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt ?? tSite('description'),
    },
  })
}

function formatDate(date: string, locale: string): string {
  try {
    return new Date(date).toLocaleDateString(locale === 'pt' ? 'pt-BR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return date
  }
}

export default async function NewsPostPage({ params }: PageProps) {
  const { locale, slug } = await params
  const post = await getPost(slug, locale)
  if (!post) notFound()

  const t = await getTranslations({ locale, namespace: 'news' })

  return (
    <main className="news-post-main flex min-h-screen flex-col pt-4 sm:pt-6 md:pt-8 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 relative transition-colors">
      <NewsThemeProvider>
        <div className="max-w-3xl w-full mx-auto relative z-10">
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
          >
            <span aria-hidden>←</span>
            <span>{t('backToList')}</span>
          </Link>

          <article className="news-article bg-[var(--surface-card)] rounded-lg p-5 sm:p-8 md:p-10 shadow-sm transition-colors">
            {post.cover && (
              <div className="relative w-full aspect-[16/9] mb-6 sm:mb-8 rounded-lg overflow-hidden bg-[var(--surface-base)]">
                <Image
                  src={post.cover}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <header className="mb-6 sm:mb-8">
              <time
                dateTime={post.date}
                className="text-xs sm:text-sm text-[var(--text-muted)] block mb-2"
              >
                {formatDate(post.date, locale)}
              </time>
              <h1 className="news-article-title text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] leading-tight transition-colors">
                {post.title}
              </h1>
            </header>

            <div className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)] prose-a:text-[var(--theme-primary)] prose-code:text-[var(--text-primary)] prose-code:bg-[var(--surface-base)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[var(--surface-base)] prose-blockquote:border-[var(--theme-primary)] prose-hr:border-[var(--border-strong)]">
              <MDXRemote
                source={post.body}
                components={mdxComponents}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                  },
                  parseFrontmatter: false,
                }}
              />
            </div>
          </article>
        </div>
      </NewsThemeProvider>
    </main>
  )
}
