'use client'

import { useEffect, useState } from 'react'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface TOCItem {
  id: string
  title: string
  level: number
}

interface FAQTOCProps {
  content: string
}

export default function FAQTOC({ content }: FAQTOCProps) {
  const t = useSafeTranslations('faq')
  const [tocItems, setTocItems] = useState<TOCItem[]>([])

  useEffect(() => {
    // Extract headings from markdown content
    const headingRegex = /^(#{2,3})\s+(.+)$/gm
    const items: TOCItem[] = []
    let match

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length // Number of # characters
      const title = match[2].trim()
      // Generate ID from title (lowercase, replace spaces with hyphens, remove special chars)
      const id = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      items.push({ id, title, level })
    }

    setTocItems(items)
  }, [content])

  if (tocItems.length === 0) {
    return null
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event from bubbling to NavigationContext
    const element = document.getElementById(id)
    if (element) {
      // Update URL hash without triggering navigation
      window.history.pushState(null, '', `#${id}`)
      
      const offset = 80 // Account for navbar height
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className="mb-4 sm:mb-6 lg:mb-0 p-3 sm:p-4 lg:p-6 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-3 sm:mb-4">{t('tableOfContents')}</h2>
      <nav>
        <ul className="space-y-1.5 sm:space-y-2">
          {tocItems.map((item) => (
            <li key={item.id} className={item.level === 3 ? 'ml-2 sm:ml-3 lg:ml-4' : ''}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                data-hash-only="true"
                className="text-xs sm:text-sm lg:text-sm text-gray-700 hover:text-[var(--theme-primary)] transition-colors duration-200 block break-words"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

