import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname), "server-only": path.resolve(__dirname, "lib/__tests__/stubs/server-only.ts") } },
  test: { environment: "node", include: ["lib/**/*.test.ts"], testTimeout: 30_000, setupFiles: ["dotenv/config"] },
});
