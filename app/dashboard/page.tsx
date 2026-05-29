import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Dumbbell, LayoutTemplate, TrendingUp, ArrowUpRight, CheckSquare } from 'lucide-react'
import { getHabitSummaryToday } from '@/lib/actions/habits'
import type { CalorieEntry } from '@/lib/types'

// Editorial gym/fitness imagery — high-contrast, dark-friendly
const IMG = {
  calories:
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=80',
  training:
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1000&q=80',
  library:
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80',
  progress:
    'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=1400&q=80',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: todayCalories }, { data: recentWorkout }, habitSummary] = await Promise.all([
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
    getHabitSummaryToday(),
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
    <div className="animate-fade-in">
      {/* Editorial header */}
      <header className="mb-8 flex items-end justify-between border-b border-white/10 pb-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/40">
            Übersicht · Heute
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-none tracking-tighter text-white sm:text-5xl">
            {firstName}.
          </h1>
        </div>
        <span className="hidden text-[11px] font-medium uppercase tracking-[0.25em] text-white/30 sm:block">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
        </span>
      </header>

      {/* Bento grid */}
      <div className="grid auto-rows-[150px] grid-cols-2 gap-3 lg:grid-cols-4">

        {/* HERO — Kalorien */}
        <div className="group relative col-span-2 row-span-2 isolate overflow-hidden rounded-2xl border border-white/10 bg-black">
          <Image
            src={IMG.calories}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/40" />
          <div className="relative z-10 flex h-full flex-col justify-between p-7">
            <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/55">
              Kalorien · Heute
            </span>
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-7xl font-bold leading-none tracking-tighter text-white tabular-nums sm:text-8xl">
                  {todayTotals.kcal}
                </span>
                <span className="text-lg font-medium text-white/40">kcal</span>
              </div>
              <Link
                href="/dashboard/calories"
                className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:text-white/60"
              >
                Essen tracken <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Makro-Kacheln */}
        <MacroTile label="Protein" value={todayTotals.protein} unit="g" />
        <MacroTile label="Kohlenhydrate" value={todayTotals.carbs} unit="g" />
        <MacroTile label="Fett" value={todayTotals.fat} unit="g" />

        {/* Training (Bild) */}
        <NavTile
          href="/dashboard/workout"
          label="Training"
          desc={recentWorkout ? `Zuletzt: ${recentWorkout.split_name}` : 'Workout starten'}
          img={IMG.training}
          icon={Dumbbell}
        />

        {/* Habits */}
        <Link
          href="/dashboard/habits"
          className="group relative col-span-2 isolate overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 flex flex-col justify-between transition-colors hover:border-white/20"
        >
          <div className="flex items-center justify-between">
            <CheckSquare className="h-5 w-5 text-white/50" />
            <ArrowUpRight className="h-4 w-4 text-white/25 transition-colors group-hover:text-white/60" />
          </div>
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-5xl font-bold leading-none tracking-tighter text-white tabular-nums">
                {habitSummary.done}
              </span>
              <span className="text-lg font-medium text-white/30">/ {habitSummary.total}</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Habits heute
            </p>
          </div>
        </Link>

        {/* Bibliothek (breit, Bild) */}
        <NavTile
          href="/dashboard/templates"
          label="Bibliothek"
          desc="Vorlagen & Übungsdatenbank"
          img={IMG.library}
          icon={LayoutTemplate}
          className="col-span-2"
        />

        {/* Progress (breit, Bild) */}
        <NavTile
          href="/dashboard/progress"
          label="Progress"
          desc="Kraft & Gewicht im Verlauf"
          img={IMG.progress}
          icon={TrendingUp}
          className="col-span-2"
        />
      </div>
    </div>
  )
}

function MacroTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-950 p-5">
      <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/40">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-bold leading-none tracking-tighter text-white tabular-nums">
          {value}
        </span>
        <span className="text-sm font-medium text-white/30">{unit}</span>
      </div>
    </div>
  )
}

function NavTile({
  href,
  label,
  desc,
  img,
  icon: Icon,
  className = '',
}: {
  href: string
  label: string
  desc: string
  img: string
  icon: typeof Dumbbell
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate overflow-hidden rounded-2xl border border-white/10 bg-black transition-colors hover:border-white/30 ${className}`}
    >
      <Image
        src={img}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 25vw"
        className="object-cover opacity-70 transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <Icon className="h-5 w-5 text-white/70" />
          <ArrowUpRight className="h-4 w-4 text-white/40 transition-colors group-hover:text-white" />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight text-white">{label}</div>
          <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
            {desc}
          </div>
        </div>
      </div>
    </Link>
  )
}
