import { createClient } from '@/lib/supabase/server'
import TemplatesManager from '@/components/TemplatesManager'
import ExerciseLibrary from '@/components/ExerciseLibrary'
import TemplatesTabs from '@/components/TemplatesTabs'
import type { Exercise, WorkoutTemplate } from '@/lib/types'

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const isLibrary = tab === 'library'
  const activeTab = isLibrary ? 'library' : 'templates'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let exercises: Exercise[] = []
  let templates: WorkoutTemplate[] = []

  if (isLibrary) {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user!.id}`)
      .order('category')
      .order('name')
    exercises = (data as Exercise[]) ?? []
  } else {
    const [{ data: ex }, { data: tmpl }] = await Promise.all([
      supabase
        .from('exercises')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user!.id}`)
        .eq('is_archived', false)
        .order('category')
        .order('name'),
      supabase
        .from('workout_templates')
        .select('*, template_exercises(*, exercises(*))')
        .eq('user_id', user!.id)
        .order('name'),
    ])
    exercises = (ex as Exercise[]) ?? []
    templates = (tmpl as WorkoutTemplate[]) ?? []
  }

  return (
    <div className="animate-fade-in space-y-6">
      <header className="border-b border-chalk/15 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-chalk/40">
          {isLibrary ? 'Eigene Übungen verwalten' : 'Trainingspläne erstellen'}
        </p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-[0.9] text-chalk">
          Bibliothek<span className="text-blaze">.</span>
        </h1>
      </header>

      <TemplatesTabs activeTab={activeTab} />

      {isLibrary
        ? <ExerciseLibrary initialExercises={exercises} userId={user!.id} />
        : <TemplatesManager exercises={exercises} initialTemplates={templates} />
      }
    </div>
  )
}
