'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  getWorkoutDetail,
  updateWorkoutLog,
  deleteWorkoutLog,
  deleteWorkout,
  saveWorkoutSession,
  getFullWorkoutHistory,
} from '@/lib/actions/workout'
import {
  BookOpen, ChevronDown, ChevronUp, Pencil, Trash2, Check, X,
  Loader2, Plus, CalendarDays,
} from 'lucide-react'
import Reveal from '@/components/Reveal'
import type { Exercise, WorkoutDetail, WorkoutLogDetail } from '@/lib/types'

interface WorkoutRecord { id: string; date: string; split_name: string; set_count: number }
interface NtSet { id: string; weight: string; reps: string }
interface NtExercise { id: string; exerciseId: string; sets: NtSet[] }

interface Props {
  initialHistory: WorkoutRecord[]
  exercises: Exercise[]
}

const CARD = 'rounded-none border border-chalk/10 bg-rubber'
const INPUT = 'bg-asphalt border border-chalk/10 focus:border-chalk/30 rounded-none px-2 py-1.5 text-sm text-chalk outline-none text-center transition-colors'

function localDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateDE(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function makeNtSet(): NtSet { return { id: crypto.randomUUID(), weight: '', reps: '' } }
function makeNtExercise(): NtExercise { return { id: crypto.randomUUID(), exerciseId: '', sets: [makeNtSet()] } }

function groupLogsByExercise(logs: WorkoutLogDetail[]): { exerciseId: string; name: string; category: string; sets: WorkoutLogDetail[] }[] {
  const map = new Map<string, { name: string; category: string; sets: WorkoutLogDetail[] }>()
  for (const log of logs) {
    if (!map.has(log.exercise_id)) {
      map.set(log.exercise_id, { name: log.exercises?.name ?? '—', category: log.exercises?.category ?? '', sets: [] })
    }
    map.get(log.exercise_id)!.sets.push(log)
  }
  for (const g of map.values()) {
    g.sets.sort((a, b) => (a.set_number ?? 1) - (b.set_number ?? 1))
  }
  return [...map.entries()].map(([exerciseId, g]) => ({ exerciseId, ...g }))
}

export default function WorkoutHistory({ initialHistory, exercises }: Props) {
  const [history, setHistory] = useState<WorkoutRecord[]>(initialHistory)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<WorkoutDetail | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)

  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ weight: '', reps: '' })
  const [isSavingLog, startSaveLog] = useTransition()

  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
  const [isDeletingLog, startDeleteLog] = useTransition()

  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null)
  const [isDeletingWorkout, startDeleteWorkout] = useTransition()

  const [showNachtragen, setShowNachtragen] = useState(false)
  const [ntDate, setNtDate] = useState(localDate())
  const [ntName, setNtName] = useState('')
  const [ntExercises, setNtExercises] = useState<NtExercise[]>([makeNtExercise()])
  const [isSavingNt, startSaveNt] = useTransition()

  const groupedExercises = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = []
    acc[ex.category].push(ex)
    return acc
  }, {})

  const handleExpand = async (workoutId: string) => {
    if (expandedId === workoutId) {
      setExpandedId(null); setDetail(null); setEditingLogId(null); return
    }
    setExpandedId(workoutId); setDetail(null); setEditingLogId(null)
    setLoadingDetailId(workoutId)
    const d = await getWorkoutDetail(workoutId)
    setDetail(d)
    setLoadingDetailId(null)
  }

  const startEdit = (logId: string, weight: number, reps: number) => {
    setEditingLogId(logId)
    setEditValues({ weight: String(weight), reps: String(reps) })
    setDeletingLogId(null)
  }

  const saveEdit = () => {
    if (!editingLogId) return
    const w = parseFloat(editValues.weight)
    const r = parseInt(editValues.reps)
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return
    startSaveLog(async () => {
      try {
        await updateWorkoutLog(editingLogId, { weight: w, reps: r })
        setDetail((prev) => prev ? {
          ...prev,
          workout_logs: prev.workout_logs.map((l) =>
            l.id === editingLogId ? { ...l, weight: w, reps: r } : l
          ),
        } : null)
        setEditingLogId(null)
        toast.success('Satz aktualisiert')
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Fehler') }
    })
  }

  const handleDeleteLog = (logId: string) => {
    if (deletingLogId !== logId) { setDeletingLogId(logId); return }
    startDeleteLog(async () => {
      try {
        await deleteWorkoutLog(logId)
        setDetail((prev) => prev ? { ...prev, workout_logs: prev.workout_logs.filter((l) => l.id !== logId) } : null)
        setHistory((prev) => prev.map((w) =>
          w.id === expandedId ? { ...w, set_count: Math.max(0, w.set_count - 1) } : w
        ))
        setDeletingLogId(null)
        toast.success('Satz gelöscht')
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Fehler') }
    })
  }

  const handleDeleteWorkout = (id: string) => {
    if (deletingWorkoutId !== id) { setDeletingWorkoutId(id); return }
    startDeleteWorkout(async () => {
      try {
        await deleteWorkout(id)
        setHistory((prev) => prev.filter((w) => w.id !== id))
        if (expandedId === id) { setExpandedId(null); setDetail(null) }
        setDeletingWorkoutId(null)
        toast.success('Training gelöscht')
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Fehler') }
    })
  }

  const updateNtExerciseId = (exId: string, value: string) =>
    setNtExercises((prev) => prev.map((e) => e.id === exId ? { ...e, exerciseId: value } : e))

  const updateNtSet = (exId: string, setId: string, field: 'weight' | 'reps', value: string) =>
    setNtExercises((prev) => prev.map((e) => e.id === exId
      ? { ...e, sets: e.sets.map((s) => s.id === setId ? { ...s, [field]: value } : s) } : e))

  const addNtSet = (exId: string) =>
    setNtExercises((prev) => prev.map((e) => e.id === exId ? { ...e, sets: [...e.sets, makeNtSet()] } : e))

  const removeNtSet = (exId: string, setId: string) =>
    setNtExercises((prev) => prev.map((e) => e.id === exId
      ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e))

  const removeNtExercise = (exId: string) =>
    setNtExercises((prev) => prev.filter((e) => e.id !== exId))

  const handleSaveNachtragen = () => {
    const entries = ntExercises
      .filter((e) => e.exerciseId)
      .map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets
          .filter((s) => parseFloat(s.weight) > 0 && parseInt(s.reps) > 0)
          .map((s) => ({ weight: parseFloat(s.weight), reps: parseInt(s.reps) })),
      }))
      .filter((e) => e.sets.length > 0)

    if (!ntName.trim()) { toast.error('Trainingsname fehlt'); return }
    if (entries.length === 0) { toast.error('Mindestens eine Übung mit gültigen Sätzen eingeben'); return }

    startSaveNt(async () => {
      try {
        await saveWorkoutSession({ splitName: ntName, date: ntDate, entries })
        const fresh = await getFullWorkoutHistory()
        setHistory(fresh)
        setShowNachtragen(false)
        setNtExercises([makeNtExercise()])
        setNtName('')
        setNtDate(localDate())
        toast.success('Training nachgetragen')
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Fehler') }
    })
  }

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap border-b border-chalk/10 pb-6">
        <div>
          <p className="text-[11px] font-semibold font-mono uppercase tracking-[0.3em] text-chalk/40">
            Vergangene Einheiten
          </p>
          <h1 className="mt-3 font-display text-5xl uppercase leading-[0.9] text-chalk">
            Logbuch<span className="text-blaze">.</span>
          </h1>
        </div>
        <button
          onClick={() => setShowNachtragen(!showNachtragen)}
          className="flex items-center gap-1.5 text-[11px] font-bold font-mono uppercase tracking-[0.15em] bg-blaze text-black px-4 py-2.5 rounded-none transition-all active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          Nachtragen
        </button>
      </header>

      {/* Nachtragen form */}
      {showNachtragen && (
        <div className={`${CARD} p-6 space-y-5`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold font-mono uppercase tracking-[0.2em] text-chalk/40">
              Training manuell nachtragen
            </p>
            <button onClick={() => setShowNachtragen(false)} className="text-chalk/30 hover:text-chalk transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-asphalt border border-chalk/10 rounded-none px-3 py-2">
              <CalendarDays className="w-3.5 h-3.5 text-chalk/30 shrink-0" />
              <input
                type="date" value={ntDate} max={localDate()}
                onChange={(e) => e.target.value && setNtDate(e.target.value)}
                className="bg-transparent text-sm text-chalk/75 outline-none cursor-pointer"
              />
            </div>
            <input
              type="text" value={ntName}
              onChange={(e) => setNtName(e.target.value)}
              placeholder="Training-Name (z.B. Push Day)"
              className="flex-1 min-w-[180px] bg-asphalt border border-chalk/10 focus:border-chalk/30 rounded-none px-3 py-2 text-sm text-chalk outline-none transition-colors"
            />
          </div>

          <div className="space-y-3">
            {ntExercises.map((ntEx) => (
              <div key={ntEx.id} className="rounded-none border border-chalk/10 bg-asphalt p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <select
                    value={ntEx.exerciseId}
                    onChange={(e) => updateNtExerciseId(ntEx.id, e.target.value)}
                    className="flex-1 bg-press border border-chalk/10 focus:border-chalk/30 rounded-none px-2 py-1.5 text-sm text-chalk outline-none transition-colors"
                  >
                    <option value="">Übung wählen...</option>
                    {Object.entries(groupedExercises).map(([cat, exs]) => (
                      <optgroup key={cat} label={cat}>
                        {exs.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    onClick={() => removeNtExercise(ntEx.id)}
                    disabled={ntExercises.length === 1}
                    className="text-chalk/25 hover:text-red-400 transition-colors disabled:opacity-20 shrink-0 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 pl-1">
                  <div className="grid grid-cols-[3rem_1fr_1fr_2rem] gap-2 px-1">
                    <span className="text-[10px] font-semibold font-mono uppercase tracking-widest text-chalk/25" />
                    <span className="text-[10px] font-semibold font-mono uppercase tracking-widest text-chalk/25 text-center">kg</span>
                    <span className="text-[10px] font-semibold font-mono uppercase tracking-widest text-chalk/25 text-center">Wdh.</span>
                    <span />
                  </div>
                  {ntEx.sets.map((set, setIdx) => (
                    <div key={set.id} className="grid grid-cols-[3rem_1fr_1fr_2rem] gap-2 items-center">
                      <span className="text-xs font-bold text-chalk/35">Satz {setIdx + 1}</span>
                      <input
                        type="number" value={set.weight}
                        onChange={(e) => updateNtSet(ntEx.id, set.id, 'weight', e.target.value)}
                        placeholder="kg" min="0" step="0.5"
                        className={INPUT}
                      />
                      <input
                        type="number" value={set.reps}
                        onChange={(e) => updateNtSet(ntEx.id, set.id, 'reps', e.target.value)}
                        placeholder="Wdh" min="1"
                        className={INPUT}
                      />
                      <button
                        onClick={() => removeNtSet(ntEx.id, set.id)}
                        disabled={ntEx.sets.length === 1}
                        className="text-chalk/25 hover:text-red-400 transition-colors disabled:opacity-20"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addNtSet(ntEx.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-chalk/25 hover:text-chalk transition-colors mt-1"
                  >
                    <Plus className="w-3 h-3" /> Satz hinzufügen
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setNtExercises((prev) => [...prev, makeNtExercise()])}
              className="flex items-center gap-1.5 text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-chalk/30 hover:text-chalk transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Übung hinzufügen
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-chalk/5">
            <button
              onClick={handleSaveNachtragen}
              disabled={isSavingNt}
              className="flex items-center gap-1.5 bg-blaze text-black text-sm font-bold px-5 py-2.5 rounded-none disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isSavingNt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Training speichern
            </button>
            <button
              onClick={() => setShowNachtragen(false)}
              className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-chalk/30 hover:text-chalk transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* History list */}
      {history.length === 0 ? (
        <div className={`${CARD} flex flex-col items-center justify-center py-20 gap-4`}>
          <div className="p-4 rounded-none bg-asphalt border border-chalk/10">
            <BookOpen className="w-6 h-6 text-chalk/30" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold tracking-tight text-chalk/40">Noch kein Training absolviert</p>
            <p className="text-[11px] font-medium font-mono uppercase tracking-[0.15em] text-chalk/20 mt-1">
              Starte dein erstes Training oder trag eines manuell nach
            </p>
          </div>
        </div>
      ) : (
        <Reveal variant="stagger" className="space-y-2">
          {history.map((w) => (
            <div key={w.id} className={`${CARD} overflow-hidden transition-colors hover:border-chalk/25`}>
              <div className="px-5 py-4 flex items-center gap-4">
                <button
                  onClick={() => handleExpand(w.id)}
                  className="flex-1 flex items-center gap-4 min-w-0 text-left"
                >
                  <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-chalk/35 tabular-nums shrink-0 w-28">
                    {formatDateDE(w.date)}
                  </span>
                  <span className="font-display text-lg uppercase leading-none text-chalk truncate">{w.split_name}</span>
                  <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em] text-chalk/30 shrink-0 ml-auto">
                    {w.set_count} Sätze
                  </span>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDeleteWorkout(w.id)}
                    disabled={isDeletingWorkout && deletingWorkoutId === w.id}
                    className={`flex items-center gap-1 text-[11px] font-semibold font-mono uppercase tracking-[0.1em] transition-colors px-2 py-1 rounded-none border ${
                      deletingWorkoutId === w.id
                        ? 'text-red-400 border-red-500/30 bg-red-500/10'
                        : 'text-chalk/25 border-transparent hover:text-red-400 hover:border-red-500/20'
                    } disabled:opacity-50`}
                  >
                    {isDeletingWorkout && deletingWorkoutId === w.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />
                    }
                    {deletingWorkoutId === w.id ? 'Löschen?' : ''}
                  </button>
                  {deletingWorkoutId === w.id && (
                    <button onClick={() => setDeletingWorkoutId(null)} className="text-[11px] text-chalk/25 hover:text-chalk/50 transition-colors">
                      Abbrechen
                    </button>
                  )}
                  <button
                    onClick={() => handleExpand(w.id)}
                    className="text-chalk/30 hover:text-chalk transition-colors p-1"
                  >
                    {expandedId === w.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedId === w.id && (
                <div className="border-t border-chalk/5">
                  {loadingDetailId === w.id ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-chalk/30 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Lade Details...
                    </div>
                  ) : !detail ? null : detail.workout_logs.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-chalk/30">Keine Einträge</div>
                  ) : (
                    <div className="divide-y divide-chalk/[0.04]">
                      {groupLogsByExercise(detail.workout_logs).map((group) => (
                        <div key={group.exerciseId} className="px-5 py-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold tracking-tight text-chalk">{group.name}</span>
                            {group.category && (
                              <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em] text-chalk/30">{group.category}</span>
                            )}
                          </div>
                          <div className="space-y-1 pl-2">
                            {group.sets.map((log, setIdx) => (
                              <div key={log.id}>
                                {editingLogId === log.id ? (
                                  <div className="flex items-center gap-2 flex-wrap py-1">
                                    <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-chalk/35 w-14 shrink-0">
                                      Satz {(log.set_number ?? setIdx + 1)}
                                    </span>
                                    <input
                                      type="number" value={editValues.weight}
                                      onChange={(e) => setEditValues((v) => ({ ...v, weight: e.target.value }))}
                                      placeholder="kg" min="0" step="0.5"
                                      className="w-20 bg-asphalt border border-chalk/30 rounded-none px-2 py-1 text-sm text-chalk outline-none text-center"
                                    />
                                    <span className="text-xs text-chalk/30">kg ×</span>
                                    <input
                                      type="number" value={editValues.reps}
                                      onChange={(e) => setEditValues((v) => ({ ...v, reps: e.target.value }))}
                                      placeholder="Wdh" min="1"
                                      className="w-16 bg-asphalt border border-chalk/30 rounded-none px-2 py-1 text-sm text-chalk outline-none text-center"
                                    />
                                    <span className="text-xs text-chalk/30">Wdh.</span>
                                    <div className="flex items-center gap-1.5 ml-auto">
                                      <button
                                        onClick={saveEdit} disabled={isSavingLog}
                                        className="text-blaze hover:text-blaze/70 transition-colors disabled:opacity-50"
                                      >
                                        {isSavingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                      </button>
                                      <button onClick={() => setEditingLogId(null)} className="text-chalk/30 hover:text-chalk transition-colors">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2 py-0.5">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-chalk/30 w-14 shrink-0">
                                        Satz {(log.set_number ?? setIdx + 1)}
                                      </span>
                                      <span className="text-sm text-chalk/75 tabular-nums">
                                        {log.weight} kg × {log.reps} Wdh.
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => startEdit(log.id, log.weight, log.reps)}
                                        className="text-chalk/25 hover:text-chalk transition-colors p-1"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLog(log.id)}
                                        disabled={isDeletingLog && deletingLogId === log.id}
                                        className={`p-1 transition-colors disabled:opacity-50 ${
                                          deletingLogId === log.id ? 'text-red-400' : 'text-chalk/25 hover:text-red-400'
                                        }`}
                                      >
                                        {isDeletingLog && deletingLogId === log.id
                                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          : <Trash2 className="w-3.5 h-3.5" />
                                        }
                                      </button>
                                      {deletingLogId === log.id && (
                                        <button
                                          onClick={() => setDeletingLogId(null)}
                                          className="text-[11px] text-chalk/25 hover:text-chalk/50 transition-colors ml-1"
                                        >
                                          Abbrechen
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </Reveal>
      )}
    </div>
  )
}
