import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser, ownerKey } from '@/lib/auth'
import { validateRoutine } from '@/lib/routine'
import { claimLegacyRoutines, createRoutine, listRoutines } from '@/lib/store'

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Administrators see every routine, regular accounts only their own.
  const routines = await listRoutines(user.admin ? null : ownerKey(user.username))
  return NextResponse.json({ routines })
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const owner = ownerKey(user.username)
  // Routines saved before accounts existed belong to the first account in.
  await claimLegacyRoutines(owner)

  const routine = await createRoutine(result.name, result.steps, owner)
  return NextResponse.json({ routine }, { status: 201 })
}
