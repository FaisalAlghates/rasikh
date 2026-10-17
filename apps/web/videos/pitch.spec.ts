import { test } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { SIZE } from './support';

/**
 * The pitch reel: one video of about three minutes that tells the whole project, built from title cards and excerpts
 * of the walkthrough videos recorded from the real app (`pnpm videos`). Nothing in it is invented: every scene is the
 * product itself, and the cards state the honest status. Run on demand: `pnpm --filter @rasikh/web videos -g pitch`.
 */
type Card = {
  kind: 'card';
  title: string;
  lines?: string[];
  seconds: number;
  tone?: 'sand' | 'night';
};
type Clip = { kind: 'clip'; src: string; from: number; to: number; tag: string };
type Scene = Card | Clip;

const SCENES: Scene[] = [
  {
    kind: 'card',
    title: 'راسخ',
    lines: ['عقارك على أرض ثابتة', 'منصة عربية لسوق العقار السعودي بثلاثة أقسام منفصلة'],
    seconds: 6,
  },
  {
    kind: 'card',
    title: 'المشكلة',
    lines: [
      'خلاف عند التسليم بلا دليل موثّق',
      'دفعات وصيانة تُتابَع في واتساب وإكسل',
      'كلام العميل يتحول إلى مخططات يدوياً',
      'إعلان عقاري بلا بياناته الإلزامية',
    ],
    seconds: 7,
  },
  {
    kind: 'card',
    title: 'الحل: سجل واحد موثوق',
    lines: ['راسخ يكمّل إيجار ومُلّاك ولا يحل محلهما', 'ولا يعالج الإيجار ولا يختم باسم مهندس'],
    seconds: 5,
  },
  { kind: 'clip', src: 'property', from: 0, to: 12, tag: '١ · إدارة الأملاك: الأقسام الثلاثة' },
  { kind: 'clip', src: 'leases', from: 6, to: 18, tag: 'العقود والدفعات' },
  { kind: 'clip', src: 'inspections', from: 8, to: 21, tag: 'فحص موثّق بالبصمة والوقت والموقع' },
  { kind: 'clip', src: 'maintenance', from: 4, to: 14, tag: 'الصيانة والمسؤولية المقترحة' },
  { kind: 'clip', src: 'map', from: 14, to: 33, tag: 'الخريطة: العقار بناءً على أرضه' },
  {
    kind: 'clip',
    src: 'styles',
    from: 8,
    to: 25,
    tag: '٢ · المكتب الهندسي: أربعة طُرز ومجسم عند المرور',
  },
  {
    kind: 'clip',
    src: 'office',
    from: 42,
    to: 57,
    tag: 'تصاميم مختلفة تجتاز فحوص الاشتراطات والكود',
  },
  {
    kind: 'clip',
    src: 'drawings',
    from: 44,
    to: 63,
    tag: 'مجموعة رسومات بترتيب المكاتب الاستشارية',
  },
  { kind: 'clip', src: 'drawings', from: 90, to: 106, tag: 'لا يخرج شيء قبل اعتماد مهندس مرخّص' },
  { kind: 'clip', src: 'broker', from: 10, to: 22, tag: '٣ · الوساطة العقارية' },
  {
    kind: 'card',
    title: 'لماذا نثق به',
    lines: [
      'قواعد محسوبة لا تخمّن، والذكاء الاصطناعي يشرح ولا يقرر',
      'أدلة مختومة لا تُعدَّل',
      'اعتماد مهندس مرخّص مرتبط ببصمة المخطط',
      'بياناتك في الدمام، وفق نظام حماية البيانات',
    ],
    seconds: 8,
    tone: 'night',
  },
  {
    kind: 'card',
    title: 'أين نحن اليوم',
    lines: [
      'المنتج مبني ومختبَر بالكامل',
      'لم يُنشر بعد، ولا مستخدمين حقيقيين بعد',
      'الخطوة التالية: إطلاق تجريبي مغلق بمقاييس معلنة',
    ],
    seconds: 8,
    tone: 'night',
  },
  { kind: 'card', title: 'راسخ', lines: ['عقارك على أرض ثابتة'], seconds: 4 },
];

test('video: the pitch reel', async ({ browser }) => {
  test.setTimeout(600_000);
  const ctx = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: 'test-results/videos/pitch', size: SIZE },
    storageState: {
      cookies: [],
      origins: [
        { origin: 'http://localhost:3000', localStorage: [{ name: 'rk-cookie-ok', value: '1' }] },
      ],
    },
  });
  const page = await ctx.newPage();
  // the site's fonts: read the font-face rules and family names from the landing page, then move to a blank page of
  // the same origin that the reel owns (the app would re-render over anything added to it)
  await page.goto('/ar');
  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    display: getComputedStyle(document.querySelector('h1') ?? document.body).fontFamily,
    faces: Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .filter((r) => r instanceof CSSFontFaceRule)
          .map((r) => r.cssText);
      } catch {
        return [];
      }
    }),
  }));
  await page.route('**/__reel', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body></body></html>',
    }),
  );
  await page.goto('/__reel');
  await page.evaluate(
    ({ scenes, fonts }) => {
      const style = document.createElement('style');
      style.textContent = `
        ${fonts.faces.join(' ')}
        html,body{margin:0;height:100%;background:#0E0D0B;overflow:hidden}
        #stage{position:fixed;inset:0;font-family:${fonts.body};direction:rtl}
        video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#0E0D0B;opacity:0;transition:opacity .5s}
        video.on{opacity:1}
        .card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:22px;
          text-align:center;opacity:0;transition:opacity .6s;padding:0 120px}
        .card.sand{background:#F4EEE4;color:#1A1815}
        .card.night{background:#1A1815;color:#F4EEE4}
        .card.on{opacity:1}
        .card h1{font-family:${fonts.display};font-size:84px;margin:0;font-weight:600;color:#B5532C}
        .card.night h1{color:#D9825A}
        .card p{font-size:34px;line-height:1.7;margin:0;max-width:1000px}
        .tag{position:absolute;top:22px;inset-inline:0;margin:0 auto;width:fit-content;max-width:80%;padding:10px 26px;border-radius:14px;
          background:rgba(14,13,11,.88);color:#F4EEE4;font-size:26px;font-weight:600;opacity:0;transition:opacity .4s;text-align:center}
        .tag.on{opacity:1}
      `;
      document.head.append(style);
      const stage = document.createElement('div');
      stage.id = 'stage';
      document.body.append(stage);
      (window as unknown as { reel: unknown }).reel = { scenes, stage };
    },
    { scenes: SCENES, fonts },
  );

  // preload and pre-seek every clip off the critical path, while the first card is on screen
  const prepare = async () =>
    page.evaluate(async (scenes) => {
      const stage = document.getElementById('stage')!;
      const made: Record<number, HTMLVideoElement> = {};
      await Promise.all(
        scenes.map(async (s, i) => {
          if (s.kind !== 'clip') return;
          const v = document.createElement('video');
          v.muted = true;
          v.playsInline = true;
          v.preload = 'auto';
          v.src = `/videos/${s.src}.webm`;
          stage.append(v);
          made[i] = v;
          await new Promise<void>((r) => {
            v.onloadedmetadata = () => r();
            v.onerror = () => r();
          });
          if (!Number.isFinite(v.duration)) {
            v.currentTime = 1e9;
            await new Promise<void>((r) => {
              v.ondurationchange = () => Number.isFinite(v.duration) && r();
              setTimeout(r, 6000);
            });
          }
          v.currentTime = s.from;
          await new Promise<void>((r) => {
            v.onseeked = () => r();
            setTimeout(r, 6000);
          });
        }),
      );
      (window as unknown as { clips: typeof made }).clips = made;
    }, SCENES);

  const showCard = async (c: Card) => {
    await page.evaluate((c) => {
      const stage = document.getElementById('stage')!;
      const el = document.createElement('div');
      el.className = `card ${c.tone ?? 'sand'}`;
      el.innerHTML = `<h1>${c.title}</h1>${(c.lines ?? []).map((l) => `<p>${l}</p>`).join('')}`;
      stage.append(el);
      requestAnimationFrame(() => el.classList.add('on'));
    }, c);
    await page.waitForTimeout(c.seconds * 1000);
    await page.evaluate(() => {
      const els = [...document.querySelectorAll('.card')];
      els.forEach((e) => e.classList.remove('on'));
      setTimeout(() => els.forEach((e) => e.remove()), 700);
    });
    await page.waitForTimeout(500);
  };

  const showClip = async (index: number, c: Clip) => {
    await page.evaluate(
      async ({ index, c }) => {
        const v = (window as unknown as { clips: Record<number, HTMLVideoElement> }).clips[index]!;
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.textContent = c.tag;
        document.getElementById('stage')!.append(tag);
        v.currentTime = c.from;
        await new Promise<void>((r) => {
          v.onseeked = () => r();
          setTimeout(r, 4000);
        });
        v.classList.add('on');
        requestAnimationFrame(() => tag.classList.add('on'));
        await v.play();
        (window as unknown as { cur: unknown }).cur = { v, tag };
      },
      { index, c },
    );
    await page.waitForTimeout((c.to - c.from) * 1000);
    await page.evaluate(() => {
      const { v, tag } = (window as unknown as { cur: { v: HTMLVideoElement; tag: HTMLElement } })
        .cur;
      v.pause();
      v.classList.remove('on');
      tag.classList.remove('on');
      setTimeout(() => tag.remove(), 600);
    });
    await page.waitForTimeout(500);
  };

  const first = SCENES[0] as Card;
  const prep = prepare();
  await showCard(first);
  await prep;
  for (let i = 1; i < SCENES.length; i++) {
    const s = SCENES[i]!;
    if (s.kind === 'card') await showCard(s);
    else await showClip(i, s);
  }
  const video = page.video();
  await ctx.close();
  mkdirSync('public/videos', { recursive: true });
  copyFileSync(await video!.path(), 'public/videos/pitch.webm');
});
