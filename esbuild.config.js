import * as esbuild from 'esbuild';
import { copyFile, chmod } from 'fs/promises';

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['src/cli.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: 'dist/cli.js',
      banner: {
        js: '#!/usr/bin/env node',
      },
      external: [
        // Don't bundle these runtime dependencies
        '@anthropic-ai/sdk',
        'openai',
      ],
      logLevel: 'info',
    });

    // Make executable
    await chmod('dist/cli.js', 0o755);
    console.log('✅ Build complete: dist/cli.js');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
