'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { saveWorkoutSession, getLastWorkoutLog, createCustomExercise } from '@/lib/actions/workout'
import { Plus, Check, StopCircle, Loader2, Timer, X, Dumbbell, RotateCcw } from 'lucide-react'
import type { Exercise, WorkoutTemplate } from '@/lib/types'

interface SetRow { id: string; weight: string; reps: string; completed: boolean }
interface ExerciseSession { exercise: Exercise; sets: SetRow[]; lastLog: { weight: number; reps: number; sets: number } | null }

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

const GLASS = 'bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
const DRAFT_KEY = 'fittrack_workout_draft'
const DRAFT_TTL = 12 * 60 * 60 * 1000 // 12h — stale drafts are auto-discarded

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

  // Load draft on mount
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

  // Autosave active session to localStorage on every set change
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

  // Timer
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
    setExerciseSessions(exList.map((ex) => ({ exercise: ex, sets: Array.from({ length: 3 }, makeSet), lastLog: null })))
    setSeconds(0)
    setTimerActive(true)
    setPendingDraft(null)

    exList.forEach((ex, i) => {
      getLastWorkoutLog(ex.id).then((log) => {
        if (!log) return
        setExerciseSessions((prev) =>
          prev.map((s, idx) => idx === i ? { ...s, lastLog: { weight: log.weight, reps: log.reps, sets: log.sets } } : s)
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
    const entries = exerciseSessions.flatMap((s) => {
      const done = s.sets.filter((r) => r.completed)
      if (done.length === 0) return []
      const last = done[done.length - 1]
      const w = parseFloat(last.weight) || s.lastLog?.weight || 0
      const r = parseInt(last.reps) || s.lastLog?.reps || 0
      if (w <= 0 || r <= 0) return []
      return [{ exerciseId: s.exercise.id, weight: w, reps: r, sets: done.length }]
    })

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
        <div>
          <h1 className="text-2xl font-semibold text-white">Training</h1>
          <p className="text-zinc-500 text-sm mt-1">Vorlage wählen — das Training gilt immer für heute</p>
        </div>

        {/* Resume banner */}
        {pendingDraft && (
          <div className="bg-[#00f2fe]/5 border border-[#00f2fe]/20 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 text-[#00f2fe] shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{pendingDraft.templateName} — unterbrochen</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  vor {formatElapsed(Date.now() - pendingDraft.startedAt)} · {pendingDraft.exerciseSessions.length} Übungen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleResumeDraft}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#00f2fe]/30 bg-[#00f2fe]/10 text-[#00f2fe] hover:bg-[#00f2fe]/15 transition-all"
              >
                Fortsetzen
              </button>
              <button
                onClick={handleDiscardDraft}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}

        <div className={`${GLASS} p-5`}>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Trainingsvorlage</p>
          {templates.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="p-3 rounded-full bg-white/3 border border-white/8">
                <Dumbbell className="w-6 h-6 text-zinc-600" />
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-500">Noch keine Vorlagen</p>
                <a
                  href="/dashboard/templates"
                  className="inline-block mt-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#00f2fe]/20 text-[#00f2fe]/70 hover:text-[#00f2fe] hover:border-[#00f2fe]/40 transition-all"
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
                  className="group flex items-center justify-between px-4 py-3.5 rounded-xl border border-white/8 bg-white/3 hover:border-[#00f2fe]/30 hover:bg-[#00f2fe]/5 text-left transition-all"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{t.name}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">{t.template_exercises?.length ?? 0} Übungen</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center group-hover:border-[#00f2fe]/30 group-hover:bg-[#00f2fe]/10 transition-all">
                    <Timer className="w-4 h-4 text-zinc-500 group-hover:text-[#00f2fe] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Eigene Übung anlegen */}
        <div className={`${GLASS} p-5`}>
          <button
            onClick={() => setShowAddExercise(!showAddExercise)}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddExercise ? 'Abbrechen' : 'Eigene Übung anlegen'}
          </button>
          {showAddExercise && (
            <div className="mt-4 flex gap-3 flex-wrap">
              <input type="text" value={newExName} onChange={(e) => setNewExName(e.target.value)}
                placeholder="Name der Übung"
                className="flex-1 min-w-0 bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none" />
              <input type="text" value={newExCategory} onChange={(e) => setNewExCategory(e.target.value)}
                placeholder="Kategorie (z.B. Brust)"
                className="w-44 bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none" />
              <button onClick={handleAddExercise} disabled={isAddingEx || !newExName.trim()}
                className="bg-white/8 hover:bg-white/12 disabled:opacity-40 text-zinc-200 text-sm px-4 py-2 rounded-lg transition-colors border border-white/5">
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs font-medium text-[#00f2fe] uppercase tracking-wider block mb-1">Aktive Session</span>
          <h1 className="text-2xl font-semibold text-white">{activeTemplate.name}</h1>
        </div>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl px-4 py-2.5">
          <Timer className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-xl font-mono font-semibold text-[#00f2fe] tabular-nums">{timerStr}</span>
        </div>
      </div>

      {/* Exercise cards */}
      {exerciseSessions.map((s, exIdx) => (
        <div key={s.exercise.id} className={`${GLASS} overflow-hidden`}>
          <div className="px-4 sm:px-5 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-medium text-white">{s.exercise.name}</span>
              <span className="text-xs text-zinc-600 ml-2">{s.exercise.category}</span>
            </div>
            {s.lastLog && (
              <span className="text-xs text-zinc-600">
                Zuletzt: {s.lastLog.weight} kg &times; {s.lastLog.reps} Wdh. ({s.lastLog.sets} Sätze)
              </span>
            )}
          </div>

          <div>
            <div className="px-4 sm:px-5 pt-3 pb-1 grid grid-cols-[1.75rem_1fr_1fr_2rem] sm:grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-1.5 sm:gap-2 items-center">
              <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Nr.</span>
              <span className="text-[10px] text-zinc-700 uppercase tracking-wider text-center">kg</span>
              <span className="text-[10px] text-zinc-700 uppercase tracking-wider text-center">Wdh.</span>
              <span />
            </div>
            <div className="divide-y divide-white/[0.04]">
              {s.sets.map((row, setIdx) => (
                <div
                  key={row.id}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 grid grid-cols-[1.75rem_1fr_1fr_2rem] sm:grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-1.5 sm:gap-2 items-center transition-all ${row.completed ? 'opacity-35 bg-white/[0.02]' : ''}`}
                >
                  <span className="text-xs text-zinc-500 font-medium">{setIdx + 1}</span>
                  <input
                    type="number" disabled={row.completed}
                    value={row.weight}
                    onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                    placeholder={s.lastLog ? `${s.lastLog.weight}` : 'kg'}
                    step="0.5" min="0"
                    className="w-full bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 disabled:cursor-not-allowed rounded-lg px-1.5 sm:px-2 py-1.5 text-sm text-zinc-100 outline-none text-center tabular-nums transition-colors"
                  />
                  <input
                    type="number" disabled={row.completed}
                    value={row.reps}
                    onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                    placeholder={s.lastLog ? `${s.lastLog.reps}` : 'Wdh'}
                    step="1" min="0"
                    className="w-full bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 disabled:cursor-not-allowed rounded-lg px-1.5 sm:px-2 py-1.5 text-sm text-zinc-100 outline-none text-center tabular-nums transition-colors"
                  />
                  <button
                    onClick={() => toggleDone(exIdx, setIdx)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center transition-all ${
                      row.completed
                        ? 'bg-[#00f2fe]/15 border-[#00f2fe]/40 text-[#00f2fe]'
                        : 'bg-white/5 border-white/10 text-zinc-600 hover:border-[#00f2fe]/30 hover:text-[#00f2fe]/60'
                    }`}
                  >
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 border-t border-white/5">
            <button onClick={() => addSet(exIdx)} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Satz hinzufügen
            </button>
          </div>
        </div>
      ))}

      {/* Finish */}
      <div className={`${GLASS} p-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">{totalDone} Satz{totalDone !== 1 ? 'e' : ''} erledigt</span>
          <span className="text-xs text-zinc-600">{localDate()}</span>
        </div>

        <button
          onClick={handleFinish}
          disabled={isSaving}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15 hover:border-red-500/30 disabled:opacity-50"
        >
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert...</>
            : <><StopCircle className="w-4 h-4" /> Workout beenden</>
          }
        </button>

        <div className="border-t border-white/5 pt-3 flex items-center gap-3">
          {cancelConfirm ? (
            <>
              <span className="text-xs text-zinc-500 flex-1">Training abbrechen ohne zu speichern?</span>
              <button
                onClick={clearSession}
                className="text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/25 bg-red-500/10 hover:bg-red-500/15 transition-all"
              >
                Ja, abbrechen
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Zurück
              </button>
            </>
          ) : (
            <button
              onClick={() => setCancelConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Training abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
