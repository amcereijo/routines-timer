import { NextRequest, NextResponse } from 'next/server'
import { canAccessOwnedResource, getRequestUser } from '@/lib/auth'
import { validateRoutine } from '@/lib/routine'
import { deleteRoutine, getRoutine, updateRoutine } from '@/lib/store'

type Ctx = { params: Promise<{ id: string }> }

async function loadOwned(req: NextRequest, id: string) {
  const user = await getRequestUser(req)
  if (!user) {
    return { user: null, routine: null, status: 401 }
  }
  const routine = await getRoutine(id)
  if (!routine) {
    return { user, routine: null, status: 404 }
  }
  if (!canAccessOwnedResource(user, routine.owner)) {
    return { user, routine, status: 403 }
  }
  return { user, routine, status: 200 }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { routine, status } = await loadOwned(req, id)
  if (status !== 200) {
    return NextResponse.json({ error: 'Not found' }, { status })
  }
  return NextResponse.json({ routine })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { status } = await loadOwned(req, id)
  if (status !== 200) {
    return NextResponse.json({ error: 'Not found' }, { status })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ errors: { body: 'Invalid JSON' } }, { status: 400 })
  }

  const result = validateRoutine(body)
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 })
  }

  const updated = await updateRoutine(id, result.name, result.steps)
  return NextResponse.json({ routine: updated })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { status } = await loadOwned(req, id)
  if (status !== 200) {
    return NextResponse.json({ error: 'Not found' }, { status })
  }
  const deleted = await deleteRoutine(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return new NextResponse(null, { status: 204 })
}
