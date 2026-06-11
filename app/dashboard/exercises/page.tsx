import { createClient } from '@/lib/supabase/server'
import ExerciseLibrary from '@/components/ExerciseLibrary'
import type { Exercise } from '@/lib/types'

export default async function ExercisesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${user!.id}`)
    .order('category')
    .order('name')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-4xl uppercase leading-none text-chalk">Übungsdatenbank<span className="text-blaze">.</span></h1>
        <p className="font-mono text-xs text-chalk/45 mt-2">Globale Übungen ansehen · eigene hinzufügen, umbenennen, entfernen</p>
      </div>
      <ExerciseLibrary initialExercises={(exercises as Exercise[]) ?? []} userId={user!.id} />
    </div>
  )
}
