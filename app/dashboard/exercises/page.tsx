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
        <h1 className="text-xl font-semibold text-zinc-100">Übungsdatenbank</h1>
        <p className="text-sm text-zinc-500 mt-1">Eigene Übungen hinzufügen, umbenennen oder entfernen</p>
      </div>
      <ExerciseLibrary initialExercises={(exercises as Exercise[]) ?? []} />
    </div>
  )
}
