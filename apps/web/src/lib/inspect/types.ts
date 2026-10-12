import type {
  InspectionInput,
  InspectionItem,
  InspectionMedia,
  InspectionStatus,
  SignParty,
} from '@rasikh/shared';

interface Stamp {
  toDate(): Date;
}

export interface SignatureDoc {
  uid: string;
  digest: string;
  at?: Stamp;
}

export type InspectionDoc = InspectionInput & {
  status: InspectionStatus;
  tenantUid?: string;
  tenantComment?: string;
  signatures?: Partial<Record<SignParty, SignatureDoc>>;
  digest?: string;
  sealedAt?: Stamp;
  createdBy: string;
  createdAt?: Stamp;
};

export type ItemDoc = InspectionItem;
export type MediaDoc = InspectionMedia & { uploadedBy: string; createdAt?: Stamp };

/** Riyadh calendar day (UTC+3) of a Firestore timestamp. */
export const riyadhDay = (s?: Stamp) =>
  s ? new Date(s.toDate().getTime() + 3 * 3600_000).toISOString().slice(0, 10) : undefined;
