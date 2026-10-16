'use client';

import { applicableRegulations, type Zoning } from '@rasikh/shared';
import { ExternalLink, Landmark } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ProjectDoc } from '@/lib/eng/data';
import { useRegulationLibrary, type LibraryEntry } from '@/lib/eng/regulations';

const CLAUSES = [
  'front',
  'streetSide',
  'neighbour',
  'coverageGround',
  'coverageUpper',
  'roofAnnex',
  'maxFloors',
  'parking',
  'height',
] as const;

/**
 * The municipal requirements for the plot: the office picks the ones that apply (the Ministry's national ones, and
 * the Amanah's own for that city) and applies them; the setbacks follow the plot's street widths, and every value
 * keeps its source document and clause.
 */
export function RegulationPicker({
  project,
  zoning,
  canApply,
  onApply,
}: {
  project: ProjectDoc;
  zoning: Zoning;
  canApply: boolean;
  onApply: (entry: LibraryEntry) => void;
}) {
  const t = useTranslations('eng.regs');
  const { entries } = useRegulationLibrary();
  const options = applicableRegulations(
    entries,
    project.program.type,
    project.plot.city,
  ) as LibraryEntry[];
  const [id, setId] = useState<string>();
  const chosen = options.find((o) => o.id === (id ?? zoning.source?.id)) ?? options[0];
  const applied = zoning.source ? entries.find((e) => e.id === zoning.source!.id) : undefined;

  return (
    <section
      className="hairline flex flex-col gap-2 rounded-lg bg-bg p-3"
      aria-labelledby="regs-h"
      data-testid="regulations"
    >
      <h4 id="regs-h" className="flex items-center gap-2 text-small font-semibold">
        <Landmark size={16} aria-hidden="true" className="text-brand-text" />
        {t('title')}
      </h4>
      <p className="text-caption text-text-muted">{t('lead')}</p>
      {options.length === 0 ? (
        <p className="text-caption text-warning">{t('none')}</p>
      ) : (
        canApply && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-0 flex-col gap-1 text-small">
              {t('choose')}
              <select
                value={chosen?.id}
                onChange={(e) => setId(e.target.value)}
                className="hairline min-h-11 max-w-full rounded-md bg-surface px-2"
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} — {o.source.issuer}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="quiet" onClick={() => chosen && onApply(chosen)}>
              {t('apply')}
            </Button>
          </div>
        )
      )}
      {applied && <SourceBox entry={applied} />}
    </section>
  );
}

/** Where the applied values come from: the document, its status, the official link and the clause of each value. */
export function SourceBox({ entry }: { entry: LibraryEntry }) {
  const t = useTranslations('eng.regs');
  return (
    <div className="flex flex-col gap-1 text-caption" data-testid="regulation-source">
      <p className="font-semibold">
        {t('from', {
          document: entry.source.document,
          issuer: entry.source.issuer,
          reference: entry.source.reference ? ` (${entry.source.reference})` : '',
        })}
      </p>
      <p className={entry.status === 'draft' ? 'text-warning' : 'text-success'}>
        {t(`status.${entry.status}`)}
      </p>
      {entry.source.url && (
        <a
          href={entry.source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-brand-text underline"
        >
          {t('openSource')}
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}
      <ul className="flex flex-col gap-0.5 text-text-muted">
        {CLAUSES.filter((k) => entry.clauses[k]).map((k) => (
          <li key={k}>
            {t(`clause.${k}`)}: {entry.clauses[k]}
          </li>
        ))}
      </ul>
      {entry.notes && <p className="text-text-muted">{entry.notes}</p>}
    </div>
  );
}
