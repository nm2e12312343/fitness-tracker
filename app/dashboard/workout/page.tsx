import { createClient } from '@/lib/supabase/server'
import WorkoutTracker from '@/components/WorkoutTracker'
import type { Exercise, WorkoutTemplate } from '@/lib/types'

export default async function WorkoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: exercises }, { data: templates }] = await Promise.all([
    supabase
      .from('exercises')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user!.id}`)
      .order('category')
      .order('name'),
    supabase
      .from('workout_templates')
      .select('*, template_exercises(*, exercises(*))')
      .eq('user_id', user!.id)
      .order('name'),
  ])

  return (
    <WorkoutTracker
      exercises={(exercises as Exercise[]) ?? []}
      templates={(templates as WorkoutTemplate[]) ?? []}
    />
  )
}
