import { json, noContent, parseJson, withApi } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { resetAll } from "@/lib/server/services/progress.service";
import { getSnapshot } from "@/lib/server/services/snapshot.service";
import { resetSchema } from "@/lib/server/schemas";

export const GET = withApi(async () => {
  const user = await requireUser();
  return json(await getSnapshot(user.id));
});

export const DELETE = withApi(async (req) => {
  const user = await requireUser();
  await parseJson(req, resetSchema);
  await resetAll(user.id);
  return noContent();
});
