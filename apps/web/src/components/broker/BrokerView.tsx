'use client';

import {
  ACTIVITY_TYPES,
  BROKERAGE_TYPES,
  BrokerageContractSchema,
  BrokerProfileSchema,
  LEAD_INTERESTS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LeadSchema,
  ViewingSchema,
  canMoveLead,
  falReminder,
  falState,
  type ActivityType,
  type LeadStatus,
} from '@rasikh/shared';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, NativeSelect } from '@/components/ui/Input';
import { firebaseDb } from '@/lib/firebase';
import { today, useOrgCollection } from '@/lib/ops/hooks';
import { AdChecker } from './AdChecker';

interface ProfileDoc {
  displayName: string;
  falNo: string;
  falExpiry: string;
}
interface LeadDoc {
  name: string;
  phone: string;
  interest: (typeof LEAD_INTERESTS)[number];
  source: (typeof LEAD_SOURCES)[number];
  budgetSar?: number;
  notes?: string;
  status: LeadStatus;
  brokerUid: string;
}
interface ViewingDoc {
  leadId: string;
  placeLabel: string;
  scheduledAt: string;
  done: boolean;
}
interface ContractDoc {
  leadId: string;
  type: (typeof BROKERAGE_TYPES)[number];
  contractNo: string;
  startDate: string;
  endDate: string;
  commissionPct?: number;
}
interface EntryDoc {
  leadId: string;
  type: ActivityType;
  text: string;
  createdAt?: Timestamp;
}

/** Broker workspace: profile with FAL reminders, leads, viewings, brokerage contracts, an immutable log and the ad checker. */
export function BrokerView({ orgId, uid }: { orgId: string; uid: string }) {
  const t = useTranslations('broker');
  const [openLead, setOpenLead] = useState<string>();
  return (
    <div className="flex flex-col gap-6" data-testid="broker-view">
      <p className="text-small text-text-muted">{t('intro')}</p>
      <ProfileCard orgId={orgId} uid={uid} />
      {openLead ? (
        <LeadDetail orgId={orgId} uid={uid} leadId={openLead} onBack={() => setOpenLead(undefined)} />
      ) : (
        <Leads orgId={orgId} uid={uid} onOpen={setOpenLead} />
      )}
      <AdChecker />
    </div>
  );
}

// ---------------------------------------------------------------- profile

function ProfileCard({ orgId, uid }: { orgId: string; uid: string }) {
  const t = useTranslations('broker');
  // A single document: the rules only allow reading your own profile, which a collection query cannot prove.
  const [mine, setMine] = useState<ProfileDoc>();
  useEffect(
    () =>
      onSnapshot(
        doc(firebaseDb(), `orgs/${orgId}/brokers/${uid}`),
        (s) => setMine(s.exists() ? (s.data() as ProfileDoc) : undefined),
        () => setMine(undefined),
      ),
    [orgId, uid],
  );
  const [f, setF] = useState({ displayName: '', falNo: '', falExpiry: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();

  useEffect(() => {
    if (mine) setF({ displayName: mine.displayName, falNo: mine.falNo, falExpiry: mine.falExpiry });
  }, [mine]);

  const state = mine ? falState(mine.falExpiry, today()) : undefined;
  const reminder = mine ? falReminder(mine.falExpiry, today()) : null;
  const left = mine
    ? Math.round((Date.parse(mine.falExpiry) - Date.parse(today())) / 86_400_000)
    : 0;

  const save = async () => {
    setMsg(undefined);
    const parsed = BrokerProfileSchema.safeParse(f);
    if (!parsed.success) return setMsg({ ok: false, text: t('required') });
    try {
      await setDoc(doc(firebaseDb(), `orgs/${orgId}/brokers/${uid}`), parsed.data);
      setMsg({ ok: true, text: t('saved') });
    } catch {
      setMsg({ ok: false, text: t('failed') });
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-h3 font-semibold">{t('profile')}</h2>
      {state && (
        <p
          data-testid="fal-state"
          className={state === 'valid' ? 'text-small text-success' : 'text-small text-danger'}
        >
          {state === 'expired'
            ? t('falExpired')
            : reminder
              ? t('falExpiring', { days: left })
              : t('falValid')}
        </p>
      )}
      <form
        className="grid gap-3 sm:grid-cols-3"
        aria-label={t('profile')}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field
          id="bp-name"
          label={t('displayName')}
          value={f.displayName}
          onChange={(e) => setF({ ...f, displayName: e.target.value })}
        />
        <Field
          id="bp-fal"
          label={t('falNo')}
          inputMode="numeric"
          value={f.falNo}
          onChange={(e) => setF({ ...f, falNo: e.target.value })}
        />
        <Field
          id="bp-exp"
          type="date"
          label={t('falExpiry')}
          value={f.falExpiry}
          onChange={(e) => setF({ ...f, falExpiry: e.target.value })}
        />
        <div className="sm:col-span-3">
          <Button type="submit">{t('saveProfile')}</Button>
        </div>
      </form>
      {msg && (
        <p role="status" className={msg.ok ? 'text-small text-success' : 'text-small text-danger'}>
          {msg.text}
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- leads

async function logEntry(orgId: string, uid: string, leadId: string, type: ActivityType, text: string) {
  await addDoc(collection(firebaseDb(), `orgs/${orgId}/brokerActivity`), {
    leadId,
    type,
    text: text.slice(0, 300),
    brokerUid: uid,
    createdAt: serverTimestamp(),
  });
}

function Leads({
  orgId,
  uid,
  onOpen,
}: {
  orgId: string;
  uid: string;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations('broker');
  const scope = useMemo(() => [where('brokerUid', '==', uid)], [uid]);
  const leads = useOrgCollection<LeadDoc>(orgId, 'leads', scope);
  const [f, setF] = useState({
    name: '',
    phone: '',
    interest: 'rent',
    source: 'call',
    budget: '',
  });
  const [error, setError] = useState<string>();

  const add = async () => {
    setError(undefined);
    const parsed = LeadSchema.safeParse({
      name: f.name,
      phone: f.phone,
      interest: f.interest,
      source: f.source,
      ...(f.budget ? { budgetSar: Number(f.budget) } : {}),
    });
    if (!parsed.success) return setError(t('required'));
    try {
      const ref = await addDoc(collection(firebaseDb(), `orgs/${orgId}/leads`), {
        ...parsed.data,
        status: 'new',
        brokerUid: uid,
        createdAt: serverTimestamp(),
      });
      await logEntry(orgId, uid, ref.id, 'lead_created', parsed.data.name);
      setF({ ...f, name: '', phone: '', budget: '' });
    } catch {
      setError(t('failed'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold">{t('addLead')}</h2>
        <form
          className="grid gap-3 sm:grid-cols-3"
          aria-label={t('addLead')}
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <Field id="ld-name" label={t('name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Field
            id="ld-phone"
            label={t('phone')}
            dir="ltr"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
          <Field
            id="ld-budget"
            label={t('budget')}
            inputMode="numeric"
            value={f.budget}
            onChange={(e) => setF({ ...f, budget: e.target.value })}
          />
          <NativeSelect
            id="ld-interest"
            label={t('interest')}
            value={f.interest}
            onChange={(e) => setF({ ...f, interest: e.target.value })}
            options={LEAD_INTERESTS.map((v) => ({ value: v, label: t(`interest_${v}`) }))}
          />
          <NativeSelect
            id="ld-source"
            label={t('source')}
            value={f.source}
            onChange={(e) => setF({ ...f, source: e.target.value })}
            options={LEAD_SOURCES.map((v) => ({ value: v, label: t(`source_${v}`) }))}
          />
          <div className="flex items-end">
            <Button type="submit">{t('addLead')}</Button>
          </div>
        </form>
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
      </Card>

      <h2 className="text-h3 font-semibold">{t('leads')}</h2>
      {leads.rows.length === 0 ? (
        <EmptyState title={t('none')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {leads.rows.map((l) => (
            <li key={l.id} data-testid="lead-row">
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-body font-semibold">{l.data.name}</p>
                  <p className="text-small text-text-muted">
                    {t(`interest_${l.data.interest}`)} · {t(`status_${l.data.status}`)}
                  </p>
                </div>
                <Button variant="quiet" onClick={() => onOpen(l.id)}>
                  {t('open')}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- one lead

function LeadDetail({
  orgId,
  uid,
  leadId,
  onBack,
}: {
  orgId: string;
  uid: string;
  leadId: string;
  onBack: () => void;
}) {
  const t = useTranslations('broker');
  const locale = useLocale();
  const scope = useMemo(() => [where('brokerUid', '==', uid)], [uid]);
  const leads = useOrgCollection<LeadDoc>(orgId, 'leads', scope);
  const viewings = useOrgCollection<ViewingDoc>(orgId, 'viewings', scope);
  const contracts = useOrgCollection<ContractDoc>(orgId, 'brokerContracts', scope);
  const entries = useOrgCollection<EntryDoc>(orgId, 'brokerActivity', scope);
  const lead = leads.rows.find((l) => l.id === leadId);
  const [error, setError] = useState<string>();
  const [note, setNote] = useState('');
  const [v, setV] = useState({ place: '', when: '' });
  const [c, setC] = useState({ type: 'rent', no: '', start: today(), end: '', pct: '' });

  const guard = async (fn: () => Promise<void>) => {
    setError(undefined);
    try {
      await fn();
    } catch {
      setError(t('failed'));
    }
  };

  if (!lead) {
    return (
      <div className="flex flex-col gap-3">
        <Button variant="quiet" onClick={onBack}>
          {t('back')}
        </Button>
        <EmptyState title={t('none')} />
      </div>
    );
  }

  const mine = <T extends { leadId: string }>(rows: { id: string; data: T }[]) =>
    rows.filter((r) => r.data.leadId === leadId);
  const when = (ts?: Timestamp) => (ts ? ts.toDate().toLocaleString(locale) : '…');
  const log = mine(entries.rows)
    .slice()
    .sort((a, b) => (a.data.createdAt?.toMillis() ?? 0) - (b.data.createdAt?.toMillis() ?? 0));

  const move = (to: LeadStatus) =>
    guard(async () => {
      await updateDoc(doc(firebaseDb(), `orgs/${orgId}/leads/${leadId}`), { status: to });
      await logEntry(orgId, uid, leadId, 'status_changed', `${t(`status_${lead.data.status}`)} → ${t(`status_${to}`)}`);
    });

  return (
    <div className="flex flex-col gap-6" data-testid="lead-detail">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="quiet" onClick={onBack}>
          {t('back')}
        </Button>
        <Button variant="quiet" onClick={() => window.print()}>
          {t('proof')}
        </Button>
      </div>
      <p className="text-small text-text-muted print:hidden">{t('proofHint')}</p>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">{lead.data.name}</h2>
        <p className="text-small text-text-muted" dir="ltr">
          {lead.data.phone}
        </p>
        <p className="text-small" data-testid="lead-status">
          {t('status')}: {t(`status_${lead.data.status}`)}
        </p>
        <div className="flex flex-wrap gap-2 print:hidden">
          {LEAD_STATUSES.filter((s) => canMoveLead(lead.data.status, s)).map((s) => (
            <Button key={s} variant="quiet" onClick={() => void move(s)}>
              {t('moveTo')} {t(`status_${s}`)}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-body font-semibold">{t('viewings')}</h3>
        <ul className="flex flex-col gap-1 text-small">
          {mine(viewings.rows).map((x) => (
            <li key={x.id} data-testid="viewing-row" className="flex items-center gap-3">
              <span>
                {x.data.placeLabel} · {new Date(x.data.scheduledAt).toLocaleString(locale)}
              </span>
              {x.data.done ? (
                <span className="text-success">{t('viewingDone')}</span>
              ) : (
                <Button
                  variant="quiet"
                  className="print:hidden"
                  onClick={() =>
                    void guard(async () => {
                      await updateDoc(doc(firebaseDb(), `orgs/${orgId}/viewings/${x.id}`), {
                        done: true,
                      });
                      await logEntry(orgId, uid, leadId, 'viewing_done', x.data.placeLabel);
                    })
                  }
                >
                  {t('markDone')}
                </Button>
              )}
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3 sm:grid-cols-3 print:hidden"
          aria-label={t('scheduleViewing')}
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = ViewingSchema.safeParse({
              leadId,
              placeLabel: v.place,
              scheduledAt: v.when ? new Date(v.when).toISOString() : '',
            });
            if (!parsed.success) return setError(t('required'));
            void guard(async () => {
              await addDoc(collection(firebaseDb(), `orgs/${orgId}/viewings`), {
                ...parsed.data,
                done: false,
                brokerUid: uid,
                createdAt: serverTimestamp(),
              });
              await logEntry(orgId, uid, leadId, 'viewing_scheduled', parsed.data.placeLabel);
              setV({ place: '', when: '' });
            });
          }}
        >
          <Field id="vw-place" label={t('place')} value={v.place} onChange={(e) => setV({ ...v, place: e.target.value })} />
          <Field
            id="vw-when"
            type="datetime-local"
            label={t('when')}
            value={v.when}
            onChange={(e) => setV({ ...v, when: e.target.value })}
          />
          <div className="flex items-end">
            <Button type="submit">{t('scheduleViewing')}</Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-body font-semibold">{t('contracts')}</h3>
        <ul className="flex flex-col gap-1 text-small">
          {mine(contracts.rows).map((x) => (
            <li key={x.id} data-testid="contract-row">
              {t(`type_${x.data.type}`)} · {x.data.contractNo} · {x.data.startDate} → {x.data.endDate}
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3 sm:grid-cols-3 print:hidden"
          aria-label={t('addContract')}
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = BrokerageContractSchema.safeParse({
              leadId,
              type: c.type,
              contractNo: c.no,
              startDate: c.start,
              endDate: c.end,
              ...(c.pct ? { commissionPct: Number(c.pct) } : {}),
            });
            if (!parsed.success) return setError(t('required'));
            void guard(async () => {
              await addDoc(collection(firebaseDb(), `orgs/${orgId}/brokerContracts`), {
                ...parsed.data,
                brokerUid: uid,
                createdAt: serverTimestamp(),
              });
              await logEntry(orgId, uid, leadId, 'contract_added', parsed.data.contractNo);
              setC({ ...c, no: '', end: '', pct: '' });
            });
          }}
        >
          <NativeSelect
            id="bc-type"
            label={t('contractType')}
            value={c.type}
            onChange={(e) => setC({ ...c, type: e.target.value })}
            options={BROKERAGE_TYPES.map((x) => ({ value: x, label: t(`type_${x}`) }))}
          />
          <Field id="bc-no" label={t('contractNo')} value={c.no} onChange={(e) => setC({ ...c, no: e.target.value })} />
          <Field
            id="bc-pct"
            label={t('commission')}
            inputMode="decimal"
            value={c.pct}
            onChange={(e) => setC({ ...c, pct: e.target.value })}
          />
          <Field id="bc-start" type="date" label={t('start')} value={c.start} onChange={(e) => setC({ ...c, start: e.target.value })} />
          <Field id="bc-end" type="date" label={t('end')} value={c.end} onChange={(e) => setC({ ...c, end: e.target.value })} />
          <div className="flex items-end">
            <Button type="submit">{t('addContract')}</Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-body font-semibold">{t('log')}</h3>
        <p className="text-small text-text-muted">{t('logHint')}</p>
        <ol className="flex flex-col gap-1 text-small" data-testid="activity-log">
          {log.map((x) => (
            <li key={x.id}>
              <span className="text-text-muted">{when(x.data.createdAt)}</span> ·{' '}
              {t(`log_${x.data.type}`)}: {x.data.text}
            </li>
          ))}
        </ol>
        <form
          className="flex flex-wrap items-end gap-3 print:hidden"
          aria-label={t('addNote')}
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            void guard(async () => {
              await logEntry(orgId, uid, leadId, 'note', note.trim());
              setNote('');
            });
          }}
        >
          <div className="min-w-56 flex-1">
            <Field id="log-note" label={t('note')} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="submit">{t('addNote')}</Button>
        </form>
      </Card>
    </div>
  );
}

// Keeps the enum import used when the activity types are listed for tests.
export const BROKER_LOG_TYPES = ACTIVITY_TYPES;
