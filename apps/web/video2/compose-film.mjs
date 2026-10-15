// Composes the split-screen marketing film: brand slides, the problem, the solution, then each chapter with the
// desktop recording on the left (browser frame) and the phone recording on the right (phone frame), played step by
// step in sync, with one caption under both. Renders a 1920x1080 canvas in a headless browser and records it with
// MediaRecorder (no ffmpeg concat needed). Usage (from apps/web): node video2/compose-film.mjs
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const FILM = '../../docs/video/film';
const OUT = process.argv[2] ?? '../../docs/video/rasikh-film.webm';

const CHAPTERS = [
  { id: '01-landing', title: 'المنصة', solves: 'كل أطراف العقار في منصة واحدة، عربية أولاً' },
  {
    id: '01b-site',
    title: 'موقع مترابط',
    solves: 'صفحات متصلة ومساعدة وبحث، وفق معايير هيئة الحكومة الرقمية',
  },
  { id: '01c-map', title: 'خريطة المملكة', solves: 'عقارات موزّعة في مدن كثيرة بلا صورة واحدة' },
  { id: '02-owner', title: 'المالك', solves: 'دفعات وإيصالات متفرقة، ومصاريف مشتركة بلا شفافية' },
  { id: '03-tenant', title: 'المستأجر', solves: 'بلاغات صيانة تضيع، ولا يُعرف من المسؤول' },
  {
    id: '04-inspection',
    title: 'الفحص الموثّق',
    solves: 'خلافات التسليم والوديعة: ما حالة الوحدة يوم الاستلام؟',
  },
  { id: '05-vendor', title: 'الفنّي', solves: 'إسناد واضح، وإثبات لما أُنجز' },
  { id: '06-unit-owner', title: 'مالك الوحدة', solves: 'غموض مصاريف العمارة وقراراتها' },
  { id: '07-broker', title: 'الوسيط', solves: 'عملاء بلا سجل، وإعلانات تنقصها بيانات إلزامية' },
];

const chapters = CHAPTERS.filter((c) => existsSync(join(FILM, `${c.id}-desktop.json`))).map((c) => {
  const d = JSON.parse(readFileSync(join(FILM, `${c.id}-desktop.json`), 'utf8')).marks;
  const m = JSON.parse(readFileSync(join(FILM, `${c.id}-mobile.json`), 'utf8')).marks;
  const steps = [];
  for (let i = 0; i < Math.min(d.length, m.length) - 1; i++) {
    steps.push({ caption: d[i].caption, d: [d[i].t, d[i + 1].t], m: [m[i].t, m[i + 1].t] });
  }
  return { ...c, desktop: `${c.id}-desktop.webm`, mobile: `${c.id}-mobile.webm`, steps };
});

const HTML = `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Reem+Kufi:wght@500;700&display=block" rel="stylesheet">
<style>html,body{margin:0;background:#0E0D0B}canvas{display:block}</style></head>
<body><canvas id="c" width="1920" height="1080"></canvas>
<video id="vd" muted playsinline style="display:none"></video><video id="vm" muted playsinline style="display:none"></video>
</body></html>`;

const server = createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML);
  }
  const f = join(FILM, decodeURIComponent(req.url.slice(1)));
  try {
    const s = statSync(f);
    res.writeHead(200, { 'Content-Type': 'video/webm', 'Content-Length': s.size });
    createReadStream(f).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
}).listen(3198);

const browser = await chromium.launch({
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => console.log('[page]', m.text()));
await page.goto('http://localhost:3198/');
const chunks = [];
await page.exposeFunction('sink', (b64) => chunks.push(Buffer.from(b64, 'base64')));

const seconds = await page.evaluate(async (chapters) => {
  const C = {
    night: '#0E0D0B',
    char: '#1A1815',
    sand: '#F4EEE4',
    stone: '#8C8478',
    clay: '#B5532C',
    clayL: '#D9825A',
  };
  const AR = '"IBM Plex Sans Arabic", Tahoma, sans-serif';
  const KUFI = '"Reem Kufi", "IBM Plex Sans Arabic", Tahoma, sans-serif';
  await Promise.all([
    document.fonts.load(`700 40px "Reem Kufi"`),
    document.fonts.load(`600 30px "IBM Plex Sans Arabic"`),
    document.fonts.load(`400 24px "IBM Plex Sans Arabic"`),
  ]).catch(() => {});

  const cv = document.getElementById('c');
  const g = cv.getContext('2d');
  const vd = document.getElementById('vd');
  const vm = document.getElementById('vm');
  const W = 1920,
    H = 1080;

  // -------------------------------------------------------------- recorder
  const stream = cv.captureStream(30);
  const rec = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 2_600_000,
  });
  rec.ondataavailable = async (e) => {
    if (!e.data.size) return;
    const buf = new Uint8Array(await e.data.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000)
      s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    await window.sink(btoa(s));
  };

  // -------------------------------------------------------------- drawing helpers
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const rr = (x, y, w, h, r) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  const text = (s, x, y, font, color, align = 'center', alpha = 1) => {
    g.save();
    g.globalAlpha = alpha;
    g.font = font;
    g.fillStyle = color;
    g.textAlign = align;
    g.direction = 'rtl';
    g.textBaseline = 'middle';
    g.fillText(s, x, y);
    g.restore();
  };
  const mark = (cx, cy, size, alpha = 1, color = C.clayL) => {
    // the Rasikh mark: three stacked shurfa triangles (32-unit artboard)
    const k = size / 32,
      x0 = cx - 16 * k,
      y0 = cy - 16 * k;
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = color;
    for (const tri of [
      [16, 2, 22, 10, 10, 10],
      [16, 11.5, 25, 21, 7, 21],
      [16, 22.5, 28, 30, 4, 30],
    ]) {
      g.beginPath();
      g.moveTo(x0 + tri[0] * k, y0 + tri[1] * k);
      g.lineTo(x0 + tri[2] * k, y0 + tri[3] * k);
      g.lineTo(x0 + tri[4] * k, y0 + tri[5] * k);
      g.closePath();
      g.fill();
    }
    g.restore();
  };
  const backdrop = () => {
    g.fillStyle = C.night;
    g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W * 0.78, H * 1.05, 40, W * 0.78, H * 1.05, 1100);
    rg.addColorStop(0, 'rgba(181,83,44,0.30)');
    rg.addColorStop(1, 'rgba(181,83,44,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);
    // shurfa frieze along the bottom edge
    g.save();
    g.globalAlpha = 0.1;
    g.fillStyle = C.clayL;
    for (let x = 0; x < W; x += 28) {
      g.beginPath();
      g.moveTo(x, H);
      g.lineTo(x + 14, H - 16);
      g.lineTo(x + 28, H);
      g.fill();
    }
    g.restore();
  };
  const wrapLines = (s, font, maxW) => {
    g.font = font;
    const words = s.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };
  const footer = () =>
    text('عرض توضيحي ببيانات تجريبية', 60, 1056, `400 17px ${AR}`, C.stone, 'left', 0.9);

  // -------------------------------------------------------------- timed rendering
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  async function hold(seconds, draw) {
    const t0 = performance.now();
    for (;;) {
      const t = (performance.now() - t0) / 1000;
      draw(t);
      if (t >= seconds) return;
      await frame();
    }
  }

  // -------------------------------------------------------------- slides
  async function slideOpen() {
    await hold(5.2, (t) => {
      backdrop();
      const a = ease(t / 1.2);
      mark(W / 2, 400 - 20 * (1 - a), 170 + 40 * a, a);
      text('راسخ', W / 2, 600, `700 120px ${KUFI}`, C.sand, 'center', ease((t - 0.6) / 1));
      text(
        'عقارك على أرض ثابتة',
        W / 2,
        715,
        `600 46px ${AR}`,
        C.clayL,
        'center',
        ease((t - 1.3) / 1),
      );
      text(
        'منصة عربية لإدارة العقار المؤجَّر في السعودية',
        W / 2,
        790,
        `400 30px ${AR}`,
        C.stone,
        'center',
        ease((t - 2) / 1),
      );
    });
  }

  const PROBLEMS = [
    ['يوم التسليم', 'خلاف على حالة الوحدة والوديعة: من سبّب العيب ومتى؟'],
    ['الدفعات', 'إيصالات وتحويلات متفرقة بين الرسائل والأوراق'],
    ['الصيانة', 'بلاغات تضيع، ولا يُعرف من المسؤول عن الإصلاح'],
    ['العمارة المشتركة', 'مصاريف وقرارات بلا شفافية بين الملاك'],
    ['الوساطة', 'عملاء ومعاينات بلا سجل، وإعلانات تنقصها بيانات إلزامية'],
  ];
  async function slideProblem() {
    await hold(15.5, (t) => {
      backdrop();
      text('المشكلة', W / 2, 150, `700 74px ${KUFI}`, C.sand, 'center', ease(t / 0.8));
      text(
        'إدارة العقار المؤجَّر اليوم موزّعة بين الرسائل والأوراق والذاكرة',
        W / 2,
        235,
        `400 32px ${AR}`,
        C.stone,
        'center',
        ease((t - 0.6) / 0.8),
      );
      PROBLEMS.forEach(([h, s], i) => {
        const a = ease((t - 1.6 - i * 1.6) / 0.7);
        if (a <= 0) return;
        const y = 330 + i * 132 + (1 - a) * 24;
        g.save();
        g.globalAlpha = a;
        rr(330, y, 1260, 108, 22);
        g.fillStyle = C.char;
        g.fill();
        g.strokeStyle = 'rgba(217,130,90,0.45)';
        g.lineWidth = 2;
        g.stroke();
        g.restore();
        text(h, 1540, y + 54, `700 34px ${KUFI}`, C.clayL, 'right', a);
        text(s, 1210, y + 54, `500 31px ${AR}`, C.sand, 'right', a);
      });
    });
  }

  async function slideSolution() {
    const PILLARS = [
      ['توثيق لا يُعدَّل', 'بصمة رقمية ووقت وموقع، وتوقيع الطرفين'],
      ['شفافية للجميع', 'المالك والمستأجر والملاك يرون السجل نفسه'],
      ['يكمّل «إيجار» و«مُلّاك»', 'ولا يغني عنهما، ولا يعالج دفعات'],
    ];
    await hold(10, (t) => {
      backdrop();
      mark(W / 2, 170, 110, ease(t / 0.8));
      text('الحل: راسخ', W / 2, 300, `700 82px ${KUFI}`, C.sand, 'center', ease((t - 0.3) / 0.8));
      text(
        'سجل واحد للعقار، من يوم الاستلام إلى يوم التسليم',
        W / 2,
        395,
        `600 40px ${AR}`,
        C.clayL,
        'center',
        ease((t - 0.9) / 0.8),
      );
      PILLARS.forEach(([h, s], i) => {
        const a = ease((t - 2 - i * 1.1) / 0.8);
        const x = 1560 - i * 600;
        g.save();
        g.globalAlpha = a;
        rr(x - 260, 500 + (1 - a) * 30, 520, 300, 28);
        g.fillStyle = C.char;
        g.fill();
        g.strokeStyle = 'rgba(217,130,90,0.4)';
        g.lineWidth = 2;
        g.stroke();
        g.restore();
        mark(x, 590 + (1 - a) * 30, 64, a);
        text(h, x, 690 + (1 - a) * 30, `700 38px ${KUFI}`, C.sand, 'center', a);
        wrapLines(s, `400 27px ${AR}`, 440).forEach((ln, j) =>
          text(ln, x, 750 + j * 38 + (1 - a) * 30, `400 27px ${AR}`, C.stone, 'center', a),
        );
      });
    });
  }

  async function slideSplit() {
    await hold(5, (t) => {
      backdrop();
      text(
        'منصة واحدة، على كل شاشة',
        W / 2,
        430,
        `700 76px ${KUFI}`,
        C.sand,
        'center',
        ease(t / 0.8),
      );
      text(
        'يسار الشاشة: نسخة الكمبيوتر · يمينها: نسخة الجوال، بنفس البيانات ونفس الخطوات',
        W / 2,
        540,
        `500 34px ${AR}`,
        C.clayL,
        'center',
        ease((t - 0.7) / 0.8),
      );
    });
  }

  async function slideChapter(c, n) {
    await hold(3.4, (t) => {
      backdrop();
      const a = ease(t / 0.6);
      text(`${n}`, W / 2, 330, `700 140px ${KUFI}`, C.clay, 'center', a * 0.9);
      text(c.title, W / 2, 500, `700 92px ${KUFI}`, C.sand, 'center', a);
      text(
        'يحل: ' + c.solves,
        W / 2,
        620,
        `500 38px ${AR}`,
        C.clayL,
        'center',
        ease((t - 0.5) / 0.7),
      );
    });
  }

  async function slideWhy() {
    const WHY = [
      'توثيق لا يُعدَّل: بصمة رقمية ووقت وموقع وتوقيع الطرفين',
      'كل طرف يرى ما يخصه فقط: مالك، مستأجر، فنّي، ملاك، ووسيط',
      'يكمّل «إيجار» و«مُلّاك» ولا يغني عنهما، ولا يعالج الدفعات',
      'بياناتك داخل المملكة، وتنزيلها أو حذفها بيدك',
      'عربي أولاً، على الكمبيوتر والجوال، ويغطي مدن المملكة كلها',
      'مطابق لمعايير كود المنصات وإمكانية الوصول WCAG 2.2',
    ];
    await hold(12, (t) => {
      backdrop();
      text('لماذا راسخ؟', W / 2, 170, `700 80px ${KUFI}`, C.sand, 'center', ease(t / 0.8));
      WHY.forEach((s, i) => {
        const a = ease((t - 1 - i * 1.2) / 0.7);
        const y = 320 + i * 120;
        mark(1500, y, 44, a);
        text(s, 1450, y, `500 38px ${AR}`, C.sand, 'right', a);
      });
    });
  }

  async function slideEnd() {
    await hold(7, (t) => {
      backdrop();
      const a = ease(t / 1);
      mark(W / 2, 360, 200, a);
      text('راسخ', W / 2, 560, `700 112px ${KUFI}`, C.sand, 'center', a);
      text(
        'عقارك على أرض ثابتة',
        W / 2,
        670,
        `600 44px ${AR}`,
        C.clayL,
        'center',
        ease((t - 0.8) / 0.8),
      );
      text(
        'قريباً على الويب وفي متاجر التطبيقات',
        W / 2,
        770,
        `400 32px ${AR}`,
        C.stone,
        'center',
        ease((t - 1.6) / 0.8),
      );
    });
  }

  // -------------------------------------------------------------- split-screen chapter
  const D = { x: 60, y: 186, w: 1190, h: 669 }; // desktop video box (16:9) under a 36 px browser bar
  const P = { x: 1404, y: 166, w: 342, h: 760 }; // phone video box (412x915)
  function drawFrames(c, caption, capA) {
    backdrop();
    // header
    mark(92, 64, 46);
    text('راسخ', 132, 66, `700 40px ${KUFI}`, C.sand, 'left');
    text(c.title, 1860, 58, `700 48px ${KUFI}`, C.sand, 'right');
    text('يحل: ' + c.solves, 1860, 112, `500 25px ${AR}`, C.clayL, 'right');
    // desktop: browser window
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.55)';
    g.shadowBlur = 40;
    rr(D.x, D.y - 36, D.w, D.h + 36, 14);
    g.fillStyle = '#26231f';
    g.fill();
    g.restore();
    ['#A63D32', '#C08A2E', '#4F7A5A'].forEach((col, i) => {
      g.beginPath();
      g.arc(D.x + 22 + i * 20, D.y - 18, 6, 0, Math.PI * 2);
      g.fillStyle = col;
      g.fill();
    });
    rr(D.x + D.w / 2 - 180, D.y - 28, 360, 20, 10);
    g.fillStyle = '#3a3630';
    g.fill();
    text('راسخ · الكمبيوتر', D.x + D.w / 2, D.y - 18, `500 15px ${AR}`, C.stone);
    g.save();
    rr(D.x, D.y, D.w, D.h, 2);
    g.clip();
    g.drawImage(vd, D.x, D.y, D.w, D.h);
    g.restore();
    // phone
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 40;
    rr(P.x - 14, P.y - 14, P.w + 28, P.h + 28, 48);
    g.fillStyle = '#1d1b18';
    g.fill();
    g.restore();
    rr(P.x - 14, P.y - 14, P.w + 28, P.h + 28, 48);
    g.strokeStyle = '#4a453e';
    g.lineWidth = 2;
    g.stroke();
    g.save();
    rr(P.x, P.y, P.w, P.h, 34);
    g.clip();
    g.drawImage(vm, P.x, P.y, P.w, P.h);
    g.restore();
    rr(P.x + P.w / 2 - 44, P.y + 8, 88, 22, 11);
    g.fillStyle = '#0b0a09';
    g.fill();
    text('الجوال', P.x + P.w / 2, P.y + P.h + 34, `500 19px ${AR}`, C.stone);
    text('الكمبيوتر', D.x + D.w / 2, D.y + D.h + 22, `500 19px ${AR}`, C.stone);
    // caption
    if (caption) {
      const font = `600 31px ${AR}`;
      g.font = font;
      const w = Math.min(1500, g.measureText(caption).width + 70);
      g.save();
      g.globalAlpha = capA;
      rr(W / 2 - w / 2, 960, w, 72, 18);
      g.fillStyle = 'rgba(26,24,21,0.96)';
      g.fill();
      g.strokeStyle = 'rgba(217,130,90,0.75)';
      g.lineWidth = 2;
      g.stroke();
      g.restore();
      text(caption, W / 2, 997, font, C.sand, 'center', capA);
    }
    footer();
  }

  async function load(v, src) {
    v.src = src;
    await new Promise((r, j) => {
      v.onloadeddata = r;
      v.onerror = () => j(new Error('cannot load ' + src));
    });
  }

  // Plays v until it reaches `end` (seconds), at a rate that keeps long waits short.
  function playUntil(v, start, end, maxSeconds) {
    const len = Math.max(0.05, end - start);
    v.playbackRate = Math.min(6, Math.max(1, len / maxSeconds));
    if (v.ended || v.currentTime >= end - 0.03) return Promise.resolve();
    return new Promise((resolve) => {
      const tick = () => {
        if (v.ended || v.currentTime >= end - 0.03) {
          v.pause();
          return resolve();
        }
        requestAnimationFrame(tick);
      };
      v.play().then(tick, tick);
    });
  }

  // Skips the pre-roll (page load, sign-in) before the first step, without showing it.
  async function seekPreroll(v, t) {
    if (t <= 0.1) return;
    v.playbackRate = 16;
    await v.play();
    await new Promise((resolve) => {
      const tick = () =>
        v.currentTime >= t - 0.05 || v.ended ? (v.pause(), resolve()) : setTimeout(tick, 20);
      tick();
    });
  }

  async function chapter(c) {
    await Promise.all([load(vd, '/' + c.desktop), load(vm, '/' + c.mobile)]);
    await Promise.all([seekPreroll(vd, c.steps[0].d[0]), seekPreroll(vm, c.steps[0].m[0])]);
    let running = true;
    let caption = '';
    let capStart = performance.now();
    const loop = () => {
      if (!running) return;
      const capA = ease((performance.now() - capStart) / 300);
      drawFrames(c, caption, capA);
      requestAnimationFrame(loop);
    };
    loop();
    for (const s of c.steps) {
      if (s.caption !== caption) {
        caption = s.caption;
        capStart = performance.now();
      }
      const maxSeconds = Math.max(4.5, Math.min(11, s.caption.length / 9 + 3));
      await Promise.all([
        playUntil(vd, s.d[0], s.d[1], maxSeconds),
        playUntil(vm, s.m[0], s.m[1], maxSeconds),
      ]);
      await new Promise((r) => setTimeout(r, 350));
    }
    await new Promise((r) => setTimeout(r, 600));
    running = false;
  }

  // -------------------------------------------------------------- the film
  const t0 = performance.now();
  rec.start(1000);
  await slideOpen();
  await slideProblem();
  await slideSolution();
  await slideSplit();
  let n = 1;
  for (const c of chapters) {
    await slideChapter(c, n++);
    await chapter(c);
  }
  await slideWhy();
  await slideEnd();
  await new Promise((r) => setTimeout(r, 500));
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.stop();
  await stopped;
  await new Promise((r) => setTimeout(r, 1500));
  return (performance.now() - t0) / 1000;
}, chapters);

writeFileSync(OUT, Buffer.concat(chunks));
console.log(`film: ${chapters.length} chapters, about ${Math.round(seconds)} s -> ${OUT}`);
await browser.close();
server.close();
