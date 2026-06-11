'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { Flame } from 'lucide-react'
import type { CalorieChartPoint } from '@/lib/types'

interface Props {
  data: CalorieChartPoint[]
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

const TOOLTIP_STYLE = {
  background: 'rgba(13,11,9,0.92)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(237,230,216,0.15)',
  borderRadius: 0,
  fontFamily: "var(--font-smono), monospace",
  fontSize: 12,
  color: '#ede6d8',
}

export default function CalorieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2.5">
        <div className="p-2.5 rounded-full bg-chalk/5 border border-chalk/10">
          <Flame className="w-5 h-5 text-chalk/25" />
        </div>
        <p className="text-xs text-chalk/30">Noch keine Daten</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(237,230,216,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#6b6557', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#6b6557', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(237,230,216,0.04)' }}
          labelFormatter={(d) => formatDate(d as string)}
          formatter={(v) => [`${v} kcal`, 'Kalorien']}
        />
        <Bar dataKey="kcal" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={i === data.length - 1 ? '#ff4d00' : 'rgba(255,77,0,0.25)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
