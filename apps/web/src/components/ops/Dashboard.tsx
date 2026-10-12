'use client';

import { computeReminders } from '@rasikh/shared';
import { signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { InspectionsTab } from '@/components/inspect/InspectionsTab';
import { BuildingsTab } from '@/components/building/BuildingsTab';
import { TicketsTab, type TicketDoc } from '@/components/maint/TicketsTab';
import { RecordTab } from '@/components/inspect/RecordTab';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShurfaLoader } from '@/components/ui/Shurfa';
import { Tabs } from '@/components/ui/Tabs';
import { useRouter } from '@/i18n/navigation';
import type { InspectionDoc } from '@/lib/inspect/types';
import { firebaseAuth, firebaseFunctions } from '@/lib/firebase';
import { tenantScope, today, useOrgCollection, useSession } from '@/lib/ops/hooks';
import type { ExpenseDoc, LeaseDoc, PaymentDoc, PropertyDoc, UnitDoc } from '@/lib/ops/types';
import { useUser } from '@/lib/use-user';
import { ExpensesTab } from './ExpensesTab';
import { LeasesTab } from './LeasesTab';
import { Overview } from './Overview';
import { CalendarButton, Reminders } from './Reminders';
import { PropertiesTab } from './PropertiesTab';
import { ReportTab } from './ReportTab';
import { ScheduleTable } from './ScheduleTable';
import { VerifyEmailBanner } from './VerifyEmailBanner';
import { money } from '@/lib/ops/types';

export function Dashboard() {
  const t = useTranslations('ops');
  const c = useTranslations('common');
  const i = useTranslations('inspect');
  const m = useTranslations('maint');
  const b = useTranslations('bldg');
  const router = useRouter();
  const user = useUser();
  const { session, loading, signedOut, noOrg } = useSession();
  const orgId = session?.orgId;
  const staff = !!session?.isStaff;
  const uid = session?.user.uid ?? '';

  const [tab, setTab] = useState('overview');
  const [selectedLease, setSelectedLease] = useState<string>();
  const [banner, setBanner] = useState<string>();

  useEffect(() => {
    if (signedOut) router.replace('/auth');
  }, [signedOut, router]);

  // No organization yet: maybe a landlord invited this (verified) email; otherwise onboard.
  useEffect(() => {
    if (!noOrg || !user) return;
    let on = true;
    void (async () => {
      try {
        const r = await httpsCallable<unknown, { claimed: number }>(
          firebaseFunctions(),
          'claimInvites',
        )();
        if (r.data.claimed > 0) {
          await user.getIdToken(true);
          window.location.reload();
          return;
        }
      } catch {
        /* fall through to onboarding */
      }
      if (on) router.replace('/onboarding');
    })();
    return () => {
      on = false;
    };
  }, [noOrg, user, router]);

  const none: never[] = useMemo(() => [], []);
  const properties = useOrgCollection<PropertyDoc>(orgId, 'properties', none, staff);
  const units = useOrgCollection<UnitDoc>(orgId, 'units', none, staff);
  const expenses = useOrgCollection<ExpenseDoc>(orgId, 'expenses', none, staff);
  const scope = useMemo(() => (staff ? [] : tenantScope(uid)), [staff, uid]);
  const leases = useOrgCollection<LeaseDoc>(orgId, 'leases', scope, !!session);
  const payments = useOrgCollection<PaymentDoc>(orgId, 'payments', scope, !!session);
  const inspections = useOrgCollection<InspectionDoc>(orgId, 'inspections', scope, !!session);
  const tickets = useOrgCollection<TicketDoc>(orgId, 'tickets', scope, !!session);
  // Reminders are computed here from the user's own records: free, no server job required.
  const reminders = useMemo(
    () =>
      computeReminders(
        today(),
        leases.rows.map((l) => ({ id: l.id, endDate: l.data.endDate, status: l.data.status })),
        payments.rows.map((p) => ({
          id: p.id,
          leaseId: p.data.leaseId,
          dueDate: p.data.dueDate,
          status: p.data.status,
        })),
      ),
    [leases.rows, payments.rows],
  );

  if (loading || noOrg || signedOut) {
    return (
      <div className="flex justify-center py-24">
        <ShurfaLoader label={c('loading')} />
      </div>
    );
  }
  if (!session || !orgId) return null;

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-h2 font-semibold">{staff ? t('tabOverview') : t('tabMyLease')}</h1>
      <Button
        variant="quiet"
        onClick={() => void signOut(firebaseAuth()).then(() => router.replace('/'))}
      >
        {c('signOut')}
      </Button>
    </div>
  );

  // ----------------------------------------------------------- tenant view
  if (!staff) {
    const lease = leases.rows[0];
    return (
      <div className="flex flex-col gap-6">
        {header}
        <VerifyEmailBanner />
        {!lease ? (
          <EmptyState title={t('noLeases')} />
        ) : (
          <Card className="flex flex-col gap-4" data-testid="my-lease">
            <div>
              <h2 className="text-h3 font-semibold">
                {lease.data.propertyName} · {lease.data.unitLabel}
              </h2>
              <p className="tabular text-small text-text-muted" dir="ltr">
                {lease.data.ejarContractNo} · {lease.data.startDate} → {lease.data.endDate}
              </p>
              <p className="text-small text-text-muted">
                {money(lease.data.annualRent)} {t('sar')} · {t(lease.data.cycle)}
              </p>
            </div>
            <CalendarButton
              lease={lease}
              payments={payments.rows.filter((p) => p.data.leaseId === lease.id)}
            />
            <h3 className="text-body font-semibold">{t('schedule')}</h3>
            <ScheduleTable
              orgId={orgId}
              payments={payments.rows.filter((p) => p.data.leaseId === lease.id)}
              canMarkPaid={false}
              canUpload
            />
          </Card>
        )}
        {lease && (
          <section className="flex flex-col gap-3" aria-label={i('tab')}>
            <h2 className="text-h3 font-semibold">{i('tab')}</h2>
            <InspectionsTab
              orgId={orgId}
              uid={uid}
              staff={false}
              inspections={inspections.rows}
              leases={leases.rows}
              units={[]}
            />
          </section>
        )}
        {lease && (
          <section className="flex flex-col gap-3" aria-label={m('tab')}>
            <h2 className="text-h3 font-semibold">{m('tab')}</h2>
            <TicketsTab orgId={orgId} staff={false} tickets={tickets.rows} leases={leases.rows} />
          </section>
        )}
        <Reminders reminders={reminders} leases={leases.rows} />
      </div>
    );
  }

  // ----------------------------------------------------------- owner / manager view
  return (
    <div className="flex flex-col gap-6">
      {header}
      <VerifyEmailBanner />
      <Tabs
        label={t('tabOverview')}
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: 'overview',
            label: t('tabOverview'),
            content: (
              <Overview
                units={units.rows}
                leases={leases.rows}
                payments={payments.rows}
                expenses={expenses.rows}
                reminders={reminders}
              />
            ),
          },
          {
            value: 'properties',
            label: t('tabProperties'),
            content: (
              <PropertiesTab
                orgId={orgId}
                properties={properties.rows}
                units={units.rows}
                onLeaseCreated={(id, invite) => {
                  setSelectedLease(id);
                  setBanner(
                    [
                      t('leaseSaved'),
                      invite === 'linked'
                        ? t('inviteLinked')
                        : invite === 'pending'
                          ? t('invitePending')
                          : '',
                    ]
                      .filter(Boolean)
                      .join(' '),
                  );
                  setTab('leases');
                }}
              />
            ),
          },
          {
            value: 'leases',
            label: t('tabLeases'),
            content: (
              <LeasesTab
                orgId={orgId}
                leases={leases.rows}
                payments={payments.rows}
                selectedId={selectedLease}
                onSelect={setSelectedLease}
                banner={banner}
              />
            ),
          },
          {
            value: 'inspections',
            label: i('tab'),
            content: (
              <InspectionsTab
                orgId={orgId}
                uid={uid}
                staff
                inspections={inspections.rows}
                leases={leases.rows}
                units={units.rows}
              />
            ),
          },
          {
            value: 'maintenance',
            label: m('tab'),
            content: <TicketsTab orgId={orgId} staff tickets={tickets.rows} leases={leases.rows} />,
          },
          {
            value: 'buildings',
            label: b('tab'),
            content: <BuildingsTab orgId={orgId} />,
          },
          {
            value: 'record',
            label: i('tabRecord'),
            content: (
              <RecordTab
                properties={properties.rows}
                leases={leases.rows}
                inspections={inspections.rows}
                expenses={expenses.rows}
              />
            ),
          },
          {
            value: 'expenses',
            label: t('tabExpenses'),
            content: (
              <ExpensesTab orgId={orgId} properties={properties.rows} expenses={expenses.rows} />
            ),
          },
          {
            value: 'report',
            label: t('tabReport'),
            content: <ReportTab payments={payments.rows} expenses={expenses.rows} />,
          },
        ]}
      />
    </div>
  );
}
