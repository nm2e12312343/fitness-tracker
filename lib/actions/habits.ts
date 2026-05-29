'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { localDate } from '@/lib/utils'
import type { HabitWithLogs } from '@/lib/types'

function calcStreak(dates: Set<string>, today: string): number {
  let streak = 0
  const [y, m, d] = today.split('-').map(Number)
  const cur = new Date(y, m - 1, d)
  if (!dates.has(today)) cur.setDate(cur.getDate() - 1)
  while (true) {
    const s = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    if (!dates.has(s)) break
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

export async function getHabitsWithLogs(): Promise<HabitWithLogs[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const today = localDate()
  const since = localDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))

  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: true })

  if (!habits?.length) return []

  const { data: logs } = await supabase
    .from('habit_logs')
    .select('habit_id, date')
    .in('habit_id', habits.map((h) => h.id))
    .gte('date', since)

  const byHabit: Record<string, string[]> = {}
  for (const log of logs ?? []) {
    if (!byHabit[log.habit_id]) byHabit[log.habit_id] = []
    byHabit[log.habit_id].push(log.date)
  }

  return habits.map((habit) => {
    const dates = new Set<string>(byHabit[habit.id] ?? [])
    return {
      ...habit,
      completedDates: [...dates],
      streak: calcStreak(dates, today),
      completedToday: dates.has(today),
    }
  })
}

export async function getHabitSummaryToday(): Promise<{ done: number; total: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { done: 0, total: 0 }

  const today = localDate()

  const { data: habits } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_archived', false)

  if (!habits?.length) return { done: 0, total: 0 }

  const { data: logs } = await supabase
    .from('habit_logs')
    .select('habit_id')
    .in('habit_id', habits.map((h) => h.id))
    .eq('date', today)

  return { done: (logs ?? []).length, total: habits.length }
}

export async function toggleHabitLog(habitId: string, date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: habit } = await supabase
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!habit) throw new Error('Habit nicht gefunden')

  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', habitId)
    .eq('date', date)
    .maybeSingle()

  if (existing) {
    await supabase.from('habit_logs').delete().eq('id', existing.id)
  } else {
    await supabase.from('habit_logs').insert({ habit_id: habitId, date })
  }

  revalidatePath('/dashboard/habits')
  revalidatePath('/dashboard')
}

export async function createHabit(name: string, color: string, emoji: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')
  if (!name.trim()) throw new Error('Name darf nicht leer sein')

  const { error } = await supabase.from('habits').insert({
    user_id: user.id,
    name: name.trim(),
    color,
    emoji: emoji || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/habits')
}

export async function archiveHabit(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  await supabase
    .from('habits')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/dashboard/habits')
  revalidatePath('/dashboard')
}
