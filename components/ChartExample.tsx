'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAppearance } from '@/contexts/AppearanceContext'

interface ChartExampleProps {
  data: Array<{
    name: string
    plays: number
  }>
}

export default function ChartExample({ data }: ChartExampleProps) {
  const { resolvedAppearance } = useAppearance()
  const isDark = resolvedAppearance === 'dark'
  const axisColor = isDark ? 'rgb(200 200 210)' : 'rgb(75 85 99)'
  const gridColor = isDark ? 'rgb(55 55 62)' : 'rgb(229 231 235)'
  const tooltipStyle = {
    backgroundColor: isDark ? 'rgb(32 32 38)' : 'rgb(255 255 255)',
    border: `1px solid ${isDark ? 'rgb(55 55 62)' : 'rgb(229 231 235)'}`,
    borderRadius: '0.5rem',
    color: isDark ? 'rgb(237 237 240)' : 'rgb(17 24 39)',
  }
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="name" stroke={axisColor} />
        <YAxis stroke={axisColor} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? 'rgb(50 50 56 / 0.5)' : 'rgb(229 231 235 / 0.5)' }} />
        <Legend wrapperStyle={{ color: axisColor }} />
        <Bar dataKey="plays" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}

