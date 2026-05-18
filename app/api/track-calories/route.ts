import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { localDate } from '@/lib/utils'
import type { NutritionResult } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  let foodText: string
  let entryDate: string
  try {
    const body = await request.json()
    foodText = body.foodText?.trim()
    entryDate = body.date ?? localDate()
    if (!foodText) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  let nutrition: NutritionResult
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 768,
      system: `Du bist ein Ernährungsexperte. Analysiere den Text und gib AUSSCHLIESSLICH dieses JSON zurück, kein Markdown, keine Erklärung:
{"total_kcal":number,"protein":number,"carbs":number,"fat":number,"items":[{"name":string,"kcal":number}]}
Jedes erkannte Lebensmittel als eigenes Item in "items" auflisten. "name" ist der Lebensmittelname inkl. Menge (z.B. "200g Hähnchenbrust").`,
      messages: [{ role: 'user', content: foodText }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Kein JSON in Antwort')
    nutrition = JSON.parse(jsonMatch[0])

    if (
      typeof nutrition.total_kcal !== 'number' ||
      typeof nutrition.protein !== 'number' ||
      typeof nutrition.carbs !== 'number' ||
      typeof nutrition.fat !== 'number' ||
      !Array.isArray(nutrition.items)
    ) {
      throw new Error('Unvollständiges JSON')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: `KI-Analyse fehlgeschlagen: ${msg}` }, { status: 422 })
  }

  const { error: dbError } = await supabase.from('calories').insert({
    user_id: user.id,
    date: entryDate,
    food_text: foodText,
    total_kcal: Math.round(nutrition.total_kcal),
    protein: Math.round(nutrition.protein),
    carbs: Math.round(nutrition.carbs),
    fat: Math.round(nutrition.fat),
  })

  if (dbError) return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 })

  return NextResponse.json({ nutrition })
}
