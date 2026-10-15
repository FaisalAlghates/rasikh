'use client';

import { summarize, type RuleResult } from '@rasikh/shared';
import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/cn';

/**
 * The rule engine's report: zoning (from the office's municipal values) and the building code, each rule passed,
 * failed or NOT CHECKED. "Not checked" is never shown as passed; its preview is labelled as such.
 */
export function ChecksReport({
  results,
  onFocus,
}: {
  results: RuleResult[];
  onFocus?: (roomIds: string[]) => void;
}) {
  const t = useTranslations('eng');
  const s = summarize(results);
  const group = (pack: 'zoning' | 'code', title: string) => (
    <section aria-labelledby={`chk-${pack}`} className="flex flex-col gap-2">
      <h3 id={`chk-${pack}`} className="text-small font-semibold text-text-muted">
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {results
          .filter((r) => r.pack === pack)
          .map((r) => (
            <li
              key={r.id}
              data-testid={`rule-${r.id}`}
              data-status={r.status}
              className={cn(
                'hairline flex items-start gap-3 rounded-lg bg-surface p-3',
                r.rooms.length > 0 && onFocus && 'cursor-pointer hover:border-brand',
              )}
              onClick={() => r.rooms.length > 0 && onFocus?.(r.rooms)}
            >
              {r.status === 'passed' ? (
                <CheckCircle2
                  size={18}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-success"
                />
              ) : r.status === 'failed' ? (
                <XCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
              ) : (
                <CircleHelp size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="flex flex-wrap items-center gap-x-2 text-small font-semibold">
                  {t(`rule.${r.id}`)}
                  <span className="text-caption font-normal text-text-muted" dir="ltr">
                    {r.pack === 'code' ? `${r.ref}${r.clause ? ` · ${r.clause}` : ''}` : ''}
                  </span>
                </p>
                <p className="text-caption text-text-muted">
                  <span
                    className={cn(
                      'font-semibold',
                      r.status === 'passed'
                        ? 'text-success'
                        : r.status === 'failed'
                          ? 'text-danger'
                          : 'text-warning',
                    )}
                  >
                    {t(`rs.${r.status}`)}
                  </span>
                  {r.status === 'not_checked' &&
                    (r.preview ? (
                      <>
                        {' · '}
                        {r.preview === 'would_pass' ? t('wouldPass') : t('wouldFail')}
                        {' · '}
                        {t('paramsUnverified')}
                      </>
                    ) : (
                      <> · {t('needsEngineer')}</>
                    ))}
                  {r.value !== undefined && (
                    <span className="tabular" dir="ltr">
                      {' '}
                      ({r.value})
                    </span>
                  )}
                  {r.rooms.length > 0 && <span> · {r.rooms.length}</span>}
                </p>
              </div>
            </li>
          ))}
      </ul>
    </section>
  );
  return (
    <div className="flex flex-col gap-4" data-testid="checks-report">
      <p className="tabular text-small" role="status">
        {t('summary', s)}
      </p>
      {group('zoning', t('zoningResults'))}
      {group('code', t('codeResults'))}
    </div>
  );
}
