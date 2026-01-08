import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { readFile } from 'fs/promises'
import { join } from 'path'
import FAQContent from '@/components/FAQContent'
import FAQTOC from '@/components/FAQTOC'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'faq' })
  return {
    title: t('title'),
  }
}

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'faq' })
  
  // Read markdown file based on locale
  let markdownContent = ''
  try {
    const filePath = join(process.cwd(), 'content', `faq-${locale}.md`)
    markdownContent = await readFile(filePath, 'utf-8')
  } catch (error) {
    console.error('Error reading FAQ markdown file:', error)
    // Fallback to English if locale file doesn't exist
    if (locale !== 'en') {
      try {
        const fallbackPath = join(process.cwd(), 'content', 'faq-en.md')
        markdownContent = await readFile(fallbackPath, 'utf-8')
      } catch (fallbackError) {
        console.error('Error reading fallback FAQ file:', fallbackError)
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 relative">
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          {t('title')}
        </h1>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar with TOC */}
          <aside className="lg:w-64 flex-shrink-0">
            <FAQTOC content={markdownContent} />
          </aside>
          {/* Main content */}
          <div className="flex-1 min-w-0 bg-white rounded-lg p-6 md:p-8 shadow-sm">
            <FAQContent content={markdownContent} />
          </div>
        </div>
      </div>
    </main>
  )
}

