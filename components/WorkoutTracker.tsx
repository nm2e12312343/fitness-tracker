'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { saveWorkoutSession, getLastWorkoutSets, createCustomExercise } from '@/lib/actions/workout'
import { Plus, Check, StopCircle, Loader2, Timer, X, Dumbbell, RotateCcw } from 'lucide-react'
import type { Exercise, WorkoutTemplate } from '@/lib/types'

interface SetRow { id: string; weight: string; reps: string; completed: boolean }
interface ExerciseSession { exercise: Exercise; sets: SetRow[]; lastSets: { weight: number; reps: number }[] | null }

interface WorkoutDraft {
  templateId: string
  templateName: string
  exerciseSessions: ExerciseSession[]
  startedAt: number
}

interface Props {
  exercises: Exercise[]
  templates: WorkoutTemplate[]
}

const CARD = 'rounded-none border border-chalk/10 bg-rubber'
const INPUT = 'w-full bg-asphalt border border-chalk/10 focus:border-chalk/30 rounded-none px-2 py-1.5 text-sm text-chalk outline-none text-center tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const DRAFT_KEY = 'fittrack_workout_draft'
const DRAFT_TTL = 12 * 60 * 60 * 1000

function localDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function makeSet(): SetRow {
  return { id: crypto.randomUUID(), weight: '', reps: '', completed: false }
}

function formatElapsed(ms: number): string {
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m} Min.`
  return `${Math.floor(m / 60)} Std. ${m % 60} Min.`
}

export default function WorkoutTracker({ exercises: allExercises, templates }: Props) {
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(null)
  const [exerciseSessions, setExerciseSessions] = useState<ExerciseSession[]>([])
  const [seconds, setSeconds] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [isSaving, startSaveTransition] = useTransition()
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<WorkoutDraft | null>(null)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [newExCategory, setNewExCategory] = useState('')
  const [isAddingEx, startAddExTransition] = useTransition()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (!saved) return
      const draft: WorkoutDraft = JSON.parse(saved)
      if (!draft.templateId || !draft.exerciseSessions?.length) { localStorage.removeItem(DRAFT_KEY); return }
      if (Date.now() - draft.startedAt > DRAFT_TTL) { localStorage.removeItem(DRAFT_KEY); return }
      setPendingDraft(draft)
    } catch {
      localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    if (!activeTemplate || exerciseSessions.length === 0 || sessionStartedAt === null) return
    try {
      const draft: WorkoutDraft = {
        templateId: activeTemplate.id,
        templateName: activeTemplate.name,
        exerciseSessions,
        startedAt: sessionStartedAt,
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {}
  }, [activeTemplate, exerciseSessions, sessionStartedAt])

  useEffect(() => {
    if (!timerActive) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [timerActive])

  const timerStr = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  const clearSession = () => {
    setActiveTemplate(null)
    setExerciseSessions([])
    setSeconds(0)
    setTimerActive(false)
    setSessionStartedAt(null)
    setCancelConfirm(false)
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  const handleSelectTemplate = (t: WorkoutTemplate) => {
    const exList = (t.template_exercises ?? [])
      .sort((a, b) => (a.order_index ?? a.sort_order ?? 0) - (b.order_index ?? b.sort_order ?? 0))
      .map((te) => te.exercises!)
      .filter(Boolean)
    const now = Date.now()
    setActiveTemplate(t)
    setSessionStartedAt(now)
    setExerciseSessions(exList.map((ex) => ({ exercise: ex, sets: Array.from({ length: 3 }, makeSet), lastSets: null })))
    setSeconds(0)
    setTimerActive(true)
    setPendingDraft(null)
    exList.forEach((ex, i) => {
      getLastWorkoutSets(ex.id).then((lastSets) => {
        if (!lastSets.length) return
        setExerciseSessions((prev) =>
          prev.map((s, idx) => idx === i ? { ...s, lastSets } : s)
        )
      })
    })
  }

  const handleResumeDraft = () => {
    if (!pendingDraft) return
    const template = templates.find((t) => t.id === pendingDraft.templateId)
    setActiveTemplate(template ?? {
      id: pendingDraft.templateId,
      name: pendingDraft.templateName,
      user_id: '',
      template_exercises: [],
    })
    setExerciseSessions(pendingDraft.exerciseSessions)
    setSessionStartedAt(pendingDraft.startedAt)
    const elapsed = Math.floor((Date.now() - pendingDraft.startedAt) / 1000)
    setSeconds(elapsed)
    setTimerActive(true)
    setPendingDraft(null)
  }

  const handleDiscardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    setPendingDraft(null)
  }

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) =>
    setExerciseSessions((prev) =>
      prev.map((s, i) => i !== exIdx ? s : {
        ...s, sets: s.sets.map((row, j) => j !== setIdx ? row : { ...row, [field]: value }),
      })
    )

  const toggleDone = (exIdx: number, setIdx: number) =>
    setExerciseSessions((prev) =>
      prev.map((s, i) => i !== exIdx ? s : {
        ...s, sets: s.sets.map((row, j) => j !== setIdx ? row : { ...row, completed: !row.completed }),
      })
    )

  const addSet = (exIdx: number) =>
    setExerciseSessions((prev) =>
      prev.map((s, i) => i !== exIdx ? s : { ...s, sets: [...s.sets, makeSet()] })
    )

  const handleFinish = () => {
    const entries = exerciseSessions
      .map((s) => ({
        exerciseId: s.exercise.id,
        sets: s.sets
          .filter((r) => r.completed)
          .map((r) => ({ weight: parseFloat(r.weight) || 0, reps: parseInt(r.reps) || 0 }))
          .filter((set) => set.weight > 0 && set.reps > 0),
      }))
      .filter((e) => e.sets.length > 0)

    if (entries.length === 0) {
      toast.error('Mindestens einen Satz als erledigt markieren (mit Gewicht und Wiederholungen).')
      return
    }
    startSaveTransition(async () => {
      try {
        await saveWorkoutSession({ splitName: activeTemplate!.name, entries })
        toast.success('Workout gespeichert!')
        clearSession()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern')
      }
    })
  }

  const handleAddExercise = () => {
    if (!newExName.trim()) return
    startAddExTransition(async () => {
      try {
        await createCustomExercise(newExName, newExCategory)
        setNewExName('')
        setNewExCategory('')
        setShowAddExercise(false)
        toast.success('Übung angelegt')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  // ── PRE-SESSION ──────────────────────────────────────────────────────
  if (!activeTemplate) {
    return (
      <div className="animate-fade-in space-y-6">
        <header className="border-b border-chalk/10 pb-6">
          <p className="text-[11px] font-semibold font-mono uppercase tracking-[0.3em] text-chalk/40">
            Vorlage wählen — gilt immer für heute
          </p>
          <h1 className="mt-3 font-display text-5xl uppercase leading-[0.9] text-chalk">
            Training<span className="text-blaze">.</span>
          </h1>
        </header>

        {/* Resume banner */}
        {pendingDraft && (
          <div className="rounded-none border border-blaze/20 bg-blaze/5 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 text-blaze shrink-0" />
              <div>
                <p className="text-sm font-bold tracking-tight text-chalk">{pendingDraft.templateName} — unterbrochen</p>
                <p className="text-[11px] font-medium font-mono uppercase tracking-[0.15em] text-chalk/40 mt-0.5">
                  vor {formatElapsed(Date.now() - pendingDraft.startedAt)} · {pendingDraft.exerciseSessions.length} Übungen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleResumeDraft}
                className="text-[11px] font-bold font-mono uppercase tracking-[0.15em] bg-blaze text-black px-4 py-2 rounded-none transition-all active:scale-[0.98]"
              >
                Fortsetzen
              </button>
              <button
                onClick={handleDiscardDraft}
                className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-chalk/35 hover:text-chalk transition-colors"
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}

        {/* Template grid */}
        <div className={`${CARD} p-6`}>
          <p className="text-[10px] font-semibold font-mono uppercase tracking-[0.25em] text-chalk/40 mb-5">
            Trainingsvorlage
          </p>
          {templates.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="p-3 rounded-none bg-asphalt border border-chalk/10">
                <Dumbbell className="w-6 h-6 text-chalk/30" />
              </div>
              <div className="text-center">
                <p className="text-sm text-chalk/40">Noch keine Vorlagen</p>
                <a
                  href="/dashboard/templates"
                  className="inline-block mt-3 text-[11px] font-bold font-mono uppercase tracking-[0.15em] bg-blaze text-black px-4 py-2 rounded-none transition-all"
                >
                  Vorlage erstellen
                </a>
              </div>
            </div>
          ) : (
            <div>
              {templates.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className="group flex w-full items-center justify-between gap-4 border-b border-chalk/10 px-2 py-4 text-left transition-all duration-300 first:border-t hover:bg-blaze hover:pl-5"
                >
                  <div className="flex min-w-0 items-baseline gap-4">
                    <span className="font-mono text-xs text-blaze transition-colors group-hover:text-black">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate font-display text-2xl uppercase leading-none text-chalk transition-colors group-hover:text-black sm:text-3xl">
                      {t.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/35 transition-colors group-hover:text-black/70">
                      {t.template_exercises?.length ?? 0} Übungen
                    </span>
                    <Timer className="h-4 w-4 text-chalk/30 transition-colors group-hover:text-black" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Eigene Übung anlegen */}
        <div className={`${CARD} p-6`}>
          <button
            onClick={() => setShowAddExercise(!showAddExercise)}
            className="flex items-center gap-1.5 text-[11px] font-semibold font-mono uppercase tracking-[0.15em] text-chalk/35 hover:text-chalk transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddExercise ? 'Abbrechen' : 'Eigene Übung anlegen'}
          </button>
          {showAddExercise && (
            <div className="mt-4 flex gap-3 flex-wrap">
              <input
                type="text" value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                placeholder="Name der Übung"
                className="flex-1 min-w-0 bg-asphalt border border-chalk/10 focus:border-chalk/30 rounded-none px-3 py-2 text-sm text-chalk outline-none transition-colors"
              />
              <input
                type="text" value={newExCategory}
                onChange={(e) => setNewExCategory(e.target.value)}
                placeholder="Kategorie (z.B. Brust)"
                className="w-44 bg-asphalt border border-chalk/10 focus:border-chalk/30 rounded-none px-3 py-2 text-sm text-chalk outline-none transition-colors"
              />
              <button
                onClick={handleAddExercise}
                disabled={isAddingEx || !newExName.trim()}
                className="bg-blaze text-black text-sm font-bold px-4 py-2 rounded-none disabled:opacity-40 transition-colors"
              >
                Anlegen
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── ACTIVE SESSION ───────────────────────────────────────────────────
  const totalDone = exerciseSessions.reduce((n, s) => n + s.sets.filter((r) => r.completed).length, 0)

  return (
    <div className="animate-fade-in space-y-6">
      {/* Session Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-chalk/10 pb-6">
        <div>
          <p className="text-[11px] font-semibold font-mono uppercase tracking-[0.25em] text-blaze">
            Aktive Session
          </p>
          <h1 className="mt-3 font-display text-5xl uppercase leading-[0.9] text-chalk">
            {activeTemplate.name}<span className="text-blaze">.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 border border-blaze/30 bg-rubber px-5 py-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blaze opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blaze" />
          </span>
          <span className="font-display text-3xl leading-none text-chalk tabular-nums">{timerStr}</span>
        </div>
      </div>

      {/* Exercise cards */}
      {exerciseSessions.map((s, exIdx) => (
        <div key={s.exercise.id} className={`${CARD} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-chalk/5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="font-mono text-xs text-blaze shrink-0">{String(exIdx + 1).padStart(2, '0')}</span>
              <span className="font-display text-xl uppercase leading-none text-chalk truncate">{s.exercise.name}</span>
              <span className="text-[11px] font-medium font-mono uppercase tracking-[0.15em] text-chalk/35 shrink-0">
                {s.exercise.category}
              </span>
            </div>
            {s.lastSets && s.lastSets.length > 0 && (
              <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em] text-chalk/30">
                Zuletzt: {s.lastSets.length}× · {s.lastSets[0].weight} kg × {s.lastSets[0].reps} Wdh.
              </span>
            )}
          </div>

          <div>
            <div className="px-5 pt-3 pb-1 grid grid-cols-[1.75rem_1fr_1fr_2rem] sm:grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-1.5 sm:gap-2 items-center">
              <span className="text-[10px] font-semibold font-mono uppercase tracking-widest text-chalk/25">Nr.</span>
              <span className="text-[10px] font-semibold font-mono uppercase tracking-widest text-chalk/25 text-center">kg</span>
              <span className="text-[10px] font-semibold font-mono uppercase tracking-widest text-chalk/25 text-center">Wdh.</span>
              <span />
            </div>
            <div className="divide-y divide-chalk/[0.04]">
              {s.sets.map((row, setIdx) => (
                <div
                  key={row.id}
                  className={`px-5 py-2 sm:py-2.5 grid grid-cols-[1.75rem_1fr_1fr_2rem] sm:grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-1.5 sm:gap-2 items-center transition-all ${row.completed ? 'opacity-30' : ''}`}
                >
                  <span className="text-xs font-bold text-chalk/40">{setIdx + 1}</span>
                  <input
                    type="number" disabled={row.completed}
                    value={row.weight}
                    onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                    placeholder={s.lastSets?.[setIdx] ? `${s.lastSets[setIdx].weight}` : 'kg'}
                    step="0.5" min="0"
                    className={INPUT}
                  />
                  <input
                    type="number" disabled={row.completed}
                    value={row.reps}
                    onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                    placeholder={s.lastSets?.[setIdx] ? `${s.lastSets[setIdx].reps}` : 'Wdh'}
                    step="1" min="0"
                    className={INPUT}
                  />
                  <button
                    onClick={() => toggleDone(exIdx, setIdx)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-none border flex items-center justify-center transition-all ${
                      row.completed
                        ? 'bg-blaze border-blaze text-black'
                        : 'bg-asphalt border-chalk/10 text-chalk/30 hover:border-chalk/40'
                    }`}
                  >
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-3 border-t border-chalk/5">
            <button
              onClick={() => addSet(exIdx)}
              className="flex items-center gap-1.5 text-[11px] font-semibold font-mono uppercase tracking-[0.15em] text-chalk/30 hover:text-chalk transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Satz hinzufügen
            </button>
          </div>
        </div>
      ))}

      {/* Finish panel */}
      <div className={`${CARD} p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.15em] text-chalk/40">
            {totalDone} Satz{totalDone !== 1 ? 'e' : ''} erledigt
          </span>
          <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.15em] text-chalk/25">{localDate()}</span>
        </div>

        <button
          onClick={handleFinish}
          disabled={isSaving}
          className="w-full py-4 rounded-none font-mono text-[12px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all bg-blaze text-black disabled:opacity-50 active:scale-[0.99]"
        >
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert...</>
            : <><StopCircle className="w-4 h-4" /> Workout beenden & speichern</>
          }
        </button>

        <div className="border-t border-chalk/5 pt-4 flex items-center gap-3">
          {cancelConfirm ? (
            <>
              <span className="text-xs text-chalk/35 flex-1">Training abbrechen ohne zu speichern?</span>
              <button
                onClick={clearSession}
                className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-none border border-red-500/25 bg-red-500/10 hover:bg-red-500/15 transition-all"
              >
                Ja, abbrechen
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="text-xs font-semibold text-chalk/30 hover:text-chalk transition-colors"
              >
                Zurück
              </button>
            </>
          ) : (
            <button
              onClick={() => setCancelConfirm(true)}
              className="flex items-center gap-1.5 text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-chalk/30 hover:text-chalk/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Training abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
