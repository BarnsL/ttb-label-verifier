import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    // Run in Node — no DOM needed for pure lib functions.
    environment: "node",
    // Report a nice summary table plus spec-style descriptions.
    reporters: "verbose",
    // Collect V8 coverage when `npm run test:cov` is invoked.
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/utils.ts"], // Tailwind helper — no meaningful logic to cover.
      reporter: ["text", "html"],
    },
  },
  resolve: {
    // Mirror the tsconfig paths so `@/lib/...` imports resolve correctly.
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
