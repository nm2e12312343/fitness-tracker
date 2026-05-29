import { createClient } from '@/lib/supabase/server'
import CalorieTracker from '@/components/CalorieTracker'
import { getCalorieHistory, getWeightHistory } from '@/lib/actions/calories'
import { localDate } from '@/lib/utils'
import type { CalorieEntry } from '@/lib/types'

export default async function CaloriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = localDate()

  const [{ data: todayEntries }, calorieHistory, weightHistory, { data: todayWeightRow }] =
    await Promise.all([
      supabase
        .from('calories')
        .select('*')
        .eq('user_id', user!.id)
        .eq('date', today)
        .order('created_at', { ascending: false }),
      getCalorieHistory(user!.id),
      getWeightHistory(user!.id),
      supabase
        .from('body_weights')
        .select('weight')
        .eq('user_id', user!.id)
        .eq('date', today)
        .maybeSingle(),
    ])

  return (
    <CalorieTracker
      initialEntries={(todayEntries as CalorieEntry[]) ?? []}
      calorieHistory={calorieHistory}
      weightHistory={weightHistory}
      todayWeight={todayWeightRow?.weight ?? null}
      initialDate={today}
    />
  )
}
