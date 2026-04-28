#!/bin/sh
set -e

echo "Running database migration..."
node /app/apps/api/dist/db/migrate.js

echo "Starting API server..."
exec node /app/apps/api/dist/index.js
