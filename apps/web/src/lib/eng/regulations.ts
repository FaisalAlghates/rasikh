'use client';

import {
  NATIONAL_REGULATIONS,
  RegulationSchema,
  type Regulation,
  type RegulationEntry,
} from '@rasikh/shared';
import type { Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';
import { useCollectionAt } from '@/lib/ops/hooks';

/** regulations/{id}: an Amanah's own requirements, kept by the Rasikh team with their source. */
export interface RegulationDoc extends Regulation {
  status: 'draft' | 'verified';
  updatedBy: string;
  updatedAt?: Timestamp;
}

/** A library entry: the Ministry's national requirements (in the code) or an Amanah's (draft or verified). */
export type LibraryEntry = RegulationEntry & { status: 'national' | 'draft' | 'verified' };

/** The whole library: the national requirements, then every valid Amanah entry. */
export function useRegulationLibrary(enabled = true): {
  entries: LibraryEntry[];
  loading: boolean;
} {
  const none = useMemo(() => [], []);
  const docs = useCollectionAt<RegulationDoc>('regulations', none, enabled);
  const entries = useMemo<LibraryEntry[]>(
    () => [
      ...NATIONAL_REGULATIONS.map((r) => ({ ...r, status: 'national' as const })),
      ...docs.rows.flatMap((d) => {
        const parsed = RegulationSchema.safeParse(d.data);
        return parsed.success ? [{ ...parsed.data, id: d.id, status: d.data.status }] : [];
      }),
    ],
    [docs.rows],
  );
  return { entries, loading: docs.loading };
}
