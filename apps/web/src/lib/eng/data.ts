'use client';

import {
  RULE_PACK_VERSION,
  canonicalPlan,
  type Boq,
  type DesignPlan,
  type Discipline,
  type PermitItem,
  type PermitState,
  type Plot,
  type Program,
  type ProjectStatus,
  type Rates,
  type RuleOverrides,
  type Zoning,
} from '@rasikh/shared';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firebaseDb } from '@/lib/firebase';

/** offices/{officeId} */
export interface OfficeDoc {
  name: string;
  crNo: string;
  sceClass: string;
  baladyActive: boolean;
  disciplines: Discipline[];
  cities: string[];
  accepting: boolean;
  verified: boolean;
  verifiedAt?: Timestamp;
}

/** offices/{officeId}/engineers/{uid} */
export interface EngineerDoc {
  name: string;
  sceNo: string;
  grade: string;
  discipline: Discipline;
  expiresAt: Timestamp;
  verified: boolean;
  active: boolean;
}

/** designProjects/{pid} */
export interface ProjectDoc {
  officeId: string;
  clientUid: string;
  clientName: string;
  title: string;
  kind: 'new' | 'renovation';
  status: ProjectStatus;
  brief: string;
  program: Program;
  plot: Plot;
  zoning?: Zoning;
  required?: Discipline[];
  permit?: Partial<Record<PermitItem, PermitState>>;
  pickedVersionId?: string;
  /** Renovation: the version holding the existing building. */
  existingVersionId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** What the checks say about an option, in words a client can read. */
export interface CheckSummary {
  zoning: { passed: number; total: number };
  code: { passed: number; total: number; verified: boolean };
  manual: number;
}

/** designProjects/{pid}/versions/{vid} */
export interface VersionDoc {
  label: string;
  kind: 'concept' | 'development' | 'existing';
  status: 'draft' | 'shared' | 'review' | 'released';
  plan: DesignPlan;
  sha256: string;
  required: Discipline[];
  /** Concepts: the bill of quantities priced with the office's rates when the option was made (the client sees it). */
  boq?: Boq;
  /** Concepts: the check summary recorded when the option was made. */
  checks?: CheckSummary;
  createdBy: string;
  createdAt?: Timestamp;
  releasedAt?: Timestamp;
  releasedBy?: string;
}

/** designProjects/{pid}/versions/{vid}/approvals/{discipline} */
export interface ApprovalDoc {
  uid: string;
  name: string;
  sceNo: string;
  discipline: Discipline;
  sha256: string;
  at?: Timestamp;
}

export interface RulePackDoc {
  rules: RuleOverrides;
}

export interface SettingsRatesDoc {
  /** May predate newer BOQ items: merge with DEFAULT_RATES. */
  rates: Partial<Rates>;
}

/** SHA-256 (hex) of a string, in the browser. */
export async function sha256Text(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The fingerprint approvals sign: SHA-256 of the plan's canonical JSON. */
export const planSha = (plan: DesignPlan) => sha256Text(canonicalPlan(plan));

/** Live single document. */
export function useDocAt<T>(path: string | undefined, enabled = true) {
  const [data, setData] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    if (!path || !enabled) return;
    return onSnapshot(
      doc(firebaseDb(), path),
      (s) => setData(s.exists() ? (s.data() as T) : null),
      () => setData(null),
    );
  }, [path, enabled]);
  return data;
}

export const rulePackPath = (officeId: string) =>
  `offices/${officeId}/rulePacks/${RULE_PACK_VERSION}`;

/** Riyadh calendar date, YYYY-MM-DD. */
export const todayRiyadh = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

export function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
