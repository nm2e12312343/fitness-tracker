import { createClient } from '@/lib/supabase/server'
import { getWeightHistory } from '@/lib/actions/calories'
import VolumeChart from '@/components/charts/VolumeChart'
import WeightChart from '@/components/charts/WeightChart'
import type { VolumeChartPoint } from '@/lib/types'

const GLASS = 'bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]'

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
      <div>
        <h1 className="text-2xl font-semibold text-white">Progress</h1>
        <p className="text-zinc-500 text-sm mt-1">Letzte 90 Tage</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Workouts" value={String(totalWorkouts)} unit="" />
        <StatCard label="Gesamtvolumen" value={`${(totalVolume / 1000).toFixed(1)}`} unit="t" />
        <StatCard label="Bestes 1RM" value={String(maxOneRM)} unit="kg" accent="text-[#00f2fe]" />
        <StatCard label="Aktuelles Gewicht" value={latestWeight ? String(latestWeight) : '—'} unit={latestWeight ? 'kg' : ''} />
      </div>

      <div className={`${GLASS} p-5`}>
        <div className="text-sm font-medium text-zinc-300 mb-1">Trainingsvolumen & 1RM-Schatzung</div>
        <p className="text-xs text-zinc-600 mb-4">Gesamtvolumen pro Tag (kg) und geschatztes 1RM nach Epley-Formel</p>
        <VolumeChart data={volumeData} />
      </div>

      <div className={`${GLASS} p-5`}>
        <div className="text-sm font-medium text-zinc-300 mb-1">Korpergewicht</div>
        <p className="text-xs text-zinc-600 mb-4">Korrelation mit Trainingsvolumen sichtbar machen</p>
        <WeightChart data={weightHistory} />
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: string }) {
  return (
    <div className={`${GLASS} p-4`}>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-semibold ${accent ?? 'text-white'}`}>{value}</span>
        {unit && <span className="text-xs text-zinc-600">{unit}</span>}
      </div>
      <div className="text-xs text-zinc-600 mt-0.5">{label}</div>
    </div>
  )
}
