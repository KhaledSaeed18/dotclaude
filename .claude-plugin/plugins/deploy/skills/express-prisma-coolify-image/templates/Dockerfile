# syntax=docker/dockerfile:1

# Runtime-only image. Dependencies, the Prisma client and the TypeScript
# build happen natively on the CI runner before this build; pnpm never runs
# inside Docker. The image only packages artifacts that already exist in
# the build context.
#
# Expected context layout (produced by the image job):
#   dist/            compiled app + generated Prisma client + healthcheck.js
#   node_modules/    production dependencies, linux-x64, with the Prisma
#                    schema engine present
#   prisma/          schema and migrations
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

# Add apt packages here only for native dependencies the app loads at
# runtime (for example the shared libraries of a headless browser).

COPY node_modules ./node_modules
COPY dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts package.json docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh \
    && mkdir -p /app/logs \
    && chown -R node:node /app/logs

USER node

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "dist/healthcheck.js"]

ENTRYPOINT ["./docker-entrypoint.sh"]
