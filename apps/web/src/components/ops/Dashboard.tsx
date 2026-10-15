'use client';

import { computeReminders } from '@rasikh/shared';
import { where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InspectionsTab } from '@/components/inspect/InspectionsTab';
import { AssistantPanel } from '@/components/ai/AssistantPanel';
import { BrokerView } from '@/components/broker/BrokerView';
import { BuildingsTab } from '@/components/building/BuildingsTab';
import { MyBuildings } from '@/components/building/MyBuildings';
import { TicketsTab, type TicketDoc } from '@/components/maint/TicketsTab';
import { RecordTab } from '@/components/inspect/RecordTab';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShurfaLoader } from '@/components/ui/Shurfa';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { useRouter } from '@/i18n/navigation';
import type { InspectionDoc } from '@/lib/inspect/types';
import { firebaseFunctions } from '@/lib/firebase';
import { tenantScope, today, useOrgCollection, useSession } from '@/lib/ops/hooks';
import type { ExpenseDoc, LeaseDoc, PaymentDoc, PropertyDoc, UnitDoc } from '@/lib/ops/types';
import { ROUTES } from '@/lib/nav';
import { accessFor, pickSection, type Section } from '@/lib/roles';
import { useUser } from '@/lib/use-user';
import { ExpensesTab } from './ExpensesTab';
import { LeasesTab } from './LeasesTab';
import { Overview } from './Overview';
import { CalendarButton, Reminders } from './Reminders';
import { PropertiesTab } from './PropertiesTab';
import { PrivacyPanel } from './PrivacyPanel';
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
  const br = useTranslations('broker');
  const ai = useTranslations('ai');
  const ac = useTranslations('account');
  const nav = useTranslations('nav');
  const router = useRouter();
  const user = useUser();
  const { session, loading, signedOut, noOrg } = useSession();
  const orgId = session?.orgId;
  const staff = !!session?.isStaff;
  const uid = session?.user.uid ?? '';

  const [tab, setTabState] = useState<string>('overview');
  const setTab = useCallback((v: string) => {
    setTabState(v);
    const url = new URL(location.href);
    url.searchParams.set('s', v);
    if (url.href !== location.href) history.pushState(history.state, '', url);
  }, []);
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
  const roles = session?.roles;
  const access = useMemo(() => accessFor(roles ?? []), [roles]);
  const { vendorOnly, unitOwner, brokerOnly } = access;
  const ticketScope = useMemo(
    () => (staff ? [] : vendorOnly ? [where('vendorUid', '==', uid)] : tenantScope(uid)),
    [staff, vendorOnly, uid],
  );
  const tickets = useOrgCollection<TicketDoc>(orgId, 'tickets', ticketScope, !!session);
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

  // Open the section named in the address (?s=) once the roles are known. Only sections the role
  // allows can open; anything else falls back to the role's first section.
  const sessionReady = !!session;
  useEffect(() => {
    if (!sessionReady) return;
    const apply = () => {
      const want = new URLSearchParams(location.search).get('s');
      setTabState(pickSection(access, want));
      if (want && !access.staff)
        requestAnimationFrame(() => document.getElementById(`sec-${want}`)?.scrollIntoView());
    };
    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, [sessionReady, access]);

  if (loading || noOrg || signedOut) {
    return (
      <div className="flex justify-center py-24">
        <ShurfaLoader label={c('loading')} />
      </div>
    );
  }
  if (!session || !orgId) return null;

  const roleBadges = (
    <ul className="flex flex-wrap gap-1.5" aria-label={nav('rolesLabel')}>
      {(roles ?? []).map((r) => (
        <li
          key={r}
          className="rounded-full bg-brand/15 px-3 py-1 text-caption font-semibold text-brand-text"
        >
          {nav.has(`role.${r}`) ? nav(`role.${r}`) : r}
        </li>
      ))}
    </ul>
  );
  const pageHead = (title: string, current?: string) => (
    <div className="flex flex-col gap-2">
      <Breadcrumbs
        items={[
          { label: nav('workspace'), href: current ? ROUTES.workspace : undefined },
          ...(current ? [{ label: current }] : []),
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 font-semibold">{title}</h1>
        {roleBadges}
      </div>
    </div>
  );
  const header = pageHead(staff ? t('tabOverview') : t('tabMyLease'));

  // ----------------------------------------------------------- broker-only view
  if (brokerOnly) {
    return (
      <div className="flex flex-col gap-6">
        {pageHead(br('tab'))}
        <VerifyEmailBanner />
        <BrokerView orgId={orgId} uid={uid} />
        <section className="flex flex-col gap-3" aria-label={ac('tab')}>
          <h2 className="text-h3 font-semibold">{ac('tab')}</h2>
          <PrivacyPanel user={session.user} />
        </section>
      </div>
    );
  }

  // ----------------------------------------------------------- tenant view
  if (!staff) {
    const lease = leases.rows[0];
    const needsLease: Section[] = ['myLease', 'inspections', 'maintenance', 'assistant'];
    const quick = access.sections.filter((x) => lease || !needsLease.includes(x));
    return (
      <div className="flex flex-col gap-6">
        {header}
        <VerifyEmailBanner />
        {quick.length > 1 && (
          <nav aria-label={nav('sections')} data-testid="role-sections">
            <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {quick.map((x) => (
                <li key={x} className="shrink-0">
                  <a
                    href={`#sec-${x}`}
                    className="hairline inline-flex min-h-10 items-center rounded-full px-4 text-small text-text hover:bg-surface"
                  >
                    {nav(`section.${x}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {!lease && !vendorOnly && !unitOwner ? (
          <EmptyState title={t('noLeases')} />
        ) : !lease ? null : (
          <Card
            id="sec-myLease"
            className="flex scroll-mt-24 flex-col gap-4"
            data-testid="my-lease"
          >
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
          <section
            id="sec-inspections"
            className="flex scroll-mt-24 flex-col gap-3"
            aria-label={i('tab')}
          >
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
          <section
            id="sec-maintenance"
            className="flex scroll-mt-24 flex-col gap-3"
            aria-label={m('tab')}
          >
            <h2 className="text-h3 font-semibold">{m('tab')}</h2>
            <TicketsTab orgId={orgId} staff={false} tickets={tickets.rows} leases={leases.rows} />
          </section>
        )}
        {lease && (
          <section
            id="sec-assistant"
            className="flex scroll-mt-24 flex-col gap-3"
            aria-label={ai('tab')}
          >
            <h2 className="text-h3 font-semibold">{ai('tab')}</h2>
            <AssistantPanel orgId={orgId} leases={leases.rows} />
          </section>
        )}
        {vendorOnly && (
          <section
            id="sec-assigned"
            className="flex scroll-mt-24 flex-col gap-3"
            aria-label={m('tab')}
          >
            <h2 className="text-h3 font-semibold">{m('assignedToMe')}</h2>
            <TicketsTab orgId={orgId} staff={false} vendor tickets={tickets.rows} leases={[]} />
          </section>
        )}
        {unitOwner && (
          <section
            id="sec-myBuildings"
            className="flex scroll-mt-24 flex-col gap-3"
            aria-label={b('tab')}
          >
            <h2 className="text-h3 font-semibold">{b('myBuildings')}</h2>
            <MyBuildings orgId={orgId} uid={uid} />
          </section>
        )}
        <div id="sec-reminders" className="scroll-mt-24">
          <Reminders reminders={reminders} leases={leases.rows} />
        </div>
        <section
          id="sec-privacy"
          className="flex scroll-mt-24 flex-col gap-3"
          aria-label={ac('tab')}
        >
          <h2 className="text-h3 font-semibold">{ac('tab')}</h2>
          <PrivacyPanel user={session.user} />
        </section>
      </div>
    );
  }

  // ----------------------------------------------------------- owner / manager view
  const allowed = (list: TabItem[]) =>
    access.sections
      .map((x) => list.find((it) => it.value === x))
      .filter((it): it is TabItem => !!it);
  return (
    <div className="flex flex-col gap-6">
      {pageHead(t('tabOverview'), tab === 'overview' ? undefined : nav(`section.${tab}`))}
      <VerifyEmailBanner />
      <Tabs
        label={t('tabOverview')}
        value={tab}
        onValueChange={setTab}
        items={allowed([
          {
            value: 'overview',
            label: t('tabOverview'),
            content: (
              <Overview
                properties={properties.rows}
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
            value: 'privacy',
            label: ac('tab'),
            content: <PrivacyPanel user={session.user} />,
          },
          {
            value: 'assistant',
            label: ai('tab'),
            content: <AssistantPanel orgId={orgId} leases={leases.rows} />,
          },
          ...(access.broker
            ? [
                {
                  value: 'broker',
                  label: br('tab'),
                  content: <BrokerView orgId={orgId} uid={uid} />,
                },
              ]
            : []),
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
        ])}
      />
    </div>
  );
}
