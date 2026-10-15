'use client';

import {
  FINDING_TYPES,
  PERMIT_ITEMS,
  approvalBlocks,
  conditionSummary,
  permitReadiness,
  releaseReadiness,
  renovationOptions,
  type DesignPlan,
  type Discipline,
  type Finding,
  type PermitState,
  type Severity,
} from '@rasikh/shared';
import {
  addDoc,
  collection,
  doc,
  orderBy,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { CheckCircle2, Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { firebaseDb } from '@/lib/firebase';
import {
  todayRiyadh,
  type ApprovalDoc,
  type EngineerDoc,
  type OfficeDoc,
  type ProjectDoc,
  type VersionDoc,
} from '@/lib/eng/data';
import { useCollectionAt, type Row } from '@/lib/ops/hooks';

const fmt = new Intl.NumberFormat('en-US');

// ------------------------------------------------------------------------------------------------ permit

export function PermitPanel({
  pid,
  project,
  canEdit,
}: {
  pid: string;
  project: ProjectDoc;
  canEdit: boolean;
}) {
  const t = useTranslations('eng');
  const r = permitReadiness(project.permit ?? {});
  const set = (item: string, state: PermitState) =>
    void updateDoc(doc(firebaseDb(), 'designProjects', pid), {
      [`permit.${item}`]: state,
      updatedAt: serverTimestamp(),
    });
  return (
    <section className="flex flex-col gap-3" aria-labelledby="permit-h" data-testid="permit">
      <h3 id="permit-h" className="text-body font-semibold">
        {t('permitTitle')}
      </h3>
      <p className="text-caption text-text-muted">{t('permitNote')}</p>
      <p
        role="status"
        className={cn('text-small font-semibold', r.ready ? 'text-success' : 'text-warning')}
      >
        {r.ready ? t('permitReady') : t('permitMissing', { n: r.missing.length })}
      </p>
      <ul className="flex flex-col gap-1.5">
        {r.rows.map((row) => (
          <li
            key={row.item}
            className="hairline flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-3"
          >
            <span className="text-small">{t(`permit.${row.item}`)}</span>
            {canEdit ? (
              <select
                aria-label={t(`permit.${row.item}`)}
                value={row.state}
                onChange={(e) => set(row.item, e.target.value as PermitState)}
                className="hairline min-h-10 rounded-md bg-bg px-2 text-small"
              >
                {(['ready', 'missing', 'not_required'] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(`pstate.${s}`)}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={cn(
                  'text-small font-semibold',
                  row.state === 'ready'
                    ? 'text-success'
                    : row.state === 'missing'
                      ? 'text-warning'
                      : 'text-text-muted',
                )}
              >
                {t(`pstate.${row.state}`)}
              </span>
            )}
          </li>
        ))}
      </ul>
      {PERMIT_ITEMS.length > 0 && <p className="text-caption text-text-muted">{t('notStamp')}</p>}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ approvals

export function ApprovalsPanel({
  pid,
  vid,
  version,
  office,
  me,
  uid,
  isLead,
  officeMember,
}: {
  pid: string;
  vid: string;
  version: VersionDoc;
  office: OfficeDoc | null | undefined;
  me: EngineerDoc | null | undefined;
  uid: string;
  isLead: boolean;
  officeMember: boolean;
}) {
  const t = useTranslations('eng');
  const locale = useLocale();
  const approvals = useCollectionAt<ApprovalDoc>(`designProjects/${pid}/versions/${vid}/approvals`);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const rr = releaseReadiness(
    version.required,
    approvals.rows.map((a) => a.data),
    version.sha256,
  );
  const date = (d?: { toDate(): Date }) =>
    d
      ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
          dateStyle: 'medium',
        }).format(d.toDate())
      : '';

  const approve = async (d: Discipline) => {
    if (!me || !window.confirm(t('approveConfirm'))) return;
    setBusy(d);
    setError(undefined);
    try {
      await setDoc(doc(firebaseDb(), `designProjects/${pid}/versions/${vid}/approvals/${d}`), {
        uid,
        name: me.name,
        sceNo: me.sceNo,
        discipline: d,
        sha256: version.sha256,
        at: serverTimestamp(),
      });
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(undefined);
    }
  };
  const release = async () => {
    setBusy('release');
    setError(undefined);
    try {
      await updateDoc(doc(firebaseDb(), `designProjects/${pid}/versions/${vid}`), {
        status: 'released',
        releasedAt: serverTimestamp(),
        releasedBy: uid,
      });
      await updateDoc(doc(firebaseDb(), 'designProjects', pid), {
        status: 'released',
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="appr-h" data-testid="approvals">
      <h3 id="appr-h" className="text-body font-semibold">
        {t('approvalsTitle')}
      </h3>
      <p className="text-caption text-text-muted">
        {t('fingerprint')}:{' '}
        <span className="tabular" dir="ltr">
          {version.sha256}
        </span>
      </p>
      <p className="text-small font-semibold">{t('required')}</p>
      <ul className="flex flex-col gap-2">
        {version.required.map((d) => {
          const a = approvals.rows.find((x) => x.id === d && x.data.sha256 === version.sha256);
          const blocks = approvalBlocks(
            {
              officeVerified: !!office?.verified,
              engineer: me
                ? {
                    verified: me.verified,
                    active: me.active,
                    discipline: me.discipline,
                    expiresOn: me.expiresAt.toDate().toISOString().slice(0, 10),
                  }
                : undefined,
            },
            d,
            todayRiyadh(),
          );
          return (
            <li
              key={d}
              data-testid={`approval-${d}`}
              className="hairline flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-3"
            >
              <span className="flex items-center gap-2 text-small">
                {a ? (
                  <CheckCircle2 size={18} aria-hidden="true" className="text-success" />
                ) : (
                  <Clock size={18} aria-hidden="true" className="text-warning" />
                )}
                <span className="font-semibold">{t(`discipline.${d}`)}</span>
                <span className="text-text-muted">
                  {a
                    ? t('approvedBy', { name: a.data.name, sce: a.data.sceNo })
                    : t('awaiting', { d: t(`discipline.${d}`) })}
                </span>
              </span>
              {!a && officeMember && version.status === 'review' && blocks.length === 0 && (
                <Button onClick={() => void approve(d)} loading={busy === d}>
                  {t('approve', { d: t(`discipline.${d}`) })}
                </Button>
              )}
              {!a &&
                officeMember &&
                version.status === 'review' &&
                blocks.length > 0 &&
                me?.discipline === d && (
                  <span className="text-caption text-danger">
                    {blocks.map((b) => t(`block.${b}`)).join(' · ')}
                  </span>
                )}
            </li>
          );
        })}
      </ul>
      {officeMember && version.status !== 'review' && version.status !== 'released' && (
        <p className="text-caption text-text-muted">{t('notInReview')}</p>
      )}
      {officeMember &&
        me &&
        version.status === 'review' &&
        !version.required.includes(me.discipline) && (
          <p className="text-caption text-text-muted">{t('block.wrong_discipline')}</p>
        )}
      {version.status === 'released' ? (
        <p className="text-small font-semibold text-success" role="status" data-testid="released">
          {t('releasedOn', { date: date(version.releasedAt) })} — {t('approvalRecord')}
        </p>
      ) : (
        isLead && (
          <div className="flex flex-col gap-1">
            <Button
              onClick={() => void release()}
              disabled={!rr.ready || version.status !== 'review'}
              loading={busy === 'release'}
            >
              {t('release')}
            </Button>
            <p className="text-caption text-text-muted">
              {rr.ready
                ? t('releaseHint')
                : t('notReady', { list: rr.missing.map((d) => t(`discipline.${d}`)).join('، ') })}
            </p>
          </div>
        )
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <p className="text-caption text-text-muted">{t('notStamp')}</p>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ comments

interface CommentDoc {
  uid: string;
  name: string;
  text: string;
  visibility: 'internal' | 'client';
  at?: { toDate(): Date };
}

export function CommentsPanel({
  pid,
  uid,
  name,
  officeMember,
}: {
  pid: string;
  uid: string;
  name: string;
  officeMember: boolean;
}) {
  const t = useTranslations('eng');
  const q = useMemo(() => [orderBy('at', 'asc')], []);
  const rows = useCollectionAt<CommentDoc>(`designProjects/${pid}/comments`, q);
  const [text, setText] = useState('');
  const [vis, setVis] = useState<'internal' | 'client'>(officeMember ? 'internal' : 'client');
  const send = async () => {
    const v = text.trim();
    if (!v) return;
    setText('');
    await addDoc(collection(firebaseDb(), `designProjects/${pid}/comments`), {
      uid,
      name,
      text: v.slice(0, 1000),
      visibility: officeMember ? vis : 'client',
      at: serverTimestamp(),
    });
  };
  return (
    <section className="flex flex-col gap-3" aria-labelledby="cm-h" data-testid="comments">
      <h3 id="cm-h" className="sr-only">
        {t('tabs.comments')}
      </h3>
      {rows.rows.length === 0 && <p className="text-small text-text-muted">{t('noComments')}</p>}
      <ul className="flex flex-col gap-2">
        {rows.rows.map((c) => (
          <li
            key={c.id}
            className={cn(
              'hairline flex flex-col gap-1 rounded-lg p-3',
              c.data.uid === uid ? 'bg-brand/10' : 'bg-surface',
            )}
          >
            <p className="flex items-center gap-2 text-caption text-text-muted">
              <span className="font-semibold text-text">{c.data.name}</span>
              {officeMember && (
                <span>{c.data.visibility === 'internal' ? t('internal') : t('toClient')}</span>
              )}
            </p>
            <p className="whitespace-pre-wrap text-small">{c.data.text}</p>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="cm-text" className="sr-only">
          {t('commentPlaceholder')}
        </label>
        <textarea
          id="cm-text"
          rows={2}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('commentPlaceholder')}
          className="hairline rounded-md bg-surface p-3 text-body"
        />
        <div className="flex flex-wrap items-center gap-2">
          {officeMember && (
            <select
              aria-label={t('toClient')}
              value={vis}
              onChange={(e) => setVis(e.target.value as 'internal' | 'client')}
              className="hairline min-h-11 rounded-md bg-surface px-2 text-small"
            >
              <option value="internal">{t('internal')}</option>
              <option value="client">{t('toClient')}</option>
            </select>
          )}
          <Button type="submit">{t('send')}</Button>
        </div>
      </form>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ renovation

export function ConditionPanel({
  pid,
  existing,
  canEdit,
}: {
  pid: string;
  existing?: DesignPlan;
  canEdit: boolean;
}) {
  const t = useTranslations('eng');
  const findings = useCollectionAt<Finding>(`designProjects/${pid}/findings`);
  const list = findings.rows.map((r) => ({ ...r.data, id: r.id }));
  const summary = conditionSummary(list);
  const options = existing ? renovationOptions(existing, list) : [];
  const [type, setType] = useState<Finding['type']>('crack');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [note, setNote] = useState('');
  const add = async () => {
    await addDoc(collection(firebaseDb(), `designProjects/${pid}/findings`), {
      type,
      severity,
      note: note.trim().slice(0, 500),
      at: serverTimestamp(),
    });
    setNote('');
  };
  return (
    <section className="flex flex-col gap-4" aria-labelledby="cond-h" data-testid="condition">
      <h3 id="cond-h" className="text-body font-semibold">
        {t('findingsTitle')}
      </h3>
      {summary.needsStructuralEngineer && (
        <p
          role="alert"
          className="rounded-md border-s-4 border-danger bg-surface p-3 text-small"
          data-testid="needs-structural"
        >
          {t('needsStructural')}
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {list.map((f) => (
          <li
            key={f.id}
            className="hairline flex flex-wrap gap-2 rounded-lg bg-surface p-3 text-small"
          >
            <span className="font-semibold">{t(`findingType.${f.type}`)}</span>
            <span
              className={cn(
                f.severity === 'critical' || f.severity === 'high'
                  ? 'text-danger'
                  : 'text-text-muted',
              )}
            >
              {t(`severity.${f.severity}`)}
            </span>
            <span>{f.note}</span>
          </li>
        ))}
      </ul>
      {canEdit && (
        <form
          className="hairline grid gap-3 rounded-lg bg-surface p-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <label className="flex flex-col gap-1 text-small">
            {t('addFinding')}
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Finding['type'])}
              className="hairline min-h-11 rounded-md bg-bg px-2"
            >
              {FINDING_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`findingType.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small">
            &nbsp;
            <select
              aria-label="severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="hairline min-h-11 rounded-md bg-bg px-2"
            >
              {(['low', 'medium', 'high', 'critical'] as const).map((x) => (
                <option key={x} value={x}>
                  {t(`severity.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small">
            {t('findingNote')}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              className="hairline min-h-11 rounded-md bg-bg px-3"
            />
          </label>
          <Button type="submit">{t('addFinding')}</Button>
        </form>
      )}
      {options.length > 0 && (
        <section aria-labelledby="reno-h" className="flex flex-col gap-2">
          <h4 id="reno-h" className="text-small font-semibold">
            {t('renovationOptions')}
          </h4>
          <ul className="grid gap-2 sm:grid-cols-3">
            {options.map((o) => (
              <li
                key={o.level}
                className="hairline flex flex-col gap-1 rounded-lg bg-surface p-3 text-small"
                data-testid={`reno-${o.level}`}
              >
                <span className="font-semibold">{t(`level.${o.level}`)}</span>
                <span className="tabular">
                  {t('levelCost', {
                    min: fmt.format(o.min),
                    max: fmt.format(o.max),
                    weeks: o.weeks,
                  })}
                </span>
                {!o.coversFindings && <span className="text-danger">{t('levelNoFix')}</span>}
                {o.needsPermit && <span className="text-text-muted">{t('needsPermit')}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-caption text-text-muted">{t('heritage')}</p>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ quotes

interface QuoteDoc {
  amount: number;
  text: string;
  at?: { toDate(): Date };
}

export function QuotesPanel({ pid, isLead }: { pid: string; isLead: boolean }) {
  const t = useTranslations('eng');
  const rows = useCollectionAt<QuoteDoc>(`designProjects/${pid}/quotes`);
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');
  const add = async () => {
    const n = Number(amount);
    if (!(n > 0) || !text.trim()) return;
    await addDoc(collection(firebaseDb(), `designProjects/${pid}/quotes`), {
      amount: n,
      text: text.trim().slice(0, 300),
      at: serverTimestamp(),
    });
    setAmount('');
    setText('');
  };
  return (
    <section className="flex flex-col gap-3" aria-labelledby="q-h" data-testid="quotes">
      <h3 id="q-h" className="text-body font-semibold">
        {t('quotesTitle')}
      </h3>
      <p className="text-caption text-text-muted">{t('quotesNote')}</p>
      {rows.rows.length === 0 && <p className="text-small text-text-muted">{t('noQuotes')}</p>}
      <ul className="flex flex-col gap-1.5">
        {(rows.rows as Row<QuoteDoc>[]).map((q) => (
          <li
            key={q.id}
            className="hairline flex justify-between gap-2 rounded-lg bg-surface p-3 text-small"
          >
            <span>{q.data.text}</span>
            <span className="tabular font-semibold">
              {fmt.format(q.data.amount)} {t('sar')}
            </span>
          </li>
        ))}
      </ul>
      {isLead && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <label className="flex flex-col gap-1 text-small">
            {t('quoteText')}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="hairline min-h-11 rounded-md bg-surface px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-small">
            {t('quoteAmount')}
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="hairline min-h-11 w-36 rounded-md bg-surface px-3"
            />
          </label>
          <Button type="submit">{t('addQuote')}</Button>
        </form>
      )}
    </section>
  );
}
