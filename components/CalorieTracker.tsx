'use client'

import { useState, useTransition } from 'react'
import {
  saveBodyWeight,
  getCalorieEntriesForDate,
  saveManualCalorieEntry,
  deleteCalorieDay,
} from '@/lib/actions/calories'
import CalorieChart from '@/components/charts/CalorieChart'
import WeightChart from '@/components/charts/WeightChart'
import { Scale, Utensils, Sparkles, Check, Loader2, Pencil, Trash2, X, CalendarDays } from 'lucide-react'
import type { CalorieEntry, CalorieChartPoint, WeightChartPoint } from '@/lib/types'

interface CalorieTrackerProps {
  initialEntries: CalorieEntry[]
  calorieHistory: CalorieChartPoint[]
  weightHistory: WeightChartPoint[]
  todayWeight: number | null
  initialDate: string
}

const GLASS = 'bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]'

function formatDateDE(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function CalorieTracker({
  initialEntries,
  calorieHistory,
  weightHistory,
  todayWeight,
  initialDate,
}: CalorieTrackerProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [entries, setEntries] = useState<CalorieEntry[]>(initialEntries)
  const [foodText, setFoodText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDateLoading, startDateTransition] = useTransition()

  const [bodyWeightInput, setBodyWeightInput] = useState(todayWeight?.toString() ?? '')
  const [weightSaved, setWeightSaved] = useState(false)
  const [isWeightPending, startWeightTransition] = useTransition()

  // Manual edit mode
  const [editMode, setEditMode] = useState(false)
  const [editKcal, setEditKcal] = useState('')
  const [editProtein, setEditProtein] = useState('')
  const [editCarbs, setEditCarbs] = useState('')
  const [editFat, setEditFat] = useState('')
  const [isSavingEdit, startEditTransition] = useTransition()

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.total_kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const isToday = selectedDate === initialDate

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setEditMode(false)
    setDeleteConfirm(false)
    setError(null)
    startDateTransition(async () => {
      const data = await getCalorieEntriesForDate(date)
      setEntries(data)
    })
  }

  const handleSubmit = () => {
    if (!foodText.trim() || isPending) return
    setError(null)
    const submittedText = foodText
    startTransition(async () => {
      const res = await fetch('/api/track-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodText: submittedText, date: selectedDate }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Fehler'); return }

      const nutrition = json.nutrition
      setFoodText('')

      setEntries((prev) => [{
        id: crypto.randomUUID(),
        user_id: '',
        date: selectedDate,
        food_text: submittedText,
        total_kcal: Math.round(nutrition.total_kcal),
        protein: Math.round(nutrition.protein),
        carbs: Math.round(nutrition.carbs),
        fat: Math.round(nutrition.fat),
      }, ...prev])
    })
  }

  const handleSaveWeight = () => {
    const w = parseFloat(bodyWeightInput)
    if (isNaN(w) || w <= 0) return
    startWeightTransition(async () => {
      await saveBodyWeight(w)
      setWeightSaved(true)
      setTimeout(() => setWeightSaved(false), 2000)
    })
  }

  const openEditMode = () => {
    setEditKcal(String(totals.kcal))
    setEditProtein(String(totals.protein))
    setEditCarbs(String(totals.carbs))
    setEditFat(String(totals.fat))
    setEditMode(true)
  }

  const handleSaveManual = () => {
    const kcal = parseFloat(editKcal)
    const protein = parseFloat(editProtein)
    const carbs = parseFloat(editCarbs)
    const fat = parseFloat(editFat)
    if ([kcal, protein, carbs, fat].some(isNaN)) return
    startEditTransition(async () => {
      await saveManualCalorieEntry(selectedDate, { total_kcal: kcal, protein, carbs, fat })
      const fresh = await getCalorieEntriesForDate(selectedDate)
      setEntries(fresh)
      setEditMode(false)
    })
  }

  const handleDelete = () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    startDeleteTransition(async () => {
      await deleteCalorieDay(selectedDate)
      setEntries([])
      setDeleteConfirm(false)
    })
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header + Datepicker */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Kalorien</h1>
          <p className="text-zinc-500 text-sm mt-1">KI-gestütztes Nahrungs-Tracking</p>
        </div>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl px-3 py-2">
          <CalendarDays className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            max={initialDate}
            onChange={(e) => e.target.value && handleDateChange(e.target.value)}
            className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer"
          />
          {!isToday && (
            <button
              onClick={() => handleDateChange(initialDate)}
              className="text-[10px] text-zinc-600 hover:text-[#00f2fe] transition-colors ml-1"
            >
              Heute
            </button>
          )}
        </div>
      </div>

      {/* Tageszusammenfassung */}
      <div className={`${GLASS} overflow-hidden`}>
        {isDateLoading ? (
          <div className="flex items-center justify-center h-24 gap-2 text-zinc-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Lade Daten...
          </div>
        ) : editMode ? (
          /* Edit-Mode */
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-300">Makros manuell anpassen</span>
              <button onClick={() => setEditMode(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Kalorien', value: editKcal, setter: setEditKcal, unit: 'kcal', color: 'text-[#00f2fe]' },
                { label: 'Protein', value: editProtein, setter: setEditProtein, unit: 'g', color: 'text-blue-400' },
                { label: 'Carbs', value: editCarbs, setter: setEditCarbs, unit: 'g', color: 'text-zinc-300' },
                { label: 'Fett', value: editFat, setter: setEditFat, unit: 'g', color: 'text-zinc-400' },
              ].map(({ label, value, setter, unit, color }) => (
                <div key={label}>
                  <div className="text-xs text-zinc-600 mb-1">{label}</div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      min="0"
                      className={`w-full bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-2 py-1.5 text-sm font-semibold ${color} outline-none text-center`}
                    />
                    <span className="text-xs text-zinc-600">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveManual}
              disabled={isSavingEdit}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-900 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              style={{ background: '#00f2fe' }}
            >
              {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Speichern
            </button>
          </div>
        ) : (
          /* Normal-Mode */
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5 border-b border-white/5">
              {[
                { label: 'Kalorien', value: totals.kcal, unit: 'kcal', color: 'text-[#00f2fe]' },
                { label: 'Protein', value: totals.protein, unit: 'g', color: 'text-blue-400' },
                { label: 'Carbs', value: totals.carbs, unit: 'g', color: 'text-zinc-300' },
                { label: 'Fett', value: totals.fat, unit: 'g', color: 'text-zinc-400' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="p-4">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-semibold ${color}`}>{value}</span>
                    <span className="text-xs text-zinc-600">{unit}</span>
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 flex items-center gap-3 border-b border-white/5">
              {!isToday && (
                <span className="text-xs text-zinc-600">{formatDateDE(selectedDate)}</span>
              )}
              <button
                onClick={openEditMode}
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Bearbeiten
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || entries.length === 0}
                className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-30 ${
                  deleteConfirm ? 'text-red-400 hover:text-red-300' : 'text-zinc-600 hover:text-red-400'
                }`}
              >
                <Trash2 className="w-3 h-3" />
                {deleteConfirm ? 'Wirklich löschen?' : 'Tag löschen'}
              </button>
              {deleteConfirm && (
                <button onClick={() => setDeleteConfirm(false)} className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
                  Abbrechen
                </button>
              )}
            </div>
          </>
        )}

        {/* Mahlzeiten-Liste */}
        {!editMode && entries.length > 0 && (
          <div className="divide-y divide-white/[0.04]">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex justify-between gap-4">
                <span className="text-sm text-zinc-400 flex-1 truncate">{entry.food_text}</span>
                <div className="flex gap-3 text-xs shrink-0">
                  <span className="text-zinc-300">{entry.total_kcal} kcal</span>
                  <span className="text-blue-400 hidden sm:block">{entry.protein}g P</span>
                  <span className="text-zinc-500 hidden sm:block">{entry.carbs}g C</span>
                  <span className="text-zinc-600 hidden sm:block">{entry.fat}g F</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {!editMode && entries.length === 0 && !isDateLoading && (
          <div className="px-4 py-5 text-sm text-zinc-700">
            Keine Einträge für {formatDateDE(selectedDate)}.
          </div>
        )}
      </div>

      {/* Körpergewicht */}
      <div className={`${GLASS} p-5`}>
        <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-3">
          <Scale className="w-4 h-4 text-zinc-500" />
          Heutiges Körpergewicht
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={bodyWeightInput}
            onChange={(e) => setBodyWeightInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveWeight() }}
            placeholder="75.5"
            step="0.1"
            min="30"
            className="w-32 bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none transition-colors"
          />
          <span className="text-sm text-zinc-500">kg</span>
          <button
            onClick={handleSaveWeight}
            disabled={isWeightPending}
            className="flex items-center gap-1.5 bg-white/8 hover:bg-white/12 disabled:opacity-40 text-zinc-200 text-sm px-4 py-2 rounded-lg transition-colors border border-white/5"
          >
            {weightSaved ? <><Check className="w-3.5 h-3.5 text-[#00f2fe]" /> Gespeichert</> : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Essens-Eingabe */}
      <div className={`${GLASS} p-5`}>
        <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-3">
          <Utensils className="w-4 h-4 text-zinc-500" />
          Was hast du gegessen?
          {!isToday && <span className="ml-1 text-xs text-zinc-600">({formatDateDE(selectedDate)})</span>}
        </label>
        <div className="flex gap-3">
          <textarea
            value={foodText}
            onChange={(e) => setFoodText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
            placeholder="z.B. 200g Hahnchenbrust, 150g Reis, Brokkoli"
            rows={3}
            className="flex-1 bg-white/5 border border-white/8 focus:border-[#00f2fe]/40 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={isPending || !foodText.trim()}
            className="self-end disabled:opacity-30 text-zinc-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition-all active:scale-[0.98]"
            style={{ background: isPending ? '#00f2fe99' : '#00f2fe' }}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyse...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Analysieren
              </span>
            )}
          </button>
        </div>
        <p className="text-xs text-zinc-700 mt-2">Cmd+Enter zum Absenden</p>
        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">{error}</div>
        )}
      </div>

      {/* 30-Tage Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${GLASS} p-5`}>
          <div className="text-sm font-medium text-zinc-300 mb-1">Kalorien</div>
          <div className="text-xs text-zinc-600 mb-4">Letzte 30 Tage</div>
          <CalorieChart data={calorieHistory} />
        </div>
        <div className={`${GLASS} p-5`}>
          <div className="text-sm font-medium text-zinc-300 mb-1">Körpergewicht</div>
          <div className="text-xs text-zinc-600 mb-4">Letzte 30 Tage</div>
          <WeightChart data={weightHistory} />
        </div>
      </div>
    </div>
  )
}
