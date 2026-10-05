/*
 * src/healthcheck.ts, compiled to dist/healthcheck.js with the app.
 * Docker's HEALTHCHECK and Coolify's container-command check both run this
 * in its own process. The runtime image ships no curl or wget, and Coolify
 * rejects shell operators in the command, so the probe is a plain node
 * script. It calls the readiness route so a container that cannot reach the
 * database never takes traffic during a rolling deploy.
 */
import { appConfig } from "./config/app.config";

const PROBE_TIMEOUT_MS = 4_000;

export function readinessUrl(): string {
  return `http://127.0.0.1:${appConfig.port}${appConfig.apiPrefix}/health/ready`;
}

export async function isReady(url: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}

if (require.main === module) {
  void isReady(readinessUrl()).then((ready) => process.exit(ready ? 0 : 1));
}
