# Snippets

Header names are a convention; pick ones prefixed with the project and use the same on both sides.

## Next.js: `lib/api/client-ip.ts`

```ts
import { type NextRequest, NextResponse } from "next/server";

export const PROXY_SECRET_HEADER = "x-app-proxy-secret";
export const CLIENT_IP_HEADER = "x-app-client-ip";

/* The last X-Forwarded-For entry is the one the edge proxy added; anything
 * before it came from the client and could be forged. */
function forwardedClientAddress(headers: Headers): string | null {
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop.length > 0);
  return hops.at(-1) ?? null;
}

export function clientIpHeaders(incoming: Headers, secret: string | undefined): Record<string, string> {
  const address = forwardedClientAddress(incoming);
  if (!(secret && address)) return {};
  return { [PROXY_SECRET_HEADER]: secret, [CLIENT_IP_HEADER]: address };
}

/* Forwards a browser /api/* call to the API with the client headers, after
 * dropping any the browser sent itself. Returns null when no secret is
 * configured, leaving the call to the plain rewrite in next.config. */
export function rewriteApiRequest(request: NextRequest, secret: string | undefined, apiOrigin: string): NextResponse | null {
  if (!secret) return null;
  const headers = new Headers(request.headers);
  headers.delete(PROXY_SECRET_HEADER);
  headers.delete(CLIENT_IP_HEADER);
  for (const [name, value] of Object.entries(clientIpHeaders(request.headers, secret))) {
    headers.set(name, value);
  }
  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(new URL(`${pathname}${search}`, apiOrigin), { request: { headers } });
}
```

In `proxy.ts` (Next 16) or `middleware.ts`:

```ts
if (pathname.startsWith("/api/")) {
  return rewriteApiRequest(request, process.env.API_PROXY_SECRET, SERVER_API_ORIGIN) ?? NextResponse.next();
}
// matcher must include "/api/:path*"
```

Server Components calling the API add `clientIpHeaders(await headers(), process.env.API_PROXY_SECRET)` to the fetch headers.

## Express: `middleware/client-ip.ts`

```ts
import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export const PROXY_SECRET_HEADER = "x-app-proxy-secret";
export const CLIENT_IP_HEADER = "x-app-client-ip";

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return typeof value === "string" ? value.trim() : undefined;
}

/* The front-end names the real client in a header, believed only next to the
 * shared secret: anyone can send the header straight to the public API.
 * Digests keep the comparison constant-time whatever the input length. */
export function createClientIpMiddleware(secret: string | null): RequestHandler {
  const expected = secret ? digest(secret) : null;
  return (req: Request, _res: Response, next: NextFunction): void => {
    const presented = headerValue(req, PROXY_SECRET_HEADER);
    const named = headerValue(req, CLIENT_IP_HEADER);
    delete req.headers[PROXY_SECRET_HEADER];
    delete req.headers[CLIENT_IP_HEADER];
    const trusted = expected !== null && presented !== undefined && timingSafeEqual(digest(presented), expected);
    req.clientIp = trusted && named && isIP(named) !== 0 ? named : (req.ip ?? "");
    next();
  };
}
```

Register it before the rate limiter and the audit middleware; key the limiter on `req.clientIp` and write `req.clientIp` into audit rows. Log it in the 404 handler too: that is the probe `deploy-verification` reads.

## Environment names

| Side | Variable | Where |
| --- | --- | --- |
| Front-end | `API_PROXY_SECRET` | the front-end's Coolify environment |
| API | `DASHBOARD_PROXY_SECRET` (or `FRONTEND_PROXY_SECRET`) | the API's Coolify environment, validated at boot like other secrets |
