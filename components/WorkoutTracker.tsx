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

const CARD = 'rounded-2xl border border-white/10 bg-zinc-950'
const INPUT = 'w-full bg-zinc-900 border border-white/10 focus:border-white/30 rounded-lg px-2 py-1.5 text-sm text-zinc-100 outline-none text-center tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50'
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
        <header className="border-b border-white/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
            Vorlage wählen — gilt immer für heute
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-none tracking-tighter text-white">
            Training.
          </h1>
        </header>

        {/* Resume banner */}
        {pendingDraft && (
          <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 text-[#ccff00] shrink-0" />
              <div>
                <p className="text-sm font-bold tracking-tight text-white">{pendingDraft.templateName} — unterbrochen</p>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/40 mt-0.5">
                  vor {formatElapsed(Date.now() - pendingDraft.startedAt)} · {pendingDraft.exerciseSessions.length} Übungen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleResumeDraft}
                className="text-[11px] font-bold uppercase tracking-[0.15em] bg-[#ccff00] text-black px-4 py-2 rounded-xl transition-all active:scale-[0.98]"
              >
                Fortsetzen
              </button>
              <button
                onClick={handleDiscardDraft}
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 hover:text-white transition-colors"
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}

        {/* Template grid */}
        <div className={`${CARD} p-6`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40 mb-5">
            Trainingsvorlage
          </p>
          {templates.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="p-3 rounded-2xl bg-zinc-900 border border-white/10">
                <Dumbbell className="w-6 h-6 text-white/30" />
              </div>
              <div className="text-center">
                <p className="text-sm text-white/40">Noch keine Vorlagen</p>
                <a
                  href="/dashboard/templates"
                  className="inline-block mt-3 text-[11px] font-bold uppercase tracking-[0.15em] bg-[#ccff00] text-black px-4 py-2 rounded-xl transition-all"
                >
                  Vorlage erstellen
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className="group flex items-center justify-between px-5 py-4 rounded-xl border border-white/10 bg-zinc-900 hover:border-white/30 text-left transition-all"
                >
                  <div>
                    <div className="text-sm font-bold tracking-tight text-white">{t.name}</div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/35 mt-1">
                      {t.template_exercises?.length ?? 0} Übungen
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center group-hover:border-[#ccff00]/40 group-hover:bg-[#ccff00]/10 transition-all">
                    <Timer className="w-4 h-4 text-white/40 group-hover:text-[#ccff00] transition-colors" />
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
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35 hover:text-white transition-colors"
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
                className="flex-1 min-w-0 bg-zinc-900 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none transition-colors"
              />
              <input
                type="text" value={newExCategory}
                onChange={(e) => setNewExCategory(e.target.value)}
                placeholder="Kategorie (z.B. Brust)"
                className="w-44 bg-zinc-900 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none transition-colors"
              />
              <button
                onClick={handleAddExercise}
                disabled={isAddingEx || !newExName.trim()}
                className="bg-[#ccff00] text-black text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
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
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-white/10 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#ccff00]">
            Aktive Session
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-none tracking-tighter text-white">
            {activeTemplate.name}.
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-zinc-950 border border-white/10 rounded-xl px-5 py-3">
          <Timer className="w-3.5 h-3.5 text-white/30" />
          <span className="text-2xl font-bold font-mono tracking-tighter text-white tabular-nums">{timerStr}</span>
        </div>
      </div>

      {/* Exercise cards */}
      {exerciseSessions.map((s, exIdx) => (
        <div key={s.exercise.id} className={`${CARD} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-bold tracking-tight text-white">{s.exercise.name}</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/35 ml-3">
                {s.exercise.category}
              </span>
            </div>
            {s.lastSets && s.lastSets.length > 0 && (
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/30">
                Zuletzt: {s.lastSets.length}× · {s.lastSets[0].weight} kg × {s.lastSets[0].reps} Wdh.
              </span>
            )}
          </div>

          <div>
            <div className="px-5 pt-3 pb-1 grid grid-cols-[1.75rem_1fr_1fr_2rem] sm:grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-1.5 sm:gap-2 items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Nr.</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25 text-center">kg</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25 text-center">Wdh.</span>
              <span />
            </div>
            <div className="divide-y divide-white/[0.04]">
              {s.sets.map((row, setIdx) => (
                <div
                  key={row.id}
                  className={`px-5 py-2 sm:py-2.5 grid grid-cols-[1.75rem_1fr_1fr_2rem] sm:grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-1.5 sm:gap-2 items-center transition-all ${row.completed ? 'opacity-30' : ''}`}
                >
                  <span className="text-xs font-bold text-white/40">{setIdx + 1}</span>
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
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center transition-all ${
                      row.completed
                        ? 'bg-[#ccff00] border-[#ccff00] text-black'
                        : 'bg-zinc-900 border-white/10 text-white/30 hover:border-white/40'
                    }`}
                  >
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-3 border-t border-white/5">
            <button
              onClick={() => addSet(exIdx)}
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Satz hinzufügen
            </button>
          </div>
        </div>
      ))}

      {/* Finish panel */}
      <div className={`${CARD} p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
            {totalDone} Satz{totalDone !== 1 ? 'e' : ''} erledigt
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/25">{localDate()}</span>
        </div>

        <button
          onClick={handleFinish}
          disabled={isSaving}
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-[#ccff00] text-black disabled:opacity-50 active:scale-[0.99]"
        >
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert...</>
            : <><StopCircle className="w-4 h-4" /> Workout beenden & speichern</>
          }
        </button>

        <div className="border-t border-white/5 pt-4 flex items-center gap-3">
          {cancelConfirm ? (
            <>
              <span className="text-xs text-white/35 flex-1">Training abbrechen ohne zu speichern?</span>
              <button
                onClick={clearSession}
                className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/25 bg-red-500/10 hover:bg-red-500/15 transition-all"
              >
                Ja, abbrechen
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="text-xs font-semibold text-white/30 hover:text-white transition-colors"
              >
                Zurück
              </button>
            </>
          ) : (
            <button
              onClick={() => setCancelConfirm(true)}
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Training abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
