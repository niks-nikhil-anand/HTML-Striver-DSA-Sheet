import { db } from "@/lib/server/db";
import { json, withApi } from "@/lib/server/http";

// Public liveness + database ping.
export const GET = withApi(async () => {
  try {
    await db.$queryRaw`SELECT 1`;
    return json({ ok: true });
  } catch {
    return json({ ok: false }, { status: 503 });
  }
});
