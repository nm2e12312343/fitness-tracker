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

const GLASS = 'bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]'

export default function TemplatesManager({ exercises, initialTemplates }: Props) {
  const templates = initialTemplates
  const router = useRouter()
  const [newTemplateName, setNewTemplateName] = useState('')
  const [isCreating, startCreateTransition] = useTransition()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplates[0]?.id ?? null
  )
  const [isAdding, startAddTransition] = useTransition()

  // Exercise search
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vorlagen-Liste */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Meine Vorlagen</div>

          {templates.length === 0 && (
            <div className="flex flex-col items-center py-6 gap-3 rounded-xl border border-white/5 bg-black/40 backdrop-blur-xl">
              <div className="p-2.5 rounded-full bg-white/3 border border-white/8">
                <LayoutTemplate className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-xs text-zinc-600">Noch keine Vorlagen</p>
            </div>
          )}

          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`group flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all backdrop-blur-xl ${
                selectedTemplateId === t.id
                  ? 'bg-[#00f2fe]/8 border-[#00f2fe]/30 text-white'
                  : 'bg-black/40 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
              }`}
            >
              <span className="text-sm font-medium">{t.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600">{t.template_exercises?.length ?? 0} Übungen</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id) }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1 rounded"
                  title="Vorlage löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTemplate() }}
              placeholder="Vorlage-Name"
              className="flex-1 bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none"
            />
            <button
              onClick={handleCreateTemplate}
              disabled={isCreating || !newTemplateName.trim()}
              className="flex items-center justify-center bg-white/8 hover:bg-white/12 disabled:opacity-40 text-zinc-200 px-3 py-2 rounded-lg transition-colors border border-white/5"
              title="Vorlage erstellen"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Übungen in Vorlage */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 border border-white/5 rounded-xl bg-black/40 backdrop-blur-xl">
              <div className="p-3 rounded-full bg-white/3 border border-white/8">
                <LayoutTemplate className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-600">Vorlage auswählen oder erstellen</p>
            </div>
          ) : (
            <div className={`${GLASS} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-white/5">
                <span className="font-medium text-white">{selectedTemplate.name}</span>
              </div>

              {/* Current exercises */}
              <div className="divide-y divide-white/5 min-h-[60px]">
                {(selectedTemplate.template_exercises ?? [])
                  .sort((a, b) => (a.order_index ?? a.sort_order ?? 0) - (b.order_index ?? b.sort_order ?? 0))
                  .map((te) => (
                    <div key={te.id} className="px-5 py-3 flex justify-between items-center">
                      <div>
                        <span className="text-sm text-zinc-300">{te.exercises?.name}</span>
                        <span className="text-xs text-zinc-600 ml-2">{te.exercises?.category}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveExercise(te.id)}
                        disabled={isAdding}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded disabled:opacity-40"
                        title="Übung entfernen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                {(selectedTemplate.template_exercises ?? []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <p className="text-sm text-zinc-600">Noch keine Übungen</p>
                    <p className="text-xs text-zinc-700">Übungen unten suchen und hinzufügen</p>
                  </div>
                )}
              </div>

              {/* Exercise search + add */}
              <div className="border-t border-white/5 p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Übung suchen..."
                    className="w-full bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                </div>

                {/* Category chips */}
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      !selectedCategory
                        ? 'bg-[#00f2fe]/15 border-[#00f2fe]/30 text-[#00f2fe]'
                        : 'bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/12'
                    }`}
                  >
                    Alle
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#00f2fe]/15 border-[#00f2fe]/30 text-[#00f2fe]'
                          : 'bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/12'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Filtered exercise list */}
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredExercises.length === 0 ? (
                    <p className="text-xs text-zinc-600 py-3 text-center">Keine Übungen gefunden</p>
                  ) : filteredExercises.map((ex) => {
                    const added = alreadyAdded.has(ex.id)
                    return (
                      <button
                        key={ex.id}
                        onClick={() => !added && handleAddExercise(ex.id)}
                        disabled={isAdding || added}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors group ${
                          added
                            ? 'opacity-30 cursor-default'
                            : 'hover:bg-white/5 cursor-pointer'
                        } disabled:cursor-default`}
                      >
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{ex.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-zinc-600">{ex.category}</span>
                          {added
                            ? <span className="text-[10px] text-zinc-600">bereits drin</span>
                            : <Plus className="w-3.5 h-3.5 text-zinc-600 group-hover:text-[#00f2fe] transition-colors" />
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
