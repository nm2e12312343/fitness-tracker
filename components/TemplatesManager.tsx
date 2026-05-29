'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, X, Plus, LayoutTemplate, Search } from 'lucide-react'
import {
  createTemplate,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
  deleteTemplate,
} from '@/lib/actions/workout'
import type { Exercise, WorkoutTemplate } from '@/lib/types'

interface Props {
  exercises: Exercise[]
  initialTemplates: WorkoutTemplate[]
}

const CARD = 'rounded-2xl border border-white/10 bg-zinc-950'
const INPUT = 'bg-zinc-900 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none transition-colors'

export default function TemplatesManager({ exercises, initialTemplates }: Props) {
  const templates = initialTemplates
  const router = useRouter()
  const [newTemplateName, setNewTemplateName] = useState('')
  const [isCreating, startCreateTransition] = useTransition()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplates[0]?.id ?? null
  )
  const [isAdding, startAddTransition] = useTransition()
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null
  const categories = [...new Set(exercises.map((ex) => ex.category))].sort()

  const filteredExercises = exercises.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
    const matchCat = !selectedCategory || ex.category === selectedCategory
    return matchSearch && matchCat
  })

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return
    startCreateTransition(async () => {
      try {
        const t = await createTemplate(newTemplateName)
        setSelectedTemplateId(t.id)
        setNewTemplateName('')
        router.refresh()
        toast.success('Vorlage erstellt')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler beim Erstellen')
      }
    })
  }

  const handleAddExercise = (exerciseId: string) => {
    if (!selectedTemplateId) return
    const sortOrder = (selectedTemplate?.template_exercises?.length ?? 0) + 1
    startAddTransition(async () => {
      try {
        await addExerciseToTemplate(selectedTemplateId, exerciseId, sortOrder)
        router.refresh()
        toast.success('Übung hinzugefügt')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  const handleRemoveExercise = (teId: string) => {
    startAddTransition(async () => {
      try {
        await removeExerciseFromTemplate(teId)
        router.refresh()
        toast.success('Übung entfernt')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  const handleDeleteTemplate = (id: string) => {
    startCreateTransition(async () => {
      await deleteTemplate(id)
      if (selectedTemplateId === id) setSelectedTemplateId(templates.find((t) => t.id !== id)?.id ?? null)
      router.refresh()
      toast.success('Vorlage gelöscht')
    })
  }

  const alreadyAdded = new Set(
    (selectedTemplate?.template_exercises ?? []).map((te) => te.exercise_id)
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Vorlagen-Liste */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
            Meine Vorlagen
          </p>

          {templates.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-3 rounded-2xl border border-white/10 bg-zinc-950">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10">
                <LayoutTemplate className="w-5 h-5 text-white/30" />
              </div>
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/30">
                Noch keine Vorlagen
              </p>
            </div>
          )}

          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`group flex items-center justify-between px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedTemplateId === t.id
                  ? 'bg-zinc-900 border-[#ccff00]/30 text-white'
                  : 'bg-zinc-950 border-white/10 text-white/40 hover:border-white/25 hover:text-white'
              }`}
            >
              <div>
                <span className="text-sm font-bold tracking-tight">{t.name}</span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mt-0.5">
                  {t.template_exercises?.length ?? 0} Übungen
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id) }}
                className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-all p-1 rounded"
                title="Vorlage löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTemplate() }}
              placeholder="Vorlage-Name"
              className={`flex-1 ${INPUT}`}
            />
            <button
              onClick={handleCreateTemplate}
              disabled={isCreating || !newTemplateName.trim()}
              className="flex items-center justify-center bg-[#ccff00] text-black disabled:opacity-40 px-3 py-2 rounded-lg transition-colors"
              title="Vorlage erstellen"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Übungen in Vorlage */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 rounded-2xl border border-white/10 bg-zinc-950">
              <div className="p-3 rounded-xl bg-zinc-900 border border-white/10">
                <LayoutTemplate className="w-5 h-5 text-white/30" />
              </div>
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/30">
                Vorlage auswählen oder erstellen
              </p>
            </div>
          ) : (
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-white/5">
                <span className="text-sm font-bold tracking-tight text-white">{selectedTemplate.name}</span>
              </div>

              {/* Current exercises */}
              <div className="divide-y divide-white/[0.04] min-h-[60px]">
                {(selectedTemplate.template_exercises ?? [])
                  .sort((a, b) => (a.order_index ?? a.sort_order ?? 0) - (b.order_index ?? b.sort_order ?? 0))
                  .map((te) => (
                    <div key={te.id} className="px-5 py-3 flex justify-between items-center">
                      <div>
                        <span className="text-sm font-bold tracking-tight text-white">{te.exercises?.name}</span>
                        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/30 ml-2">
                          {te.exercises?.category}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveExercise(te.id)}
                        disabled={isAdding}
                        className="text-white/25 hover:text-red-400 transition-colors p-1 rounded disabled:opacity-40"
                        title="Übung entfernen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                {(selectedTemplate.template_exercises ?? []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <p className="text-sm text-white/30">Noch keine Übungen</p>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/20">
                      Unten suchen und hinzufügen
                    </p>
                  </div>
                )}
              </div>

              {/* Exercise search + add */}
              <div className="border-t border-white/5 p-5 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Übung suchen..."
                    className="w-full bg-zinc-900 border border-white/10 focus:border-white/30 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 outline-none transition-colors"
                  />
                </div>

                {/* Category chips */}
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border transition-all ${
                      !selectedCategory
                        ? 'bg-[#ccff00]/15 border-[#ccff00]/30 text-[#ccff00]'
                        : 'bg-zinc-900 border-white/10 text-white/35 hover:text-white hover:border-white/25'
                    }`}
                  >
                    Alle
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#ccff00]/15 border-[#ccff00]/30 text-[#ccff00]'
                          : 'bg-zinc-900 border-white/10 text-white/35 hover:text-white hover:border-white/25'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Filtered exercise list */}
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredExercises.length === 0 ? (
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/25 py-4 text-center">
                      Keine Übungen gefunden
                    </p>
                  ) : filteredExercises.map((ex) => {
                    const added = alreadyAdded.has(ex.id)
                    return (
                      <button
                        key={ex.id}
                        onClick={() => !added && handleAddExercise(ex.id)}
                        disabled={isAdding || added}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors group ${
                          added ? 'opacity-25 cursor-default' : 'hover:bg-zinc-900 cursor-pointer'
                        } disabled:cursor-default`}
                      >
                        <span className="text-sm font-bold tracking-tight text-white">{ex.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/30">{ex.category}</span>
                          {added
                            ? <span className="text-[10px] text-white/25">bereits drin</span>
                            : <Plus className="w-3.5 h-3.5 text-white/25 group-hover:text-[#ccff00] transition-colors" />
                          }
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
