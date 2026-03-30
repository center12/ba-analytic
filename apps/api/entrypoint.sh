#!/bin/sh
set -e
#
# Run Prisma migrations at container start, then start Nest.
# Keep CWD inside apps/api so relative Prisma paths work.
#
cd /app/apps/api
sh ./node_modules/.bin/prisma migrate deploy
exec node ./dist/main
