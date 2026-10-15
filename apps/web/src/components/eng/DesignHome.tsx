'use client';

import {
  BUILDING_TYPES,
  STYLES,
  confirmProgram,
  missingItems,
  parseBrief,
  type Program,
} from '@rasikh/shared';
import { addDoc, collection, serverTimestamp, where } from 'firebase/firestore';
import { BadgeCheck, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Link, useRouter } from '@/i18n/navigation';
import { firebaseDb } from '@/lib/firebase';
import { CITIES } from '@/lib/map/kingdom';
import type { OfficeDoc, ProjectDoc } from '@/lib/eng/data';
import { useCollectionAt } from '@/lib/ops/hooks';
import { useUser } from '@/lib/use-user';

type Toggle =
  | 'majlisMen'
  | 'majlisWomen'
  | 'dining'
  | 'maidRoom'
  | 'driverRoom'
  | 'familyLiving'
  | 'roofAnnex'
  | 'basement'
  | 'pool'
  | 'elevator'
  | 'separateGuestEntry';
const TOGGLES: Toggle[] = [
  'majlisMen',
  'majlisWomen',
  'dining',
  'maidRoom',
  'driverRoom',
  'familyLiving',
  'roofAnnex',
  'basement',
  'pool',
  'elevator',
  'separateGuestEntry',
];

/** The client's design projects and the brief: free text → programme they confirm → sent to a verified office. */
export function DesignHome() {
  const t = useTranslations('eng');
  const city = useTranslations('cities');
  const router = useRouter();
  const user = useUser();
  useEffect(() => {
    if (user === null) router.replace('/auth');
  }, [user, router]);

  const mineQ = useMemo(() => (user ? [where('clientUid', '==', user.uid)] : []), [user]);
  const mine = useCollectionAt<ProjectDoc>('designProjects', mineQ, !!user);
  const openQ = useMemo(() => [where('accepting', '==', true)], []);
  const offices = useCollectionAt<OfficeDoc>('offices', openQ, !!user);

  const [officeId, setOfficeId] = useState<string>();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'new' | 'renovation'>('new');
  const [plot, setPlot] = useState({
    width: 20,
    depth: 30,
    front: 15,
    back: 0,
    left: 0,
    right: 0,
    cityId: 'riyadh',
    district: '',
  });
  const [brief, setBrief] = useState('');
  const [program, setProgram] = useState<Partial<Program> | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string>();

  const missing = program ? missingItems(program) : [];
  const read = () => {
    const parsed = parseBrief(brief);
    setProgram({ floors: undefined, bedrooms: undefined, ...parsed });
  };
  const send = async () => {
    setError(undefined);
    const confirmed = program && confirmProgram(program);
    if (!officeId || !title.trim() || !confirmed?.success) return setError(t('failed'));
    setBusy(true);
    const cityAt = CITIES.find((c) => c.id === plot.cityId);
    try {
      const ref = await addDoc(collection(firebaseDb(), 'designProjects'), {
        officeId,
        clientUid: user!.uid,
        clientName: user!.displayName ?? user!.email ?? '',
        title: title.trim().slice(0, 100),
        kind,
        status: 'brief',
        brief: brief.trim().slice(0, 2000),
        // Firestore stores no undefined values
        program: JSON.parse(JSON.stringify(confirmed.data)),
        plot: {
          width: plot.width,
          depth: plot.depth,
          streets: { front: plot.front, back: plot.back, left: plot.left, right: plot.right },
          northDeg: 0,
          city: city(plot.cityId),
          district: plot.district,
          // the city centre until the office sets the exact plot (used by the sun study)
          ...(cityAt ? { location: { lat: cityAt.coords[1], lng: cityAt.coords[0] } } : {}),
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSent(ref.id);
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };

  const num = (id: string, label: string, value: number, on: (n: number) => void) => (
    <label key={id} htmlFor={id} className="flex flex-col gap-1 text-small">
      {label}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => on(Number(e.target.value))}
        className="hairline min-h-11 rounded-md bg-surface px-3 tabular"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="my-h" className="flex flex-col gap-3">
        <h2 id="my-h" className="text-h3 font-semibold">
          {t('myProjects')}
        </h2>
        {mine.rows.length === 0 && !mine.loading && (
          <p className="text-small text-text-muted">{t('noProjects')}</p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {mine.rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/design/${p.id}`}
                data-testid="my-project"
                className="hairline flex flex-col gap-1 rounded-xl bg-surface p-4 hover:border-brand"
              >
                <span className="text-body font-semibold">{p.data.title}</span>
                <span className="text-small text-text-muted">
                  {t(`kind.${p.data.kind}`)} · {t(`status.${p.data.status}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="new-h" className="flex flex-col gap-5" data-testid="brief-form">
        <h2 id="new-h" className="text-h3 font-semibold">
          {t('newBrief')}
        </h2>
        {sent ? (
          <div
            className="hairline flex flex-col items-start gap-3 rounded-xl bg-surface p-5"
            role="status"
          >
            <p className="text-body font-semibold text-success">{t('sent')}</p>
            <Link href={`/design/${sent}`} className="text-brand-text underline underline-offset-4">
              {t('openProject')}
            </Link>
          </div>
        ) : (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-small font-semibold">{t('chooseOffice')}</legend>
              {offices.rows.length === 0 && !offices.loading && (
                <p className="text-small text-text-muted">{t('noOffices')}</p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {offices.rows.map((o) => (
                  <label
                    key={o.id}
                    className={cn(
                      'hairline flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-4',
                      officeId === o.id && 'border-brand',
                    )}
                  >
                    <input
                      type="radio"
                      name="office"
                      value={o.id}
                      checked={officeId === o.id}
                      onChange={() => setOfficeId(o.id)}
                      className="mt-1 size-5 accent-[var(--rk-brand)]"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-body font-semibold">
                        <Building2 size={16} aria-hidden="true" className="text-brand-text" />
                        {o.data.name}
                      </span>
                      <span
                        className={cn(
                          'flex items-center gap-1 text-caption',
                          o.data.verified ? 'text-success' : 'text-warning',
                        )}
                      >
                        {o.data.verified && <BadgeCheck size={14} aria-hidden="true" />}
                        {o.data.verified ? t('officeVerified') : t('officeNotVerified')}
                      </span>
                      <span className="text-caption text-text-muted">
                        {o.data.disciplines.map((d) => t(`discipline.${d}`)).join('، ')} ·{' '}
                        {o.data.cities.join('، ')}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-small">
                {t('projectTitle')}
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="hairline min-h-11 rounded-md bg-surface px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-small">
                {t('kindLabel')}
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as 'new' | 'renovation')}
                  className="hairline min-h-11 rounded-md bg-surface px-2"
                >
                  <option value="new">{t('kind.new')}</option>
                  <option value="renovation">{t('kind.renovation')}</option>
                </select>
              </label>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-small font-semibold">{t('plotTitle')}</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {num('pw', t('plotWidth'), plot.width, (n) => setPlot({ ...plot, width: n }))}
                {num('pd', t('plotDepth'), plot.depth, (n) => setPlot({ ...plot, depth: n }))}
                <label className="flex flex-col gap-1 text-small">
                  {t('city')}
                  <select
                    value={plot.cityId}
                    onChange={(e) => setPlot({ ...plot, cityId: e.target.value })}
                    className="hairline min-h-11 rounded-md bg-surface px-2"
                  >
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {city(c.id)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-small">
                  {t('district')}
                  <input
                    value={plot.district}
                    onChange={(e) => setPlot({ ...plot, district: e.target.value })}
                    maxLength={60}
                    className="hairline min-h-11 rounded-md bg-surface px-3"
                  />
                </label>
              </div>
              <p className="text-caption text-text-muted">{t('streetsTitle')}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['front', 'back', 'left', 'right'] as const).map((s) =>
                  num(`st-${s}`, t(`side.${s}`), plot[s], (n) => setPlot({ ...plot, [s]: n })),
                )}
              </div>
              <p className="text-caption text-text-muted">{t('zoningNote')}</p>
            </fieldset>

            <div className="flex flex-col gap-2">
              <label htmlFor="brief" className="text-small font-semibold">
                {t('briefText')}
              </label>
              <textarea
                id="brief"
                rows={4}
                maxLength={2000}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                aria-describedby="brief-hint"
                className="hairline rounded-md bg-surface p-3 text-body"
              />
              <p id="brief-hint" className="text-caption text-text-muted">
                {t('briefHint')}
              </p>
              <Button
                variant="quiet"
                onClick={read}
                disabled={!brief.trim()}
                className="self-start"
              >
                {t('readBrief')}
              </Button>
            </div>

            {program && (
              <fieldset
                className="hairline flex flex-col gap-3 rounded-xl bg-surface p-4"
                data-testid="program"
              >
                <legend className="px-1 text-small font-semibold">{t('programTitle')}</legend>
                <p className="text-caption text-text-muted">{t('programHint')}</p>
                {missing.length > 0 && (
                  <p
                    role="status"
                    className="text-small font-semibold text-warning"
                    data-testid="missing"
                  >
                    {t('missing', {
                      items: missing.map((m) => (m === 'type' ? t('typeLabel') : t(m))).join('، '),
                    })}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="flex flex-col gap-1 text-small">
                    {t('typeLabel')}
                    <select
                      value={program.type ?? ''}
                      onChange={(e) =>
                        setProgram({ ...program, type: e.target.value as Program['type'] })
                      }
                      className={cn(
                        'hairline min-h-11 rounded-md bg-bg px-2',
                        !program.type && 'border-warning',
                      )}
                    >
                      <option value="">—</option>
                      {BUILDING_TYPES.map((b) => (
                        <option key={b} value={b}>
                          {t(`type.${b}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(['floors', 'bedrooms', 'parking'] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-1 text-small">
                      {t(k)}
                      <input
                        type="number"
                        min={0}
                        value={program[k] ?? ''}
                        onChange={(e) =>
                          setProgram({
                            ...program,
                            [k]: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className={cn(
                          'hairline min-h-11 rounded-md bg-bg px-3 tabular',
                          program[k] === undefined && k !== 'parking' && 'border-warning',
                        )}
                      />
                    </label>
                  ))}
                  <label className="flex flex-col gap-1 text-small">
                    {t('styleLabel')}
                    <select
                      value={program.style ?? 'modern_najdi'}
                      onChange={(e) =>
                        setProgram({ ...program, style: e.target.value as Program['style'] })
                      }
                      className="hairline min-h-11 rounded-md bg-bg px-2"
                    >
                      {STYLES.map((s) => (
                        <option key={s} value={s}>
                          {t(`style.${s}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-small">
                    <input
                      type="checkbox"
                      checked={program.kitchen === 'open'}
                      onChange={(e) =>
                        setProgram({ ...program, kitchen: e.target.checked ? 'open' : 'closed' })
                      }
                      className="size-5 accent-[var(--rk-brand)]"
                    />
                    {t('toggles.kitchenOpen')}
                  </label>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {TOGGLES.map((k) => (
                    <label key={k} className="flex min-h-11 items-center gap-2 text-small">
                      <input
                        type="checkbox"
                        checked={
                          program[k] ??
                          (k === 'majlisMen' || k === 'dining' || k === 'familyLiving')
                        }
                        onChange={(e) => setProgram({ ...program, [k]: e.target.checked })}
                        className="size-5 accent-[var(--rk-brand)]"
                      />
                      {t(`toggles.${k}`)}
                    </label>
                  ))}
                </div>
                <Button
                  onClick={() => void send()}
                  loading={busy}
                  disabled={missing.length > 0 || !officeId || !title.trim()}
                >
                  {t('confirmSend')}
                </Button>
              </fieldset>
            )}
            {error && (
              <p role="alert" className="text-small text-danger">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
