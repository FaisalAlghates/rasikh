/**
 * Builds the free static demo (GitHub Pages, under /rasikh): `pnpm --filter @rasikh/web build:demo`.
 * A static export cannot use the locale proxy or the catch-all 404 route, so both are set aside while it builds and
 * always restored. Without a Firebase project the sign-in and saving do nothing: the demo is the public site, the map,
 * the design lab, the sections and the videos.
 */
import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const aside = join(root, '.demo-aside');
const moves = [
  ['src/proxy.ts', 'proxy.ts'],
  ['src/app/[locale]/[...rest]', 'rest'],
];

mkdirSync(aside, { recursive: true });
for (const [from, name] of moves) renameSync(join(root, from), join(aside, name));
let code = 1;
try {
  const run = spawnSync('npx', ['next', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      DEMO_EXPORT: '1',
      NEXT_PUBLIC_USE_EMULATORS: 'false',
      NEXT_PUBLIC_DEMO: '1',
      // the demo never talks to the real project and ships no tokens
      NEXT_PUBLIC_FIREBASE_API_KEY: '',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: '',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
      NEXT_PUBLIC_FIREBASE_APP_ID: '',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: '',
      NEXT_PUBLIC_MAPBOX_TOKEN: '',
      NEXT_PUBLIC_GOOGLE_MAPS_KEY: '',
    },
  });
  code = run.status ?? 1;
  if (code === 0) {
    // the site root has no page of its own: send it to the Arabic home
    writeFileSync(
      join(root, '.next-demo', 'index.html'),
      '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/rasikh/ar/"><link rel="canonical" href="/rasikh/ar/"><title>Rasikh</title>',
    );
    writeFileSync(join(root, '.next-demo', '.nojekyll'), '');
    const notFound = join(root, '.next-demo', 'ar', '404', 'index.html');
    if (existsSync(notFound)) cpSync(notFound, join(root, '.next-demo', '404.html'));
  }
} finally {
  for (const [from, name] of moves) renameSync(join(aside, name), join(root, from));
  rmSync(aside, { recursive: true, force: true });
}
process.exit(code);
