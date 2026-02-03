'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faSpinner, faChartLine, faTrophy, faStar, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { Link } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import SafeImage from '@/components/SafeImage'

interface DriverEntry {
  chartType: 'artists' | 'tracks' | 'albums'
  entryKey: string
  name: string
  artist?: string | null
  slug: string
  reachedNumberOne?: boolean
}

interface PersonalizedStats {
  hasStats: boolean
  totalVS: number
  totalPlays: number
  weeksAsMVP: number
  byChartType: {
    artists: { entriesHelpedDebut: number; weeksAtOneContributed: number; entriesAsMainDriver: number }
    tracks: { entriesHelpedDebut: number; weeksAtOneContributed: number; entriesAsMainDriver: number }
    albums: { entriesHelpedDebut: number; weeksAtOneContributed: number; entriesAsMainDriver: number }
  }
  driverEntries?: DriverEntry[]
}

interface MyContributionCardProps {
  groupId: string
  userId: string | null
}

export default function MyContributionCard({ groupId, userId }: MyContributionCardProps) {
  const tMyContribution = useSafeTranslations('records.myContribution')
  const tTabs = useSafeTranslations('records.tabs')
  const [membersList, setMembersList] = useState<Array<{ userId: string; user: { id: string; name: string | null; lastfmUsername: string; image: string | null } }>>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(userId)
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false)
  const [memberFilterQuery, setMemberFilterQuery] = useState('')
  const [personalizedStats, setPersonalizedStats] = useState<PersonalizedStats | null>(null)
  const [personalizedStatsLoading, setPersonalizedStatsLoading] = useState(false)

  useEffect(() => {
    if (userId) setSelectedMemberId(userId)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetch(`/api/groups/${groupId}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && data.members) setMembersList(data.members)
      })
      .catch((err) => console.error('Error fetching members:', err))
  }, [groupId, userId])

  useEffect(() => {
    if (!userId || !selectedMemberId) return
    let cancelled = false
    setPersonalizedStatsLoading(true)
    const url = `/api/groups/${groupId}/records/personalized?userId=${encodeURIComponent(selectedMemberId)}&_t=${Date.now()}`
    fetch(url, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (!data.error) setPersonalizedStats(data)
        setPersonalizedStatsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Error fetching personalized stats:', err)
        setPersonalizedStatsLoading(false)
      })
    return () => { cancelled = true }
  }, [groupId, userId, selectedMemberId])

  if (!userId) return null

  const getMemberDisplayName = (id: string) => {
    if (id === userId) return tMyContribution('you')
    const m = membersList.find((x) => x.userId === id)
    return m ? (m.user.name || m.user.lastfmUsername) : id
  }
  const getSelectedMember = () => {
    if (!selectedMemberId || selectedMemberId === userId) return null
    return membersList.find((x) => x.userId === selectedMemberId) || null
  }
  const selectedMember = getSelectedMember()
  const filteredMembers = membersList.filter((m) => {
    // Exclude current user from the list (they have the "You" option)
    if (m.userId === userId) return false
    const q = memberFilterQuery.trim().toLowerCase()
    if (!q) return true
    const name = (m.user.name || '').toLowerCase()
    const username = (m.user.lastfmUsername || '').toLowerCase()
    return name.includes(q) || username.includes(q)
  })
  const showYouOption = !memberFilterQuery.trim() || tMyContribution('you').toLowerCase().includes(memberFilterQuery.trim().toLowerCase())

  return (
    <div className="mt-6 pt-6 border-t border-[var(--theme-border)]/50">
      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{tMyContribution('sectionTitle')}</h3>
      <div className="rounded-2xl bg-gradient-to-br from-white/90 to-[var(--theme-primary-lighter)]/20 border border-theme/60 shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {selectedMember && (
                <Link
                  href={`/u/${encodeURIComponent(selectedMember.user.lastfmUsername)}`}
                  className="relative w-10 h-10 md:w-12 md:h-12 rounded-full ring-2 ring-[var(--theme-ring)] bg-[var(--theme-primary-lighter)] flex-shrink-0 overflow-hidden hover:opacity-90 transition-opacity"
                >
                  <SafeImage
                    src={selectedMember.user.image}
                    alt={selectedMember.user.name || selectedMember.user.lastfmUsername}
                    className="object-cover w-full h-full"
                  />
                </Link>
              )}
              {selectedMember ? (
                <Link
                  href={`/u/${encodeURIComponent(selectedMember.user.lastfmUsername)}`}
                  className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 hover:text-[var(--theme-primary)] transition-colors truncate"
                >
                  {tMyContribution('memberContribution', { name: getMemberDisplayName(selectedMemberId!) })}
                </Link>
              ) : (
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                  {tMyContribution('title')}
                </h4>
              )}
            </div>
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setMemberDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme bg-white/80 text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900 transition-colors w-full sm:w-auto justify-center sm:justify-start"
              >
                <span>{tMyContribution('selectMember')}</span>
                <FontAwesomeIcon icon={faChevronDown} className={`text-xs flex-shrink-0 transition-transform ${memberDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {memberDropdownOpen && (
                <div className="absolute top-full left-0 right-0 sm:right-auto sm:left-0 mt-1 w-full sm:w-64 rounded-lg border border-theme bg-white shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-theme/40">
                    <input
                      type="text"
                      value={memberFilterQuery}
                      onChange={(e) => setMemberFilterQuery(e.target.value)}
                      placeholder={tMyContribution('filterMembers')}
                      className="w-full px-3 py-2 text-sm rounded-md border border-theme/50 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/50"
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {showYouOption && (
                      <li>
                        <button
                          type="button"
                          onClick={() => { setSelectedMemberId(userId); setMemberDropdownOpen(false); setMemberFilterQuery(''); }}
                          className={`w-full px-3 py-2 text-left text-sm ${selectedMemberId === userId ? 'bg-[var(--theme-primary)]/15 font-semibold text-[var(--theme-primary)]' : 'text-gray-800 hover:bg-gray-100'}`}
                        >
                          {tMyContribution('you')}
                        </button>
                      </li>
                    )}
                    {filteredMembers.map((m) => (
                      <li key={m.userId}>
                        <button
                          type="button"
                          onClick={() => { setSelectedMemberId(m.userId); setMemberDropdownOpen(false); setMemberFilterQuery(''); }}
                          className={`w-full px-3 py-2 text-left text-sm ${selectedMemberId === m.userId ? 'bg-[var(--theme-primary)]/15 font-semibold text-[var(--theme-primary)]' : 'text-gray-800 hover:bg-gray-100'}`}
                        >
                          {m.user.name || m.user.lastfmUsername}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          {personalizedStatsLoading ? (
            <div className="flex items-center justify-center py-10">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--theme-primary)]" />
            </div>
          ) : personalizedStats ? (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 min-w-0 p-2 sm:p-0 rounded-xl bg-gray-50/50 sm:bg-transparent text-center sm:text-left">
                  <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--theme-primary)]/15 flex items-center justify-center">
                    <FontAwesomeIcon icon={faChartLine} className="text-base md:text-lg text-[var(--theme-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl md:text-3xl font-bold text-gray-900 tabular-nums">
                      {personalizedStats.totalVS.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">{tMyContribution('totalVS')}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 min-w-0 p-2 sm:p-0 rounded-xl bg-gray-50/50 sm:bg-transparent text-center sm:text-left">
                  <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <FontAwesomeIcon icon={faTrophy} className="text-base md:text-lg text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl md:text-3xl font-bold text-gray-900 tabular-nums">{personalizedStats.weeksAsMVP}</p>
                    <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">{tMyContribution('weeksAsMVP')}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 min-w-0 p-2 sm:p-0 rounded-xl bg-gray-50/50 sm:bg-transparent text-center sm:text-left">
                  <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <FontAwesomeIcon icon={faStar} className="text-base md:text-lg text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl md:text-3xl font-bold text-gray-900 tabular-nums">
                      {personalizedStats.byChartType.artists.entriesAsMainDriver + personalizedStats.byChartType.tracks.entriesAsMainDriver + personalizedStats.byChartType.albums.entriesAsMainDriver}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">{tMyContribution('entriesAsMainDriver')}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['artists', 'tracks', 'albums'] as const).map((type) => {
                  const b = personalizedStats.byChartType[type]
                  const total = b.entriesHelpedDebut + b.weeksAtOneContributed + b.entriesAsMainDriver
                  if (total === 0) return null
                  return (
                    <div
                      key={type}
                      className="rounded-xl bg-white/70 border border-theme/40 p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/15 flex items-center justify-center">
                          <FontAwesomeIcon
                            icon={type === 'artists' ? faMicrophone : type === 'tracks' ? faMusic : faCompactDisc}
                            className="text-[var(--theme-primary)] text-sm"
                          />
                        </div>
                        <span className="text-base font-semibold text-gray-800">{tTabs(type)}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{tMyContribution('debuts')}</span>
                          <span className="text-sm font-bold text-gray-900 tabular-nums">{b.entriesHelpedDebut}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{tMyContribution('atNumberOne')}</span>
                          <span className="text-sm font-bold text-gray-900 tabular-nums">{b.weeksAtOneContributed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{tMyContribution('asDriver')}</span>
                          <span className="text-sm font-bold text-gray-900 tabular-nums">{b.entriesAsMainDriver}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {personalizedStats.driverEntries && personalizedStats.driverEntries.length > 0 && (() => {
                const byType = { artists: [] as DriverEntry[], tracks: [] as DriverEntry[], albums: [] as DriverEntry[] }
                personalizedStats.driverEntries.forEach((e) => byType[e.chartType].push(e))
                const sortEntries = (a: DriverEntry, b: DriverEntry) => {
                  const cmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
                  if (cmp !== 0) return cmp
                  return (a.artist ?? '').localeCompare(b.artist ?? '', undefined, { sensitivity: 'base' })
                }
                byType.artists.sort(sortEntries)
                byType.tracks.sort(sortEntries)
                byType.albums.sort(sortEntries)
                const sections = [
                  { key: 'artists' as const, icon: faMicrophone, label: tTabs('artists') },
                  { key: 'tracks' as const, icon: faMusic, label: tTabs('tracks') },
                  { key: 'albums' as const, icon: faCompactDisc, label: tTabs('albums') },
                ]
                return (
                  <div className="mt-5 pt-4 border-t border-theme/40">
                    <p className="text-sm font-medium text-gray-700 mb-3">{tMyContribution('driverEntriesList')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                      {sections.map(({ key, icon, label }) => (
                        <div key={key} className="rounded-xl bg-white/60 border border-theme/40 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--theme-primary)]/10 border-b border-theme/40">
                            <FontAwesomeIcon icon={icon} className="text-[var(--theme-primary)] text-sm" />
                            <span className="text-sm font-semibold text-gray-800">{label}</span>
                            <span className="text-xs text-gray-500">({byType[key].length})</span>
                          </div>
                          <ul className="divide-y divide-theme/30 max-h-[200px] md:max-h-[280px] overflow-y-auto">
                            {byType[key].length === 0 ? (
                              <li className="px-3 py-4 text-xs text-gray-500 text-center">—</li>
                            ) : (
                              byType[key].map((entry) => {
                                const typePath = key === 'artists' ? 'artist' : key === 'tracks' ? 'track' : 'album'
                                const href = `/groups/${groupId}/charts/${typePath}/${encodeURIComponent(entry.slug)}`
                                const isGold = entry.reachedNumberOne
                                return (
                                  <li key={entry.entryKey}>
                                    <Link
                                      href={href}
                                      className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                                        isGold
                                          ? 'bg-amber-50/80 hover:bg-amber-100/80 border-l-2 border-amber-500'
                                          : 'hover:bg-[var(--theme-primary-lighter)]/20'
                                      }`}
                                    >
                                      {isGold && (
                                        <span className="flex-shrink-0 text-amber-500" title="#1">★</span>
                                      )}
                                      <span className={`text-sm truncate min-w-0 flex-1 ${isGold ? 'font-semibold text-amber-900' : 'font-medium text-gray-900'}`}>
                                        {entry.name}
                                      </span>
                                      <span className="text-[var(--theme-primary)] text-xs flex-shrink-0">→</span>
                                    </Link>
                                  </li>
                                )
                              })
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </>
          ) : (
            <div className="py-10 text-center text-sm text-gray-500">
              {tMyContribution('noStats')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
