import { json, parseJson, withApi } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { importProgress } from "@/lib/server/services/import-export.service";
import { IMPORT_MAX_BYTES, migrateSchema } from "@/lib/server/schemas";

// One-time claim of a guest's LocalStorage progress after first sign-in: always a merge.
export const POST = withApi(async (req) => {
  const user = await requireUser();
  const { data } = await parseJson(req, migrateSchema, IMPORT_MAX_BYTES);
  return json(await importProgress(user.id, data, "merge"));
});
