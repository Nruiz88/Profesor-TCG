import { NextResponse } from 'next/server'
import { getSets } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sets = await getSets()
    return NextResponse.json({ sets })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}