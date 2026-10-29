import { NextRequest, NextResponse } from 'next/server'
import { validateRoutine } from '@/lib/routine'
import { deleteRoutine, getRoutine, updateRoutine } from '@/lib/store'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!(await getRoutine(id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
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

  const routine = await updateRoutine(id, result.name, result.steps)
  return NextResponse.json({ routine })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const deleted = await deleteRoutine(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return new NextResponse(null, { status: 204 })
}
