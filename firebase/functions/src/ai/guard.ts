/**
 * The checks that run BEFORE any model sees a message (CLAUDE.md §7): scope classifier, jailbreak refusal and the
 * topics that must carry a disclaimer. Pure functions, so the eval suite can run them without a model.
 * Arabic text is normalized first (diacritics, tatweel, alef/ya/ta-marbuta variants) so spelling variants match.
 */

export type ScopeVerdict =
  | { allowed: true; disclaimers: Disclaimer[] }
  | { allowed: false; reason: 'off_topic' | 'jailbreak' | 'empty' | 'too_long' };

export type Disclaimer = 'legal' | 'valuation' | 'financial';

export const MAX_INPUT_CHARS = 2000;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // diacritics + tatweel
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic digits
    .replace(/\s+/g, ' ')
    .trim();
}

const n = (words: string[]) => words.map(normalize);

/** Attempts to override the product's rules or extract its instructions. Refused before anything else. */
const JAILBREAK = n([
  'تجاهل التعليمات',
  'تجاهل كل التعليمات',
  'تجاهل ما سبق',
  'انس التعليمات',
  'تخطى القيود',
  'بدون قيود',
  'وضع المطور',
  'اظهر التعليمات',
  'اعرض التعليمات',
  'ما هي تعليماتك',
  'رسالة النظام',
  'انت الان',
  'تظاهر انك',
  'ignore previous',
  'ignore all previous',
  'ignore the above',
  'disregard',
  'system prompt',
  'developer mode',
  'jailbreak',
  'do anything now',
  'pretend you are',
  'you are now',
  'reveal your instructions',
]);

/** Words that put a message inside real estate in this product. One match is enough. */
const IN_SCOPE = n([
  'عقد',
  'ايجار',
  'اجار',
  'مستاجر',
  'مؤجر',
  'مالك',
  'ملاك',
  'عقار',
  'وحده',
  'شقه',
  'فيلا',
  'عمار',
  'مبني',
  'ارض',
  'سكن',
  'محل',
  'وسيط',
  'وساطه',
  'سمسار',
  'اعلان',
  'معاينه',
  'عمله',
  'دفعه',
  'قسط',
  'سداد',
  'ايجار',
  'ايجار',
  'ايجر',
  'صيانه',
  'تسرب',
  'سباكه',
  'كهرباء',
  'تكييف',
  'مكيف',
  'اتحاد',
  'جمعيه',
  'تصويت',
  'مصروف',
  'فحص',
  'تسليم',
  'استلام',
  'وديعه',
  'ضمان',
  'ايجار',
  'حي ',
  'الحي',
  'سعر',
  'تجديد',
  'انهاء',
  'اخلاء',
  'زياده',
  'تجميد',
  'فال',
  'ترخيص',
  'اتفاق',
  'مستاجرين',
  'ملخص',
  'عمارتي',
  'عقاراتي',
  'مستحق',
  'متاخر',
  'rent',
  'lease',
  'tenant',
  'landlord',
  'property',
  'apartment',
  'villa',
  'building',
  'unit',
  'broker',
  'listing',
  'viewing',
  'payment',
  'maintenance',
  'ticket',
  'deposit',
  'ejar',
  'inspection',
  'association',
  'mortgage',
  'landlords',
  'neighborhood',
  'neighbourhood',
]);

const LEGAL = n([
  'قانوني',
  'قانونيا',
  'محامي',
  'دعوه',
  'قضيه',
  'محكمه',
  'حكم قضائي',
  'غرامه',
  'مخالفه',
  'يحق لي',
  'هل يجوز',
  'انتهاك',
  'ملاحقه',
  'اشتكي',
  'legal',
  'lawyer',
  'sue ',
  'court',
  'illegal',
  'my rights',
]);
const VALUATION = n([
  'تقييم',
  'قيمه عقاري',
  'قيمه العقار',
  'كم يساوي',
  'كم قيمه',
  'تثمين',
  'valuation',
  'appraise',
  'appraisal',
  'worth',
]);
const FINANCIAL = n([
  'استثمار',
  'استثمر',
  'تمويل',
  'قرض',
  'ربح مضمون',
  'عائد مضمون',
  'اشتري ام',
  'هل اشتري',
  'ارباح',
  'invest',
  'loan',
  'financing',
  'guaranteed return',
]);

const hits = (text: string, list: string[]) => list.some((w) => text.includes(w));

export function classifyScope(raw: string): ScopeVerdict {
  const text = normalize(raw);
  if (text === '') return { allowed: false, reason: 'empty' };
  if (raw.length > MAX_INPUT_CHARS) return { allowed: false, reason: 'too_long' };
  if (hits(text, JAILBREAK)) return { allowed: false, reason: 'jailbreak' };
  if (!hits(text, IN_SCOPE)) return { allowed: false, reason: 'off_topic' };
  const disclaimers: Disclaimer[] = [];
  if (hits(text, LEGAL)) disclaimers.push('legal');
  if (hits(text, VALUATION)) disclaimers.push('valuation');
  if (hits(text, FINANCIAL)) disclaimers.push('financial');
  return { allowed: true, disclaimers };
}

// ---- messages (Arabic; a person always reads these, never raw model text for a refusal) ------------

export const REFUSALS = {
  off_topic:
    'أقدر أساعدك في أمور العقار داخل راسخ فقط: العقود والدفعات والفحص والصيانة والعمائر والإعلانات. جرّب سؤالاً من هذا النطاق.',
  jailbreak: 'ما أقدر أنفّذ هذا الطلب. أساعدك في أمور العقار داخل راسخ فقط، وبالقواعد المعتمدة للمنتج.',
  empty: 'اكتب سؤالك أو طلبك أولاً.',
  too_long: 'الرسالة طويلة. اختصرها في أقل من ٢٠٠٠ حرف.',
} as const;

export const DISCLAIMERS: Record<Disclaimer, string> = {
  legal:
    'هذا شرح عام وليس رأياً قانونياً ولا حكماً. للقرار القانوني راجع محامياً مرخّصاً أو منصة إيجار.',
  valuation:
    'هذه مؤشرات إرشادية وليست تقييماً رسمياً. للتقييم الرسمي استعن بمقيّم معتمد من الهيئة السعودية للمقيّمين.',
  financial:
    'هذه معلومات عامة وليست نصيحة مالية أو استثمارية. للقرار المالي استشر مختصاً مرخّصاً.',
};

/** Marker shown on every AI output so nobody mistakes it for a record or a decision. */
export const AI_LABEL = 'مُولَّد بالذكاء الاصطناعي، راجعه قبل الاعتماد';
