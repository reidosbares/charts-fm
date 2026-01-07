import Link from 'next/link'
import { generateSlug, ChartType } from '@/lib/chart-slugs'

interface RecordBlockProps {
  title: string
  record: {
    entryKey?: string
    chartType?: ChartType
    name: string
    artist?: string | null
    slug?: string
    userId?: string
    value: number
  } | null
  value: string
  groupId: string
  isUser?: boolean
}

export default function RecordBlock({ title, record, value, groupId, isUser }: RecordBlockProps) {
  if (!record) {
    return null
  }

  const getLink = () => {
    if (isUser) {
      return `/groups/${groupId}` // Users don't have drill-down pages yet
    }

    if (record.entryKey && record.chartType) {
      const slug = record.slug || generateSlug(record.entryKey, record.chartType)
      return `/groups/${groupId}/charts/${record.chartType === 'artists' ? 'artist' : record.chartType === 'tracks' ? 'track' : 'album'}/${slug}`
    }

    return null
  }

  const link = getLink()

  const content = (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm hover:shadow-md transition-shadow h-full">
      <h4 className="text-sm font-semibold text-gray-600 mb-2">{title}</h4>
      <div className="mb-2">
        <div className="font-bold text-lg text-gray-900">
          {record.name}
        </div>
        {record.artist && (
          <div className="text-xs text-gray-600 mt-1">by {record.artist}</div>
        )}
      </div>
      <div className="text-sm font-semibold text-[var(--theme-primary)]">
        {value}
      </div>
    </div>
  )

  if (link && !isUser) {
    return (
      <Link href={link} className="block h-full">
        {content}
      </Link>
    )
  }

  return content
}

