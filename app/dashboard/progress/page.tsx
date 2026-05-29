import { createClient } from '@/lib/supabase/server'
import { getWeightHistory } from '@/lib/actions/calories'
import VolumeChart from '@/components/charts/VolumeChart'
import WeightChart from '@/components/charts/WeightChart'
import type { VolumeChartPoint } from '@/lib/types'

const CARD = 'rounded-2xl border border-white/10 bg-zinc-950'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [weightHistory, { data: workoutData }] = await Promise.all([
    getWeightHistory(user!.id),
    supabase
      .from('workouts')
      .select('date, workout_logs(weight, reps, sets)')
      .eq('user_id', user!.id)
      .gte('date', since)
      .order('date', { ascending: true }),
  ])

  const byDate: Record<string, { volume: number; bestOneRM: number }> = {}
  for (const workout of workoutData ?? []) {
    const d = workout.date
    if (!byDate[d]) byDate[d] = { volume: 0, bestOneRM: 0 }
    for (const log of workout.workout_logs ?? []) {
      const vol = log.weight * log.reps * log.sets
      byDate[d].volume += vol
      const oneRM = log.reps === 1 ? log.weight : log.weight * (1 + log.reps / 30)
      if (oneRM > byDate[d].bestOneRM) byDate[d].bestOneRM = oneRM
    }
  }

  const volumeData: VolumeChartPoint[] = Object.entries(byDate).map(([date, v]) => ({
    date,
    volume: Math.round(v.volume),
    oneRM: Math.round(v.bestOneRM),
  }))

  const totalWorkouts = (workoutData ?? []).length
  const totalVolume = volumeData.reduce((s, d) => s + d.volume, 0)
  const maxOneRM = volumeData.length > 0 ? Math.max(...volumeData.map((d) => d.oneRM)) : 0
  const latestWeight = weightHistory.at(-1)?.weight ?? null

  return (
    <div className="animate-fade-in space-y-6">
      <header className="border-b border-white/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
          Letzte 90 Tage
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-none tracking-tighter text-white">
          Progress.
        </h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Workouts" value={String(totalWorkouts)} unit="" />
        <StatCard label="Gesamtvolumen" value={`${(totalVolume / 1000).toFixed(1)}`} unit="t" />
        <StatCard label="Bestes 1RM" value={String(maxOneRM)} unit="kg" />
        <StatCard label="Körpergewicht" value={latestWeight ? String(latestWeight) : '—'} unit={latestWeight ? 'kg' : ''} />
      </div>

      <div className={`${CARD} p-6`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40 mb-1">
          Trainingsvolumen & 1RM
        </p>
        <p className="text-sm font-bold tracking-tight text-white mb-5">
          Volumen pro Tag & Epley-1RM-Schätzung
        </p>
        <VolumeChart data={volumeData} />
      </div>

      <div className={`${CARD} p-6`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40 mb-1">
          Körpergewicht
        </p>
        <p className="text-sm font-bold tracking-tight text-white mb-5">
          Verlauf in kg
        </p>
        <WeightChart data={weightHistory} />
      </div>
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5 flex flex-col justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5 mt-3">
        <span className="text-4xl font-bold leading-none tracking-tighter text-white tabular-nums">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-white/30">{unit}</span>}
      </div>
    </div>
  )
}
