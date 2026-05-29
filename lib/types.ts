export interface Exercise {
  id: string
  name: string
  category: string
  user_id?: string | null
  is_archived?: boolean
}

export interface Workout {
  id: string
  user_id: string
  date: string
  split_name: string
}

export interface WorkoutLog {
  id: string
  workout_id: string
  exercise_id: string
  weight: number
  reps: number
  sets: number
  exercises?: Exercise
}

export interface CalorieEntry {
  id: string
  user_id: string
  date: string
  food_text: string
  total_kcal: number
  protein: number
  carbs: number
  fat: number
  goy_score?: number | null
  created_at?: string
}

export interface NutritionItem {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  goy_score: number
}

export interface NutritionResult {
  total_kcal: number
  protein: number
  carbs: number
  fat: number
  items: NutritionItem[]
}

export interface BodyWeight {
  id: string
  user_id: string
  date: string
  weight: number
}

export interface WorkoutTemplate {
  id: string
  user_id: string
  name: string
  template_exercises?: TemplateExercise[]
}

export interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  sort_order?: number
  order_index?: number
  exercises?: Exercise
}

export interface CalorieChartPoint {
  date: string
  kcal: number
}

export interface WeightChartPoint {
  date: string
  weight: number
}

export interface VolumeChartPoint {
  date: string
  volume: number
  oneRM: number
}

export interface WorkoutLogDetail {
  id: string
  exercise_id: string
  weight: number
  reps: number
  sets: number
  set_number: number
  is_completed: boolean
  exercises: Exercise | null
}

export interface WorkoutDetail {
  id: string
  date: string
  split_name: string
  workout_logs: WorkoutLogDetail[]
}

export interface Habit {
  id: string
  user_id: string
  name: string
  color: string
  emoji: string | null
  created_at: string
  is_archived: boolean
}

export interface HabitWithLogs extends Habit {
  completedDates: string[]
  streak: number
  completedToday: boolean
}
