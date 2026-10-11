// Renders <HeroScene/> to public/hero-dusk.svg so the hero is a real image (best LCP element).
// The component stays the single source of truth; run via `pnpm gen:hero` (also runs before build).
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const outFile = join(root, 'node_modules', '.cache', 'hero-scene.cjs');
mkdirSync(join(root, 'node_modules', '.cache'), { recursive: true });

await build({
  entryPoints: [join(root, 'src', 'components', 'HeroScene.tsx')],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  logLevel: 'error',
});

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { HeroScene } = require(outFile);

let svg = renderToStaticMarkup(React.createElement(HeroScene));
svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
writeFileSync(join(root, 'public', 'hero-dusk.svg'), svg);
console.log(`hero-dusk.svg written (${(svg.length / 1024).toFixed(1)} KB)`);
