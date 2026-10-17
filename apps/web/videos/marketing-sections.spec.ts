import { test } from '@playwright/test';
import { playReel, type Scene } from './reel';

/**
 * One marketing video per section (about 45 s each, for customers): a hook, the product itself in short excerpts with
 * a big caption, and an honest close. No statistics, no testimonials, no claim of launch.
 * Run on demand: `pnpm --filter @rasikh/web videos -g "marketing:"`.
 */
const close = (line: string): Scene => ({
  kind: 'card',
  title: 'راسخ',
  lines: [line, 'مجاني عند الإطلاق · قريباً'],
  seconds: 4,
});

const PROPERTY: Scene[] = [
  {
    kind: 'card',
    title: 'متى آخر مرة تخاصمت على عربون أو دفعة؟',
    seconds: 3.5,
    tone: 'night',
  },
  {
    kind: 'card',
    title: 'الخلاف يبدأ حيث ينتهي الدليل',
    lines: ['سجّل كل شيء من أول يوم'],
    seconds: 3.5,
    tone: 'night',
  },
  { kind: 'clip', src: 'property', from: 4, to: 12, tag: 'عقاراتك ووحداتك في سجل واحد' },
  { kind: 'clip', src: 'leases', from: 8, to: 15, tag: 'عقد إيجار برقم عقدك، ودفعات تتذكّرها عنك' },
  {
    kind: 'clip',
    src: 'inspections',
    from: 9,
    to: 17,
    tag: 'فحص الاستلام: صور بوقتها وموقعها وبصمتها',
  },
  { kind: 'clip', src: 'maintenance', from: 5, to: 12, tag: 'بلاغ صيانة بصورة، ومسؤولية واضحة' },
  { kind: 'clip', src: 'buildings', from: 8, to: 15, tag: 'عمارة بملّاك كثر؟ مصروفات بإيصالاتها' },
  { kind: 'clip', src: 'map', from: 20, to: 28, tag: 'وكل عقار على الخريطة قائم على أرضه' },
  {
    kind: 'card',
    title: 'يكمّل إيجار ومُلّاك',
    lines: ['ولا يحل محلهما، ولا يستلم إيجارك'],
    seconds: 3.5,
    tone: 'night',
  },
  close('إدارة الأملاك: عقارك على أرض ثابتة'),
];

const OFFICE: Scene[] = [
  {
    kind: 'card',
    title: 'عميل يقول: أبغى بيت يشبهني',
    lines: ['وأنت تحتاج أسابيع لأول مسودة'],
    seconds: 4,
    tone: 'night',
  },
  {
    kind: 'card',
    title: 'ماذا لو بدأت من خيارات جاهزة؟',
    lines: ['مسودات في دقائق، وقرارك أنت'],
    seconds: 3.5,
    tone: 'night',
  },
  { kind: 'clip', src: 'office', from: 8, to: 17, tag: 'طلب العميل: الأرض والمساحة والاحتياج' },
  {
    kind: 'clip',
    src: 'styles',
    from: 12,
    to: 22,
    tag: 'نجدي · حديث · سويسري · فخم: مجسم عند مرور المؤشر',
  },
  { kind: 'clip', src: 'office', from: 42, to: 52, tag: 'كل خيار يُفحص بقواعد محسوبة لا تخمّن' },
  {
    kind: 'clip',
    src: 'drawings',
    from: 50,
    to: 60,
    tag: 'مجموعة رسومات بترتيب المكاتب الاستشارية',
  },
  { kind: 'clip', src: 'drawings', from: 92, to: 102, tag: 'ولا يخرج شيء قبل اعتماد مهندس مرخّص' },
  {
    kind: 'card',
    title: 'المسودة منا، والاعتماد منك',
    lines: ['راسخ لا يختم باسم مهندس ولا يقدّم للبلدية'],
    seconds: 4,
    tone: 'night',
  },
  close('المكتب الهندسي الذكي لمكتبك'),
];

const BROKER: Scene[] = [
  {
    kind: 'card',
    title: 'عميل سأل عن شقة قبل أسبوع',
    lines: ['فين راح رقمه؟'],
    seconds: 3.5,
    tone: 'night',
  },
  {
    kind: 'card',
    title: 'كل استفسار. كل معاينة. كل متابعة.',
    lines: ['في سجل لا يُعدَّل'],
    seconds: 3.5,
    tone: 'night',
  },
  { kind: 'clip', src: 'broker', from: 6, to: 14, tag: 'رخصة فال في ملفك، وتذكير قبل انتهائها' },
  {
    kind: 'clip',
    src: 'broker',
    from: 18,
    to: 25,
    tag: 'عملاؤك المحتملون ومراحل البيع في مكان واحد',
  },
  { kind: 'clip', src: 'broker', from: 25, to: 30, tag: 'معاينات ومتابعات بتوقيت موثّق' },
  {
    kind: 'clip',
    src: 'broker',
    from: 34,
    to: 43,
    tag: 'مدقّق الإعلان: يخبرك بنقص بيانات الهيئة قبل النشر',
  },
  {
    kind: 'card',
    title: 'رقم رخصة فال ظاهر لعملائك',
    lines: ['ولا نعرض أو نحجز علناً بدون ترخيص الهيئة'],
    seconds: 4,
    tone: 'night',
  },
  close('الوساطة العقارية: سجلك يتكلم عنك'),
];

for (const [name, scenes] of [
  ['property', PROPERTY],
  ['office', OFFICE],
  ['broker', BROKER],
] as const) {
  test(`marketing: ${name}`, async ({ browser }) => {
    test.setTimeout(300_000);
    await playReel(browser, `marketing-${name}`, [...scenes], 'marketing');
  });
}
