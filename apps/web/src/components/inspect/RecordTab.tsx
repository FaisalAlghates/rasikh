'use client';

import { buildTimeline, type TimelineEvent as RecordEvent } from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { NativeSelect } from '@/components/ui/Input';
import { Timeline } from '@/components/ui/Timeline';
import { riyadhDay, type InspectionDoc } from '@/lib/inspect/types';
import { today, type Row } from '@/lib/ops/hooks';
import { money, type ExpenseDoc, type LeaseDoc, type PropertyDoc } from '@/lib/ops/types';

/**
 * Property Health Record: one timeline per property, computed from the leases, signed inspections and
 * expenses the other modules already keep, so it can never contradict them.
 */
export function RecordTab({
  properties,
  leases,
  inspections,
  expenses,
}: {
  properties: Row<PropertyDoc>[];
  leases: Row<LeaseDoc>[];
  inspections: Row<InspectionDoc>[];
  expenses: Row<ExpenseDoc>[];
}) {
  const t = useTranslations('inspect');
  const o = useTranslations('ops');
  const [propertyId, setPropertyId] = useState<string>();
  const chosen = propertyId ?? properties[0]?.id;

  const events = useMemo(() => {
    if (!chosen) return [];
    return buildTimeline(chosen, {
      today: today(),
      leases: leases.map((l) => ({
        id: l.id,
        propertyId: l.data.propertyId,
        startDate: l.data.startDate,
        endDate: l.data.endDate,
        unitLabel: l.data.unitLabel,
        status: l.data.status,
      })),
      inspections: inspections.map((i) => ({
        id: i.id,
        propertyId: i.data.propertyId,
        kind: i.data.kind,
        status: i.data.status,
        sealedOn: riyadhDay(i.data.sealedAt),
        unitLabel: leases.find((l) => l.id === i.data.leaseId)?.data.unitLabel,
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        propertyId: e.data.propertyId,
        date: e.data.date,
        category: e.data.category,
        amount: e.data.amount,
      })),
    });
  }, [chosen, leases, inspections, expenses]);

  if (properties.length === 0) return <EmptyState title={o('noProperties')} />;

  const title = (e: RecordEvent) => {
    const where = e.unitLabel ? ` · ${e.unitLabel}` : '';
    switch (e.kind) {
      case 'lease_started':
        return `${t('evLeaseStarted')}${where}`;
      case 'lease_ended':
        return `${t('evLeaseEnded')}${where}`;
      case 'inspection_sealed':
        return `${t(e.detail === 'move_out' ? 'evMoveOut' : 'evMoveIn')}${where}`;
      case 'expense':
        return `${t('evExpense')} · ${o(`cat${(e.detail ?? 'other')[0]!.toUpperCase()}${(e.detail ?? 'other').slice(1)}`)}`;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {properties.length > 1 && (
        <div className="max-w-sm">
          <NativeSelect
            id="record-property"
            label={o('property')}
            value={chosen}
            onChange={(e) => setPropertyId(e.target.value)}
            options={properties.map((p) => ({ value: p.id, label: p.data.name }))}
          />
        </div>
      )}
      {events.length === 0 ? (
        <EmptyState title={t('recordEmpty')} />
      ) : (
        <div data-testid="health-record">
          <Timeline
            label={t('recordTitle')}
            events={events.map((e) => ({
              id: e.key,
              date: e.date,
              title: title(e),
              detail: e.amount !== undefined ? `${money(e.amount)} ${o('sar')}` : undefined,
            }))}
          />
        </div>
      )}
      <p className="text-caption text-text-muted">{t('recordNote')}</p>
    </div>
  );
}
