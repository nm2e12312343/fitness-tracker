import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Flame, Dumbbell, LayoutTemplate, TrendingUp, ChevronRight } from 'lucide-react'
import type { CalorieEntry } from '@/lib/types'
import type { LucideIcon } from 'lucide-react'

const GLASS = 'bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: todayCalories }, { data: recentWorkout }] = await Promise.all([
    supabase
      .from('calories')
      .select('*')
      .eq('user_id', user!.id)
      .eq('date', today),
    supabase
      .from('workouts')
      .select('id, split_name')
      .eq('user_id', user!.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const todayTotals = (todayCalories as CalorieEntry[] | null)?.reduce(
    (acc, entry) => ({
      kcal: acc.kcal + entry.total_kcal,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  ) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Athlet'

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Guten Tag, {firstName}</h1>
        <p className="text-zinc-500 mt-1 text-sm">Deine heutige Ubersicht</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Kalorien heute" value={`${todayTotals.kcal}`} unit="kcal" accent="text-[#00f2fe]" />
        <StatCard label="Protein" value={`${todayTotals.protein}`} unit="g" accent="text-blue-400" />
        <StatCard label="Kohlenhydrate" value={`${todayTotals.carbs}`} unit="g" accent="text-zinc-300" />
        <StatCard label="Fett" value={`${todayTotals.fat}`} unit="g" accent="text-zinc-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          {
            href: '/dashboard/calories',
            title: 'Kalorien',
            desc: 'KI-gestutztes Essen tracken',
            icon: Flame,
          },
          {
            href: '/dashboard/workout',
            title: 'Training',
            desc: recentWorkout ? `Zuletzt: ${recentWorkout.split_name}` : 'Workout starten',
            icon: Dumbbell,
          },
          {
            href: '/dashboard/templates',
            title: 'Vorlagen',
            desc: 'Trainingsplane verwalten',
            icon: LayoutTemplate,
          },
          {
            href: '/dashboard/progress',
            title: 'Progress',
            desc: 'Kraft & Gewicht im Verlauf',
            icon: TrendingUp,
          },
        ] as { href: string; title: string; desc: string; icon: LucideIcon }[]).map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`group ${GLASS} p-5 hover:border-white/10 transition-all`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                <Icon className="w-4 h-4 text-zinc-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
            </div>
            <div className="text-sm font-medium text-white mb-1">{title}</div>
            <div className="text-xs text-zinc-500">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string
  value: string
  unit: string
  accent: string
}) {
  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-semibold ${accent}`}>{value}</span>
        <span className="text-sm text-zinc-600">{unit}</span>
      </div>
      <div className="text-xs text-zinc-600 mt-1">{label}</div>
    </div>
  )
}
