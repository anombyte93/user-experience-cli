#!/bin/bash
set -e
echo "🔨 Building user-experience CLI..."

# Build ESM bundle WITHOUT shebang
npx esbuild src/cli.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=esm \
  --outfile=dist/cli.mjs \
  --packages=external \
  --banner:js="" \
  --footer:js=""

# Create executable wrapper with shebang
cat > dist/cli.js <<'WRAPPER'
#!/usr/bin/env node
import('./cli.mjs');
WRAPPER

chmod +x dist/cli.js

# Copy package.json to dist for runtime dependencies
cp package.json dist/

echo "✅ Build complete: dist/cli.js"
echo "📦 Bundle: dist/cli.mjs"
echo "🔗 Wrapper: dist/cli.js"
