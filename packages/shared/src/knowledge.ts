/**
 * Rasikh's own knowledge base: design practice for the hot-dry Saudi climate and traditional styles, and how the
 * product's records fit the rental process. Written by the team, each entry with its basis. It is guidance, never a
 * compliance ruling: the Saudi Building Code checks stay in the rule engine, and legal questions go to a licensed
 * professional.
 */
export type KnowledgeKind = 'design' | 'guide';
export type KnowledgeBasis = 'practice' | 'product' | 'ejar_guidance';

export interface KnowledgeEntry {
  id: string;
  kind: KnowledgeKind;
  topic: string;
  /** Words (Arabic or English, any spelling) whose presence in a question selects this entry. */
  words: string[];
  ar: string;
  en: string;
  basis: KnowledgeBasis;
  /** Design entries only: show when the brief's style / building type is one of these (absent: any). */
  styles?: string[];
  types?: string[];
}

export const KNOWLEDGE: readonly KnowledgeEntry[] = [
  // ---- design: climate -------------------------------------------------------------------------------
  {
    id: 'west-glazing',
    kind: 'design',
    topic: 'climate',
    words: ['غرب', 'غربي', 'west', 'شمس', 'حراره', 'زجاج'],
    ar: 'قلّل الزجاج على الواجهة الغربية؛ شمس العصر المنخفضة أشد مصدر حرارة صيفاً. ضع عليها فتحات صغيرة أو مظللة.',
    en: 'Keep glazing on the west facade small or shaded: the low afternoon sun is the strongest summer heat source.',
    basis: 'practice',
  },
  {
    id: 'north-light',
    kind: 'design',
    topic: 'climate',
    words: ['شمال', 'شمالي', 'north', 'اضاءه', 'ضوء'],
    ar: 'الواجهة الشمالية أهدأ ضوءاً وأقل حرارة؛ الأنسب لغرف المعيشة والمكاتب التي تحتاج ضوءاً ثابتاً.',
    en: 'The north facade gives the calmest light and least heat: best for living rooms and offices.',
    basis: 'practice',
  },
  {
    id: 'courtyard-cooling',
    kind: 'design',
    topic: 'climate',
    words: ['فناء', 'حوش', 'courtyard', 'تبريد', 'برودة'],
    ar: 'الفناء الداخلي يظلّل جدرانه ويبرّد الهواء قبل دخوله الغرف، ويعطي ضوءاً وخصوصية معاً.',
    en: 'A courtyard shades its own walls, cools the air before it enters the rooms, and gives light and privacy together.',
    basis: 'practice',
  },
  {
    id: 'cross-ventilation',
    kind: 'design',
    topic: 'climate',
    words: ['تهويه', 'هواء', 'ventilation', 'نوافذ متقابله'],
    ar: 'اجعل لكل غرفة معيشة فتحتين على جهتين مختلفتين إن أمكن؛ تيار الهواء في الليالي المعتدلة يوفر تكييفاً.',
    en: 'Give living rooms openings on two different sides where possible; night air flow saves cooling energy.',
    basis: 'practice',
  },
  {
    id: 'shading',
    kind: 'design',
    topic: 'climate',
    words: ['تظليل', 'ظل', 'بروز', 'shading', 'مظله'],
    ar: 'بروز السقف أو كتف أمام النافذة الجنوبية يحجب شمس الصيف العالية ويسمح بدفء شمس الشتاء المنخفضة.',
    en: 'An overhang or fin on the south window blocks the high summer sun and admits the low winter sun.',
    basis: 'practice',
  },
  {
    id: 'insulation',
    kind: 'design',
    topic: 'climate',
    words: ['عزل', 'insulation', 'طاقه', 'كهرباء'],
    ar: 'العزل الحراري للسقف والجدران أكبر موفّر للتكييف. القيم المطلوبة يحددها كود ترشيد الطاقة السعودي ويتحقق منها مكتبك.',
    en: 'Roof and wall insulation saves the most cooling energy. Required values come from the Saudi energy conservation code and your office verifies them.',
    basis: 'practice',
  },
  {
    id: 'thermal-mass',
    kind: 'design',
    topic: 'climate',
    words: ['كتله حراريه', 'جدار سميك', 'طين', 'thermal'],
    ar: 'الجدران الكتلية تبطئ دخول الحرارة نهاراً وتطلقها ليلاً؛ مفيدة في الأجواء الصحراوية ذات الفرق الكبير بين الليل والنهار.',
    en: 'Massive walls slow daytime heat and release it at night: useful where desert days and nights differ widely.',
    basis: 'practice',
  },
  // ---- design: privacy and plan --------------------------------------------------------------------
  {
    id: 'majlis-entry',
    kind: 'design',
    topic: 'privacy',
    words: ['مجلس', 'ضيوف', 'majlis', 'مدخل'],
    ar: 'ضع المجلس قرب المدخل الخارجي بمدخل مستقل للضيوف، حتى لا يعبر الضيف مناطق الأسرة.',
    en: 'Place the majlis near the outer entrance with its own guest door so guests never cross family areas.',
    basis: 'practice',
    types: ['villa', 'duplex', 'townhouse'],
  },
  {
    id: 'window-privacy',
    kind: 'design',
    topic: 'privacy',
    words: ['خصوصيه', 'جار', 'مشربيه', 'privacy', 'كشف'],
    ar: 'تجنّب مواجهة نوافذ غرف النوم مباشرة لنوافذ الجار؛ استخدم نوافذ عالية أو مشربية أو إزاحة بسيطة.',
    en: 'Avoid bedroom windows facing a neighbour window directly; use high windows, screens or a small offset.',
    basis: 'practice',
  },
  {
    id: 'wet-core',
    kind: 'design',
    topic: 'plan',
    words: ['حمام', 'مطبخ', 'سباكه', 'تمديدات', 'plumbing'],
    ar: 'جمّع المطبخ والحمامات حول عمود تمديدات واحد؛ يقصّر الأنابيب ويخفض التكلفة وأعطال التسرب.',
    en: 'Group the kitchen and bathrooms around one service stack: shorter pipes, lower cost, fewer leaks.',
    basis: 'practice',
  },
  {
    id: 'stair-core',
    kind: 'design',
    topic: 'plan',
    words: ['درج', 'سلم', 'stair', 'حركه'],
    ar: 'ضع الدرج في وسط المبنى أو قرب المدخل لتقصير مسارات الحركة وتسهيل الإخلاء.',
    en: 'Put the stair near the centre or entrance: shorter circulation and easier evacuation.',
    basis: 'practice',
    types: ['villa', 'duplex', 'townhouse', 'apartments', 'commercial', 'hall'],
  },
  {
    id: 'kitchen-service',
    kind: 'design',
    topic: 'plan',
    words: ['مطبخ', 'خدمه', 'kitchen', 'سيارات'],
    ar: 'اربط المطبخ بمدخل الخدمة وقريباً من الموقف ليسهل إدخال المشتريات دون عبور المجلس.',
    en: 'Link the kitchen to the service door near parking so groceries do not cross the majlis.',
    basis: 'practice',
    types: ['villa', 'duplex', 'townhouse'],
  },
  {
    id: 'apartments-light',
    kind: 'design',
    topic: 'plan',
    words: ['شقق', 'عمارة', 'apartments', 'مناور'],
    ar: 'في العمائر اجعل غرف المعيشة والنوم على الواجهات والخدمات على مناور؛ تضمن ضوءاً وتهوية طبيعية للغرف الرئيسية.',
    en: 'In apartment buildings put living rooms and bedrooms on facades and services on light wells.',
    basis: 'practice',
    types: ['apartments'],
  },
  // ---- design: styles ---------------------------------------------------------------------------------
  {
    id: 'style-najdi',
    kind: 'design',
    topic: 'style',
    words: ['نجدي', 'najdi', 'شرفات'],
    ar: 'الطراز النجدي: كتل مصمتة، فتحات صغيرة عالية، فناء داخلي، وشرفات مثلثة (الشرفات) على الحافة.',
    en: 'Najdi style: massive walls, small high openings, an inner courtyard and triangular crenellations on the parapet.',
    basis: 'practice',
    styles: ['modern_najdi', 'classic'],
  },
  {
    id: 'style-salmani',
    kind: 'design',
    topic: 'style',
    words: ['سلماني', 'salmani'],
    ar: 'الطراز السلماني يستلهم العمارة النجدية بتناسب واضح وأقواس وفتحات محسوبة؛ يحتاج تفاصيل واجهة منتظمة.',
    en: 'The Salmani style draws on Najdi architecture with clear proportions, arches and measured openings.',
    basis: 'practice',
    styles: ['salmani'],
  },
  {
    id: 'style-contemporary',
    kind: 'design',
    topic: 'style',
    words: ['عصري', 'حديث', 'contemporary', 'modern'],
    ar: 'التصميم العصري يميل إلى فتحات كبيرة؛ عوّض ذلك بتظليل وزجاج مزدوج ليبقى الأداء الحراري جيداً.',
    en: 'Contemporary design favours large openings; offset them with shading and double glazing.',
    basis: 'practice',
    styles: ['contemporary'],
  },
  // ---- guide: product and rental process --------------------------------------------------------
  {
    id: 'ejar-complement',
    kind: 'guide',
    topic: 'ejar',
    words: ['ايجار', 'منصه ايجار', 'ejar', 'عقد موثق', 'توثيق'],
    ar: 'راسخ يكمّل منصة إيجار ولا يحل محلها: العقد الرسمي يُسجَّل في إيجار، وراسخ يحفظ سجلك حوله (الدفعات، الفحص، الصيانة).',
    en: 'Rasikh complements Ejar and never replaces it: the official contract is registered in Ejar; Rasikh keeps the records around it.',
    basis: 'product',
  },
  {
    id: 'deposit',
    kind: 'guide',
    topic: 'ejar',
    words: ['تامين', 'ضمان', 'deposit', 'وديعه'],
    ar: 'الضمان والتأمين تحفظه منصة إيجار، وراسخ لا يستلم أموالاً ولا يحتفظ بها. نوثّق حالة الوحدة فقط لتقليل الخلاف.',
    en: 'Deposits are held through Ejar; Rasikh never receives or holds money. It documents the unit condition to reduce disputes.',
    basis: 'ejar_guidance',
  },
  {
    id: 'renewal-notice',
    kind: 'guide',
    topic: 'lease',
    words: ['تجديد', 'اشعار', 'renewal', 'انتهاء العقد', 'ينتهي'],
    ar: 'تنبيه التجديد في راسخ قبل ٦٠ يوماً من انتهاء العقد. المدة النظامية الملزمة تراجعها في عقدك ومنصة إيجار.',
    en: 'Rasikh reminds you 60 days before a lease ends. Check the binding period in your contract and Ejar.',
    basis: 'product',
  },
  {
    id: 'riyadh-freeze',
    kind: 'guide',
    topic: 'lease',
    words: ['رياض', 'زياده', 'رفع الايجار', 'تجميد', 'freeze'],
    ar: 'في الرياض لا زيادة سنوية على العقود لمدة ٥ سنوات من ٢٠٢٥-٠٩-٢٥ حسب القرار المعلن. المساعد في راسخ يحسب لك ويذكّرك، ولا يعطي رأياً قانونياً.',
    en: 'In Riyadh no annual increase applies for 5 years from 2025-09-25 per the announced decision. Rasikh calculates and reminds; it gives no legal opinion.',
    basis: 'ejar_guidance',
  },
  {
    id: 'inspection',
    kind: 'guide',
    topic: 'inspection',
    words: ['فحص', 'معاينه', 'استلام', 'تسليم', 'inspection', 'صور'],
    ar: 'افحص الوحدة غرفة غرفة عند الاستلام والتسليم؛ كل صورة تحفظ بوقتها وموقعها وبصمة رقمية، ويوقّع الطرفان، ثم تُنتج مقارنة PDF تُرفق في إيجار.',
    en: 'Inspect room by room at move-in and move-out; each photo keeps its time, place and digital fingerprint, both sign, and a comparison PDF is made for Ejar.',
    basis: 'product',
  },
  {
    id: 'maintenance-who',
    kind: 'guide',
    topic: 'maintenance',
    words: ['صيانه', 'مسؤول', 'تسرب', 'عطل', 'maintenance'],
    ar: 'القاعدة العامة بحسب إرشاد إيجار: المستهلكات على المستأجر، والصيانة الأساسية والإنشائية على المالك. راسخ يقترح فقط والاتفاق في العقد.',
    en: 'Per Ejar guidance: consumables fall on the tenant, basic and structural maintenance on the owner. Rasikh only suggests; the contract rules.',
    basis: 'ejar_guidance',
  },
  {
    id: 'payments-record',
    kind: 'guide',
    topic: 'payments',
    words: ['دفعه', 'دفعات', 'سداد', 'قسط', 'تاخر', 'متاخر'],
    ar: 'راسخ يسجل الدفعات ويذكّر بالمتأخر والقريب، ولا يحصّل المال ولا يمول الإيجار. ارفع إيصال كل دفعة لتبقى موثقة.',
    en: 'Rasikh records payments and reminds you of late and upcoming ones; it does not collect or finance rent. Upload each receipt.',
    basis: 'product',
  },
  {
    id: 'health-record',
    kind: 'guide',
    topic: 'record',
    words: ['سجل العقار', 'السجل', 'تاريخ العقار', 'نقل ملكيه'],
    ar: 'سجل العقار خط زمني لكل ما حدث للعقار (فحوص، صيانة، تصاميم معتمدة)، وينتقل لمالك جديد بموافقتك.',
    en: 'The Property Health Record is a timeline of everything that happened to a property and transfers to a new owner with your consent.',
    basis: 'product',
  },
  {
    id: 'broker-ads',
    kind: 'guide',
    topic: 'broker',
    words: ['اعلان', 'فال', 'ترخيص اعلان', 'وسيط', 'rega', 'الهيئه'],
    ar: 'الإعلان العقاري يحتاج بيانات إلزامية من الهيئة العامة للعقار (مثل رخصة فال ورقم ترخيص الإعلان). فاحص الإعلانات يذكّرك بالناقص قبل النشر.',
    en: 'A property ad needs the mandatory data from the real estate authority (such as the FAL licence and ad licence number). The ad checker flags what is missing.',
    basis: 'product',
  },
  {
    id: 'engineering-draft',
    kind: 'guide',
    topic: 'engineering',
    words: ['تصميم', 'مخطط', 'مهندس', 'كود', 'مكتب هندسي', 'رسومات'],
    ar: 'كل تصميم في راسخ مسودة حتى يعتمدها مهندس مرخّص من مكتبك؛ مطابقة الكود تقررها قواعد محسوبة لا الذكاء الاصطناعي، وراسخ لا يختم ولا يقدّم الطلب لبلدي.',
    en: 'Every design is a draft until a licensed engineer of your office approves it; compliance comes from calculated rules, and Rasikh never stamps or files with Balady.',
    basis: 'product',
  },
  {
    id: 'boq-range',
    kind: 'guide',
    topic: 'engineering',
    words: ['كميات', 'تكلفه', 'سعر', 'boq', 'ميزانيه'],
    ar: 'جدول الكميات في راسخ نطاق استرشادي من أسعار قابلة للتعديل؛ الأسعار الفعلية تأتي من عروض المقاولين.',
    en: 'The BOQ is an indicative range from editable rates; real prices come from contractor quotes.',
    basis: 'product',
  },
  {
    id: 'balady-checklist',
    kind: 'guide',
    topic: 'engineering',
    words: ['رخصه بناء', 'بلدي', 'امانه', 'بلديه', 'تصريح'],
    ar: 'راسخ يجهّز قائمة متطلبات رخصة البناء ويقارن بمتطلبات الوزارة المحفوظة، لكن لا توجد واجهة مباشرة للأمانات؛ المكتب يؤكد القيم الخاصة بالقطعة.',
    en: 'Rasikh prepares the building-permit checklist against the stored ministry requirements, but there is no live Amanah interface; your office confirms plot-specific values.',
    basis: 'product',
  },
  {
    id: 'modern-facade',
    kind: 'design',
    topic: 'style',
    words: ['واجهه عصريه', 'واجهه حديثه', 'كسوه', 'طوب', 'زجاج', 'facade'],
    ar: 'الواجهة العصرية: كتلة علوية مكسوّة بالطوب أو الحجر، وزجاج بإطار داكن تظلله بروزات، وسطح مسطح بإفريز بسيط، وفتحات تتبع محاور الإنشاء.',
    en: 'A modern facade: an upper volume clad in brick or stone, glazing in dark frames shaded by projections, a flat roof with a plain coping, and openings that follow the structural axes.',
    basis: 'practice',
    styles: ['contemporary'],
  },
  {
    id: 'drawing-set',
    kind: 'guide',
    topic: 'engineering',
    words: [
      'مجموعه الرسومات',
      'لوحات',
      'ترقيم',
      'مخططات انشائيه',
      'مخططات كهربائيه',
      'مخططات ميكانيكيه',
      'السلامه',
      'عزل حراري',
      'حسابات انشائيه',
      'drawing set',
    ],
    ar: 'مجموعة الرسومات بترتيب المكاتب الاستشارية: معماري (AR) من مخطط الموقع إلى المساقط والواجهات والقطاعات والعزل الحراري، ثم إنشائي (ST) بالمحاور والأعمدة والبلاطات وملخص الحسابات، ثم كهرباء (EL) وميكانيك (ME) وسلامة (FS) لكل دور. كلها مسودات مبدئية حتى يعتمدها مهندس كل تخصص.',
    en: 'The drawing set follows a consultant office order: architectural (AR) from the site layout to plans, elevations, sections and thermal insulation, then structural (ST) with axes, columns, slabs and a calculation summary, then electrical (EL), mechanical (ME) and fire and safety (FS) per floor. All are preliminary drafts until the engineer of each discipline approves.',
    basis: 'product',
  },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();

/** The guide entries that answer a question, best first (a word match scores by its length; none: empty). */
export function answerFromKnowledge(question: string, limit = 2): KnowledgeEntry[] {
  const q = norm(question);
  return KNOWLEDGE.filter((e) => e.kind === 'guide')
    .map((e) => ({
      e,
      score: e.words.reduce((s, w) => (q.includes(norm(w)) ? s + norm(w).length : s), 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}

/** Design practice that fits a brief: style- and type-specific entries first, then general ones. */
export function designTips(brief: { style?: string; type?: string }, limit = 5): KnowledgeEntry[] {
  const fits = KNOWLEDGE.filter(
    (e) =>
      e.kind === 'design' &&
      (!e.styles || (brief.style !== undefined && e.styles.includes(brief.style))) &&
      (!e.types || (brief.type !== undefined && e.types.includes(brief.type))),
  );
  const specific = (e: KnowledgeEntry) => (e.styles ? 2 : 0) + (e.types ? 1 : 0);
  return fits.sort((a, b) => specific(b) - specific(a)).slice(0, limit);
}
