'use client'

import { useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Check, X, Search, Plus, RotateCcw } from 'lucide-react'
import {
  createCustomExercise,
  updateExerciseName,
  deleteOrArchiveExercise,
  restoreExercise,
} from '@/lib/actions/workout'
import type { Exercise } from '@/lib/types'

const CARD = 'rounded-2xl border border-white/10 bg-zinc-950'
const CATEGORIES = ['Brust', 'Ruecken', 'Schultern', 'Bizeps', 'Trizeps', 'Beine', 'Bauch', 'Kardio', 'Sonstiges']

interface Props {
  initialExercises: Exercise[]
  userId: string
}

export default function ExerciseLibrary({ initialExercises, userId }: Props) {
  const [exercises, setExercises] = useState(initialExercises)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('Sonstiges')

  const archivedCount = useMemo(() => exercises.filter(e => e.is_archived && e.user_id === userId).length, [exercises, userId])
  const ownCount = useMemo(() => exercises.filter(e => !e.is_archived && e.user_id === userId).length, [exercises, userId])

  const filtered = useMemo(() => {
    const base = showArchived
      ? exercises.filter(e => e.is_archived)
      : exercises.filter(e => !e.is_archived)
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
  }, [exercises, search, showArchived])

  const grouped = useMemo(() => {
    const acc: Record<string, Exercise[]> = {}
    for (const ex of filtered) {
      const cat = ex.category || 'Sonstiges'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(ex)
    }
    return Object.entries(acc).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  function handleAdd() {
    if (!newName.trim()) return
    startTransition(async () => {
      try {
        const ex = await createCustomExercise(newName, newCategory)
        setExercises(prev => [...prev, ex as Exercise])
        setNewName('')
        setShowAddForm(false)
        toast.success('Übung hinzugefügt')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  function startEdit(ex: Exercise) {
    setEditingId(ex.id)
    setEditName(ex.name)
    setDeletingId(null)
  }

  function handleRename(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        await updateExerciseName(id, trimmed)
        setExercises(prev => prev.map(e => e.id === id ? { ...e, name: trimmed } : e))
        setEditingId(null)
        toast.success('Übung umbenannt')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  function handleDelete(id: string) {
    if (deletingId !== id) { setDeletingId(id); setEditingId(null); return }
    startTransition(async () => {
      try {
        const result = await deleteOrArchiveExercise(id)
        if (result.archived) {
          setExercises(prev => prev.map(e => e.id === id ? { ...e, is_archived: true } : e))
          toast.success('Archiviert — vergangene Logs bleiben erhalten')
        } else {
          setExercises(prev => prev.filter(e => e.id !== id))
          toast.success('Übung entfernt')
        }
        setDeletingId(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
        setDeletingId(null)
      }
    })
  }

  function handleRestore(id: string) {
    startTransition(async () => {
      try {
        await restoreExercise(id)
        setExercises(prev => prev.map(e => e.id === id ? { ...e, is_archived: false } : e))
        toast.success('Übung wiederhergestellt')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      {showAddForm ? (
        <div className={`${CARD} p-5 space-y-4`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
            Neue Übung
          </p>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') setShowAddForm(false)
            }}
            placeholder="Name der Übung..."
            className="w-full px-3 py-2 bg-zinc-900 border border-white/10 focus:border-white/30 rounded-lg text-sm text-zinc-100 placeholder:text-white/25 outline-none transition-colors"
          />
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setNewCategory(cat)}
                className={`text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border transition-all ${
                  newCategory === cat
                    ? 'bg-[#ccff00]/15 border-[#ccff00]/30 text-[#ccff00]'
                    : 'bg-zinc-900 border-white/10 text-white/35 hover:text-white hover:border-white/25'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending || !newName.trim()}
              className="flex-1 py-2.5 bg-[#ccff00] text-black text-sm font-bold rounded-xl disabled:opacity-40 transition-colors"
            >
              Hinzufügen
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewName('') }}
              className="px-4 py-2.5 bg-zinc-900 border border-white/10 text-white/40 text-sm rounded-xl hover:text-white transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-[#ccff00] text-black text-[11px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Übung hinzufügen
        </button>
      )}

      {/* Search + archive toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-white/10 focus:border-white/30 rounded-xl text-sm text-zinc-100 placeholder:text-white/25 outline-none transition-colors"
          />
        </div>
        {archivedCount > 0 && (
          <button
            onClick={() => { setShowArchived(!showArchived); setSearch('') }}
            className={`px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-[0.12em] border transition-colors whitespace-nowrap ${
              showArchived
                ? 'bg-zinc-800 border-white/20 text-white'
                : 'bg-zinc-900 border-white/10 text-white/35 hover:text-white'
            }`}
          >
            Archiv ({archivedCount})
          </button>
        )}
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/25">
        {showArchived
          ? `${archivedCount} archivierte eigene Übungen`
          : `${ownCount} eigene · ${exercises.filter(e => !e.is_archived && e.user_id === null).length} global`}
        {search.trim() ? ` · ${filtered.length} gefunden` : ''}
      </p>

      {/* Exercise list */}
      {grouped.length === 0 ? (
        <div className={`${CARD} py-14 text-center px-6`}>
          <p className="text-sm font-bold tracking-tight text-white/30">Keine Übungen gefunden</p>
        </div>
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          {grouped.map(([cat, exList]) => (
            <div key={cat} className="border-b border-white/5 last:border-b-0">
              <div className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 bg-zinc-900/50">
                {cat}
              </div>
              {exList.map(ex => (
                <div
                  key={ex.id}
                  className="flex items-center gap-2 px-5 py-3 border-t border-white/[0.04] hover:bg-zinc-900/30 transition-colors"
                >
                  {editingId === ex.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(ex.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 px-2 py-1 bg-zinc-800 border border-white/20 rounded-lg text-sm text-zinc-100 outline-none"
                      />
                      <button
                        onClick={() => handleRename(ex.id)}
                        disabled={isPending}
                        className="p-1.5 text-[#ccff00] hover:text-[#ccff00]/70 disabled:opacity-40 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-white/30 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 text-sm font-bold tracking-tight ${ex.is_archived ? 'text-white/25 line-through' : 'text-white'}`}>
                        {ex.name}
                      </span>
                      {ex.user_id === null && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25 px-2 py-0.5 rounded-full border border-white/10 shrink-0">
                          global
                        </span>
                      )}
                      {ex.user_id === userId && ex.is_archived && (
                        <>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25 px-2 py-0.5 rounded-full border border-white/10 shrink-0">
                            archiviert
                          </span>
                          <button
                            onClick={() => handleRestore(ex.id)}
                            disabled={isPending}
                            className="p-1.5 text-white/30 hover:text-white transition-colors disabled:opacity-40"
                            title="Wiederherstellen"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {ex.user_id === userId && !ex.is_archived && (
                        <>
                          <button
                            onClick={() => startEdit(ex)}
                            disabled={isPending}
                            className="p-1.5 text-white/25 hover:text-white transition-colors disabled:opacity-40"
                            title="Umbenennen"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ex.id)}
                            disabled={isPending}
                            className={`p-1.5 transition-colors disabled:opacity-40 rounded ${
                              deletingId === ex.id
                                ? 'text-red-400 bg-red-500/10'
                                : 'text-white/25 hover:text-red-400'
                            }`}
                            title={deletingId === ex.id ? 'Nochmal klicken zum Bestätigen' : 'Entfernen'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {deletingId && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/25 text-center">
          Nochmal klicken zum Bestätigen
        </p>
      )}
    </div>
  )
}
