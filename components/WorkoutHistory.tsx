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
import type { Exercise, WorkoutDetail } from '@/lib/types'

interface WorkoutRecord { id: string; date: string; split_name: string; set_count: number }
interface NtEntry { id: string; exerciseId: string; weight: string; reps: string; sets: string }

interface Props {
  initialHistory: WorkoutRecord[]
  exercises: Exercise[]
}

const GLASS = 'bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]'

function localDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateDE(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function makeNtEntry(): NtEntry {
  return { id: crypto.randomUUID(), exerciseId: '', weight: '', reps: '', sets: '3' }
}

export default function WorkoutHistory({ initialHistory, exercises }: Props) {
  const [history, setHistory] = useState<WorkoutRecord[]>(initialHistory)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<WorkoutDetail | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)

  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ weight: '', reps: '', sets: '' })
  const [isSavingLog, startSaveLog] = useTransition()

  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
  const [isDeletingLog, startDeleteLog] = useTransition()

  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null)
  const [isDeletingWorkout, startDeleteWorkout] = useTransition()

  // Nachtragen
  const [showNachtragen, setShowNachtragen] = useState(false)
  const [ntDate, setNtDate] = useState(localDate())
  const [ntName, setNtName] = useState('')
  const [ntEntries, setNtEntries] = useState<NtEntry[]>([makeNtEntry()])
  const [isSavingNt, startSaveNt] = useTransition()

  const groupedExercises = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = []
    acc[ex.category].push(ex)
    return acc
  }, {})

  // ── Detail expand ────────────────────────────────────────────────────
  const handleExpand = async (workoutId: string) => {
    if (expandedId === workoutId) {
      setExpandedId(null)
      setDetail(null)
      setEditingLogId(null)
      return
    }
    setExpandedId(workoutId)
    setDetail(null)
    setEditingLogId(null)
    setLoadingDetailId(workoutId)
    const d = await getWorkoutDetail(workoutId)
    setDetail(d)
    setLoadingDetailId(null)
  }

  // ── Log edit ─────────────────────────────────────────────────────────
  const startEdit = (logId: string, weight: number, reps: number, sets: number) => {
    setEditingLogId(logId)
    setEditValues({ weight: String(weight), reps: String(reps), sets: String(sets) })
  }

  const saveEdit = () => {
    if (!editingLogId) return
    const w = parseFloat(editValues.weight)
    const r = parseInt(editValues.reps)
    const s = parseInt(editValues.sets)
    if ([w, r, s].some(isNaN) || w <= 0 || r <= 0 || s <= 0) return
    startSaveLog(async () => {
      try {
        await updateWorkoutLog(editingLogId, { weight: w, reps: r, sets: s })
        setDetail((prev) => prev ? {
          ...prev,
          workout_logs: prev.workout_logs.map((l) =>
            l.id === editingLogId ? { ...l, weight: w, reps: r, sets: s } : l
          ),
        } : null)
        setEditingLogId(null)
        toast.success('Satz aktualisiert')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  // ── Log delete ───────────────────────────────────────────────────────
  const handleDeleteLog = (logId: string) => {
    if (deletingLogId !== logId) { setDeletingLogId(logId); return }
    startDeleteLog(async () => {
      try {
        await deleteWorkoutLog(logId)
        setDetail((prev) => prev ? {
          ...prev,
          workout_logs: prev.workout_logs.filter((l) => l.id !== logId),
        } : null)
        setHistory((prev) => prev.map((w) =>
          w.id === expandedId ? { ...w, set_count: Math.max(0, w.set_count - 1) } : w
        ))
        setDeletingLogId(null)
        toast.success('Satz gelöscht')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  // ── Workout delete ───────────────────────────────────────────────────
  const handleDeleteWorkout = (id: string) => {
    if (deletingWorkoutId !== id) { setDeletingWorkoutId(id); return }
    startDeleteWorkout(async () => {
      try {
        await deleteWorkout(id)
        setHistory((prev) => prev.filter((w) => w.id !== id))
        if (expandedId === id) { setExpandedId(null); setDetail(null) }
        setDeletingWorkoutId(null)
        toast.success('Training gelöscht')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  // ── Nachtragen ───────────────────────────────────────────────────────
  const handleSaveNachtragen = () => {
    const entries = ntEntries
      .filter((e) => e.exerciseId && parseFloat(e.weight) > 0 && parseInt(e.reps) > 0)
      .map((e) => ({
        exerciseId: e.exerciseId,
        weight: parseFloat(e.weight),
        reps: parseInt(e.reps),
        sets: parseInt(e.sets) || 1,
      }))

    if (!ntName.trim()) { toast.error('Trainingsname fehlt'); return }
    if (entries.length === 0) { toast.error('Mindestens eine gültige Übung eingeben'); return }

    startSaveNt(async () => {
      try {
        await saveWorkoutSession({ splitName: ntName, date: ntDate, entries })
        const fresh = await getFullWorkoutHistory()
        setHistory(fresh)
        setShowNachtragen(false)
        setNtEntries([makeNtEntry()])
        setNtName('')
        setNtDate(localDate())
        toast.success('Training nachgetragen')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  const updateNtEntry = (id: string, field: keyof NtEntry, value: string) =>
    setNtEntries((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e))

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Logbuch</h1>
          <p className="text-zinc-500 text-sm mt-1">Vergangene Einheiten einsehen, bearbeiten und nachtragen</p>
        </div>
        <button
          onClick={() => setShowNachtragen(!showNachtragen)}
          className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-white/8 bg-white/5 hover:bg-white/8 text-zinc-300 hover:text-white transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Nachtragen
        </button>
      </div>

      {/* Nachtragen form */}
      {showNachtragen && (
        <div className={`${GLASS} p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Training manuell nachtragen</span>
            <button onClick={() => setShowNachtragen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-black/40 border border-white/8 rounded-lg px-3 py-2">
              <CalendarDays className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <input
                type="date"
                value={ntDate}
                max={localDate()}
                onChange={(e) => e.target.value && setNtDate(e.target.value)}
                className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer"
              />
            </div>
            <input
              type="text"
              value={ntName}
              onChange={(e) => setNtName(e.target.value)}
              placeholder="Training-Name (z.B. Push Day)"
              className="flex-1 min-w-[180px] bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_5rem_4rem_4rem_2rem] gap-2 px-1">
              <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Übung</span>
              <span className="text-[10px] text-zinc-700 uppercase tracking-wider text-center">kg</span>
              <span className="text-[10px] text-zinc-700 uppercase tracking-wider text-center">Wdh.</span>
              <span className="text-[10px] text-zinc-700 uppercase tracking-wider text-center">Sätze</span>
              <span />
            </div>
            {ntEntries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1fr_5rem_4rem_4rem_2rem] gap-2 items-center">
                <select
                  value={entry.exerciseId}
                  onChange={(e) => updateNtEntry(entry.id, 'exerciseId', e.target.value)}
                  className="bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-2 py-1.5 text-sm text-zinc-100 outline-none"
                >
                  <option value="">Übung wählen...</option>
                  {Object.entries(groupedExercises).map(([cat, exs]) => (
                    <optgroup key={cat} label={cat}>
                      {exs.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="number" value={entry.weight} onChange={(e) => updateNtEntry(entry.id, 'weight', e.target.value)}
                  placeholder="kg" min="0" step="0.5"
                  className="bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-2 py-1.5 text-sm text-zinc-100 outline-none text-center"
                />
                <input
                  type="number" value={entry.reps} onChange={(e) => updateNtEntry(entry.id, 'reps', e.target.value)}
                  placeholder="Wdh" min="1"
                  className="bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-2 py-1.5 text-sm text-zinc-100 outline-none text-center"
                />
                <input
                  type="number" value={entry.sets} onChange={(e) => updateNtEntry(entry.id, 'sets', e.target.value)}
                  placeholder="3" min="1"
                  className="bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-2 py-1.5 text-sm text-zinc-100 outline-none text-center"
                />
                <button
                  onClick={() => setNtEntries((prev) => prev.filter((e) => e.id !== entry.id))}
                  disabled={ntEntries.length === 1}
                  className="text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-20"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setNtEntries((prev) => [...prev, makeNtEntry()])}
              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Übung hinzufügen
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-white/5">
            <button
              onClick={handleSaveNachtragen}
              disabled={isSavingNt}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-900 px-4 py-2 rounded-lg disabled:opacity-50 transition-all"
              style={{ background: '#00f2fe' }}
            >
              {isSavingNt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Training speichern
            </button>
            <button
              onClick={() => setShowNachtragen(false)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* History list */}
      {history.length === 0 ? (
        <div className={`${GLASS} flex flex-col items-center justify-center py-16 gap-3`}>
          <div className="p-3 rounded-full bg-white/3 border border-white/8">
            <BookOpen className="w-6 h-6 text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="text-sm text-zinc-500">Noch kein Training absolviert</p>
            <p className="text-xs text-zinc-700 mt-1">Starte dein erstes Training oder trag eines manuell nach</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((w) => (
            <div key={w.id} className={`${GLASS} overflow-hidden`}>
              {/* Workout row */}
              <div className="px-5 py-4 flex items-center gap-4">
                <button
                  onClick={() => handleExpand(w.id)}
                  className="flex-1 flex items-center gap-4 min-w-0 text-left"
                >
                  <span className="text-xs text-zinc-600 tabular-nums shrink-0 w-28">{formatDateDE(w.date)}</span>
                  <span className="text-sm font-medium text-zinc-200 truncate">{w.split_name}</span>
                  <span className="text-xs text-zinc-600 shrink-0 ml-auto">{w.set_count} Sätze</span>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDeleteWorkout(w.id)}
                    disabled={isDeletingWorkout && deletingWorkoutId === w.id}
                    className={`flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-lg border ${
                      deletingWorkoutId === w.id
                        ? 'text-red-400 border-red-500/30 bg-red-500/10'
                        : 'text-zinc-600 border-transparent hover:text-red-400 hover:border-red-500/20'
                    } disabled:opacity-50`}
                  >
                    {isDeletingWorkout && deletingWorkoutId === w.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />
                    }
                    {deletingWorkoutId === w.id ? 'Löschen?' : ''}
                  </button>
                  {deletingWorkoutId === w.id && (
                    <button onClick={() => setDeletingWorkoutId(null)} className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
                      Abbrechen
                    </button>
                  )}
                  <button
                    onClick={() => handleExpand(w.id)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors p-1"
                  >
                    {expandedId === w.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === w.id && (
                <div className="border-t border-white/5">
                  {loadingDetailId === w.id ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-zinc-600 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Lade Details...
                    </div>
                  ) : !detail ? null : detail.workout_logs.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-zinc-600">Keine Einträge</div>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {detail.workout_logs.map((log) => (
                        <div key={log.id} className="px-5 py-3">
                          {editingLogId === log.id ? (
                            /* Edit row */
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-sm text-zinc-300 w-36 shrink-0 truncate">{log.exercises?.name ?? '—'}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number" value={editValues.weight}
                                  onChange={(e) => setEditValues((v) => ({ ...v, weight: e.target.value }))}
                                  placeholder="kg" min="0" step="0.5"
                                  className="w-20 bg-white/5 border border-[#00f2fe]/40 rounded-lg px-2 py-1 text-sm text-zinc-100 outline-none text-center"
                                />
                                <span className="text-xs text-zinc-600">kg ×</span>
                                <input
                                  type="number" value={editValues.reps}
                                  onChange={(e) => setEditValues((v) => ({ ...v, reps: e.target.value }))}
                                  placeholder="Wdh" min="1"
                                  className="w-16 bg-white/5 border border-[#00f2fe]/40 rounded-lg px-2 py-1 text-sm text-zinc-100 outline-none text-center"
                                />
                                <span className="text-xs text-zinc-600">Wdh. ×</span>
                                <input
                                  type="number" value={editValues.sets}
                                  onChange={(e) => setEditValues((v) => ({ ...v, sets: e.target.value }))}
                                  placeholder="Sätze" min="1"
                                  className="w-16 bg-white/5 border border-[#00f2fe]/40 rounded-lg px-2 py-1 text-sm text-zinc-100 outline-none text-center"
                                />
                                <span className="text-xs text-zinc-600">Sätze</span>
                              </div>
                              <div className="flex items-center gap-2 ml-auto">
                                <button
                                  onClick={saveEdit}
                                  disabled={isSavingLog}
                                  className="text-[#00f2fe] hover:text-[#00f2fe]/80 transition-colors disabled:opacity-50"
                                >
                                  {isSavingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => setEditingLogId(null)}
                                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Display row */
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                <span className="text-sm text-zinc-300 truncate">{log.exercises?.name ?? '—'}</span>
                                <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                                  {log.weight} kg × {log.reps} Wdh. × {log.sets} Sätze
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => startEdit(log.id, log.weight, log.reps, log.sets)}
                                  className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLog(log.id)}
                                  disabled={isDeletingLog && deletingLogId === log.id}
                                  className={`p-1 transition-colors disabled:opacity-50 ${
                                    deletingLogId === log.id ? 'text-red-400' : 'text-zinc-600 hover:text-red-400'
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
                                    className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
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
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
