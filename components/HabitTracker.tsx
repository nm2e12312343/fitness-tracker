'use client'

import { useState, useTransition } from 'react'
import { toggleHabitLog, createHabit, archiveHabit } from '@/lib/actions/habits'
import { Check, Flame, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import Reveal from '@/components/Reveal'
import type { HabitWithLogs } from '@/lib/types'

const COLORS = [
  '#ff4d00', '#ffb347', '#f4d35e', '#7fb069',
  '#4fb3bf', '#74c0fc', '#cc5de8', '#e63946',
]

const EMOJIS = ['💪', '📚', '💧', '🧘', '🏃', '🥗', '😴', '✍️', '🎯', '🚶']

function fmtDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function calcStreakClient(dates: Set<string>, today: string): number {
  let streak = 0
  const cur = fmtDate(today)
  if (!dates.has(today)) cur.setDate(cur.getDate() - 1)
  while (true) {
    const s = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    if (!dates.has(s)) break
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

interface Props {
  habits: HabitWithLogs[]
  today: string
}

export default function HabitTracker({ habits: init, today }: Props) {
  const [habits, setHabits] = useState(init)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [newEmoji, setNewEmoji] = useState(EMOJIS[0])
  const [, startTransition] = useTransition()

  const toggle = (habitId: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h
        const nowDone = !h.completedToday
        const dates = nowDone
          ? [...h.completedDates, today]
          : h.completedDates.filter((d) => d !== today)
        return {
          ...h,
          completedToday: nowDone,
          completedDates: dates,
          streak: calcStreakClient(new Set(dates), today),
        }
      })
    )
    startTransition(() => toggleHabitLog(habitId, today))
  }

  const add = () => {
    if (!newName.trim()) return
    startTransition(async () => {
      await createHabit(newName.trim(), newColor, newEmoji)
      setNewName('')
      setShowAdd(false)
    })
  }

  const archive = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id))
    startTransition(() => archiveHabit(id))
  }

  const doneCount = habits.filter((h) => h.completedToday).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-end justify-between border-b border-chalk/10 pb-6">
        <div>
          <p className="text-[11px] font-semibold font-mono uppercase tracking-[0.3em] text-chalk/40">
            Gewohnheiten · Heute
          </p>
          <h1 className="mt-3 font-display text-5xl uppercase leading-[0.9] text-chalk">
            Habits<span className="text-blaze">.</span>
          </h1>
          {habits.length > 0 && (
            <p className="mt-2 text-sm text-chalk/40">
              <span className="text-chalk font-semibold">{doneCount}</span>
              <span className="text-chalk/30"> / {habits.length} heute erledigt</span>
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-none border border-chalk/10 bg-rubber px-4 py-2.5 text-[11px] font-semibold font-mono uppercase tracking-[0.15em] text-chalk/50 transition-all hover:border-chalk/25 hover:text-chalk"
        >
          <Plus className="h-3.5 w-3.5" />
          Neu
        </button>
      </header>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-none border border-chalk/10 bg-rubber p-6 space-y-5">
          <p className="text-[11px] font-semibold font-mono uppercase tracking-[0.25em] text-chalk/40">
            Neue Gewohnheit
          </p>

          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="z.B. Trinken, Lesen, Meditieren…"
            autoFocus
            className="w-full rounded-none border border-chalk/10 bg-black px-4 py-3 text-sm text-chalk placeholder-chalk/25 outline-none focus:border-chalk/30 transition-colors"
          />

          <div>
            <p className="mb-2.5 text-[10px] font-semibold font-mono uppercase tracking-[0.2em] text-chalk/30">
              Symbol
            </p>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setNewEmoji(e)}
                  className={`rounded-none border p-2 text-xl transition-colors ${
                    newEmoji === e
                      ? 'border-chalk/30 bg-chalk/10'
                      : 'border-chalk/10 bg-black hover:border-chalk/20'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[10px] font-semibold font-mono uppercase tracking-[0.2em] text-chalk/30">
              Farbe
            </p>
            <div className="flex gap-2.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    newColor === c ? 'border-chalk scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={add}
              disabled={!newName.trim()}
              className="flex-1 rounded-none bg-blaze py-2.5 text-sm font-bold text-black transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              Hinzufügen
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName('') }}
              className="rounded-none border border-chalk/10 px-5 py-2.5 text-sm text-chalk/50 hover:text-chalk transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {habits.length === 0 && !showAdd && (
        <div className="rounded-none border border-dashed border-chalk/10 p-16 text-center">
          <p className="text-4xl mb-4">🎯</p>
          <p className="text-sm font-semibold text-chalk/40">Noch keine Gewohnheiten</p>
          <p className="mt-1 text-xs text-chalk/25">
            Klicke auf &ldquo;Neu&rdquo; um zu starten
          </p>
        </div>
      )}

      {/* Habit list */}
      {habits.length > 0 && (
        <Reveal variant="stagger" className="space-y-2">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              today={today}
              expanded={expanded === habit.id}
              onToggle={() => toggle(habit.id)}
              onExpand={() => setExpanded(expanded === habit.id ? null : habit.id)}
              onArchive={() => archive(habit.id)}
            />
          ))}
        </Reveal>
      )}
    </div>
  )
}

function HabitCard({
  habit,
  today,
  expanded,
  onToggle,
  onExpand,
  onArchive,
}: {
  habit: HabitWithLogs
  today: string
  expanded: boolean
  onToggle: () => void
  onExpand: () => void
  onArchive: () => void
}) {
  return (
    <div className="rounded-none border border-chalk/10 bg-rubber overflow-hidden transition-colors hover:border-chalk/15">
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Color bar */}
        <div
          className="h-10 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: habit.color }}
        />

        {habit.emoji && (
          <span className="text-xl shrink-0 leading-none">{habit.emoji}</span>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-display text-lg uppercase leading-none text-chalk truncate">{habit.name}</p>
          {habit.streak > 0 ? (
            <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-chalk/40">
              <Flame className="h-3 w-3" style={{ color: habit.color }} />
              {habit.streak} Tag{habit.streak !== 1 ? 'e' : ''} am Stück
            </p>
          ) : (
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-chalk/25">Noch kein Streak</p>
          )}
        </div>

        {/* Today toggle */}
        <button
          onClick={onToggle}
          className={`h-9 w-9 shrink-0 rounded-full border-2 flex items-center justify-center transition-all active:scale-95 ${
            habit.completedToday
              ? 'border-transparent scale-105'
              : 'border-chalk/20 hover:border-chalk/50'
          }`}
          style={habit.completedToday ? { backgroundColor: habit.color } : {}}
          aria-label={habit.completedToday ? 'Abhaken rückgängig' : 'Erledigt'}
        >
          {habit.completedToday && (
            <Check className="h-4 w-4 text-black" strokeWidth={3} />
          )}
        </button>

        {/* Expand */}
        <button
          onClick={onExpand}
          className="text-chalk/25 hover:text-chalk/70 transition-colors"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-chalk/5 px-5 py-5 space-y-5">
          <MonthlyGrid habit={habit} today={today} />
          <button
            onClick={onArchive}
            className="flex items-center gap-1.5 text-[11px] font-semibold font-mono uppercase tracking-[0.15em] text-chalk/25 transition-colors hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Archivieren
          </button>
        </div>
      )}
    </div>
  )
}

function MonthlyGrid({
  habit,
  today,
}: {
  habit: HabitWithLogs
  today: string
}) {
  const completed = new Set(habit.completedDates)
  const [curY, curM] = today.split('-').map(Number)

  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(curY, curM - 1 - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const daysInMonth = new Date(y, m, 0).getDate()
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    const days = Array.from({ length: daysInMonth }, (__, day) => {
      const s = `${y}-${String(m).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`
      return { s, done: completed.has(s), future: s > today }
    })
    const doneCount = days.filter((d) => d.done).length
    return { label, days, doneCount, total: daysInMonth }
  }).reverse()

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-semibold font-mono uppercase tracking-[0.2em] text-chalk/30">
        Verlauf · 3 Monate
      </p>
      {months.map(({ label, days, doneCount, total }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-chalk/30">{label}</p>
            <p className="text-[10px] text-chalk/20">
              {doneCount}/{total}
            </p>
          </div>
          <div className="flex flex-wrap gap-[3px]">
            {days.map(({ s, done, future }) => (
              <div
                key={s}
                title={s}
                className={`h-[18px] w-[18px] rounded-[3px] transition-colors ${
                  future ? 'bg-chalk/5' : done ? '' : 'bg-chalk/10'
                }`}
                style={done ? { backgroundColor: habit.color, opacity: 0.85 } : {}}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
