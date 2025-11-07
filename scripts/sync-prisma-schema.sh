#!/bin/bash
# Sync Prisma schema and migrations from services repo and modify generator output

SERVICES_SCHEMA="../midcurve-services/prisma/schema.prisma"
SERVICES_MIGRATIONS="../midcurve-services/prisma/migrations"
LOCAL_SCHEMA="prisma/schema.prisma"
LOCAL_MIGRATIONS="prisma/migrations"

# Create prisma directory if it doesn't exist
mkdir -p prisma

# Copy schema from services
cp "$SERVICES_SCHEMA" "$LOCAL_SCHEMA"

# Copy migrations directory from services
# Remove existing migrations first to ensure clean sync
rm -rf "$LOCAL_MIGRATIONS"
cp -r "$SERVICES_MIGRATIONS" "$LOCAL_MIGRATIONS"

# Modify generator output to use local node_modules
# This works on both macOS (BSD sed) and Linux (GNU sed)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' 's/generator client {/generator client {\n  output = "..\/node_modules\/.prisma\/client"/' "$LOCAL_SCHEMA"
else
  # Linux
  sed -i 's/generator client {/generator client {\n  output = "..\/node_modules\/.prisma\/client"/' "$LOCAL_SCHEMA"
fi

echo "✓ Synced Prisma schema and migrations from services"
