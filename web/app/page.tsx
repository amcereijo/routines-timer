import Link from "next/link";
import { listRoutines } from "@/lib/store";
import LogoutButton from "./LogoutButton";
import RoutineList from "./RoutineList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const routines = await listRoutines();

  return (
    <main>
      <div className="topbar">
        <h1>Routines Timer Builder</h1>
        <LogoutButton />
      </div>
      <div className="spread" style={{ marginBottom: 14 }}>
        <h2>Saved routines</h2>
        <Link href="/routines/new">
          <button className="primary">+ New routine</button>
        </Link>
      </div>
      {routines.length === 0 ? (
        <p className="muted">No routines yet. Create one to generate import codes.</p>
      ) : (
        <RoutineList routines={routines} />
      )}
    </main>
  );
}
