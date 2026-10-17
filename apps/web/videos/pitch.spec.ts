import { test } from '@playwright/test';
import { playReel, type Scene } from './reel';

/**
 * The pitch reel: one video of about three minutes that tells the whole project, built from title cards and excerpts
 * of the walkthrough videos recorded from the real app (`pnpm videos`). Nothing in it is invented: every scene is the
 * product itself, and the cards state the honest status. Run on demand: `pnpm --filter @rasikh/web videos -g pitch`.
 */
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
  await playReel(browser, 'pitch', SCENES, 'pitch');
});
