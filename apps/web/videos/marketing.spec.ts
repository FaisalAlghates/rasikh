import { test } from '@playwright/test';
import { playReel, type Scene } from './reel';

/**
 * The marketing video (about a minute, for customers): short cards and excerpts of the real app, no statistics, no
 * testimonials, no claim that the product has launched. Run on demand: `pnpm --filter @rasikh/web videos -g marketing`.
 */
const SCENES: Scene[] = [
  {
    kind: 'card',
    title: 'بيتك. عقدك. دفعاتك.',
    lines: ['وصور يوم الاستلام…', 'كلها في مكان واحد؟'],
    seconds: 4,
    tone: 'night',
  },
  { kind: 'card', title: 'راسخ', lines: ['عقارك على أرض ثابتة'], seconds: 3 },
  { kind: 'clip', src: 'leases', from: 8, to: 14, tag: 'عقودك ودفعاتك تتنظم لوحدها' },
  {
    kind: 'clip',
    src: 'inspections',
    from: 9,
    to: 15,
    tag: 'يوم الاستلام موثّق بالصور والبصمة',
  },
  { kind: 'clip', src: 'maintenance', from: 6, to: 11, tag: 'صيانة: بلاغ بصورة ومسؤولية واضحة' },
  { kind: 'clip', src: 'map', from: 20, to: 28, tag: 'بيتك على الخريطة… قائم على أرضه' },
  { kind: 'card', title: 'وإن كنت تبني؟', seconds: 2.5 },
  {
    kind: 'clip',
    src: 'styles',
    from: 12,
    to: 20,
    tag: 'نجدي · حديث · سويسري · فخم: تصميمك بمجسم ثلاثي الأبعاد',
  },
  {
    kind: 'clip',
    src: 'drawings',
    from: 50,
    to: 58,
    tag: 'ومخططاتك كاملة بترتيب المكاتب الاستشارية',
  },
  {
    kind: 'card',
    title: 'ويعتمدها مهندس مرخّص',
    lines: ['راسخ لا يختم باسم مهندس'],
    seconds: 3,
    tone: 'night',
  },
  { kind: 'card', title: 'راسخ', lines: ['مجاني عند الإطلاق', 'قريباً'], seconds: 4 },
];

test('video: the marketing video', async ({ browser }) => {
  test.setTimeout(300_000);
  await playReel(browser, 'marketing', SCENES, 'marketing');
});
