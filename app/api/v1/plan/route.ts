import { json, parseJson, withApi } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { putPlan } from "@/lib/server/services/plan.service";
import { putPlanSchema } from "@/lib/server/schemas";

export const PUT = withApi(async (req) => {
  const user = await requireUser();
  const { startDate } = await parseJson(req, putPlanSchema);
  return json(await putPlan(user.id, startDate));
});
