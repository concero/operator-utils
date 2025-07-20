import esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read package.json to get external dependencies
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const external = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.peerDependencies,
});

const baseConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  external,
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  keepNames: true,
  treeShaking: true,
  metafile: true,
  logLevel: 'info',
};

async function build() {
  try {
    // Build ESM
    console.log('Building ESM...');
    const esmResult = await esbuild.build({
      ...baseConfig,
      format: 'esm',
      outfile: 'dist/index.mjs',
      banner: {
        js: `// @concero/operator-utils v${packageJson.version} - ESM build`,
      },
    });

    // Build CJS
    console.log('Building CJS...');
    const cjsResult = await esbuild.build({
      ...baseConfig,
      format: 'cjs',
      outfile: 'dist/index.js',
      banner: {
        js: `// @concero/operator-utils v${packageJson.version} - CJS build`,
      },
    });

    // Print build analysis if requested
    if (process.env.ANALYZE) {
      const esmMeta = esmResult.metafile;
      const cjsMeta = cjsResult.metafile;

      console.log('\nESM Build Analysis:');
      console.log(await esbuild.analyzeMetafile(esmMeta, { verbose: true }));

      console.log('\nCJS Build Analysis:');
      console.log(await esbuild.analyzeMetafile(cjsMeta, { verbose: true }));
    }

    console.log('\n✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Watch mode
if (process.argv.includes('--watch')) {
  console.log('Starting watch mode...');

  const contexts = await Promise.all([
    esbuild.context({
      ...baseConfig,
      format: 'esm',
      outfile: 'dist/index.mjs',
    }),
    esbuild.context({
      ...baseConfig,
      format: 'cjs',
      outfile: 'dist/index.js',
    }),
  ]);

  await Promise.all(contexts.map(ctx => ctx.watch()));
  console.log('Watching for changes...');
} else {
  build();
}
