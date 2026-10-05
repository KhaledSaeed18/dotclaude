#!/bin/sh
set -e

# Apply pending database migrations before booting. A failed migration
# stops the container here, before it can take traffic.
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "Applying database migrations..."
    node_modules/.bin/prisma migrate deploy
else
    echo "No database migrations to apply."
fi

exec node dist/server.js
