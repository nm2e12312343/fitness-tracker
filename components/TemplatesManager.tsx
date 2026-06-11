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

const CARD = 'rounded-none border border-chalk/10 bg-rubber'
const INPUT = 'bg-asphalt border border-chalk/10 focus:border-chalk/30 rounded-none px-3 py-2 text-sm text-chalk outline-none transition-colors'

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
          <p className="text-[10px] font-semibold font-mono uppercase tracking-[0.25em] text-chalk/40">
            Meine Vorlagen
          </p>

          {templates.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-3 rounded-none border border-chalk/10 bg-rubber">
              <div className="p-2.5 rounded-none bg-asphalt border border-chalk/10">
                <LayoutTemplate className="w-5 h-5 text-chalk/30" />
              </div>
              <p className="text-[11px] font-medium font-mono uppercase tracking-[0.15em] text-chalk/30">
                Noch keine Vorlagen
              </p>
            </div>
          )}

          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`group flex items-center justify-between px-4 py-3.5 rounded-none border cursor-pointer transition-all ${
                selectedTemplateId === t.id
                  ? 'bg-asphalt border-blaze/30 text-chalk'
                  : 'bg-rubber border-chalk/10 text-chalk/40 hover:border-chalk/25 hover:text-chalk'
              }`}
            >
              <div>
                <span className="text-sm font-bold tracking-tight">{t.name}</span>
                <p className="text-[10px] font-semibold font-mono uppercase tracking-[0.15em] text-chalk/30 mt-0.5">
                  {t.template_exercises?.length ?? 0} Übungen
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id) }}
                className="opacity-0 group-hover:opacity-100 text-chalk/25 hover:text-red-400 transition-all p-1 rounded"
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
              className="flex items-center justify-center bg-blaze text-black disabled:opacity-40 px-3 py-2 rounded-none transition-colors"
              title="Vorlage erstellen"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Übungen in Vorlage */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 rounded-none border border-chalk/10 bg-rubber">
              <div className="p-3 rounded-none bg-asphalt border border-chalk/10">
                <LayoutTemplate className="w-5 h-5 text-chalk/30" />
              </div>
              <p className="text-[11px] font-medium font-mono uppercase tracking-[0.15em] text-chalk/30">
                Vorlage auswählen oder erstellen
              </p>
            </div>
          ) : (
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-chalk/5">
                <span className="text-sm font-bold tracking-tight text-chalk">{selectedTemplate.name}</span>
              </div>

              {/* Current exercises */}
              <div className="divide-y divide-chalk/[0.04] min-h-[60px]">
                {(selectedTemplate.template_exercises ?? [])
                  .sort((a, b) => (a.order_index ?? a.sort_order ?? 0) - (b.order_index ?? b.sort_order ?? 0))
                  .map((te) => (
                    <div key={te.id} className="px-5 py-3 flex justify-between items-center">
                      <div>
                        <span className="text-sm font-bold tracking-tight text-chalk">{te.exercises?.name}</span>
                        <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em] text-chalk/30 ml-2">
                          {te.exercises?.category}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveExercise(te.id)}
                        disabled={isAdding}
                        className="text-chalk/25 hover:text-red-400 transition-colors p-1 rounded disabled:opacity-40"
                        title="Übung entfernen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                {(selectedTemplate.template_exercises ?? []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <p className="text-sm text-chalk/30">Noch keine Übungen</p>
                    <p className="text-[11px] font-medium font-mono uppercase tracking-[0.12em] text-chalk/20">
                      Unten suchen und hinzufügen
                    </p>
                  </div>
                )}
              </div>

              {/* Exercise search + add */}
              <div className="border-t border-chalk/5 p-5 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-chalk/25 pointer-events-none" />
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Übung suchen..."
                    className="w-full bg-asphalt border border-chalk/10 focus:border-chalk/30 rounded-none pl-9 pr-3 py-2 text-sm text-chalk outline-none transition-colors"
                  />
                </div>

                {/* Category chips */}
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`text-[10px] font-semibold font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-none border transition-all ${
                      !selectedCategory
                        ? 'bg-blaze/15 border-blaze/30 text-blaze'
                        : 'bg-asphalt border-chalk/10 text-chalk/35 hover:text-chalk hover:border-chalk/25'
                    }`}
                  >
                    Alle
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`text-[10px] font-semibold font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-none border transition-all ${
                        selectedCategory === cat
                          ? 'bg-blaze/15 border-blaze/30 text-blaze'
                          : 'bg-asphalt border-chalk/10 text-chalk/35 hover:text-chalk hover:border-chalk/25'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Filtered exercise list */}
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredExercises.length === 0 ? (
                    <p className="text-[11px] font-medium font-mono uppercase tracking-[0.15em] text-chalk/25 py-4 text-center">
                      Keine Übungen gefunden
                    </p>
                  ) : filteredExercises.map((ex) => {
                    const added = alreadyAdded.has(ex.id)
                    return (
                      <button
                        key={ex.id}
                        onClick={() => !added && handleAddExercise(ex.id)}
                        disabled={isAdding || added}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-none text-left transition-colors group ${
                          added ? 'opacity-25 cursor-default' : 'hover:bg-asphalt cursor-pointer'
                        } disabled:cursor-default`}
                      >
                        <span className="text-sm font-bold tracking-tight text-chalk">{ex.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-medium font-mono uppercase tracking-[0.1em] text-chalk/30">{ex.category}</span>
                          {added
                            ? <span className="text-[10px] text-chalk/25">bereits drin</span>
                            : <Plus className="w-3.5 h-3.5 text-chalk/25 group-hover:text-blaze transition-colors" />
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
