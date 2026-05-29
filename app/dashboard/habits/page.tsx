import HabitTracker from '@/components/HabitTracker'
import { getHabitsWithLogs } from '@/lib/actions/habits'
import { localDate } from '@/lib/utils'

export default async function HabitsPage() {
  const [habits, today] = await Promise.all([
    getHabitsWithLogs(),
    Promise.resolve(localDate()),
  ])

  return <HabitTracker habits={habits} today={today} />
}
