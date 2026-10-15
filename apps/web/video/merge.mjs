// Joins the recorded scenes into one film without ffmpeg's concat support: plays each scene in a headless browser
// and records the canvas with MediaRecorder. Usage (from apps/web): node video/merge.mjs
import { createServer } from 'node:http';
import { createReadStream, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const dir = process.argv[2] ?? '../../docs/video/scenes';
const out = process.argv[3] ?? '../../docs/video/rasikh-tour.webm';
const files = readdirSync(dir)
  .filter((f) => /^\d\d-.*\.webm$/.test(f))
  .sort();

const server = createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<canvas id="c" width="1280" height="720"></canvas>');
  }
  const f = join(dir, decodeURIComponent(req.url.slice(1)));
  try {
    const s = statSync(f);
    res.writeHead(200, { 'Content-Type': 'video/webm', 'Content-Length': s.size });
    createReadStream(f).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
}).listen(3199);

const browser = await chromium.launch({
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:3199/');
const chunks = [];
await page.exposeFunction('sink', (b64) => chunks.push(Buffer.from(b64, 'base64')));

const total = await page.evaluate(async (list) => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 3_500_000,
  });
  rec.ondataavailable = async (e) => {
    if (!e.data.size) return;
    const buf = new Uint8Array(await e.data.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000)
      s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    await window.sink(btoa(s));
  };
  rec.start(1000);
  let seconds = 0;
  for (const f of list) {
    const v = document.createElement('video');
    v.muted = true;
    v.src = 'http://localhost:3199/' + f;
    await new Promise((r) => (v.onloadeddata = r));
    await v.play();
    await new Promise((r) => {
      const draw = () => {
        ctx.drawImage(v, 0, 0, 1280, 720);
        if (v.ended) return r();
        requestAnimationFrame(draw);
      };
      v.onended = r;
      draw();
    });
    seconds += v.duration || 0;
  }
  await new Promise((r) => setTimeout(r, 600));
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.stop();
  await stopped;
  await new Promise((r) => setTimeout(r, 1500));
  return seconds;
}, files);

writeFileSync(out, Buffer.concat(chunks));
console.log(`merged ${files.length} scenes, about ${Math.round(total)} s of video -> ${out}`);
await browser.close();
server.close();
