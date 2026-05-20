import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    version: '919b9f5',
    features: ['uebungen-tab', 'per-user-exercises', 'sw-disabled'],
    deployed: new Date().toISOString(),
  })
}
