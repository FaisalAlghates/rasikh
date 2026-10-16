'use client';

import {
  LibraryEntrySchema,
  builtUpArea,
  patternOf,
  type LibraryItem,
  type Program,
} from '@rasikh/shared';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { firebaseDb } from '@/lib/firebase';
import { useCollectionAt } from '@/lib/ops/hooks';
import type { ProjectDoc, VersionDoc } from './data';

/** The shared design library for one building type (only valid entries). */
export function useDesignLibrary(type: Program['type'] | undefined, enabled = true) {
  const q = useMemo(() => (type ? [where('type', '==', type)] : []), [type]);
  const docs = useCollectionAt<Record<string, unknown>>('designLibrary', q, enabled && !!type);
  const items = useMemo<LibraryItem[]>(
    () =>
      docs.rows.flatMap((d) => {
        const parsed = LibraryEntrySchema.safeParse(d.data);
        return parsed.success ? [{ ...parsed.data, id: d.id }] : [];
      }),
    [docs.rows],
  );
  return { items, loading: docs.loading };
}

/**
 * The office's own released designs, as patterns the engine can learn the office's way of working from. They never
 * leave the office (nothing is written anywhere); a project of the same brief type is enough.
 */
export async function officePatterns(
  officeId: string,
  officeName: string,
  type: Program['type'],
  skip: string,
): Promise<LibraryItem[]> {
  const db = firebaseDb();
  const projects = await getDocs(
    query(
      collection(db, 'designProjects'),
      where('officeId', '==', officeId),
      where('status', '==', 'released'),
      limit(30),
    ),
  );
  const out: LibraryItem[] = [];
  for (const p of projects.docs) {
    const project = p.data() as ProjectDoc;
    if (p.id === skip || project.program.type !== type) continue;
    const versions = await getDocs(
      query(
        collection(db, `designProjects/${p.id}/versions`),
        where('status', '==', 'released'),
        limit(1),
      ),
    );
    const plan = (versions.docs[0]?.data() as VersionDoc | undefined)?.plan;
    const pattern = plan && patternOf(plan);
    if (!plan || !pattern) continue;
    out.push({
      id: `own-${p.id}`,
      officeId,
      officeName,
      title: project.title,
      city: project.plot.city,
      type: project.program.type,
      style: project.program.style,
      floors: project.program.floors,
      bedrooms: project.program.bedrooms,
      plot: { width: plan.plot.width, depth: plan.plot.depth },
      builtUpM2: Math.round(builtUpArea(plan)),
      pattern,
      share: 'pattern',
    });
  }
  return out;
}
