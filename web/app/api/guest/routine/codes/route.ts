import { NextRequest, NextResponse } from 'next/server'
import { readGuestToken } from '@/lib/guestSession'
import {
  createGuestCode,
  getGuestRoutineByWorkspace,
  listGuestCodes,
} from '@/lib/guestStore'
import { guestCodeRateLimited } from '@/lib/rateLimit'
import { CODE_TTL_PRESETS, CodeTtlKey } from '@/lib/routine'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/** Active import codes of the guest routine. */
export async function GET(req: NextRequest) {
  const token = readGuestToken(req)
  if (!token) {
    return NextResponse.json({ error: 'No guest session' }, { status: 401 })
  }

  const routine = await getGuestRoutineByWorkspace(token)
  if (!routine) {
    return NextResponse.json({ codes: [] })
  }

  const codes = await listGuestCodes(routine.id)
  return NextResponse.json({ codes })
}

/**
 * Mint an import code for the guest routine.
 *
 * A guest routine can only be transferred to the watch — there is no public
 * share link for it. The code never outlives the routine.
 */
export async function POST(req: NextRequest) {
  const token = readGuestToken(req)
  if (!token) {
    return NextResponse.json({ error: 'No guest session' }, { status: 401 })
  }

  if (await guestCodeRateLimited(clientIp(req))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const routine = await getGuestRoutineByWorkspace(token)
  if (!routine) {
    return NextResponse.json({ error: 'No routine' }, { status: 404 })
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

  const record = await createGuestCode(routine.id, ttl as CodeTtlKey)
  if (!record) {
    return NextResponse.json({ error: 'Could not create code' }, { status: 500 })
  }
  return NextResponse.json({ code: record }, { status: 201 })
}
