import { NextRequest, NextResponse } from 'next/server'
import { canAccessOwnedResource, getRequestUser } from '@/lib/auth'
import { SHARE_TTL_PRESETS, ShareTtlKey } from '@/lib/routine'
import { createShare, getRoutine, listShares } from '@/lib/store'
import { shareUrl } from '@/lib/url'

type Ctx = { params: Promise<{ id: string }> }

async function loadOwned(req: NextRequest, id: string) {
  const user = await getRequestUser(req)
  if (!user) return { user: null, routine: null, status: 401 }
  const routine = await getRoutine(id)
  if (!routine) return { user, routine: null, status: 404 }
  if (!canAccessOwnedResource(user, routine.owner)) {
    return { user, routine, status: 403 }
  }
  return { user, routine, status: 200 }
}

/** Public share links of a routine. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { status } = await loadOwned(req, id)
  if (status !== 200) {
    return NextResponse.json({ error: 'Not found' }, { status })
  }
  const shares = await listShares(id)
  return NextResponse.json({
    shares: shares.map((share) => ({
      ...share,
      url: shareUrl(req, share.token),
    })),
  })
}

/** Create a public share link for a routine. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { user, status } = await loadOwned(req, id)
  if (status !== 200 || !user) {
    return NextResponse.json({ error: 'Not found' }, { status })
  }

  let ttl: unknown
  try {
    ttl = (await req.json())?.ttl
  } catch {
    ttl = undefined
  }
  if (typeof ttl !== 'string' || !(ttl in SHARE_TTL_PRESETS)) {
    return NextResponse.json({ error: 'Invalid expiration' }, { status: 400 })
  }

  const record = await createShare(id, user.username, ttl as ShareTtlKey)
  if (!record) {
    return NextResponse.json({ error: 'Could not create link' }, { status: 500 })
  }

  return NextResponse.json(
    {
      share: {
        ...record,
        url: shareUrl(req, record.token),
      },
    },
    { status: 201 }
  )
}
