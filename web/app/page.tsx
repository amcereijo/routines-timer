import Link from "next/link";
import { ownerKey } from "@/lib/auth";
import { getServerUser } from "@/lib/currentUser";
import { listRoutines } from "@/lib/store";
import LogoutButton from "./LogoutButton";
import RoutineList from "./RoutineList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getServerUser();
  const routines = user
    ? await listRoutines(user.admin ? null : ownerKey(user.username))
    : [];

  return (
    <main>
      <div className="topbar">
        <div>
          <h1>Routines Timer</h1>
          <p className="sub">
            {user ? `Signed in as ${user.displayName}` : ""}
          </p>
        </div>
        <div className="row">
          <Link href="/routines/new">
            <button className="primary">+ New routine</button>
          </Link>
          <LogoutButton />
        </div>
      </div>

      {routines.length === 0 ? (
        <div className="empty">
          <h2>No routines yet</h2>
          <p>
            Create a routine, then share it with a public link or send it to
            your watch with an import code.
          </p>
          <div className="mt">
            <Link href="/routines/new">
              <button className="primary">Create your first routine</button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="spread" style={{ marginBottom: 12 }}>
            <h2>Saved routines</h2>
            <span className="muted">{routines.length} total</span>
          </div>
          <RoutineList routines={routines} viewer={user?.username.toLowerCase()} />
        </>
      )}
    </main>
  );
}
