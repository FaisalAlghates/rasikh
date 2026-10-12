'use client';

import { buildIcs, leaseIcsEvents, type Reminder } from '@rasikh/shared';
import { CalendarPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, StatusDot } from '@/components/ui/Card';
import { today, type Row } from '@/lib/ops/hooks';
import type { LeaseDoc, PaymentDoc } from '@/lib/ops/types';

/** Reminders are computed from the user's own records: free, no server, no push service. */
export function Reminders({
  reminders,
  leases,
}: {
  reminders: Reminder[];
  leases: Row<LeaseDoc>[];
}) {
  const t = useTranslations('ops');
  const label = (r: Reminder) =>
    r.kind === 'payment_upcoming'
      ? t('nUpcoming')
      : r.kind === 'payment_late'
        ? t('nLate')
        : r.kind === 'lease_expiring'
          ? t('nExpiring')
          : t('nRenewal');

  return (
    <Card className="flex flex-col gap-3" data-testid="reminders">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-body font-semibold">{t('notifications')}</h3>
        <BrowserAlerts count={reminders.length} />
      </div>
      {reminders.length === 0 ? (
        <p className="text-small text-text-muted">{t('noNotifications')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reminders.map((r) => {
            const l = leases.find((x) => x.id === r.leaseId)?.data;
            return (
              <li
                key={r.key}
                data-testid={`reminder-${r.kind}`}
                className="flex items-center justify-between gap-3 text-small"
              >
                <span>
                  {label(r)} · {l?.propertyName} {l?.unitLabel}
                </span>
                <StatusDot
                  status={r.kind === 'payment_late' ? 'late' : 'warn'}
                  label={t('daysLeft', { count: Math.abs(r.days) })}
                />
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-caption text-text-muted">{t('remindersFree')}</p>
    </Card>
  );
}

/** Browser notifications (free): asks once, then shows one summary per day while the app is open. */
function BrowserAlerts({ count }: { count: number }) {
  const t = useTranslations('ops');
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('unsupported');

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    setPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (perm !== 'granted' || count === 0) return;
    try {
      const key = 'rk-alert-day';
      if (localStorage.getItem(key) === today()) return;
      localStorage.setItem(key, today());
      new Notification(t('alertsTitle', { count }), { tag: 'rasikh-reminders' });
    } catch {
      /* notifications are a convenience */
    }
  }, [perm, count, t]);

  if (perm === 'unsupported') return null;
  if (perm === 'granted') return <span className="text-caption text-success">{t('alertsOn')}</span>;
  if (perm === 'denied')
    return <span className="text-caption text-text-muted">{t('alertsBlocked')}</span>;
  return (
    <Button
      size="md"
      variant="quiet"
      onClick={() => void Notification.requestPermission().then(setPerm)}
    >
      {t('enableAlerts')}
    </Button>
  );
}

/** Downloads a .ics with this lease's unpaid installments, renewal-notice date and end date. */
export function CalendarButton({
  lease,
  payments,
}: {
  lease: { id: string; data: LeaseDoc };
  payments: Row<PaymentDoc>[];
}) {
  const t = useTranslations('ops');
  const download = () => {
    const events = leaseIcsEvents(
      {
        id: lease.id,
        endDate: lease.data.endDate,
        unitLabel: lease.data.unitLabel,
        propertyName: lease.data.propertyName,
      },
      payments.map((p) => ({
        id: p.id,
        dueDate: p.data.dueDate,
        amount: p.data.amount,
        status: p.data.status,
      })),
      { payment: t('calPayment'), leaseEnd: t('calLeaseEnd'), renewal: t('calRenewal') },
    );
    const blob = new Blob([buildIcs('راسخ · Rasikh', events)], {
      type: 'text/calendar;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rasikh-${lease.data.ejarContractNo}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-1">
      <Button size="md" variant="quiet" onClick={download} data-testid="add-to-calendar">
        <CalendarPlus size={18} aria-hidden="true" />
        {t('addToCalendar')}
      </Button>
      <p className="text-caption text-text-muted">{t('calendarNote')}</p>
    </div>
  );
}
