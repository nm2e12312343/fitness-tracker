'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import {
  saveBodyWeight,
  getCalorieEntriesForDate,
  updateCalorieEntry,
  deleteCalorieEntry,
  deleteCalorieDay,
} from '@/lib/actions/calories'
import CalorieChart from '@/components/charts/CalorieChart'
import WeightChart from '@/components/charts/WeightChart'
import {
  Scale, Utensils, Sparkles, Check, Loader2, Pencil, Trash2, X,
  CalendarDays, Salad, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { CalorieEntry, CalorieChartPoint, WeightChartPoint, NutritionItem } from '@/lib/types'

interface CalorieTrackerProps {
  initialEntries: CalorieEntry[]
  calorieHistory: CalorieChartPoint[]
  weightHistory: WeightChartPoint[]
  todayWeight: number | null
  initialDate: string
}

const CARD = 'rounded-2xl border border-white/10 bg-zinc-950'
const INPUT = 'bg-zinc-900 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none transition-colors'

function GoyBarometer({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDisplayScore(Math.min(100, Math.max(0, score))), 80)
    return () => clearTimeout(t)
  }, [score])

  const R = 70
  const CX = 90
  const CY = 88
  const HALF_CIRC = Math.PI * R
  const dashOffset = HALF_CIRC * (1 - displayScore / 100)

  const tipAngle = Math.PI * (1 - displayScore / 100)
  const tipX = CX + R * Math.cos(tipAngle)
  const tipY = CY - R * Math.sin(tipAngle)

  const tier =
    score < 30 ? { label: 'Based', color: '#10b981' }
    : score < 60 ? { label: 'Lil Goy', color: '#eab308' }
    : score < 80 ? { label: 'Goy', color: '#f97316' }
    : { label: 'Giga Goy', color: '#ef4444' }

  const easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  const duration = '1.2s'

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
          Tages-Goy-Score
        </p>
        <svg viewBox="0 0 180 110" className="w-56 h-auto" fill="none" aria-label={`Goy Score: ${score}`}>
          <defs>
            <linearGradient id="goyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="72%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path
            d={`M 20,${CY} A ${R},${R} 0 0,1 160,${CY}`}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d={`M 20,${CY} A ${R},${R} 0 0,1 160,${CY}`}
            stroke="url(#goyGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${HALF_CIRC} ${HALF_CIRC}`}
            strokeDashoffset={dashOffset}
            style={{ transition: `stroke-dashoffset ${duration} ${easing}` }}
          />
          <circle
            cx={tipX} cy={tipY} r="9"
            fill={tier.color} opacity="0.25"
            style={{ transition: `cx ${duration} ${easing}, cy ${duration} ${easing}` }}
          />
          <circle
            cx={tipX} cy={tipY} r="5"
            fill={tier.color}
            style={{ transition: `cx ${duration} ${easing}, cy ${duration} ${easing}` }}
          />
          <text x="90" y="68" textAnchor="middle" fill="#f4f4f5"
            fontSize="28" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
            {score}
          </text>
          <text x="90" y="83" textAnchor="middle" fill={tier.color}
            fontSize="11" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.05em">
            {tier.label}
          </text>
          <text x="14" y="107" textAnchor="middle" fill="rgba(255,255,255,0.25)"
            fontSize="8" fontFamily="system-ui, -apple-system, sans-serif">Based</text>
          <text x="166" y="107" textAnchor="middle" fill="rgba(255,255,255,0.25)"
            fontSize="8" fontFamily="system-ui, -apple-system, sans-serif">Goy</text>
        </svg>
        <p className="text-xs text-white/30 -mt-1">Ø Verarbeitungsgrad heute</p>
      </div>
    </div>
  )
}

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
  const [isPending, startTransition] = useTransition()
  const [isDateLoading, startDateTransition] = useTransition()

  const [bodyWeightInput, setBodyWeightInput] = useState(todayWeight?.toString() ?? '')
  const [isWeightPending, startWeightTransition] = useTransition()

  const [editingEntry, setEditingEntry] = useState<CalorieEntry | null>(null)
  const [editItemFoodText, setEditItemFoodText] = useState('')
  const [editItemKcal, setEditItemKcal] = useState('')
  const [editItemProtein, setEditItemProtein] = useState('')
  const [editItemCarbs, setEditItemCarbs] = useState('')
  const [editItemFat, setEditItemFat] = useState('')
  const [isSavingItemEdit, startItemEditTransition] = useTransition()

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeletingItem, startDeleteItemTransition] = useTransition()

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const [lastAnalysis, setLastAnalysis] = useState<NutritionItem[] | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)

  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.total_kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const scoredEntries = entries.filter((e) => e.goy_score != null)
  const dailyGoyScore = scoredEntries.length > 0
    ? Math.round(scoredEntries.reduce((sum, e) => sum + (e.goy_score ?? 0), 0) / scoredEntries.length)
    : null

  const isToday = selectedDate === initialDate

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setEditingEntry(null)
    setDeleteConfirm(false)
    setDeleteConfirmId(null)
    setLastAnalysis(null)
    setShowAnalysis(false)
    startDateTransition(async () => {
      const data = await getCalorieEntriesForDate(date)
      setEntries(data)
    })
  }

  const handleSubmit = () => {
    if (!foodText.trim() || isPending) return
    const submittedText = foodText
    setLastAnalysis(null)
    setShowAnalysis(false)
    startTransition(async () => {
      const res = await fetch('/api/track-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodText: submittedText, date: selectedDate }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Analyse fehlgeschlagen')
        return
      }
      const nutrition = json.nutrition
      setFoodText('')
      if (nutrition.items?.length) {
        setLastAnalysis(nutrition.items)
        setShowAnalysis(true)
      }
      const count = json.entries?.length ?? 1
      toast.success(`${count} Lebensmittel gespeichert`)
      if (json.entries?.length) {
        setEntries((prev) => [...json.entries, ...prev])
      }
    })
  }

  const handleSaveWeight = () => {
    const w = parseFloat(bodyWeightInput)
    if (isNaN(w) || w <= 0) return
    startWeightTransition(async () => {
      await saveBodyWeight(w)
      toast.success('Gewicht gespeichert')
    })
  }

  const openItemEdit = (entry: CalorieEntry) => {
    setEditingEntry(entry)
    setEditItemFoodText(entry.food_text)
    setEditItemKcal(String(entry.total_kcal))
    setEditItemProtein(String(entry.protein))
    setEditItemCarbs(String(entry.carbs))
    setEditItemFat(String(entry.fat))
    setDeleteConfirmId(null)
  }

  const handleSaveItemEdit = () => {
    if (!editingEntry) return
    const kcal = parseFloat(editItemKcal)
    const protein = parseFloat(editItemProtein)
    const carbs = parseFloat(editItemCarbs)
    const fat = parseFloat(editItemFat)
    if ([kcal, protein, carbs, fat].some(isNaN)) return
    startItemEditTransition(async () => {
      await updateCalorieEntry(editingEntry.id, {
        food_text: editItemFoodText,
        total_kcal: kcal,
        protein,
        carbs,
        fat,
      })
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingEntry.id
            ? { ...e, food_text: editItemFoodText, total_kcal: Math.round(kcal), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) }
            : e
        )
      )
      setEditingEntry(null)
      toast.success('Eintrag aktualisiert')
    })
  }

  const handleDeleteItem = (id: string) => {
    if (deleteConfirmId !== id) { setDeleteConfirmId(id); return }
    startDeleteItemTransition(async () => {
      await deleteCalorieEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setDeleteConfirmId(null)
      toast.success('Eintrag gelöscht')
    })
  }

  const handleDelete = () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    startDeleteTransition(async () => {
      await deleteCalorieDay(selectedDate)
      setEntries([])
      setDeleteConfirm(false)
      toast.success('Einträge gelöscht')
    })
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <header className="flex items-end justify-between gap-4 flex-wrap border-b border-white/10 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
            KI-gestütztes Nahrungs-Tracking
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-none tracking-tighter text-white">
            Kalorien.
          </h1>
        </div>
        {/* Datepicker */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2">
          <CalendarDays className="w-3.5 h-3.5 text-white/30 shrink-0" />
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
              className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40 hover:text-white transition-colors ml-1"
            >
              Heute
            </button>
          )}
        </div>
      </header>

      {/* Edit-Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setEditingEntry(null)}>
          <div className={`${CARD} p-6 w-full max-w-md mx-4`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Eintrag bearbeiten
              </p>
              <button onClick={() => setEditingEntry(null)} className="text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">Bezeichnung</p>
              <input
                type="text"
                value={editItemFoodText}
                onChange={(e) => setEditItemFoodText(e.target.value)}
                className={INPUT}
                style={{ width: '100%' }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Kalorien', value: editItemKcal, setter: setEditItemKcal, unit: 'kcal', color: 'text-[#00f2fe]' },
                { label: 'Protein', value: editItemProtein, setter: setEditItemProtein, unit: 'g', color: 'text-violet-400' },
                { label: 'Carbs', value: editItemCarbs, setter: setEditItemCarbs, unit: 'g', color: 'text-emerald-400' },
                { label: 'Fett', value: editItemFat, setter: setEditItemFat, unit: 'g', color: 'text-amber-400' },
              ].map(({ label, value, setter, unit, color }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-2">{label}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      min="0"
                      className={`w-full bg-zinc-900 border border-white/10 focus:border-white/30 rounded-lg px-2 py-1.5 text-sm font-bold ${color} outline-none text-center transition-colors`}
                    />
                    <span className="text-xs text-white/30">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveItemEdit}
              disabled={isSavingItemEdit}
              className="flex items-center gap-1.5 bg-[#ccff00] text-black text-sm font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {isSavingItemEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* Tageszusammenfassung */}
      <div className={`${CARD} overflow-hidden`}>
        {isDateLoading ? (
          <div className="flex items-center justify-center h-24 gap-2 text-white/30 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Lade Daten...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5 border-b border-white/5">
              {[
                { label: 'Kalorien', value: totals.kcal, unit: 'kcal', color: 'text-[#00f2fe]' },
                { label: 'Protein', value: totals.protein, unit: 'g', color: 'text-violet-400' },
                { label: 'Carbs', value: totals.carbs, unit: 'g', color: 'text-emerald-400' },
                { label: 'Fett', value: totals.fat, unit: 'g', color: 'text-amber-400' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="p-5">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold tracking-tighter tabular-nums ${color}`}>{value}</span>
                    <span className="text-xs text-white/30">{unit}</span>
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-2.5 flex items-center gap-3 border-b border-white/5">
              {!isToday && (
                <span className="text-xs text-white/30">{formatDateDE(selectedDate)}</span>
              )}
              <button
                onClick={handleDelete}
                disabled={isDeleting || entries.length === 0}
                className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-30 ${
                  deleteConfirm ? 'text-red-400 hover:text-red-300' : 'text-white/30 hover:text-red-400'
                }`}
              >
                <Trash2 className="w-3 h-3" />
                {deleteConfirm ? 'Wirklich löschen?' : 'Tag löschen'}
              </button>
              {deleteConfirm && (
                <button onClick={() => setDeleteConfirm(false)} className="text-xs text-white/20 hover:text-white/50 transition-colors">
                  Abbrechen
                </button>
              )}
            </div>
          </>
        )}

        {entries.length > 0 && !isDateLoading && (
          <div className="divide-y divide-white/[0.04]">
            {entries.map((entry) => (
              <div key={entry.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm text-zinc-400 truncate">{entry.food_text}</span>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  <span className="text-zinc-300 tabular-nums">{entry.total_kcal} kcal</span>
                  <span className="text-violet-400 hidden sm:block tabular-nums">{entry.protein}g P</span>
                  <span className="text-emerald-400 hidden sm:block tabular-nums">{entry.carbs}g C</span>
                  <span className="text-amber-400 hidden sm:block tabular-nums">{entry.fat}g F</span>
                  <div className="flex items-center gap-0.5 ml-1 border-l border-white/[0.06] pl-2">
                    <button
                      onClick={() => openItemEdit(entry)}
                      title="Bearbeiten"
                      className="p-1 text-white/25 hover:text-white transition-colors rounded"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(entry.id)}
                      disabled={isDeletingItem}
                      title={deleteConfirmId === entry.id ? 'Nochmal klicken zum Bestätigen' : 'Löschen'}
                      className={`p-1 transition-colors rounded disabled:opacity-30 ${
                        deleteConfirmId === entry.id ? 'text-red-400 hover:text-red-300' : 'text-white/25 hover:text-red-400'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {entries.length === 0 && !isDateLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="p-3 rounded-2xl bg-zinc-900 border border-white/10">
              <Salad className="w-6 h-6 text-white/30" />
            </div>
            <div className="text-center">
              <p className="text-sm text-white/40">Noch nichts getrackt</p>
              <p className="text-xs text-white/20 mt-0.5">{formatDateDE(selectedDate)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Goy-Score Barometer */}
      {dailyGoyScore !== null && <GoyBarometer score={dailyGoyScore} />}

      {/* Körpergewicht */}
      <div className={`${CARD} p-6`}>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40 mb-4">
          <Scale className="w-3.5 h-3.5" />
          Heutiges Körpergewicht
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={bodyWeightInput}
            onChange={(e) => setBodyWeightInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveWeight() }}
            placeholder="75.5"
            step="0.1"
            min="30"
            className={`w-32 ${INPUT}`}
          />
          <span className="text-sm text-white/30">kg</span>
          <button
            onClick={handleSaveWeight}
            disabled={isWeightPending}
            className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 hover:border-white/25 disabled:opacity-40 text-zinc-200 text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {isWeightPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Essens-Eingabe */}
      <div className={`${CARD} p-6`}>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40 mb-4">
          <Utensils className="w-3.5 h-3.5" />
          Was hast du gegessen?
          {!isToday && <span className="ml-1 normal-case font-normal tracking-normal text-white/20">({formatDateDE(selectedDate)})</span>}
        </p>
        <div className="flex gap-3">
          <textarea
            value={foodText}
            onChange={(e) => setFoodText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
            placeholder="z.B. 200g Hähnchenbrust, 150g Reis, Brokkoli"
            rows={3}
            className="flex-1 bg-zinc-900 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-white/20 outline-none resize-none transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={isPending || !foodText.trim()}
            className="self-end disabled:opacity-30 bg-[#ccff00] text-black text-sm font-bold px-4 py-2.5 rounded-xl transition-all active:scale-[0.98] whitespace-nowrap"
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
        <p className="text-[10px] font-medium text-white/20 mt-2 uppercase tracking-[0.15em]">
          Cmd+Enter zum Absenden
        </p>

        {lastAnalysis && lastAnalysis.length > 0 && (
          <div className="mt-4 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <span className="font-semibold uppercase tracking-[0.15em]">
                KI-Aufschlüsselung ({lastAnalysis.length} Zutaten)
              </span>
              {showAnalysis ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showAnalysis && (
              <div className="border-t border-white/5 divide-y divide-white/[0.04]">
                {lastAnalysis.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs text-zinc-500 truncate flex-1 pr-2">{item.name}</span>
                    <span className="text-xs text-zinc-400 tabular-nums shrink-0">{item.kcal} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 30-Tage Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${CARD} p-6`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40 mb-1">Kalorien</p>
          <p className="text-sm font-bold tracking-tight text-white mb-5">Letzte 30 Tage</p>
          <CalorieChart data={calorieHistory} />
        </div>
        <div className={`${CARD} p-6`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40 mb-1">Körpergewicht</p>
          <p className="text-sm font-bold tracking-tight text-white mb-5">Letzte 30 Tage</p>
          <WeightChart data={weightHistory} />
        </div>
      </div>
    </div>
  )
}
