import { NextRequest, NextResponse } from 'next/server'
import { GUEST_COOKIE, readGuestToken } from '@/lib/guestSession'
import { deleteGuestRoutineByWorkspace } from '@/lib/guestStore'

/**
 * Leave endpoint (spec: web-guest-routines).
 *
 * The browser sends this with `navigator.sendBeacon` when the guest closes
 * or leaves the page: the routine and its import codes are deleted at once,
 * and the workspace cookie is dropped. The request carries no body, so it
 * must not parse one.
 */
export async function POST(req: NextRequest) {
  const token = readGuestToken(req)
  if (token) {
    await deleteGuestRoutineByWorkspace(token)
  }

  const res = new NextResponse(null, { status: 204 })
  res.cookies.delete(GUEST_COOKIE)
  return res
}
