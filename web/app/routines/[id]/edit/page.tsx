import { notFound } from "next/navigation";
import { canAccessOwnedResource } from "@/lib/auth";
import { getServerUser } from "@/lib/currentUser";
import { getRoutine } from "@/lib/store";
import RoutineEditorLoader from "../../RoutineEditorLoader";

export const dynamic = "force-dynamic";

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const routine = await getRoutine(id);
  const user = await getServerUser();
  if (!routine || !canAccessOwnedResource(user, routine.owner)) notFound();
  return <RoutineEditorLoader mode="edit" initial={routine} />;
}
