import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    version: 'f43a1f5',
    features: ['uebungen-tab', 'per-user-exercises', 'sw-disabled', 'exercises-page'],
    deployed: new Date().toISOString(),
  })
}
