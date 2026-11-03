import { NextRequest, NextResponse } from 'next/server'
import { canAccessOwnedResource, getRequestUser } from '@/lib/auth'
import { CODE_TTL_PRESETS, CodeTtlKey } from '@/lib/routine'
import { createCode, getRoutine, listCodesForRoutine } from '@/lib/store'

type Ctx = { params: Promise<{ id: string }> }

async function loadOwned(req: NextRequest, id: string) {
  const user = await getRequestUser(req)
  if (!user) return { routine: null, status: 401 }
  const routine = await getRoutine(id)
  if (!routine) return { routine: null, status: 404 }
  if (!canAccessOwnedResource(user, routine.owner)) {
    return { routine, status: 403 }
  }
  return { routine, status: 200 }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { status } = await loadOwned(req, id)
  if (status !== 200) {
    return NextResponse.json({ error: 'Not found' }, { status })
  }
  const codes = await listCodesForRoutine(id)
  return NextResponse.json({ codes })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { status } = await loadOwned(req, id)
  if (status !== 200) {
    return NextResponse.json({ error: 'Not found' }, { status })
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
