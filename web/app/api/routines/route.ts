import { NextRequest, NextResponse } from 'next/server'
import { validateRoutine } from '@/lib/routine'
import { createRoutine } from '@/lib/store'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { errors: { body: 'Invalid JSON' } },
      { status: 400 }
    )
  }

  const result = validateRoutine(body)
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 })
  }

  const routine = await createRoutine(result.name, result.steps)
  return NextResponse.json({ routine }, { status: 201 })
}
