/**
 * Renders every Mermaid block of docs/DIAGRAMS.md to an SVG in docs/diagrams, named after its heading
 * (for Word, slides or any viewer that does not render Mermaid). Needs the network once (Mermaid from a CDN) and the
 * Playwright browser already installed for the web app: `node scripts/export-diagrams.cjs`.
 */
const { chromium } = require('../apps/web/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'docs', 'DIAGRAMS.md');
const out = path.join(__dirname, '..', 'docs', 'diagrams');
const lines = fs.readFileSync(source, 'utf8').split('\n');

const diagrams = [];
let heading = 'diagram';
for (let i = 0; i < lines.length; i++) {
  const h = lines[i].match(/^###\s+([\d.]+)\s+(.*)$/);
  if (h) heading = `${h[1]}-${h[2]}`;
  if (lines[i].startsWith('```mermaid')) {
    const body = [];
    for (i++; i < lines.length && !lines[i].startsWith('```'); i++) body.push(lines[i]);
    diagrams.push({
      name: heading
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '-')
        .replace(/^-+|-+$/g, ''),
      code: body.join('\n'),
    });
  }
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body><div id="o"></div></body></html>');
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/mermaid@10.9.3/dist/mermaid.min.js' });
  for (const d of diagrams) {
    const svg = await page.evaluate(async (code) => {
      mermaid.initialize({ startOnLoad: false, theme: 'default', htmlLabels: false, flowchart: { htmlLabels: false } });
      const r = await mermaid.render('d' + Math.random().toString(36).slice(2), code);
      return r.svg;
    }, d.code);
    fs.writeFileSync(path.join(out, `${d.name}.svg`), svg);
  }
  await browser.close();
  console.log(`${diagrams.length} diagrams written to docs/diagrams`);
})();
