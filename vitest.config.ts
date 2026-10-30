import { defineConfig } from "vitest/config";

// Tests spawn the real gen/validate scripts through tsx against throwaway
// fixture repos, so each case pays a cold compile. Give them generous room.
export default defineConfig({
  test: {
    // Playwright owns e2e/; vitest must not try to run those specs.
    exclude: ["**/node_modules/**", "e2e/**"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
