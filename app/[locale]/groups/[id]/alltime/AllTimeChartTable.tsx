'use client'

import { EnrichedChartItem } from '@/lib/group-chart-metrics'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface AllTimeChartTableProps {
  items: EnrichedChartItem[]
  chartType: 'artists' | 'tracks' | 'albums'
}

export default function AllTimeChartTable({ items, chartType }: AllTimeChartTableProps) {
  const t = useSafeTranslations('groups.allTimeStats')
  const tTable = useSafeTranslations('groups.allTimeStats.table')

  const getTypeLabel = () => {
    if (chartType === 'artists') return tTable('artist')
    if (chartType === 'tracks') return tTable('track')
    return tTable('album')
  }

  return (
    <div className="bg-[var(--surface-card)] rounded-lg shadow-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--surface-base)]">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-32">
              {tTable('position')}
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              {getTypeLabel()}
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-32">
              {tTable('plays')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {items.map((item) => (
            <tr key={item.position} className="hover:bg-[var(--surface-base)] transition-colors">
              <td className="px-6 py-5 text-sm">
                <span className="font-bold text-[var(--text-primary)]">{item.position}</span>
              </td>
              <td className="px-6 py-5 text-sm">
                <div>
                  <div className="font-medium text-[var(--text-primary)] break-words">{item.name}</div>
                  {item.artist && (
                    <div className="text-[var(--text-muted)] text-xs mt-1 break-words">{t('by', { artist: item.artist })}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-5 text-sm text-right">
                <span className="text-[var(--text-primary)] font-medium">{item.playcount}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

