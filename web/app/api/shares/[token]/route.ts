import { NextRequest, NextResponse } from 'next/server'
import { canAccessOwnedResource, getRequestUser } from '@/lib/auth'
import { deleteShare, getRoutine, getShare } from '@/lib/store'

type Ctx = { params: Promise<{ token: string }> }

/**
 * Discard a public share link. Only the owner of the routine (or an
 * administrator) may discard it — the link dies immediately and the public
 * page returns 404 from then on.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params
  const user = await getRequestUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const share = await getShare(token)
  if (!share) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const routine = await getRoutine(share.routineId)
  if (!routine || !canAccessOwnedResource(user, routine.owner)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteShare(token)
  return new NextResponse(null, { status: 204 })
}
