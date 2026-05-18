'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X, Plus } from 'lucide-react'
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
  const [addExerciseId, setAddExerciseId] = useState('')
  const [isAdding, startAddTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return
    startCreateTransition(async () => {
      try {
        const t = await createTemplate(newTemplateName)
        setSelectedTemplateId(t.id)
        setNewTemplateName('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  const handleAddExercise = () => {
    if (!selectedTemplateId || !addExerciseId) return
    const sortOrder = (selectedTemplate?.template_exercises?.length ?? 0) + 1
    startAddTransition(async () => {
      try {
        await addExerciseToTemplate(selectedTemplateId, addExerciseId, sortOrder)
        setAddExerciseId('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler')
      }
    })
  }

  const handleRemoveExercise = (teId: string) => {
    startAddTransition(async () => {
      await removeExerciseFromTemplate(teId)
      router.refresh()
    })
  }

  const handleDeleteTemplate = (id: string) => {
    startCreateTransition(async () => {
      await deleteTemplate(id)
      if (selectedTemplateId === id) setSelectedTemplateId(templates.find((t) => t.id !== id)?.id ?? null)
      router.refresh()
    })
  }

  const groupedExercises = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = []
    acc[ex.category].push(ex)
    return acc
  }, {})

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Vorlagen</h1>
        <p className="text-zinc-500 text-sm mt-1">Trainingspläne erstellen und verwalten</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vorlagen-Liste */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Meine Vorlagen</div>

          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`group flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all backdrop-blur-xl ${
                selectedTemplateId === t.id
                  ? 'bg-[#00f2fe]/8 border-[#00f2fe]/30 text-white'
                  : 'bg-black/30 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
              }`}
            >
              <span className="text-sm font-medium">{t.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600">{t.template_exercises?.length ?? 0} Ubungen</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id) }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1 rounded"
                  title="Vorlage loschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Neue Vorlage */}
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
            <div className="flex items-center justify-center h-40 text-zinc-700 text-sm border border-white/5 rounded-xl bg-black/20 backdrop-blur-xl">
              Wahle oder erstelle eine Vorlage
            </div>
          ) : (
            <div className={`${GLASS} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-white/5">
                <span className="font-medium text-white">{selectedTemplate.name}</span>
              </div>

              <div className="divide-y divide-white/5 min-h-[80px]">
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
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded"
                        title="Ubung entfernen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                {(selectedTemplate.template_exercises ?? []).length === 0 && (
                  <div className="px-5 py-6 text-zinc-700 text-sm">Noch keine Ubungen hinzugefugt.</div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-white/5 flex gap-3">
                <select
                  value={addExerciseId}
                  onChange={(e) => setAddExerciseId(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none"
                >
                  <option value="">Ubung hinzufugen...</option>
                  {Object.entries(groupedExercises).map(([category, exs]) => (
                    <optgroup key={category} label={category}>
                      {exs.map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  onClick={handleAddExercise}
                  disabled={isAdding || !addExerciseId}
                  className="bg-white/8 hover:bg-white/12 disabled:opacity-40 text-zinc-200 text-sm px-4 py-2 rounded-lg transition-colors border border-white/5"
                >
                  Hinzufugen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
