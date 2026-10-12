'use client';

import { compareInspections, damageTotal, needsAssessment } from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { conditionLabel, itemLabel, roomLabel } from '@/lib/inspect/labels';
import { riyadhDay, type InspectionDoc, type ItemDoc } from '@/lib/inspect/types';
import { money } from '@/lib/ops/types';

/**
 * Move-in vs move-out, ready to print or save as PDF (the browser shapes Arabic correctly) and attach in Ejar.
 * A change is only "damage" if a person decided so; the screen never judges on its own.
 */
export function CompareReport({
  inspection,
  leaseLabel,
  moveIn,
  moveOut,
}: {
  inspection: InspectionDoc;
  leaseLabel: string;
  moveIn: ItemDoc[];
  moveOut: ItemDoc[];
}) {
  const t = useTranslations('inspect');
  const rows = compareInspections(moveIn, moveOut);
  const changed = rows.filter((r) => r.change !== 'same');
  const open = needsAssessment(rows).filter((r) => !r.after?.assessment);
  const total = damageTotal(rows);

  return (
    <section className="flex flex-col gap-3" aria-label={t('compareTitle')}>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-h3 font-semibold">{t('compareTitle')}</h3>
        <Button variant="quiet" onClick={() => window.print()} data-testid="print-compare">
          {t('printReport')}
        </Button>
      </div>

      <Card className="print-area flex flex-col gap-5 p-6" data-testid="compare-report">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-4">
          <span className="flex items-center gap-3 text-brand-text">
            <BrandMark size={28} />
            <span className="display-font text-h2 text-text">راسخ</span>
          </span>
          <span className="text-end">
            <span className="block text-h3 font-semibold">{t('compareTitle')}</span>
            <span className="block text-small text-text-muted">{leaseLabel}</span>
            <span className="tabular block text-caption text-text-muted" dir="ltr">
              {riyadhDay(inspection.sealedAt) ?? t(`status_${inspection.status}`)}
            </span>
          </span>
        </header>

        {changed.length === 0 ? (
          <p className="text-small text-text-muted" data-testid="no-changes">
            {t('noChanges')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-start text-small">
              <thead>
                <tr className="text-text-muted">
                  <th className="py-2 text-start font-medium">{t('colItem')}</th>
                  <th className="py-2 text-start font-medium">{t('colBefore')}</th>
                  <th className="py-2 text-start font-medium">{t('colAfter')}</th>
                  <th className="py-2 text-start font-medium">{t('assessment')}</th>
                  <th className="py-2 text-start font-medium">{t('costSar')}</th>
                </tr>
              </thead>
              <tbody>
                {changed.map((r) => (
                  <tr key={r.id} className="border-t border-border/20" data-testid={`cmp-${r.id}`}>
                    <td className="py-2">
                      {roomLabel(t, r.room)} · {itemLabel(t, r.item)}
                    </td>
                    <td className="py-2">
                      {r.before ? conditionLabel(t, r.before.condition) : '—'}
                    </td>
                    <td className="py-2">
                      {r.after ? conditionLabel(t, r.after.condition) : t('missingNow')}
                      {r.change === 'better' ? ` (${t('better')})` : ''}
                    </td>
                    <td className="py-2">
                      {r.after?.assessment === 'damage'
                        ? t('assessDamage')
                        : r.after?.assessment === 'wear'
                          ? t('assessWear')
                          : r.change === 'worse'
                            ? t('notAssessed')
                            : '—'}
                    </td>
                    <td className="tabular py-2">
                      {r.after?.assessment === 'damage' && r.after.costSar !== undefined
                        ? money(r.after.costSar)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-baseline justify-between gap-4 border-b border-border/20 pb-2">
            <dt className="text-text-muted">{t('damageTotal')}</dt>
            <dd className="tabular text-h3 font-semibold" data-testid="damage-total">
              {money(total)} {t('sar')}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border/20 pb-2">
            <dt className="text-text-muted">{t('pendingAssessment')}</dt>
            <dd className="tabular text-h3 font-semibold" data-testid="pending-assessment">
              {open.length}
            </dd>
          </div>
        </dl>

        <footer className="text-caption text-text-muted">
          <p>{t('compareNote')}</p>
          {inspection.digest && (
            <p dir="ltr" className="tabular break-all">
              SHA-256 {inspection.digest}
            </p>
          )}
        </footer>
      </Card>
    </section>
  );
}
