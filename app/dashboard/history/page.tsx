import { createClient } from '@/lib/supabase/server'
import WorkoutHistory from '@/components/WorkoutHistory'
import { getFullWorkoutHistory } from '@/lib/actions/workout'
import type { Exercise } from '@/lib/types'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [history, { data: exercises }] = await Promise.all([
    getFullWorkoutHistory(),
    supabase
      .from('exercises')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user!.id}`)
      .order('category')
      .order('name'),
  ])

  return (
    <WorkoutHistory
      initialHistory={history}
      exercises={(exercises as Exercise[]) ?? []}
    />
  )
}
