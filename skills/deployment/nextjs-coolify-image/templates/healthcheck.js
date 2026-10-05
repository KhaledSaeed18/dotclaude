/*
 * Container health probe. Docker's HEALTHCHECK and Coolify's container
 * command check both run this in its own process. The runtime image ships
 * no curl or wget, and Coolify rejects shell operators in the command, so
 * the probe is a plain Node script. Exit 0 when the server answers.
 */
const PROBE_TIMEOUT_MS = 4000;
const port = process.env.PORT || "3000";

fetch(`http://127.0.0.1:${port}/healthz`, {
  signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
})
  .then((response) => process.exit(response.ok ? 0 : 1))
  .catch(() => process.exit(1));
