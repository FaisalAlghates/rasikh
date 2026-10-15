'use client';

import {
  DEFAULT_RATES,
  DISCIPLINES,
  PRECEDENT_TAGS,
  RULES,
  RULE_PACK_VERSION,
  SCE_GRADES,
  type Discipline,
  type PrecedentTag,
  type Rates,
  type RuleOverride,
} from '@rasikh/shared';
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { BadgeCheck, Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { firebaseDb, firebaseFunctions } from '@/lib/firebase';
import {
  rulePackPath,
  todayRiyadh,
  useDocAt,
  type EngineerDoc,
  type OfficeDoc,
  type ProjectDoc,
  type RulePackDoc,
  type SettingsRatesDoc,
} from '@/lib/eng/data';
import { useCollectionAt } from '@/lib/ops/hooks';

/** The engineering office's private workspace: projects, team, profile, code parameters, unit rates, precedents. */
export function OfficeWorkspace({
  officeId,
  uid,
  isLead,
}: {
  officeId: string;
  uid: string;
  isLead: boolean;
}) {
  const t = useTranslations('eng');
  const office = useDocAt<OfficeDoc>(`offices/${officeId}`);
  const me = useDocAt<EngineerDoc>(`offices/${officeId}/engineers/${uid}`);
  return (
    <div className="flex flex-col gap-4" data-testid="office-workspace">
      {office && !office.verified && (
        <p
          role="status"
          className="rounded-md border-s-4 border-warning bg-surface p-3 text-small"
          data-testid="office-pending"
        >
          {t('office.pending')}
        </p>
      )}
      <Tabs
        label={t('title')}
        items={[
          {
            value: 'projects',
            label: t('office.tabs.projects'),
            content: <OfficeProjects officeId={officeId} />,
          },
          {
            value: 'team',
            label: t('office.tabs.team'),
            content: <TeamPanel officeId={officeId} uid={uid} isLead={isLead} me={me} />,
          },
          {
            value: 'profile',
            label: t('office.tabs.profile'),
            content: office ? (
              <ProfilePanel officeId={officeId} office={office} isLead={isLead} />
            ) : null,
          },
          {
            value: 'rules',
            label: t('office.tabs.rules'),
            content: <RulesPanel officeId={officeId} uid={uid} me={me} />,
          },
          {
            value: 'rates',
            label: t('office.tabs.rates'),
            content: <RatesPanel officeId={officeId} isLead={isLead} />,
          },
          {
            value: 'precedents',
            label: t('office.tabs.precedents'),
            content: <PrecedentsPanel officeId={officeId} isLead={isLead} />,
          },
        ]}
      />
    </div>
  );
}

function OfficeProjects({ officeId }: { officeId: string }) {
  const t = useTranslations('eng');
  const q = useMemo(() => [where('officeId', '==', officeId)], [officeId]);
  const rows = useCollectionAt<ProjectDoc>('designProjects', q);
  const sorted = [...rows.rows].sort(
    (a, b) => (b.data.updatedAt?.toMillis() ?? 0) - (a.data.updatedAt?.toMillis() ?? 0),
  );
  return (
    <section className="flex flex-col gap-3" aria-label={t('office.tabs.projects')}>
      <p className="text-small text-text-muted">{t('office.projectsLead')}</p>
      {sorted.length === 0 && !rows.loading && (
        <p className="text-small text-text-muted">{t('office.noProjects')}</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {sorted.map((p) => (
          <li key={p.id}>
            <Link
              href={`/design/${p.id}`}
              data-testid="office-project"
              className="hairline flex flex-col gap-1 rounded-xl bg-surface p-4 hover:border-brand"
            >
              <span className="text-body font-semibold">{p.data.title}</span>
              <span className="text-small text-text-muted">
                {p.data.clientName} · {t(`kind.${p.data.kind}`)} ·{' '}
                {t(`type.${p.data.program.type}`)}
              </span>
              <span
                className={cn(
                  'text-small font-semibold',
                  p.data.status === 'brief' ? 'text-warning' : 'text-brand-text',
                )}
              >
                {t(`status.${p.data.status}`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProfilePanel({
  officeId,
  office,
  isLead,
}: {
  officeId: string;
  office: OfficeDoc;
  isLead: boolean;
}) {
  const t = useTranslations('eng');
  const [v, setV] = useState({ ...office, citiesText: office.cities.join('، ') });
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  useEffect(() => setV({ ...office, citiesText: office.cities.join('، ') }), [office]);
  const locked = office.verified;
  const save = async () => {
    setMsg(undefined);
    try {
      await updateDoc(doc(firebaseDb(), 'offices', officeId), {
        ...(locked
          ? {}
          : {
              name: v.name.trim(),
              crNo: v.crNo.trim(),
              sceClass: v.sceClass.trim(),
              baladyActive: v.baladyActive,
            }),
        disciplines: v.disciplines,
        cities: v.citiesText
          .split(/[,،]/)
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 20),
        accepting: v.accepting,
      });
      setMsg({ ok: true, text: t('saved') });
    } catch {
      setMsg({ ok: false, text: t('failed') });
    }
  };
  const input = 'hairline min-h-11 rounded-md bg-surface px-3';
  return (
    <section
      className="flex max-w-2xl flex-col gap-3"
      aria-label={t('office.tabs.profile')}
      data-testid="office-profile"
    >
      <p
        className={cn(
          'flex items-center gap-2 text-small font-semibold',
          office.verified ? 'text-success' : 'text-warning',
        )}
      >
        {office.verified ? (
          <BadgeCheck size={16} aria-hidden="true" />
        ) : (
          <Clock size={16} aria-hidden="true" />
        )}
        {office.verified ? t('office.verified') : t('office.pending')}
      </p>
      {locked && <p className="text-caption text-text-muted">{t('office.locked')}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-small">
          {t('office.name')}
          <input
            value={v.name}
            disabled={!isLead || locked}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-small">
          {t('office.crNo')}
          <input
            value={v.crNo}
            dir="ltr"
            inputMode="numeric"
            maxLength={10}
            disabled={!isLead || locked}
            onChange={(e) => setV({ ...v, crNo: e.target.value })}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-small">
          {t('office.sceClass')}
          <input
            value={v.sceClass}
            maxLength={40}
            disabled={!isLead || locked}
            onChange={(e) => setV({ ...v, sceClass: e.target.value })}
            className={input}
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 self-end text-small">
          <input
            type="checkbox"
            checked={v.baladyActive}
            disabled={!isLead || locked}
            onChange={(e) => setV({ ...v, baladyActive: e.target.checked })}
            className="size-5 accent-[var(--rk-brand)]"
          />
          {t('office.baladyActive')}
        </label>
      </div>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
        <legend className="mb-1 text-small font-semibold">{t('office.disciplines')}</legend>
        {DISCIPLINES.map((d) => (
          <label key={d} className="flex min-h-11 items-center gap-2 text-small">
            <input
              type="checkbox"
              disabled={!isLead}
              checked={v.disciplines.includes(d)}
              onChange={(e) =>
                setV({
                  ...v,
                  disciplines: e.target.checked
                    ? [...v.disciplines, d]
                    : v.disciplines.filter((x) => x !== d),
                })
              }
              className="size-5 accent-[var(--rk-brand)]"
            />
            {t(`discipline.${d}`)}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-small">
        {t('office.cities')}
        <input
          value={v.citiesText}
          disabled={!isLead}
          onChange={(e) => setV({ ...v, citiesText: e.target.value })}
          className={input}
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-small font-semibold">
        <input
          type="checkbox"
          checked={v.accepting}
          disabled={!isLead}
          onChange={(e) => setV({ ...v, accepting: e.target.checked })}
          className="size-5 accent-[var(--rk-brand)]"
        />
        {t('office.accepting')}
      </label>
      {isLead && (
        <Button onClick={() => void save()} className="self-start">
          {t('save')}
        </Button>
      )}
      {msg && (
        <p
          role={msg.ok ? 'status' : 'alert'}
          className={msg.ok ? 'text-small text-success' : 'text-small text-danger'}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

function TeamPanel({
  officeId,
  uid,
  isLead,
  me,
}: {
  officeId: string;
  uid: string;
  isLead: boolean;
  me: EngineerDoc | null | undefined;
}) {
  const t = useTranslations('eng');
  const engineers = useCollectionAt<EngineerDoc>(`offices/${officeId}/engineers`);
  const [email, setEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState<string>();
  const [p, setP] = useState({
    name: '',
    sceNo: '',
    grade: 'engineer',
    discipline: 'architectural' as Discipline,
    expiresOn: '',
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  useEffect(() => {
    if (me)
      setP({
        name: me.name,
        sceNo: me.sceNo,
        grade: me.grade,
        discipline: me.discipline,
        expiresOn: me.expiresAt.toDate().toISOString().slice(0, 10),
      });
  }, [me]);

  const invite = async () => {
    setInviteMsg(undefined);
    try {
      const r = await httpsCallable<unknown, { status: 'linked' | 'pending' }>(
        firebaseFunctions(),
        'inviteEngineer',
      )({ officeId, email });
      setInviteMsg(
        r.data.status === 'linked' ? t('office.inviteLinked') : t('office.invitePending'),
      );
      setEmail('');
    } catch {
      setInviteMsg(t('failed'));
    }
  };
  const saveMine = async () => {
    setMsg(undefined);
    if (!/^\d{4,10}$/.test(p.sceNo) || !p.expiresOn || p.name.trim().length < 2)
      return setMsg({ ok: false, text: t('failed') });
    const data = {
      name: p.name.trim(),
      sceNo: p.sceNo,
      grade: p.grade,
      discipline: p.discipline,
      expiresAt: Timestamp.fromDate(new Date(`${p.expiresOn}T23:59:59+03:00`)),
    };
    try {
      if (me) await updateDoc(doc(firebaseDb(), `offices/${officeId}/engineers/${uid}`), data);
      else
        await setDoc(doc(firebaseDb(), `offices/${officeId}/engineers/${uid}`), {
          ...data,
          verified: false,
          active: true,
        });
      setMsg({ ok: true, text: t('saved') });
    } catch {
      setMsg({ ok: false, text: t('failed') });
    }
  };
  const today = todayRiyadh();
  const state = (e: EngineerDoc) =>
    !e.active
      ? t('office.engPaused')
      : e.expiresAt.toDate().toISOString().slice(0, 10) < today
        ? t('office.engExpired')
        : e.verified
          ? t('office.engVerified')
          : t('office.engPending');
  const input = 'hairline min-h-11 rounded-md bg-surface px-3';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-3" aria-labelledby="eng-list-h">
        <h3 id="eng-list-h" className="text-body font-semibold">
          {t('office.engineers')}
        </h3>
        {engineers.rows.length === 0 && (
          <p className="text-small text-text-muted">{t('office.noEngineers')}</p>
        )}
        <ul className="flex flex-col gap-2" data-testid="engineer-list">
          {engineers.rows.map((e) => (
            <li
              key={e.id}
              className="hairline flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-3 text-small"
            >
              <span>
                <span className="font-semibold">{e.data.name}</span> ·{' '}
                {t(`discipline.${e.data.discipline}`)} · <span dir="ltr">{e.data.sceNo}</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={e.data.verified && e.data.active ? 'text-success' : 'text-warning'}
                >
                  {state(e.data)}
                </span>
                {isLead && e.id !== uid && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      void updateDoc(doc(firebaseDb(), `offices/${officeId}/engineers/${e.id}`), {
                        active: !e.data.active,
                      })
                    }
                  >
                    {e.data.active ? t('office.pause') : t('office.resume')}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {isLead && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void invite();
            }}
          >
            <label className="flex flex-1 flex-col gap-1 text-small">
              {t('office.inviteEmail')}
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
            </label>
            <Button type="submit" disabled={!email.includes('@')}>
              {t('office.invite')}
            </Button>
            {inviteMsg && (
              <p role="status" className="w-full text-small text-text-muted">
                {inviteMsg}
              </p>
            )}
          </form>
        )}
      </section>
      <section
        className="flex flex-col gap-3"
        aria-labelledby="me-h"
        data-testid="my-engineer-profile"
      >
        <h3 id="me-h" className="text-body font-semibold">
          {t('office.myProfile')}
        </h3>
        {me && (
          <p
            className={cn(
              'text-small font-semibold',
              me.verified ? 'text-success' : 'text-warning',
            )}
          >
            {state(me)}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-small">
            {t('office.engName')}
            <input
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-small">
            {t('office.sceNo')}
            <input
              value={p.sceNo}
              dir="ltr"
              inputMode="numeric"
              disabled={!!me?.verified}
              onChange={(e) => setP({ ...p, sceNo: e.target.value })}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-small">
            {t('office.gradeLabel')}
            <select
              value={p.grade}
              disabled={!!me?.verified}
              onChange={(e) => setP({ ...p, grade: e.target.value })}
              className={input}
            >
              {SCE_GRADES.map((g) => (
                <option key={g} value={g}>
                  {t(`grade.${g}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small">
            {t('office.disciplineLabel')}
            <select
              value={p.discipline}
              disabled={!!me?.verified}
              onChange={(e) => setP({ ...p, discipline: e.target.value as Discipline })}
              className={input}
            >
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {t(`discipline.${d}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small">
            {t('office.expiresOn')}
            <input
              type="date"
              dir="ltr"
              value={p.expiresOn}
              disabled={!!me?.verified}
              onChange={(e) => setP({ ...p, expiresOn: e.target.value })}
              className={input}
            />
          </label>
        </div>
        <Button onClick={() => void saveMine()} className="self-start">
          {t('save')}
        </Button>
        {msg && (
          <p
            role={msg.ok ? 'status' : 'alert'}
            className={msg.ok ? 'text-small text-success' : 'text-small text-danger'}
          >
            {msg.text}
          </p>
        )}
      </section>
    </div>
  );
}

function RulesPanel({
  officeId,
  uid,
  me,
}: {
  officeId: string;
  uid: string;
  me: EngineerDoc | null | undefined;
}) {
  const t = useTranslations('eng');
  const locale = useLocale();
  const pack = useDocAt<RulePackDoc>(rulePackPath(officeId));
  const rules = pack?.rules ?? {};
  const current =
    !!me?.verified &&
    !!me.active &&
    me.expiresAt.toDate().toISOString().slice(0, 10) >= todayRiyadh();
  const [edit, setEdit] = useState<
    Record<string, { params: Record<string, number>; clause: string }>
  >({});
  const [error, setError] = useState<string>();
  const val = (id: string, base: Record<string, number>) =>
    edit[id] ?? {
      params: { ...base, ...(rules[id]?.params ?? {}) },
      clause: rules[id]?.clause ?? '',
    };
  const verify = async (id: string, base: Record<string, number>) => {
    setError(undefined);
    const v = val(id, base);
    const next: RuleOverride = {
      params: v.params,
      clause: v.clause.trim(),
      verifiedBy: `${me?.name ?? uid} (${me?.sceNo ?? ''})`,
      verifiedAt: todayRiyadh(),
    };
    try {
      await setDoc(
        doc(firebaseDb(), rulePackPath(officeId)),
        { rules: { ...rules, [id]: next } },
        { merge: true },
      );
    } catch {
      setError(t('failed'));
    }
  };
  const dateFmt = (d?: string) =>
    d
      ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
          dateStyle: 'medium',
        }).format(new Date(d))
      : '';
  return (
    <section
      className="flex flex-col gap-3"
      aria-label={t('office.tabs.rules')}
      data-testid="rule-pack"
    >
      <p className="text-small text-text-muted">
        {t('office.rulesLead', { v: RULE_PACK_VERSION })}
      </p>
      {!current && <p className="text-small text-warning">{t('office.onlyEngineers')}</p>}
      <ul className="flex flex-col gap-2">
        {RULES.filter((r) => r.pack === 'code').map((r) => {
          const v = val(r.id, r.params);
          const o = rules[r.id];
          return (
            <li
              key={r.id}
              className="hairline flex flex-col gap-2 rounded-lg bg-surface p-3"
              data-testid={`pack-${r.id}`}
            >
              <p className="flex flex-wrap items-center gap-2 text-small font-semibold">
                {t(`rule.${r.id}`)}
                <span className="text-caption font-normal text-text-muted" dir="ltr">
                  {r.ref} · {t(`discipline.${r.discipline}`)}
                </span>
              </p>
              {!r.check ? (
                <p className="text-caption text-text-muted">{t('office.manualRule')}</p>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  {Object.keys(r.params).map((k) => (
                    <label key={k} className="flex flex-col gap-1 text-caption">
                      <span dir="ltr">{k}</span>
                      <input
                        type="number"
                        step={0.1}
                        disabled={!current}
                        value={v.params[k]}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...v, params: { ...v.params, [k]: Number(e.target.value) } },
                          })
                        }
                        className="hairline min-h-10 w-24 rounded-md bg-bg px-2 tabular"
                      />
                    </label>
                  ))}
                  <label className="flex flex-col gap-1 text-caption">
                    {t('office.clause')}
                    <input
                      disabled={!current}
                      value={v.clause}
                      onChange={(e) =>
                        setEdit({ ...edit, [r.id]: { ...v, clause: e.target.value } })
                      }
                      className="hairline min-h-10 w-32 rounded-md bg-bg px-2"
                    />
                  </label>
                  {current && (
                    <Button variant="quiet" onClick={() => void verify(r.id, r.params)}>
                      {t('office.verifyRule')}
                    </Button>
                  )}
                </div>
              )}
              {o?.verifiedBy && (
                <p className="text-caption text-success">
                  {t('office.verifiedBy', { name: o.verifiedBy, date: dateFmt(o.verifiedAt) })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function RatesPanel({ officeId, isLead }: { officeId: string; isLead: boolean }) {
  const t = useTranslations('eng');
  const saved = useDocAt<SettingsRatesDoc>(`offices/${officeId}/settings/rates`);
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [msg, setMsg] = useState<string>();
  useEffect(() => {
    if (saved?.rates) setRates(saved.rates);
  }, [saved]);
  const save = async () => {
    await setDoc(doc(firebaseDb(), `offices/${officeId}/settings/rates`), { rates });
    setMsg(t('saved'));
  };
  return (
    <section className="flex max-w-2xl flex-col gap-3" aria-label={t('office.tabs.rates')}>
      <p className="text-small text-text-muted">{t('office.ratesLead')}</p>
      <ul className="flex flex-col gap-2">
        {(Object.keys(DEFAULT_RATES) as Array<keyof Rates>).map((k) => (
          <li key={k} className="grid grid-cols-[1fr_6rem_6rem] items-center gap-2 text-small">
            <span>{t(`boq.${k}`)}</span>
            {[0, 1].map((i) => (
              <input
                key={i}
                type="number"
                aria-label={`${t(`boq.${k}`)} ${i === 0 ? '<' : '>'}`}
                disabled={!isLead}
                value={rates[k][i]}
                onChange={(e) => {
                  const pair = [...rates[k]] as [number, number];
                  pair[i] = Number(e.target.value);
                  setRates({ ...rates, [k]: pair });
                }}
                className="hairline min-h-10 rounded-md bg-surface px-2 tabular"
              />
            ))}
          </li>
        ))}
      </ul>
      {isLead && (
        <Button onClick={() => void save()} className="self-start">
          {t('save')}
        </Button>
      )}
      {msg && (
        <p role="status" className="text-small text-success">
          {msg}
        </p>
      )}
    </section>
  );
}

interface PrecedentDoc {
  title: string;
  summary: string;
  tags: PrecedentTag[];
  citation: string;
  consent: boolean;
  source: 'office_project';
}

function PrecedentsPanel({ officeId, isLead }: { officeId: string; isLead: boolean }) {
  const t = useTranslations('eng');
  const rows = useCollectionAt<PrecedentDoc>(`offices/${officeId}/precedents`);
  const [v, setV] = useState({
    title: '',
    summary: '',
    citation: '',
    tags: [] as PrecedentTag[],
    consent: false,
  });
  const add = async () => {
    if (!v.consent || !v.title.trim()) return;
    await addDoc(collection(firebaseDb(), `offices/${officeId}/precedents`), {
      ...v,
      title: v.title.trim(),
      source: 'office_project',
      at: serverTimestamp(),
    });
    setV({ title: '', summary: '', citation: '', tags: [], consent: false });
  };
  const input = 'hairline min-h-11 rounded-md bg-surface px-3';
  return (
    <section className="flex flex-col gap-3" aria-label={t('office.tabs.precedents')}>
      <p className="text-small text-text-muted">{t('office.precedentsLead')}</p>
      {rows.rows.length === 0 && (
        <p className="text-small text-text-muted">{t('office.noPrecedents')}</p>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.rows.map((p) => (
          <li
            key={p.id}
            className="hairline flex flex-col gap-1 rounded-lg bg-surface p-3 text-small"
          >
            <span className="font-semibold">{p.data.title}</span>
            <span className="text-text-muted">{p.data.summary}</span>
            <span className="text-caption">
              {p.data.tags.map((x) => t(`office.tag.${x}`)).join(' · ')}
            </span>
            <span className="text-caption text-text-muted">{p.data.citation}</span>
          </li>
        ))}
      </ul>
      {isLead && (
        <form
          className="hairline flex flex-col gap-3 rounded-xl bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-small">
              {t('office.pTitle')}
              <input
                value={v.title}
                onChange={(e) => setV({ ...v, title: e.target.value })}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1 text-small">
              {t('office.pCitation')}
              <input
                value={v.citation}
                onChange={(e) => setV({ ...v, citation: e.target.value })}
                className={input}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-small">
            {t('office.pSummary')}
            <textarea
              rows={2}
              value={v.summary}
              onChange={(e) => setV({ ...v, summary: e.target.value })}
              className="hairline rounded-md bg-surface p-3"
            />
          </label>
          <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
            <legend className="mb-1 text-small font-semibold">{t('office.pTags')}</legend>
            {PRECEDENT_TAGS.map((tag) => (
              <label key={tag} className="flex min-h-10 items-center gap-1.5 text-small">
                <input
                  type="checkbox"
                  checked={v.tags.includes(tag)}
                  onChange={(e) =>
                    setV({
                      ...v,
                      tags: e.target.checked ? [...v.tags, tag] : v.tags.filter((x) => x !== tag),
                    })
                  }
                  className="size-4 accent-[var(--rk-brand)]"
                />
                {t(`office.tag.${tag}`)}
              </label>
            ))}
          </fieldset>
          <label className="flex min-h-11 items-center gap-2 text-small font-semibold">
            <input
              type="checkbox"
              checked={v.consent}
              onChange={(e) => setV({ ...v, consent: e.target.checked })}
              className="size-5 accent-[var(--rk-brand)]"
            />
            {t('office.pConsent')}
          </label>
          <Button type="submit" disabled={!v.consent || !v.title.trim()} className="self-start">
            {t('office.addPrecedent')}
          </Button>
        </form>
      )}
    </section>
  );
}
