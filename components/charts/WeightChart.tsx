'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Scale } from 'lucide-react'
import type { WeightChartPoint } from '@/lib/types'

interface Props {
  data: WeightChartPoint[]
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

export default function WeightChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2.5">
        <div className="p-2.5 rounded-full bg-white/3 border border-white/8">
          <Scale className="w-5 h-5 text-zinc-700" />
        </div>
        <p className="text-xs text-zinc-600">Noch keine Gewichtsdaten</p>
      </div>
    )
  }

  const min = Math.min(...data.map((d) => d.weight)) - 2
  const max = Math.max(...data.map((d) => d.weight)) + 2

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
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
          domain={[min, max]}
          tick={{ fill: '#52525b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: 'rgba(0,242,254,0.2)', strokeWidth: 1 }}
          labelFormatter={(d) => formatDate(d as string)}
          formatter={(v) => [`${v} kg`, 'Gewicht']}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#00f2fe"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#00f2fe', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
