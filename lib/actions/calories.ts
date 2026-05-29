'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { localDate } from '@/lib/utils'
import type { CalorieEntry } from '@/lib/types'

export async function saveBodyWeight(weight: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  await supabase
    .from('body_weights')
    .upsert({ user_id: user.id, date: localDate(), weight }, { onConflict: 'user_id,date' })

  revalidatePath('/dashboard/calories')
  revalidatePath('/dashboard/progress')
}

export async function getCalorieEntriesForDate(date: string): Promise<CalorieEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('calories')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: false })

  return (data ?? []) as CalorieEntry[]
}

export async function saveManualCalorieEntry(
  date: string,
  values: { total_kcal: number; protein: number; carbs: number; fat: number }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  await supabase.from('calories').delete().eq('user_id', user.id).eq('date', date)

  const { error } = await supabase.from('calories').insert({
    user_id: user.id,
    date,
    food_text: 'Manuell eingetragen',
    total_kcal: Math.round(values.total_kcal),
    protein: Math.round(values.protein),
    carbs: Math.round(values.carbs),
    fat: Math.round(values.fat),
  })

  if (error) throw new Error('Fehler beim Speichern')
  revalidatePath('/dashboard/calories')
}

export async function updateCalorieEntry(
  id: string,
  values: { food_text: string; total_kcal: number; protein: number; carbs: number; fat: number }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { error } = await supabase
    .from('calories')
    .update({
      food_text: values.food_text,
      total_kcal: Math.round(values.total_kcal),
      protein: Math.round(values.protein),
      carbs: Math.round(values.carbs),
      fat: Math.round(values.fat),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error('Fehler beim Aktualisieren')
  revalidatePath('/dashboard/calories')
}

export async function deleteCalorieEntry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  await supabase.from('calories').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/calories')
}

export async function deleteCalorieDay(date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  await supabase.from('calories').delete().eq('user_id', user.id).eq('date', date)
  revalidatePath('/dashboard/calories')
}

export async function getCalorieHistory(userId: string) {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sinceStr = localDate(since)

  const { data } = await supabase
    .from('calories')
    .select('date, total_kcal')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  const grouped: Record<string, number> = {}
  for (const row of data ?? []) {
    grouped[row.date] = (grouped[row.date] ?? 0) + row.total_kcal
  }
  return Object.entries(grouped).map(([date, kcal]) => ({ date, kcal }))
}

export async function getWeightHistory(userId: string) {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const { data } = await supabase
    .from('body_weights')
    .select('date, weight')
    .eq('user_id', userId)
    .gte('date', localDate(since))
    .order('date', { ascending: true })

  return (data ?? []).map((r) => ({ date: r.date, weight: r.weight }))
}
