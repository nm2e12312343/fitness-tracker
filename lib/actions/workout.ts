'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { localDate } from '@/lib/utils'

export async function getLastWorkoutLog(exerciseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workout_logs')
    .select('weight, reps, sets, workouts!inner(user_id, date)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', user.id)
    .order('workouts(date)', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

export async function saveWorkoutSession(data: {
  splitName: string
  date?: string
  entries: { exerciseId: string; weight: number; reps: number; sets: number }[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')
  if (data.entries.length === 0) throw new Error('Keine erledigten Satze zum Speichern')

  const workoutDate = data.date ?? localDate()

  const { data: newWorkout, error: workoutError } = await supabase
    .from('workouts')
    .insert({ user_id: user.id, date: workoutDate, split_name: data.splitName })
    .select('id')
    .single()

  if (workoutError || !newWorkout) throw new Error('Workout konnte nicht erstellt werden')

  const { error: logError } = await supabase.from('workout_logs').insert(
    data.entries.map((e) => ({
      workout_id: newWorkout.id,
      exercise_id: e.exerciseId,
      weight: e.weight,
      reps: e.reps,
      sets: e.sets,
    }))
  )

  if (logError) throw new Error('Einträge konnten nicht gespeichert werden')
  revalidatePath('/dashboard/workout')
  revalidatePath('/dashboard/progress')
}

export async function getWorkoutHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('workouts')
    .select('id, date, split_name, workout_logs(count)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  return (data ?? []).map((w) => ({
    id: w.id as string,
    date: w.date as string,
    split_name: w.split_name as string,
    set_count: (w.workout_logs as unknown as { count: number }[])[0]?.count ?? 0,
  }))
}

export async function deleteWorkout(workoutId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  await supabase.from('workout_logs').delete().eq('workout_id', workoutId)
  await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard/workout')
  revalidatePath('/dashboard/progress')
}

export async function createCustomExercise(name: string, category: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')
  if (!name.trim()) throw new Error('Name darf nicht leer sein')

  const { data, error } = await supabase
    .from('exercises')
    .insert({ name: name.trim(), category: category.trim() || 'Eigene', user_id: user.id })
    .select()
    .single()

  if (error) throw new Error('Ubung konnte nicht erstellt werden')
  revalidatePath('/dashboard/workout')
  revalidatePath('/dashboard/templates')
  return data
}

export async function createTemplate(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/templates')
  return data
}

export async function addExerciseToTemplate(templateId: string, exerciseId: string, sortOrder: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { error } = await supabase.from('template_exercises').insert({
    template_id: templateId,
    exercise_id: exerciseId,
    order_index: sortOrder,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/templates')
}

export async function removeExerciseFromTemplate(templateExerciseId: string) {
  const supabase = await createClient()
  await supabase.from('template_exercises').delete().eq('id', templateExerciseId)
  revalidatePath('/dashboard/templates')
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  await supabase
    .from('workout_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard/templates')
}
