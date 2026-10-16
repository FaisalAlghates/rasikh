'use client';

import { LibraryEntrySchema, type LibraryItem, type PlanRoom } from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useCollectionAt } from '@/lib/ops/hooks';
import { PlanView } from './PlanView';

const fmt = new Intl.NumberFormat('en-US');

/**
 * The shared design library as offices see it: every design an office added with its client's consent, credited to
 * the office, by building type. The engine learns from these when it designs; offices can browse them here.
 */
export function DesignLibraryList() {
  const t = useTranslations('eng');
  const docs = useCollectionAt<Record<string, unknown>>('designLibrary');
  const [type, setType] = useState<string>('all');
  const items = useMemo<LibraryItem[]>(
    () =>
      docs.rows.flatMap((d) => {
        const parsed = LibraryEntrySchema.safeParse(d.data);
        return parsed.success ? [{ ...parsed.data, id: d.id }] : [];
      }),
    [docs.rows],
  );
  const shown = items.filter((e) => type === 'all' || e.type === type);
  const offices = new Set(items.map((e) => e.officeId)).size;
  const roomLabel = (r: PlanRoom) => t(`room.${r.type}`);

  return (
    <section className="flex flex-col gap-4" data-testid="design-library">
      <p className="max-w-3xl text-small text-text-muted">{t('library.listLead')}</p>
      <p className="text-small font-semibold" role="status">
        {t('library.count', { n: items.length, offices })}
      </p>
      <label className="flex max-w-xs flex-col gap-1 text-small">
        {t('typeLabel')}
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="hairline min-h-11 rounded-md bg-surface px-2"
        >
          <option value="all">{t('library.allTypes')}</option>
          {[...new Set(items.map((e) => e.type))].map((ty) => (
            <option key={ty} value={ty}>
              {t(`type.${ty}`)}
            </option>
          ))}
        </select>
      </label>
      {shown.length === 0 && !docs.loading && (
        <p className="text-small text-text-muted">{t('library.empty')}</p>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {shown.map((e) => (
          <li
            key={e.id}
            data-testid="library-entry"
            className="hairline flex min-w-0 flex-col gap-2 rounded-xl bg-surface p-3"
          >
            <p className="text-body font-semibold">{e.title}</p>
            <p className="text-caption text-text-muted">
              {e.officeName} · {e.city} · {t(`designs.type.${e.pattern.typology}`)} ·{' '}
              <span className="tabular">{t('builtUp', { area: fmt.format(e.builtUpM2) })}</span>
            </p>
            <p className="text-caption">{t(`library.share.${e.share}`)}</p>
            {e.plan && (
              <PlanView
                plan={e.plan}
                floor={0}
                label={roomLabel}
                watermark={null}
                title={e.title}
                compact
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
