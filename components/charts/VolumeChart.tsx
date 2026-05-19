'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { VolumeChartPoint } from '@/lib/types'

interface Props {
  data: VolumeChartPoint[]
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

export default function VolumeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2.5">
        <div className="p-2.5 rounded-full bg-white/3 border border-white/8">
          <TrendingUp className="w-5 h-5 text-zinc-700" />
        </div>
        <p className="text-xs text-zinc-600">Noch keine Trainingsdaten</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#52525b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis yAxisId="left" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: 'rgba(0,242,254,0.15)', strokeWidth: 1 }}
          labelFormatter={(d) => formatDate(d as string)}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#52525b' }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="volume"
          name="Volumen (kg)"
          stroke="#00f2fe"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#00f2fe', strokeWidth: 0 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="oneRM"
          name="1RM Schätzung (kg)"
          stroke="rgba(0,242,254,0.45)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
          strokeDasharray="4 3"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
