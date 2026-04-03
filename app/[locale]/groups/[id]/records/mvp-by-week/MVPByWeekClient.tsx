'use client'

import useSWR from 'swr'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { formatChartWeekDate, formatChartWeekLabel } from '@/lib/weekly-utils'

interface MVPByWeekRow {
  weekStart: string
  weekNumber: number
  mvpUserId: string | null
  mvpName: string | null
  mvpImage: string | null
  mvpLastfmUsername: string | null
  totalVS: number
  totalPlays: number
}

interface MVPByWeekClientProps {
  groupId: string
}

export default function MVPByWeekClient({ groupId }: MVPByWeekClientProps) {
  const t = useSafeTranslations('records.mvpByWeek')
  const { data: rawData, error, isLoading: loading } = useSWR<any>(`/api/groups/${groupId}/records/mvp-by-week`)
  const rows = rawData ? (Array.isArray(rawData) ? rawData : []) as MVPByWeekRow[] : null

  const titleBlock = (
    <div className="mb-3 md:mb-6 text-center px-2">
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--theme-primary)]">
        {t('pageTitle')}
      </h1>
    </div>
  )

  if (loading) {
    return (
      <>
        {titleBlock}
        <div className="flex items-center justify-center py-10 md:py-16 px-2">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl md:text-3xl text-[var(--theme-primary)]" />
          <span className="ml-3 text-sm md:text-base text-gray-600">{t('loading')}</span>
        </div>
      </>
    )
  }

  if (error || !rows) {
    return (
      <>
        {titleBlock}
        <div className="rounded-lg border border-gray-200 bg-white shadow-lg p-4 md:p-6 text-center text-sm md:text-base text-gray-600" style={{ backgroundColor: '#ffffff' }}>
          {error || t('empty')}
        </div>
      </>
    )
  }

  if (rows.length === 0) {
    return (
      <>
        {titleBlock}
        <div className="rounded-lg border border-gray-200 bg-white shadow-lg p-4 md:p-6 text-center text-sm md:text-base text-gray-600" style={{ backgroundColor: '#ffffff' }}>
          {t('empty')}
        </div>
      </>
    )
  }

  return (
    <>
      {titleBlock}

      {/* Mobile: card list (touch-friendly, white background, tight spacing) */}
      <div className="md:hidden space-y-2">
        {rows.map((row) => (
          <div
            key={row.weekStart}
            className="rounded-lg border border-gray-200 shadow-sm p-3 overflow-hidden"
            style={{ backgroundColor: '#ffffff', isolation: 'isolate' }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('weekNumber')} {row.weekNumber}</span>
              <Link
                href={`/groups/${groupId}/charts?week=${formatChartWeekDate(new Date(row.weekStart))}`}
                className="text-sm text-gray-600 hover:text-[var(--theme-primary)] underline-offset-2 hover:underline min-h-[44px] inline-flex items-center"
              >
                {formatChartWeekLabel(new Date(row.weekStart))}
              </Link>
            </div>
            <div className="mb-1.5 min-h-[44px]">
              {row.mvpUserId && row.mvpLastfmUsername ? (
                <Link
                  href={`/u/${encodeURIComponent(row.mvpLastfmUsername)}`}
                  className="flex items-center gap-3 py-1.5 -mx-1 px-1 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px]"
                >
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
                    <SafeImage
                      src={row.mvpImage || ''}
                      alt={row.mvpName || row.mvpLastfmUsername}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="font-medium text-gray-900 truncate">
                    {row.mvpName || row.mvpLastfmUsername}
                  </span>
                </Link>
              ) : (
                <span className="text-gray-500 text-sm py-1.5 block">—</span>
              )}
            </div>
            <div className="flex items-center gap-6 text-sm tabular-nums border-t border-gray-100 pt-2">
              <span className="text-gray-600"><span className="text-gray-400 font-medium">{t('plays')}</span> {row.totalPlays.toLocaleString()}</span>
              <span className="text-gray-600"><span className="text-gray-400 font-medium">{t('vs')}</span> {row.totalVS.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div
        className="hidden md:block overflow-x-auto rounded-lg shadow-lg overflow-hidden"
        style={{
          backgroundColor: '#ffffff',
          isolation: 'isolate',
        }}
      >
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">{t('weekNumber')}</th>
              <th className="px-4 py-3 font-semibold text-gray-700">{t('weekDate')}</th>
              <th className="px-4 py-3 font-semibold text-gray-700">{t('mvp')}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-right tabular-nums">{t('plays')}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-right tabular-nums">{t('vs')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.weekStart} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 tabular-nums">{row.weekNumber}</td>
                <td className="px-4 py-3 text-gray-700">
                  <Link
                    href={`/groups/${groupId}/charts?week=${formatChartWeekDate(new Date(row.weekStart))}`}
                    className="text-gray-700 hover:text-[var(--theme-primary)] underline-offset-2 hover:underline"
                  >
                    {formatChartWeekLabel(new Date(row.weekStart))}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {row.mvpUserId && row.mvpLastfmUsername ? (
                    <Link
                      href={`/u/${encodeURIComponent(row.mvpLastfmUsername)}`}
                      className="flex items-center gap-2 text-gray-900 hover:text-[var(--theme-primary)]"
                    >
                      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-[var(--theme-primary)]/10 ring-1 ring-[var(--theme-border)]">
                        <SafeImage
                          src={row.mvpImage || ''}
                          alt={row.mvpName || row.mvpLastfmUsername}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="font-medium truncate max-w-[200px]">
                        {row.mvpName || row.mvpLastfmUsername}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.totalPlays.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.totalVS.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
