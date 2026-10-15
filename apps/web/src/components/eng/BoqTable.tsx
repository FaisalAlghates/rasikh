'use client';

import { BOQ_SECTIONS, boqCsv, type Boq } from '@rasikh/shared';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { download } from '@/lib/eng/data';

const fmt = new Intl.NumberFormat('en-US');

/** A bill of quantities grouped by section, with the total, the cost per m² and a CSV download. Never a quote. */
export function BoqTable({ bill, fileName }: { bill: Boq; fileName: string }) {
  const t = useTranslations('eng');
  const csv = () =>
    download(
      fileName,
      boqCsv(bill, {
        item: (i) => t(`boqItem.${i}`),
        unit: (u) => t(`unit.${u}`),
        head: (['no', 'item', 'qty', 'unit', 'min', 'max'] as const).map((k) => t(`boqCol.${k}`)),
      }),
      'text/csv;charset=utf-8',
    );
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] text-caption" data-testid="boq-table">
          <caption className="sr-only">{t('boqTitle')}</caption>
          <thead>
            <tr className="border-b border-border/20 text-text-muted">
              <th scope="col" className="p-1 text-start font-medium">
                {t('boqCol.no')}
              </th>
              <th scope="col" className="p-1 text-start font-medium">
                {t('boqCol.item')}
              </th>
              <th scope="col" className="p-1 text-start font-medium">
                {t('boqCol.qty')}
              </th>
              <th scope="col" className="p-1 text-end font-medium">
                {t('designs.colCost')}
              </th>
            </tr>
          </thead>
          {BOQ_SECTIONS.map((s) => {
            const lines = bill.lines.filter((l) => l.section === s);
            if (lines.length === 0) return null;
            return (
              <tbody key={s}>
                <tr>
                  <th scope="colgroup" colSpan={4} className="bg-bg p-1 text-start font-semibold">
                    {t(`boqSection.${s}`)}
                  </th>
                </tr>
                {lines.map((l) => (
                  <tr key={l.no} className="border-b border-border/10">
                    <td className="tabular p-1">{l.no}</td>
                    <td className="p-1">{t(`boqItem.${l.item}`)}</td>
                    <td className="tabular whitespace-nowrap p-1">
                      {fmt.format(l.qty)} {t(`unit.${l.unit}`)}
                    </td>
                    <td className="tabular whitespace-nowrap p-1 text-end">
                      {fmt.format(l.min)} – {fmt.format(l.max)}
                    </td>
                  </tr>
                ))}
              </tbody>
            );
          })}
          <tfoot>
            <tr>
              <th scope="row" colSpan={3} className="p-1 text-start">
                {t('boqTotal')}
              </th>
              <td className="tabular whitespace-nowrap p-1 text-end font-semibold">
                {fmt.format(bill.min)} – {fmt.format(bill.max)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="tabular text-caption text-text-muted">
        {t('perM2', { min: fmt.format(bill.perM2[0]!), max: fmt.format(bill.perM2[1]!) })}
      </p>
      <p className="text-caption text-text-muted">{t('boqNote')}</p>
      <Button variant="quiet" onClick={csv} className="self-start">
        <Download size={16} aria-hidden="true" />
        {t('boqCsv')}
      </Button>
    </div>
  );
}
