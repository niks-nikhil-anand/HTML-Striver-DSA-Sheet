import { json, parseJson, withApi } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { importProgress } from "@/lib/server/services/import-export.service";
import { IMPORT_MAX_BYTES, importSchema } from "@/lib/server/schemas";

export const POST = withApi(async (req) => {
  const user = await requireUser();
  const { mode, data } = await parseJson(req, importSchema, IMPORT_MAX_BYTES);
  return json(await importProgress(user.id, data, mode));
});
