'use client';

import { yearTotals } from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NativeSelect } from '@/components/ui/Input';
import { today, type Row } from '@/lib/ops/hooks';
import { money, type ExpenseDoc, type PaymentDoc } from '@/lib/ops/types';

/** Branded annual income/expense report. "Print or save as PDF" uses the browser, which shapes Arabic correctly. */
export function ReportTab({
  payments,
  expenses,
}: {
  payments: Row<PaymentDoc>[];
  expenses: Row<ExpenseDoc>[];
}) {
  const t = useTranslations('ops');
  const nowYear = Number(today().slice(0, 4));
  const [year, setYear] = useState(nowYear);
  const totals = yearTotals(
    year,
    payments.map((p) => p.data),
    expenses.map((e) => e.data),
  );
  const rows: Array<[string, number, string]> = [
    [t('expected'), totals.expected, 'expected'],
    [t('collected'), totals.collected, 'collected'],
    [t('outstanding'), totals.outstanding, 'outstanding'],
    [t('expenses'), totals.expenses, 'expenses'],
    [t('net'), totals.net, 'net'],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="w-40">
          <NativeSelect
            id="yr"
            label={t('year')}
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
            options={[nowYear - 1, nowYear, nowYear + 1].map((y) => ({
              value: String(y),
              label: String(y),
            }))}
          />
        </div>
        <Button variant="quiet" onClick={() => window.print()}>
          {t('print')}
        </Button>
      </div>

      <Card className="print-area flex flex-col gap-6 p-8" data-testid="report">
        <header className="flex items-center justify-between gap-4 border-b border-border/30 pb-4">
          <span className="flex items-center gap-3 text-brand-text">
            <BrandMark size={32} />
            <span className="display-font text-h2 text-text">راسخ</span>
          </span>
          <span className="text-end">
            <span className="block text-h3 font-semibold">{t('reportTitle')}</span>
            <span className="tabular block text-small text-text-muted">{year}</span>
          </span>
        </header>
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map(([label, value, key]) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-4 border-b border-border/20 pb-2"
            >
              <dt className="text-text-muted">{label}</dt>
              <dd data-testid={`total-${key}`} className="tabular text-h3 font-semibold">
                {money(value)} {t('sar')}
              </dd>
            </div>
          ))}
        </dl>
        <footer className="text-caption text-text-muted">
          <p>{t('reportNote')}</p>
          <p>
            {t('generatedBy')} · {today()}
          </p>
        </footer>
      </Card>
    </div>
  );
}
