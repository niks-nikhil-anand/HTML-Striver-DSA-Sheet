import { requireUser } from "@/lib/server/auth";
import { withApi } from "@/lib/server/http";
import { exportForUser } from "@/lib/server/services/import-export.service";

export const GET = withApi(async () => {
  const user = await requireUser();
  return new Response(await exportForUser(user.id), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="dsa-tracker-progress.json"',
      "Cache-Control": "no-store",
    },
  });
});
