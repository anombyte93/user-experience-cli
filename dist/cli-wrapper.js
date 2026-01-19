#!/usr/bin/env node

// Load the ESM bundle using dynamic import
import('./cli.mjs').catch(err => {
  console.error('Failed to load CLI:', err);
  process.exit(1);
});
