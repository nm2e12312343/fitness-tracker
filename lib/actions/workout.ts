'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { localDate } from '@/lib/utils'
import type { WorkoutDetail } from '@/lib/types'

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
  if (data.entries.length === 0) throw new Error('Keine erledigten Sätze zum Speichern')

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
  revalidatePath('/dashboard/history')
  revalidatePath('/dashboard/progress')
}

export async function getFullWorkoutHistory(limit = 100) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('workouts')
    .select('id, date, split_name, workout_logs(count)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(limit)

  return (data ?? []).map((w) => ({
    id: w.id as string,
    date: w.date as string,
    split_name: w.split_name as string,
    set_count: (w.workout_logs as unknown as { count: number }[])[0]?.count ?? 0,
  }))
}

export async function getWorkoutDetail(workoutId: string): Promise<WorkoutDetail | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workouts')
    .select('id, date, split_name, workout_logs(id, exercise_id, weight, reps, sets, exercises(id, name, category))')
    .eq('id', workoutId)
    .eq('user_id', user.id)
    .maybeSingle()

  return data as WorkoutDetail | null
}

export async function updateWorkoutLog(logId: string, values: { weight: number; reps: number; sets: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: log } = await supabase
    .from('workout_logs')
    .select('workout_id')
    .eq('id', logId)
    .maybeSingle()

  if (!log) throw new Error('Eintrag nicht gefunden')

  const { data: workout } = await supabase
    .from('workouts')
    .select('id')
    .eq('id', log.workout_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!workout) throw new Error('Keine Berechtigung')

  const { error } = await supabase
    .from('workout_logs')
    .update({ weight: values.weight, reps: values.reps, sets: values.sets })
    .eq('id', logId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/history')
  revalidatePath('/dashboard/progress')
}

export async function deleteWorkoutLog(logId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: log } = await supabase
    .from('workout_logs')
    .select('workout_id')
    .eq('id', logId)
    .maybeSingle()

  if (!log) throw new Error('Eintrag nicht gefunden')

  const { data: workout } = await supabase
    .from('workouts')
    .select('id')
    .eq('id', log.workout_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!workout) throw new Error('Keine Berechtigung')

  await supabase.from('workout_logs').delete().eq('id', logId)
  revalidatePath('/dashboard/history')
  revalidatePath('/dashboard/progress')
}

export async function deleteWorkout(workoutId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  // Verify ownership before touching any rows
  const { data: workout } = await supabase
    .from('workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!workout) throw new Error('Training nicht gefunden oder keine Berechtigung')

  await supabase.from('workout_logs').delete().eq('workout_id', workoutId)
  await supabase.from('workouts').delete().eq('id', workoutId).eq('user_id', user.id)

  revalidatePath('/dashboard/workout')
  revalidatePath('/dashboard/history')
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

  if (error) throw new Error('Übung konnte nicht erstellt werden')
  revalidatePath('/dashboard/exercises')
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

  // Verify template belongs to this user
  const { data: template } = await supabase
    .from('workout_templates')
    .select('id')
    .eq('id', templateId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!template) throw new Error('Vorlage nicht gefunden oder keine Berechtigung')

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  // Get the template_exercise to find its template
  const { data: te } = await supabase
    .from('template_exercises')
    .select('template_id')
    .eq('id', templateExerciseId)
    .maybeSingle()

  if (!te) return // nothing to do

  // Verify the template belongs to this user
  const { data: template } = await supabase
    .from('workout_templates')
    .select('id')
    .eq('id', te.template_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!template) throw new Error('Keine Berechtigung')

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

export async function updateExerciseName(id: string, newName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: existing } = await supabase.from('exercises').select('user_id').eq('id', id).maybeSingle()
  if (!existing || existing.user_id !== user.id) throw new Error('Keine Berechtigung')

  const { error } = await supabase
    .from('exercises')
    .update({ name: newName.trim() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/exercises')
  revalidatePath('/dashboard/templates')
  revalidatePath('/dashboard/workout')
  revalidatePath('/dashboard/history')
}

export async function deleteOrArchiveExercise(id: string): Promise<{ archived: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: existing } = await supabase.from('exercises').select('user_id').eq('id', id).maybeSingle()
  if (!existing || existing.user_id !== user.id) throw new Error('Keine Berechtigung')

  const { count: logCount } = await supabase
    .from('workout_logs')
    .select('id', { count: 'exact', head: true })
    .eq('exercise_id', id)

  const hasLogs = (logCount ?? 0) > 0

  if (hasLogs) {
    const { error } = await supabase.from('exercises').update({ is_archived: true }).eq('id', id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/exercises')
    revalidatePath('/dashboard/templates')
    revalidatePath('/dashboard/workout')
    return { archived: true }
  }

  await supabase.from('template_exercises').delete().eq('exercise_id', id)
  const { error } = await supabase.from('exercises').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/exercises')
  revalidatePath('/dashboard/templates')
  revalidatePath('/dashboard/workout')
  return { archived: false }
}

export async function restoreExercise(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: existing } = await supabase.from('exercises').select('user_id').eq('id', id).maybeSingle()
  if (!existing || existing.user_id !== user.id) throw new Error('Keine Berechtigung')

  const { error } = await supabase.from('exercises').update({ is_archived: false }).eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/exercises')
  revalidatePath('/dashboard/templates')
  revalidatePath('/dashboard/workout')
}
