#!/bin/bash
# Sync Prisma schema from services repo and modify generator output

SERVICES_SCHEMA="../midcurve-services/prisma/schema.prisma"
LOCAL_SCHEMA="prisma/schema.prisma"

# Create prisma directory if it doesn't exist
mkdir -p prisma

# Copy schema from services
cp "$SERVICES_SCHEMA" "$LOCAL_SCHEMA"

# Modify generator output to use local node_modules
# This works on both macOS (BSD sed) and Linux (GNU sed)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' 's/generator client {/generator client {\n  output = "..\/node_modules\/.prisma\/client"/' "$LOCAL_SCHEMA"
else
  # Linux
  sed -i 's/generator client {/generator client {\n  output = "..\/node_modules\/.prisma\/client"/' "$LOCAL_SCHEMA"
fi

echo "✓ Synced Prisma schema from services"
