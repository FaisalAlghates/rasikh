import type { Discipline } from './schemas.js';

/**
 * The drawing set as a consultant's office issues it: a code per discipline (AR, ST, EL, ME, FS), a running number,
 * and every title in Arabic and English. Which discipline sheets appear follows the disciplines the project requires;
 * all of them are preliminary drafts until the licensed engineer of that discipline approves.
 */
export type SheetKind =
  | 'site'
  | 'plan'
  | 'elevations'
  | 'sections'
  | 'schedules'
  | 'areas'
  | 'levels'
  | 'thermal'
  | 'access'
  | 'st-notes'
  | 'st-grid'
  | 'st-slab'
  | 'st-columns'
  | 'st-calc'
  | 'el-plan'
  | 'me-plan'
  | 'fs-plan';

export type SheetGroup = 'architectural' | 'structural' | 'electrical' | 'mechanical' | 'safety';

export const SHEET_PREFIX: Record<SheetGroup, string> = {
  architectural: 'AR',
  structural: 'ST',
  electrical: 'EL',
  mechanical: 'ME',
  safety: 'FS',
};

/** What the title block calls the kind of drawing. */
export const DRAWING_TYPE: Record<SheetGroup, { ar: string; en: string }> = {
  architectural: { ar: 'معماري', en: 'ARCHITECTURE' },
  structural: { ar: 'إنشائي', en: 'STRUCTURE' },
  electrical: { ar: 'كهرباء', en: 'ELECTRICAL' },
  mechanical: { ar: 'ميكانيك', en: 'MECHANICAL' },
  safety: { ar: 'السلامة والحريق', en: 'FIRE & SAFETY' },
};

export interface SheetSpec {
  /** The test/anchor id (`site`, `plan-0`, `elevations` ...). */
  id: string;
  kind: SheetKind;
  group: SheetGroup;
  floor?: number;
  /** `AR-03`. */
  code: string;
  ar: string;
  en: string;
  scale: string;
}

const FLOOR_AR = [
  'الدور الأرضي',
  'الدور الأول',
  'الدور الثاني',
  'الدور الثالث',
  'الدور الرابع',
  'الدور الخامس',
  'الدور السادس',
  'الدور السابع',
  'الدور الثامن',
  'الدور التاسع',
  'الدور العاشر',
  'الدور الحادي عشر',
];
const FLOOR_EN = [
  'GROUND',
  'FIRST',
  'SECOND',
  'THIRD',
  'FOURTH',
  'FIFTH',
  'SIXTH',
  'SEVENTH',
  'EIGHTH',
  'NINTH',
  'TENTH',
  'ELEVENTH',
];
export const floorName = (f: number) => ({
  ar: FLOOR_AR[f] ?? `الدور ${f}`,
  en: `${FLOOR_EN[f] ?? String(f)} FLOOR`,
});

type Draft = Omit<SheetSpec, 'code'>;

/** The ordered sheet list for a plan with `floors` floors. */
export function sheetSet(
  plan: { floors: number },
  disciplines: readonly Discipline[] | readonly string[],
): SheetSpec[] {
  const has = (d: string) => (disciplines as readonly string[]).includes(d);
  const floors = Array.from({ length: plan.floors }, (_, f) => f);
  const drafts: Draft[] = [
    {
      id: 'site',
      kind: 'site',
      group: 'architectural',
      ar: 'مخطط الموقع العام',
      en: 'SITE LAYOUT',
      scale: '1:100',
    },
    ...floors.map((f): Draft => ({
      id: `plan-${f}`,
      kind: 'plan',
      group: 'architectural',
      floor: f,
      ar: `مسقط ${floorName(f).ar}`,
      en: `${floorName(f).en} PLAN`,
      scale: '1:100',
    })),
    {
      id: 'elevations',
      kind: 'elevations',
      group: 'architectural',
      ar: 'الواجهات',
      en: 'ELEVATIONS',
      scale: '1:100',
    },
    {
      id: 'sections',
      kind: 'sections',
      group: 'architectural',
      ar: 'القطاعات',
      en: 'SECTIONS',
      scale: '1:100',
    },
    {
      id: 'levels',
      kind: 'levels',
      group: 'architectural',
      ar: 'المناسيب',
      en: 'LEVELS',
      scale: 'N.T.S.',
    },
    {
      id: 'thermal',
      kind: 'thermal',
      group: 'architectural',
      ar: 'العزل الحراري',
      en: 'THERMAL INSULATION',
      scale: 'N.T.S.',
    },
    {
      id: 'access',
      kind: 'access',
      group: 'architectural',
      ar: 'إمكانية الوصول',
      en: 'ACCESSIBILITY',
      scale: '1:100',
    },
    {
      id: 'schedules',
      kind: 'schedules',
      group: 'architectural',
      ar: 'جداول الأبواب والنوافذ',
      en: 'DOOR & WINDOW SCHEDULES',
      scale: 'N.T.S.',
    },
    {
      id: 'areas',
      kind: 'areas',
      group: 'architectural',
      ar: 'جدول المساحات',
      en: 'AREA SCHEDULE',
      scale: 'N.T.S.',
    },
  ];
  if (has('structural'))
    drafts.push(
      {
        id: 'st-notes',
        kind: 'st-notes',
        group: 'structural',
        ar: 'الملاحظات العامة والمواد',
        en: 'GENERAL NOTES & MATERIALS',
        scale: 'N.T.S.',
      },
      {
        id: 'st-grid',
        kind: 'st-grid',
        group: 'structural',
        ar: 'المحاور والأعمدة عند الأساسات',
        en: 'AXES & COLUMNS AT FOUNDATIONS',
        scale: '1:100',
      },
      {
        id: 'st-slab',
        kind: 'st-slab',
        group: 'structural',
        ar: 'مخطط البلاطات والجسور',
        en: 'SLAB & BEAM LAYOUT',
        scale: '1:100',
      },
      {
        id: 'st-columns',
        kind: 'st-columns',
        group: 'structural',
        ar: 'جدول الأعمدة',
        en: 'COLUMN SCHEDULE',
        scale: 'N.T.S.',
      },
      {
        id: 'st-calc',
        kind: 'st-calc',
        group: 'structural',
        ar: 'ملخص الحسابات الإنشائية المبدئية',
        en: 'PRELIMINARY CALCULATION SUMMARY',
        scale: 'N.T.S.',
      },
    );
  if (has('electrical'))
    for (const f of floors)
      drafts.push({
        id: `el-${f}`,
        kind: 'el-plan',
        group: 'electrical',
        floor: f,
        ar: `مخطط الكهرباء — ${floorName(f).ar}`,
        en: `${floorName(f).en} ELECTRICAL PLAN`,
        scale: '1:100',
      });
  if (has('mechanical'))
    for (const f of floors)
      drafts.push({
        id: `me-${f}`,
        kind: 'me-plan',
        group: 'mechanical',
        floor: f,
        ar: `مخطط الميكانيك والسباكة — ${floorName(f).ar}`,
        en: `${floorName(f).en} MECHANICAL & PLUMBING PLAN`,
        scale: '1:100',
      });
  if (has('electrical') || has('mechanical'))
    for (const f of floors)
      drafts.push({
        id: `fs-${f}`,
        kind: 'fs-plan',
        group: 'safety',
        floor: f,
        ar: `مخطط السلامة والحريق — ${floorName(f).ar}`,
        en: `${floorName(f).en} FIRE & SAFETY PLAN`,
        scale: '1:100',
      });

  const next: Record<string, number> = {};
  return drafts.map((d) => {
    const prefix = SHEET_PREFIX[d.group];
    next[prefix] = (next[prefix] ?? 0) + 1;
    return { ...d, code: `${prefix}-${String(next[prefix]).padStart(2, '0')}` };
  });
}

/** Title-block labels, Arabic and English on every sheet like the reference sets. */
export const TITLE_BLOCK = {
  office: { ar: 'المكتب', en: 'OFFICE' },
  project: { ar: 'اسم المشروع', en: 'PROJECT NAME' },
  type: { ar: 'نوع اللوحة', en: 'DRAWING TYPE' },
  title: { ar: 'عنوان اللوحة', en: 'DRAWING TITLE' },
  date: { ar: 'التاريخ', en: 'DATE' },
  sheet: { ar: 'رقم اللوحة', en: 'SHEET NO.' },
  scale: { ar: 'مقياس الرسم', en: 'SCALE' },
  version: { ar: 'النسخة', en: 'VERSION' },
  stamp: { ar: 'مكان الختم والتوقيع بعد الاعتماد', en: 'STAMP & SIGNATURE AREA AFTER APPROVAL' },
  notes: { ar: 'ملاحظات', en: 'NOTES' },
} as const;
