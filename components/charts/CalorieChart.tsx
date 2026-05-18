'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import type { CalorieChartPoint } from '@/lib/types'

interface Props {
  data: CalorieChartPoint[]
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

const TOOLTIP_STYLE = {
  background: 'rgba(0,0,0,0.85)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
  fontSize: 12,
  color: '#e4e4e7',
}

export default function CalorieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
        Noch keine Daten
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#52525b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#52525b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          labelFormatter={(d) => formatDate(d as string)}
          formatter={(v) => [`${v} kcal`, 'Kalorien']}
        />
        <Bar dataKey="kcal" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={i === data.length - 1 ? '#00f2fe' : 'rgba(0,242,254,0.25)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
