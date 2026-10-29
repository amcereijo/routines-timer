import { NextRequest, NextResponse } from 'next/server'
import { CODE_TTL_PRESETS, CodeTtlKey } from '@/lib/routine'
import { createCode, getRoutine, listCodesForRoutine } from '@/lib/store'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!(await getRoutine(id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const codes = await listCodesForRoutine(id)
  return NextResponse.json({ codes })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!(await getRoutine(id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let ttl: unknown
  try {
    ttl = (await req.json())?.ttl
  } catch {
    ttl = undefined
  }
  if (typeof ttl !== 'string' || !(ttl in CODE_TTL_PRESETS)) {
    return NextResponse.json({ error: 'Invalid expiration' }, { status: 400 })
  }

  const record = await createCode(id, ttl as CodeTtlKey)
  if (!record) {
    return NextResponse.json({ error: 'Could not create code' }, { status: 500 })
  }
  return NextResponse.json({ code: record }, { status: 201 })
}
