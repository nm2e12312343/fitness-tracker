import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    version: '0756716',
    features: ['uebungen-tab', 'per-user-exercises', 'sw-disabled'],
    deployed: new Date().toISOString(),
  })
}
