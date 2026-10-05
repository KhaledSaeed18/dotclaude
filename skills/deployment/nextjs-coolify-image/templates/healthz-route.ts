/*
 * app/healthz/route.ts
 * Liveness and readiness probe for Docker, Coolify and the deploy pipeline.
 * Deliberately outside /api, which may be rewritten to a backend, and
 * excluded from the locale or auth proxy matcher. Static: it only proves
 * the Node server answers.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
