import { ApiError } from "@/lib/server/errors";
import { json, noContent, parseJson, withApi } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { clearProgress, putProgress } from "@/lib/server/services/progress.service";
import { problemIdSchema, putProgressSchema } from "@/lib/server/schemas";

type Ctx = { params: Promise<{ problemId: string }> };

async function problemIdFrom(ctx: Ctx): Promise<string> {
  const parsed = problemIdSchema.safeParse((await ctx.params).problemId);
  if (!parsed.success) throw new ApiError("NOT_FOUND", "Unknown problem");
  return parsed.data;
}

export const PUT = withApi(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const problemId = await problemIdFrom(ctx);
  const body = await parseJson(req, putProgressSchema);
  return json(await putProgress(user.id, problemId, body));
});

export const DELETE = withApi(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  await clearProgress(user.id, await problemIdFrom(ctx));
  return noContent();
});
