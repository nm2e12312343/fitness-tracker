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
  background: 'rgba(13,11,9,0.92)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(237,230,216,0.15)',
  borderRadius: 0,
  fontFamily: "var(--font-smono), monospace",
  fontSize: 12,
  color: '#ede6d8',
}

export default function VolumeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2.5">
        <div className="p-2.5 rounded-full bg-chalk/5 border border-chalk/10">
          <TrendingUp className="w-5 h-5 text-chalk/25" />
        </div>
        <p className="text-xs text-chalk/30">Noch keine Trainingsdaten</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(237,230,216,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#6b6557', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis yAxisId="left" tick={{ fill: '#6b6557', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b6557', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: 'rgba(255,77,0,0.15)', strokeWidth: 1 }}
          labelFormatter={(d) => formatDate(d as string)}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#52525b' }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="volume"
          name="Volumen (kg)"
          stroke="#ff4d00"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#ff4d00', strokeWidth: 0 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="oneRM"
          name="1RM Schätzung (kg)"
          stroke="rgba(255,77,0,0.45)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
          strokeDasharray="4 3"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
