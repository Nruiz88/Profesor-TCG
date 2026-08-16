import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = getSupabase()

  try {
    const { data: maxPos, error: posError } = await supabase
      .from('binder_pages')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
    if (posError) throw posError

    const position = (maxPos?.[0]?.position ?? -1) + 1

    const { data, error } = await supabase
      .from('binder_pages')
      .insert({ name: `Hoja ${position + 1}`, position })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ page: data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}