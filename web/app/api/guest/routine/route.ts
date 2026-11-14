import { NextRequest, NextResponse } from 'next/server'
import { readGuestToken } from '@/lib/guestSession'
import { getGuestRoutineByWorkspace, replaceGuestRoutine } from '@/lib/guestStore'
import { guestSaveRateLimited } from '@/lib/rateLimit'
import { validateRoutine } from '@/lib/routine'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/** The routine of this guest workspace; null when there is none (yet). */
export async function GET(req: NextRequest) {
  const token = readGuestToken(req)
  if (!token) {
    return NextResponse.json({ error: 'No guest session' }, { status: 401 })
  }

  const routine = await getGuestRoutineByWorkspace(token)
  return NextResponse.json({
    routine: routine
      ? {
          id: routine.id,
          name: routine.name,
          steps: routine.steps,
          createdAt: routine.createdAt,
          expiresAt: routine.expiresAt,
        }
      : null,
  })
}

/**
 * Save the guest routine.
 *
 * Every save replaces the previous routine: the guest keeps exactly one
 * routine at a time, and the codes of the replaced routine stop working.
 */
async function save(req: NextRequest) {
  const token = readGuestToken(req)
  if (!token) {
    return NextResponse.json({ error: 'No guest session' }, { status: 401 })
  }

  if (await guestSaveRateLimited(clientIp(req))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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

  const routine = await replaceGuestRoutine(token, result.name, result.steps)
  return NextResponse.json(
    {
      routine: {
        id: routine.id,
        name: routine.name,
        steps: routine.steps,
        createdAt: routine.createdAt,
        expiresAt: routine.expiresAt,
      },
    },
    { status: 201 }
  )
}

export async function POST(req: NextRequest) {
  return save(req)
}

export async function PUT(req: NextRequest) {
  return save(req)
}

export async function PATCH(req: NextRequest) {
  return save(req)
}
