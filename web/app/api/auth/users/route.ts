import { NextResponse } from 'next/server'
import { getAuthMode, getUsers, publicUser } from '@/lib/users'

/**
 * Public list of the accounts that can sign in (usernames only — never
 * passwords). The login form uses it to offer a picker instead of a free-text
 * field.
 */
export async function GET() {
  const mode = getAuthMode()
  if (mode === 'none') {
    return NextResponse.json({ mode, users: [] })
  }
  return NextResponse.json({
    mode,
    users: getUsers().map(publicUser),
  })
}
