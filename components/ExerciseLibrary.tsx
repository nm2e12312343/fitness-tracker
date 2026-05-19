'use client'

import { useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, RotateCcw, Check, X, Search } from 'lucide-react'
import { updateExerciseName, deleteOrArchiveExercise, restoreExercise } from '@/lib/actions/workout'
import type { Exercise } from '@/lib/types'

const GLASS = 'bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]'

interface Props {
  initialExercises: Exercise[]
}

export default function ExerciseLibrary({ initialExercises }: Props) {
  const [exercises, setExercises] = useState(initialExercises)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const archivedCount = useMemo(() => exercises.filter(e => e.is_archived).length, [exercises])
  const activeCount = useMemo(() => exercises.filter(e => !e.is_archived).length, [exercises])

  const filtered = useMemo(() => {
    const base = showArchived
      ? exercises.filter(e => e.is_archived)
      : exercises.filter(e => !e.is_archived)
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(e =>
      e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    )
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

  function startEdit(ex: Exercise) {
    setEditingId(ex.id)
    setEditName(ex.name)
    setDeletingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  function handleRename(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        await updateExerciseName(id, trimmed)
        setExercises(prev => prev.map(e => e.id === id ? { ...e, name: trimmed } : e))
        setEditingId(null)
        toast.success('Ubung umbenannt')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler beim Umbenennen')
      }
    })
  }

  function handleDelete(id: string) {
    if (deletingId !== id) {
      setDeletingId(id)
      setEditingId(null)
      return
    }
    startTransition(async () => {
      try {
        const result = await deleteOrArchiveExercise(id)
        if (result.archived) {
          setExercises(prev => prev.map(e => e.id === id ? { ...e, is_archived: true } : e))
          toast.success('Ubung archiviert — vergangene Logs bleiben erhalten')
        } else {
          setExercises(prev => prev.filter(e => e.id !== id))
          toast.success('Ubung geloscht')
        }
        setDeletingId(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler beim Loschen')
        setDeletingId(null)
      }
    })
  }

  function handleRestore(id: string) {
    startTransition(async () => {
      try {
        await restoreExercise(id)
        setExercises(prev => prev.map(e => e.id === id ? { ...e, is_archived: false } : e))
        toast.success('Ubung wiederhergestellt')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ubung oder Kategorie suchen..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-900/60 border border-white/8 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[#00f2fe]/40"
          />
        </div>
        <button
          onClick={() => { setShowArchived(!showArchived); setSearch('') }}
          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
            showArchived
              ? 'bg-zinc-700/60 border-zinc-600 text-zinc-200'
              : 'bg-zinc-900/60 border-white/8 text-zinc-500 hover:text-zinc-200'
          }`}
        >
          Archiv {archivedCount > 0 && `(${archivedCount})`}
        </button>
      </div>

      <p className="text-xs text-zinc-600">
        {showArchived ? `${archivedCount} archivierte Ubungen` : `${activeCount} aktive Ubungen`}
        {search && ` · ${filtered.length} gefunden`}
      </p>

      <div className={`${GLASS} overflow-hidden`}>
        {grouped.length === 0 && (
          <div className="py-12 text-center text-zinc-600 text-sm">Keine Ubungen gefunden</div>
        )}
        {grouped.map(([cat, exList]) => (
          <div key={cat} className="border-b border-white/5 last:border-b-0">
            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 bg-white/2">
              {cat}
            </div>
            {exList.map(ex => (
              <div
                key={ex.id}
                className="flex items-center gap-2 px-4 py-2.5 border-t border-white/3 hover:bg-white/2 transition-colors"
              >
                {editingId === ex.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(ex.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="flex-1 px-2 py-1 bg-zinc-800 border border-[#00f2fe]/30 rounded text-sm text-zinc-100 outline-none focus:border-[#00f2fe]/60"
                    />
                    <button
                      onClick={() => handleRename(ex.id)}
                      disabled={isPending}
                      className="p-1.5 text-[#00f2fe] hover:text-[#00f2fe]/70 transition-colors disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-sm ${ex.is_archived ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
                      {ex.name}
                    </span>
                    {ex.is_archived ? (
                      <span className="text-[10px] text-zinc-600 px-2 py-0.5 rounded-full border border-zinc-700">
                        archiviert
                      </span>
                    ) : null}
                    {ex.is_archived ? (
                      <button
                        onClick={() => handleRestore(ex.id)}
                        disabled={isPending}
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40"
                        title="Wiederherstellen"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(ex)}
                          disabled={isPending}
                          className="p-1.5 text-zinc-600 hover:text-zinc-200 transition-colors disabled:opacity-40"
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
                              : 'text-zinc-600 hover:text-red-400'
                          }`}
                          title={deletingId === ex.id ? 'Nochmal klicken zum Bestatigen' : 'Loschen'}
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

      {deletingId && (
        <p className="text-xs text-zinc-500 text-center">
          Nochmal klicken zum Bestatigen — falls die Ubung in Logs verwendet wird, wird sie archiviert statt geloscht.
        </p>
      )}
    </div>
  )
}
