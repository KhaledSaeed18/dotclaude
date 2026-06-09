import { defineConfig } from "vitest/config";

// Tests spawn the real gen/validate scripts through tsx against throwaway
// fixture repos, so each case pays a cold compile. Give them generous room.
export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
