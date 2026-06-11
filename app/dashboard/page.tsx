import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getHabitSummaryToday } from '@/lib/actions/habits'
import Reveal from '@/components/Reveal'
import CountUp from '@/components/CountUp'
import type { CalorieEntry } from '@/lib/types'

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
  const dateStr = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  // Macro share of today's energy (4/4/9 kcal per gram)
  const macroKcal = {
    protein: todayTotals.protein * 4,
    carbs: todayTotals.carbs * 4,
    fat: todayTotals.fat * 9,
  }
  const macroSum = macroKcal.protein + macroKcal.carbs + macroKcal.fat
  const share = (k: number) => (macroSum > 0 ? Math.round((k / macroSum) * 100) : 0)

  const macros = [
    { label: 'Protein', grams: todayTotals.protein, pct: share(macroKcal.protein), bar: 'bg-blaze' },
    { label: 'Carbs', grams: todayTotals.carbs, pct: share(macroKcal.carbs), bar: 'bg-chalk/70' },
    { label: 'Fett', grams: todayTotals.fat, pct: share(macroKcal.fat), bar: 'bg-chalk/35' },
  ]

  const stations = [
    { n: '01', href: '/dashboard/calories', label: 'Kalorien', desc: 'KI-Nahrungstracking' },
    { n: '02', href: '/dashboard/workout', label: 'Training', desc: recentWorkout ? `Zuletzt: ${recentWorkout.split_name}` : 'Workout starten' },
    { n: '03', href: '/dashboard/history', label: 'Logbuch', desc: 'Vergangene Einheiten' },
    { n: '04', href: '/dashboard/habits', label: 'Habits', desc: `${habitSummary.done}/${habitSummary.total} heute erledigt` },
    { n: '05', href: '/dashboard/templates', label: 'Bibliothek', desc: 'Vorlagen & Übungsdatenbank' },
    { n: '06', href: '/dashboard/progress', label: 'Progress', desc: 'Kraft & Gewicht im Verlauf' },
  ]

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section data-rail="Heute" className="flex min-h-[62vh] flex-col justify-end pb-14">
        <Reveal variant="wipe">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-chalk/40">
            {dateStr} — Übersicht
          </p>
          <h1 className="mt-4 font-display text-[clamp(56px,11vw,130px)] uppercase leading-[0.85] text-chalk">
            <span className="text-outline">Dranbleiben,</span>
            <br />
            {firstName}
            <span className="text-blaze">.</span>
          </h1>
        </Reveal>
        <Reveal delay={300}>
          <div className="mt-12 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/40">
            <span className="scroll-cue block h-10 w-px bg-blaze" />
            Scrollen
          </div>
        </Reveal>
      </section>

      {/* ── Stadium ticker: live data crawl, full-bleed ──────────────── */}
      <Ticker
        items={[
          `Kcal heute ${todayTotals.kcal}`,
          `Protein ${todayTotals.protein}g`,
          `Carbs ${todayTotals.carbs}g`,
          `Fett ${todayTotals.fat}g`,
          `Habits ${habitSummary.done}/${habitSummary.total}`,
          recentWorkout ? `Zuletzt ${recentWorkout.split_name}` : 'Noch kein Training',
          dateStr,
        ]}
      />

      {/* ── 01 / Bilanz ──────────────────────────────────────────────── */}
      <section data-rail="Bilanz" className="relative overflow-hidden border-t border-chalk/15 py-20">
        <span aria-hidden className="ghost-num">01</span>
        <SectionHead n="01" title="Bilanz heute" />
        <Reveal>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <CountUp
              value={todayTotals.kcal}
              className="font-display text-[clamp(88px,16vw,180px)] leading-none text-chalk tabular-nums"
            />
            <span className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-blaze">
              kcal
            </span>
          </div>
        </Reveal>
        <Reveal variant="stagger" className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {macros.map(({ label, grams, pct, bar }) => (
            <div key={label}>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/45">
                  {label}
                </span>
                <span className="font-mono text-[10px] text-chalk/30 tabular-nums">{pct}%</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-4xl leading-none text-chalk tabular-nums">{grams}</span>
                <span className="font-mono text-xs text-chalk/35">g</span>
              </div>
              <div className="mt-3 h-[3px] w-full bg-chalk/10">
                <div className={`bar-fill h-full ${bar}`} style={{ '--w': `${pct}%` } as React.CSSProperties} />
              </div>
            </div>
          ))}
        </Reveal>
        <Reveal delay={150}>
          <Link
            href="/dashboard/calories"
            className="mt-12 inline-flex items-center gap-2 border border-chalk/20 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-chalk transition-colors hover:border-blaze hover:bg-blaze hover:text-black"
          >
            Essen tracken <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Reveal>
      </section>

      {/* ── 02 / Training ────────────────────────────────────────────── */}
      <section data-rail="Training" className="relative overflow-hidden border-t border-chalk/15 py-20">
        <span aria-hidden className="ghost-num">02</span>
        <SectionHead n="02" title="Training & Habits" />
        <Reveal variant="stagger" className="grid gap-px bg-chalk/15 sm:grid-cols-2 border border-chalk/15">
          <div className="flex min-h-[220px] flex-col justify-between bg-rubber p-7">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/45">
              {recentWorkout ? 'Letzte Einheit' : 'Noch kein Training'}
            </span>
            <div>
              <p className="font-display text-4xl uppercase leading-none text-chalk">
                {recentWorkout ? recentWorkout.split_name : 'Leg los'}
                <span className="text-blaze">.</span>
              </p>
              <Link
                href="/dashboard/workout"
                className="mt-6 inline-flex items-center gap-2 bg-blaze px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-transform active:scale-[0.98]"
              >
                Workout starten <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <Link
            href="/dashboard/habits"
            className="group flex min-h-[220px] flex-col justify-between bg-rubber p-7 transition-colors hover:bg-press"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-chalk/45">
                Habits heute
              </span>
              <ArrowUpRight className="h-4 w-4 text-chalk/25 transition-colors group-hover:text-blaze" />
            </div>
            <div className="flex items-baseline gap-2">
              <CountUp
                value={habitSummary.done}
                duration={900}
                className="font-display text-7xl leading-none text-chalk tabular-nums"
              />
              <span className="font-mono text-xl text-chalk/30">/ {habitSummary.total}</span>
            </div>
          </Link>
        </Reveal>
      </section>

      {/* ── 03 / Stationen ───────────────────────────────────────────── */}
      <section data-rail="Stationen" className="relative overflow-hidden border-t border-chalk/15 py-20">
        <span aria-hidden className="ghost-num">03</span>
        <SectionHead n="03" title="Stationen" />
        <Reveal variant="stagger">
          {stations.map(({ n, href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex items-center justify-between gap-4 border-b border-chalk/15 px-2 py-5 transition-all duration-300 first:border-t hover:bg-blaze hover:pl-6"
            >
              <div className="flex min-w-0 items-baseline gap-5">
                <span className="font-mono text-xs text-blaze transition-colors group-hover:text-black">
                  {n}
                </span>
                <span className="truncate font-display text-3xl uppercase leading-none text-chalk transition-colors group-hover:text-black sm:text-4xl">
                  {label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/35 transition-colors group-hover:text-black/70 sm:block">
                  {desc}
                </span>
                <ArrowUpRight className="h-5 w-5 text-chalk/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-black" />
              </div>
            </Link>
          ))}
        </Reveal>
        <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/20">
          Fittrack — {new Date().getFullYear()}
        </p>
      </section>
    </div>
  )
}

function Ticker({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <span aria-hidden={hidden || undefined} className="inline-flex items-center">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center">
          <span className="px-6 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-chalk/60">
            {item}
          </span>
          <span className="text-blaze">●</span>
        </span>
      ))}
    </span>
  )
  return (
    <div className="ticker relative left-1/2 w-screen -translate-x-1/2 border-y border-chalk/15 py-3">
      <div className="ticker-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <Reveal className="mb-12 flex items-center gap-4">
      <span className="font-mono text-xs font-bold text-blaze">{n}</span>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-chalk/50">{title}</h2>
      <span className="h-px flex-1 bg-chalk/15" />
    </Reveal>
  )
}
