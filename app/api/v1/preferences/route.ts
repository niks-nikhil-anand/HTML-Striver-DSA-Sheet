import { json, parseJson, withApi } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { patchPreferences } from "@/lib/server/services/preferences.service";
import { patchPreferencesSchema } from "@/lib/server/schemas";

export const PATCH = withApi(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, patchPreferencesSchema);
  return json(await patchPreferences(user.id, body));
});
