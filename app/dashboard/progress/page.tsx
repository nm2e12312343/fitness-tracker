import { createClient } from '@/lib/supabase/server'
import { getWeightHistory } from '@/lib/actions/calories'
import VolumeChart from '@/components/charts/VolumeChart'
import WeightChart from '@/components/charts/WeightChart'
import Reveal from '@/components/Reveal'
import CountUp from '@/components/CountUp'
import type { VolumeChartPoint } from '@/lib/types'

const CARD = 'rounded-none border border-chalk/10 bg-rubber'

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
      <header className="border-b border-chalk/10 pb-6">
        <p className="text-[11px] font-semibold font-mono uppercase tracking-[0.3em] text-chalk/40">
          Letzte 90 Tage
        </p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-[0.9] text-chalk">
          Progress<span className="text-blaze">.</span>
        </h1>
      </header>

      <section data-rail="Bilanz">
        <Reveal variant="stagger" className="grid grid-cols-2 lg:grid-cols-4 gap-px border border-chalk/15 bg-chalk/15">
          <StatCard label="Workouts" value={totalWorkouts} unit="" />
          <StatCard label="Gesamtvolumen" value={totalVolume / 1000} decimals={1} unit="t" />
          <StatCard label="Bestes 1RM" value={maxOneRM} unit="kg" />
          <StatCard label="Körpergewicht" value={latestWeight} decimals={1} unit={latestWeight ? 'kg' : ''} />
        </Reveal>
      </section>

      <section data-rail="Volumen">
        <Reveal className={`${CARD} p-6`}>
          <p className="text-[11px] font-semibold font-mono uppercase tracking-[0.25em] text-chalk/40 mb-1">
            Trainingsvolumen & 1RM
          </p>
          <p className="text-sm font-bold tracking-tight text-chalk mb-5">
            Volumen pro Tag & Epley-1RM-Schätzung
          </p>
          <VolumeChart data={volumeData} />
        </Reveal>
      </section>

      <section data-rail="Gewicht">
        <Reveal className={`${CARD} p-6`}>
          <p className="text-[11px] font-semibold font-mono uppercase tracking-[0.25em] text-chalk/40 mb-1">
            Körpergewicht
          </p>
          <p className="text-sm font-bold tracking-tight text-chalk mb-5">
            Verlauf in kg
          </p>
          <WeightChart data={weightHistory} />
        </Reveal>
      </section>
    </div>
  )
}

function StatCard({ label, value, unit, decimals = 0 }: { label: string; value: number | null; unit: string; decimals?: number }) {
  return (
    <div className="bg-rubber p-5 flex flex-col justify-between">
      <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.25em] text-chalk/40">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5 mt-3">
        {value === null ? (
          <span className="font-display text-4xl leading-none text-chalk/30">—</span>
        ) : (
          <CountUp value={value} decimals={decimals} className="font-display text-4xl leading-none text-chalk tabular-nums" />
        )}
        {unit && <span className="font-mono text-sm text-chalk/30">{unit}</span>}
      </div>
    </div>
  )
}
