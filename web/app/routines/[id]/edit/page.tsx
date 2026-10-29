import { notFound } from "next/navigation";
import { getRoutine } from "@/lib/store";
import RoutineEditor from "../../RoutineEditor";

export const dynamic = "force-dynamic";

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const routine = await getRoutine(id);
  if (!routine) notFound();
  return <RoutineEditor mode="edit" initial={routine} />;
}
