import { NextRequest, NextResponse } from 'next/server'
import { resolveRateLimited } from '@/lib/rateLimit'
import { isCodeFormat, ROUTINE_DOC_VERSION, stripStepExtras } from '@/lib/routine'
import { getRoutine, resolveCode } from '@/lib/store'

const NOT_FOUND = { error: 'not_found' }

function noStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/**
 * Public resolution endpoint (spec: routine-import-codes).
 * Possession of an active code grants access; unknown, expired, malformed,
 * and orphaned codes all return the same generic 404.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!isCodeFormat(code)) {
    return noStore(NextResponse.json(NOT_FOUND, { status: 404 }))
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (await resolveRateLimited(ip)) {
    return noStore(NextResponse.json({ error: 'rate_limited' }, { status: 429 }))
  }

  const record = await resolveCode(code)
  if (!record) {
    return noStore(NextResponse.json(NOT_FOUND, { status: 404 }))
  }

  const routine = await getRoutine(record.routineId)
  if (!routine) {
    return noStore(NextResponse.json(NOT_FOUND, { status: 404 }))
  }

  return noStore(
    NextResponse.json({
      version: ROUTINE_DOC_VERSION,
      name: routine.name,
      // The watch only understands the timing fields: the web-only extras
      // (images, links) are stripped so the v1 document stays small.
      steps: stripStepExtras(routine.steps),
    })
  )
}
