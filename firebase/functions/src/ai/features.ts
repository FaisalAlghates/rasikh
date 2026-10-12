import {
  TICKET_CATEGORIES,
  URGENCIES,
  balances,
  checkAd,
  computeReminders,
  daysBetween,
  renewalNoticeDate,
  suggestResponsibility,
  type AdDraft,
  type TicketCategory,
  type Urgency,
} from '@rasikh/shared';
import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { normalize } from './guard.js';

/**
 * Each feature first computes its FACTS from data the requesting person may see (checked here, because the Admin SDK
 * bypasses the security rules), then a Genkit flow phrases them. A feature only SUGGESTS: nothing here writes a record.
 */

export interface FeatureCtx {
  db: Firestore;
  orgId: string;
  uid: string;
  roles: string[];
  today: string;
}
export interface Citation {
  label: string;
  path: string;
}
export interface Gathered {
  facts: string[];
  citations: Citation[];
  /** A structured proposal the person can accept with one tap. Never applied by the server. */
  suggestion?: Record<string, unknown>;
}

const STAFF = new Set(['owner', 'manager', 'admin']);
export const isStaff = (roles: string[]) => roles.some((r) => STAFF.has(r));
const money = (n: number) => new Intl.NumberFormat('en-US').format(n);
const denied = () => new HttpsError('permission-denied', 'not_allowed');

// ---- inputs ---------------------------------------------------------------------------------------

export const InputSchemas = {
  explainLease: z.object({ leaseId: z.string().min(1) }),
  compareInspections: z.object({ inspectionId: z.string().min(1) }),
  triageTicket: z.object({
    title: z.string().trim().min(2).max(120),
    description: z.string().max(1000).default(''),
  }),
  adHelper: z.object({
    draft: z.object({
      purpose: z.enum(['sale', 'rent']).optional(),
      advertiserName: z.string().max(120).optional(),
      capacity: z.enum(['owner', 'broker', 'agent', 'developer']).optional(),
      adLicenseNo: z.string().max(20).optional(),
      adLicenseExpiry: z.string().max(10).optional(),
      city: z.string().max(60).optional(),
      district: z.string().max(60).optional(),
      propertyType: z.string().max(60).optional(),
      areaSqm: z.number().nonnegative().optional(),
      priceSar: z.number().nonnegative().optional(),
      phone: z.string().max(20).optional(),
      description: z.string().max(1500).optional(),
      disclosesEncumbrances: z.boolean().optional(),
    }),
  }),
  buildingSummary: z.object({ buildingId: z.string().min(1) }),
  assistant: z.object({ question: z.string().trim().min(2).max(2000) }),
} as const;

/** The text of an input that the scope classifier must read. Structured-only features have none. */
export function textOf(feature: keyof typeof InputSchemas, input: Record<string, unknown>): string {
  switch (feature) {
    case 'assistant':
      return String(input.question ?? '');
    case 'triageTicket':
      return `${String(input.title ?? '')} ${String(input.description ?? '')} صيانة`;
    case 'adHelper':
      return 'اعلان عقار';
    case 'explainLease':
      return 'شرح عقد ايجار';
    case 'compareInspections':
      return 'مقارنة فحص تسليم استلام';
    case 'buildingSummary':
      return 'ملخص عمارة';
  }
}

// ---- explain a lease ------------------------------------------------------------------------------

export async function gatherExplainLease(
  ctx: FeatureCtx,
  input: { leaseId: string },
): Promise<Gathered> {
  const ref = ctx.db.doc(`orgs/${ctx.orgId}/leases/${input.leaseId}`);
  const snap = await ref.get();
  const l = snap.data();
  if (!snap.exists || !l) throw new HttpsError('not-found', 'lease_not_found');
  if (!isStaff(ctx.roles) && l.tenantUid !== ctx.uid) throw denied();

  const pay = await ctx.db
    .collection(`orgs/${ctx.orgId}/payments`)
    .where('leaseId', '==', input.leaseId)
    .get();
  const due = pay.docs
    .map((d) => d.data() as { dueDate: string; amount: number; status: string })
    .filter((p) => p.status === 'due')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const left = daysBetween(ctx.today, l.endDate as string);
  const facts = [
    `رقم عقد إيجار المسجّل: ${l.ejarContractNo}`,
    `المدة: من ${l.startDate} إلى ${l.endDate} (${left >= 0 ? `يتبقى ${left} يوماً` : 'انتهى العقد'})`,
    `الإيجار السنوي: ${money(l.annualRent as number)} ريال، ويُدفع ${cycleAr(l.cycle as string)}`,
    due[0]
      ? `أقرب دفعة غير مسددة: ${money(due[0].amount)} ريال بتاريخ ${due[0].dueDate}`
      : 'لا توجد دفعات غير مسددة مسجلة',
    `آخر موعد لإشعار التجديد (٦٠ يوماً قبل الانتهاء): ${renewalNoticeDate(l.endDate as string)}`,
    'راسخ يسجّل العقد والدفعات فقط، والعقد الرسمي والوديعة عبر منصة إيجار.',
  ];
  return { facts, citations: [{ label: 'العقد', path: ref.path }] };
}

const cycleAr = (c: string) =>
  ({ monthly: 'شهرياً', quarterly: 'كل ٣ أشهر', semiannual: 'كل ٦ أشهر', annual: 'سنوياً' })[c] ??
  c;

// ---- compare move-in and move-out -----------------------------------------------------------------

const RANK: Record<string, number> = { good: 0, fair: 1, poor: 2, damaged: 3 };
const CONDITION_AR: Record<string, string> = {
  good: 'جيدة',
  fair: 'مقبولة',
  poor: 'سيئة',
  damaged: 'متضررة',
};

export async function gatherCompare(
  ctx: FeatureCtx,
  input: { inspectionId: string },
): Promise<Gathered> {
  const outRef = ctx.db.doc(`orgs/${ctx.orgId}/inspections/${input.inspectionId}`);
  const out = await outRef.get();
  const o = out.data();
  if (!out.exists || !o) throw new HttpsError('not-found', 'inspection_not_found');
  if (!isStaff(ctx.roles) && o.tenantUid !== ctx.uid) throw denied();
  if (o.kind !== 'move_out' || !o.moveInId)
    throw new HttpsError('failed-precondition', 'needs_move_out');

  const inRef = ctx.db.doc(`orgs/${ctx.orgId}/inspections/${o.moveInId}`);
  const [inSnap, outItems, inItems] = await Promise.all([
    inRef.get(),
    outRef.collection('items').get(),
    inRef.collection('items').get(),
  ]);
  if (!inSnap.exists) throw new HttpsError('not-found', 'move_in_not_found');
  const before = new Map(inItems.docs.map((d) => [d.id, d.data()]));
  const worse: string[] = [];
  for (const d of outItems.docs) {
    const a = before.get(d.id);
    const b = d.data();
    if (a && (RANK[b.condition as string] ?? 0) > (RANK[a.condition as string] ?? 0)) {
      worse.push(
        `${b.room} / ${b.item}: من ${CONDITION_AR[a.condition as string]} إلى ${CONDITION_AR[b.condition as string]}` +
          (b.assessment === 'damage'
            ? ' (قرّر المالك: تلف)'
            : b.assessment === 'wear'
              ? ' (قرّر المالك: استهلاك عادي)'
              : ''),
      );
    }
  }
  const facts = [
    `عدد البنود المقارنة: ${outItems.size}`,
    worse.length ? `بنود ساءت حالتها (${worse.length}):` : 'لا توجد بنود ساءت حالتها.',
    ...worse,
    'المقارنة على الحالات المسجلة في الفحصين، وليست مقارنة آلية للصور. الحكم بين استهلاك عادي وتلف يقرره الطرفان.',
  ];
  return {
    facts,
    citations: [
      { label: 'فحص التسليم', path: outRef.path },
      { label: 'فحص الاستلام', path: inRef.path },
    ],
  };
}

// ---- ticket triage (a suggestion the person confirms) ----------------------------------------------

const CATEGORY_WORDS: Array<[TicketCategory, string[]]> = [
  ['plumbing', ['تسرب', 'سباك', 'ماء', 'مياه', 'حنفيه', 'صرف', 'مجاري', 'خزان', 'سخان']],
  ['electrical', ['كهرباء', 'كهربائي', 'قاطع', 'فيش', 'اضاءه', 'لمبه', 'شرر', 'ماس']],
  ['ac', ['تكييف', 'مكيف', 'سبليت', 'تبريد', 'فريون']],
  ['appliance', ['ثلاجه', 'غسال', 'فرن', 'طباخ', 'غساله', 'مجفف']],
  ['structure', ['تشقق', 'شرخ', 'سقف', 'جدار', 'رطوبه', 'تصدع', 'هبوط']],
  ['pest', ['حشرات', 'صراصير', 'فئران', 'نمل', 'ارضه', 'بق']],
  ['tenant_damage', ['كسر', 'كسرت', 'انكسر', 'خدش', 'تخريب']],
  ['consumables', ['لمبه محروقه', 'مصباح', 'بطاريه', 'فلتر', 'مستهلك']],
];
const EMERGENCY = ['حريق', 'دخان', 'شرر', 'ماس كهربائي', 'غاز', 'غرق', 'فيضان', 'انهيار', 'صعق'];
const URGENT = ['تسرب', 'ماء', 'انقطاع', 'لا يعمل', 'معطل', 'بدون كهرباء', 'طفح', 'مجاري'];

export function triage(title: string, description: string) {
  const text = normalize(`${title} ${description}`);
  let category: TicketCategory = 'other';
  let bestHits = 0;
  for (const [cat, words] of CATEGORY_WORDS) {
    const hits = words.filter((w) => text.includes(normalize(w))).length;
    if (hits > bestHits) {
      bestHits = hits;
      category = cat;
    }
  }
  const urgency: Urgency = EMERGENCY.some((w) => text.includes(normalize(w)))
    ? 'emergency'
    : URGENT.some((w) => text.includes(normalize(w)))
      ? 'urgent'
      : 'normal';
  return {
    category,
    urgency,
    suggestedParty: suggestResponsibility(category),
    matched: bestHits > 0,
  };
}

export async function gatherTriage(
  _ctx: FeatureCtx,
  input: { title: string; description: string },
): Promise<Gathered> {
  const t = triage(input.title, input.description);
  const facts = [
    `التصنيف المقترح: ${categoryAr(t.category)}${t.matched ? '' : ' (لم أجد كلمات واضحة، راجعه)'}`,
    `الأولوية المقترحة: ${urgencyAr(t.urgency)}`,
    `المسؤولية المقترحة: ${t.suggestedParty === 'tenant' ? 'المستأجر' : 'المالك'} (اقتراح عام وفق إرشاد إيجار، والقرار لكما)`,
  ];
  return { facts, citations: [], suggestion: { category: t.category, urgency: t.urgency } };
}

const categoryAr = (c: string) =>
  ({
    consumables: 'مستهلكات',
    tenant_damage: 'ضرر من المستأجر',
    plumbing: 'سباكة',
    electrical: 'كهرباء',
    ac: 'تكييف',
    appliance: 'أجهزة',
    structure: 'هيكل ومبنى',
    pest: 'حشرات',
    other: 'أخرى',
  })[c] ?? c;
const urgencyAr = (u: string) =>
  ({ low: 'منخفضة', normal: 'عادية', urgent: 'عاجلة', emergency: 'طارئة' })[u] ?? u;

// Keeps the enums referenced so a new category or urgency in shared fails typecheck here.
export const TRIAGE_CATEGORIES = TICKET_CATEGORIES;
export const TRIAGE_URGENCIES = URGENCIES;

// ---- ad helper ---------------------------------------------------------------------------------------

export async function gatherAdHelper(
  ctx: FeatureCtx,
  input: { draft: AdDraft },
): Promise<Gathered> {
  if (!ctx.roles.includes('broker') && !isStaff(ctx.roles)) throw denied();
  const d = input.draft;
  const issues = checkAd(d, ctx.today);
  const errors = issues.filter((i) => i.severity === 'error').map((i) => i.code);
  const warnings = issues.filter((i) => i.severity === 'warning').map((i) => i.code);
  const parts = [d.propertyType, d.district && `في ${d.district}`, d.city]
    .filter(Boolean)
    .join(' ');
  const draftText = parts
    ? `${d.purpose === 'sale' ? 'للبيع' : 'للإيجار'}: ${parts}${d.areaSqm ? `، مساحة ${d.areaSqm} م²` : ''}${d.priceSar ? `، السعر ${money(d.priceSar)} ريال` : ''}.`
    : '';
  const facts = [
    errors.length
      ? `بيانات إلزامية ناقصة: ${errors.join('، ')}`
      : 'بيانات الإعلان الإلزامية مكتملة.',
    ...(warnings.length ? [`تنبيهات: ${warnings.join('، ')}`] : []),
    ...(draftText ? [`مسودة وصف مقترحة: ${draftText}`] : []),
    'المسودة اقتراح تراجعه وتعدّله بنفسك. راسخ لا ينشر الإعلان ولا يعتمده.',
  ];
  return {
    facts,
    citations: [],
    suggestion: { errors, warnings, ...(draftText ? { description: draftText } : {}) },
  };
}

// ---- building summary --------------------------------------------------------------------------------

export async function gatherBuildingSummary(
  ctx: FeatureCtx,
  input: { buildingId: string },
): Promise<Gathered> {
  const base = `orgs/${ctx.orgId}/buildings/${input.buildingId}`;
  if (!isStaff(ctx.roles)) {
    const link = await ctx.db.doc(`${base}/owners/${ctx.uid}`).get();
    if (!link.exists) throw denied();
  }
  const b = await ctx.db.doc(base).get();
  if (!b.exists) throw new HttpsError('not-found', 'building_not_found');
  const [members, expenses, contribs] = await Promise.all([
    ctx.db.collection(`${base}/members`).get(),
    ctx.db.collection(`${base}/expenses`).get(),
    ctx.db.collection(`${base}/contributions`).get(),
  ]);
  const shares = members.docs.map((d) => ({ id: d.id, shareBp: d.data().shareBp as number }));
  const bal = balances(
    shares,
    expenses.docs.map((d) => ({ amount: d.data().amount as number })),
    contribs.docs.map((d) => ({
      memberId: d.data().memberId as string,
      amount: d.data().amount as number,
    })),
  );
  const total = expenses.docs.reduce((s, d) => s + (d.data().amount as number), 0);
  const paid = contribs.docs.reduce((s, d) => s + (d.data().amount as number), 0);
  const owing = bal.filter((x) => x.balance > 0);
  const facts = [
    `العمارة: ${b.data()?.name}، عدد الملاك ${members.size}`,
    `إجمالي المصاريف المشتركة: ${money(total)} ريال، والمدفوع من الملاك: ${money(paid)} ريال`,
    owing.length
      ? `عدد الملاك الذين عليهم رصيد: ${owing.length}، وأكبر رصيد متبقٍ ${money(Math.max(...owing.map((x) => x.balance)))} ريال`
      : 'لا يوجد رصيد متبقٍ على أحد.',
    'راسخ يكمّل منصة مُلّاك الرسمية ولا يغني عنها.',
  ];
  return { facts, citations: [{ label: 'العمارة', path: base }] };
}

// ---- assistant -----------------------------------------------------------------------------------------

export async function gatherAssistant(ctx: FeatureCtx): Promise<Gathered> {
  const staff = isStaff(ctx.roles);
  const leasesQ = staff
    ? ctx.db.collection(`orgs/${ctx.orgId}/leases`)
    : ctx.db.collection(`orgs/${ctx.orgId}/leases`).where('tenantUid', '==', ctx.uid);
  const payQ = staff
    ? ctx.db.collection(`orgs/${ctx.orgId}/payments`)
    : ctx.db.collection(`orgs/${ctx.orgId}/payments`).where('tenantUid', '==', ctx.uid);
  const [leases, payments] = await Promise.all([leasesQ.get(), payQ.get()]);
  const reminders = computeReminders(
    ctx.today,
    leases.docs.map((d) => ({
      id: d.id,
      endDate: d.data().endDate as string,
      status: d.data().status as string,
    })),
    payments.docs.map((d) => ({
      id: d.id,
      leaseId: d.data().leaseId as string,
      dueDate: d.data().dueDate as string,
      status: d.data().status as 'due' | 'paid',
    })),
  );
  const late = reminders.filter((r) => r.kind === 'payment_late').length;
  const soon = reminders.filter((r) => r.kind === 'payment_upcoming').length;
  const expiring = reminders.filter(
    (r) => r.kind === 'lease_expiring' || r.kind === 'renewal_notice',
  ).length;
  const facts = [
    `عدد العقود المتاحة لك: ${leases.size}`,
    `دفعات متأخرة: ${late}، ودفعات قريبة خلال ٧ أيام: ${soon}`,
    `عقود تحتاج انتباهاً (قرب الانتهاء أو إشعار التجديد): ${expiring}`,
    'هذه الأرقام من سجلاتك في راسخ فقط.',
  ];
  return {
    facts,
    citations: leases.docs
      .slice(0, 5)
      .map((d) => ({ label: `عقد ${d.data().ejarContractNo ?? d.id}`, path: d.ref.path })),
  };
}
