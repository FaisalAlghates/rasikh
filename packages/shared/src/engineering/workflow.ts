import type { Discipline, ProjectStatus } from './schemas.js';

/**
 * The office workflow: brief → concepts → client picks → office develops → discipline reviews → approvals → release.
 * Approval needs a verified office and a verified engineer of that discipline whose SCE membership is current; it
 * signs the SHA-256 of the exact version. A version is released only when every required discipline approved that
 * same hash. Rasikh never stamps or submits in an engineer's name.
 */

export const WATERMARK = {
  ar: 'مسودة — تتطلب مراجعة واعتماد مهندس مرخّص',
  en: 'DRAFT — requires review and approval by a licensed engineer',
} as const;

export interface ApproverState {
  officeVerified: boolean;
  engineer?: {
    verified: boolean;
    active: boolean;
    discipline: Discipline;
    /** YYYY-MM-DD */
    expiresOn: string;
  };
}

export type ApprovalBlock =
  | 'office_not_verified'
  | 'not_an_engineer'
  | 'engineer_not_verified'
  | 'engineer_inactive'
  | 'membership_expired'
  | 'wrong_discipline';

/** Why this person cannot approve this discipline today (empty = may approve). */
export function approvalBlocks(
  s: ApproverState,
  discipline: Discipline,
  today: string,
): ApprovalBlock[] {
  const out: ApprovalBlock[] = [];
  if (!s.officeVerified) out.push('office_not_verified');
  if (!s.engineer) return [...out, 'not_an_engineer'];
  if (!s.engineer.verified) out.push('engineer_not_verified');
  if (!s.engineer.active) out.push('engineer_inactive');
  if (s.engineer.expiresOn < today) out.push('membership_expired');
  if (s.engineer.discipline !== discipline) out.push('wrong_discipline');
  return out;
}

/** Disciplines whose engineers must approve before release. */
export function requiredDisciplines(
  kind: 'new' | 'renovation',
  structuralChange = true,
): Discipline[] {
  if (kind === 'renovation')
    return structuralChange ? ['architectural', 'structural'] : ['architectural'];
  return ['architectural', 'structural', 'mechanical', 'electrical'];
}

export interface ApprovalRecord {
  discipline: Discipline;
  sha256: string;
}

export function releaseReadiness(
  required: Discipline[],
  approvals: ApprovalRecord[],
  sha256: string,
) {
  const ok = new Set(approvals.filter((a) => a.sha256 === sha256).map((a) => a.discipline));
  const stale = approvals.filter((a) => a.sha256 !== sha256).map((a) => a.discipline);
  const missing = required.filter((d) => !ok.has(d));
  return { ready: missing.length === 0, missing, stale };
}

/** Allowed project status moves, and who may make them. */
export const TRANSITIONS: Record<
  ProjectStatus,
  Array<{ to: ProjectStatus; by: 'client' | 'office' }>
> = {
  brief: [
    { to: 'accepted', by: 'office' },
    { to: 'declined', by: 'office' },
  ],
  accepted: [{ to: 'concepts', by: 'office' }],
  concepts: [{ to: 'picked', by: 'client' }],
  picked: [{ to: 'development', by: 'office' }],
  development: [{ to: 'review', by: 'office' }],
  review: [
    { to: 'development', by: 'office' },
    { to: 'released', by: 'office' },
  ],
  released: [{ to: 'development', by: 'office' }],
  declined: [],
};

export function canMove(from: ProjectStatus, to: ProjectStatus, by: 'client' | 'office') {
  return TRANSITIONS[from].some((t) => t.to === to && t.by === by);
}
