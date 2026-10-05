# syntax=docker/dockerfile:1

# Runtime-only image. The Next.js build runs natively on the CI runner and
# this image only packages the standalone output. pnpm never runs inside
# Docker and the server never builds.
#
# Expected context layout (produced by the image job after `pnpm build`):
#   .next/standalone/   server.js, the traced node_modules subset, package.json
#   .next/static/       hashed client assets
#   public/             static files
#   healthcheck.js      container probe
#   shutdown.cjs        exit deadline on SIGTERM
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_MANUAL_SIG_HANDLE=true

COPY --chown=node:node .next/standalone ./
COPY --chown=node:node .next/static ./.next/static
COPY --chown=node:node public ./public
COPY --chown=node:node healthcheck.js shutdown.cjs ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["node", "healthcheck.js"]

CMD ["node", "--require", "./shutdown.cjs", "server.js"]
