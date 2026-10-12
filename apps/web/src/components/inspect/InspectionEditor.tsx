'use client';

import {
  CONDITIONS,
  conditionRank,
  itemId,
  itemsOfRoom,
  type Assessment,
  type Condition,
} from '@rasikh/shared';
import { doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, StatusDot } from '@/components/ui/Card';
import { Field, NativeSelect } from '@/components/ui/Input';
import { firebaseDb } from '@/lib/firebase';
import { evidenceUrl, saveEvidence, verifyEvidence } from '@/lib/inspect/evidence';
import { conditionLabel, itemLabel, roomLabel } from '@/lib/inspect/labels';
import { riyadhDay, type InspectionDoc, type ItemDoc, type MediaDoc } from '@/lib/inspect/types';
import { useCollectionAt, type Row } from '@/lib/ops/hooks';
import { CameraButton } from './CameraButton';
import { CompareReport } from './CompareReport';
import { SignDialog } from './SignDialog';

const NOTE_MAX = 300;

/**
 * One inspection: room-by-room checklist, in-app photos with hash/time/GPS, and the two-party sign-off.
 * Staff edit while it is a draft; the tenant reviews, comments and signs; once sealed nothing changes.
 */
export function InspectionEditor({
  orgId,
  id,
  inspection,
  uid,
  staff,
  leaseLabel,
  onBack,
}: {
  orgId: string;
  id: string;
  inspection: InspectionDoc;
  uid: string;
  staff: boolean;
  leaseLabel: string;
  onBack: () => void;
}) {
  const t = useTranslations('inspect');
  const base = `orgs/${orgId}/inspections/${id}`;
  const items = useCollectionAt<ItemDoc>(`${base}/items`);
  const media = useCollectionAt<MediaDoc>(`${base}/media`);
  const moveIn = useCollectionAt<ItemDoc>(
    inspection.moveInId ? `orgs/${orgId}/inspections/${inspection.moveInId}/items` : undefined,
  );

  const editable = staff && inspection.status === 'draft';
  const itemMap = useMemo(() => new Map(items.rows.map((r) => [r.id, r.data])), [items.rows]);
  const beforeMap = useMemo(() => new Map(moveIn.rows.map((r) => [r.id, r.data])), [moveIn.rows]);
  const total = inspection.rooms.reduce((n, r) => n + itemsOfRoom(r).length, 0);
  const answered = items.rows.length;
  const complete = answered >= total;

  return (
    <div className="flex flex-col gap-5" data-testid="inspection-editor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowRight size={18} aria-hidden="true" className="rtl:rotate-0 ltr:rotate-180" />
          {t('back')}
        </Button>
        <p className="text-small text-text-muted">
          {t(inspection.kind)} · {leaseLabel}
        </p>
      </div>

      <Card className="flex flex-col gap-3" data-testid="sign-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusDot
            status={inspection.status === 'sealed' ? 'ok' : 'warn'}
            label={t(`status_${inspection.status}`)}
          />
          <span className="tabular text-small text-text-muted" data-testid="progress">
            {t('progress', { done: answered, total })}
          </span>
        </div>
        <ul className="grid gap-1 text-small sm:grid-cols-2">
          {(['owner', 'tenant'] as const).map((p) => {
            const sig = inspection.signatures?.[p];
            return (
              <li key={p} data-testid={`signed-${p}`} className="text-text-muted">
                {t(p === 'owner' ? 'partyOwner' : 'partyTenant')}:{' '}
                <span className={sig ? 'text-success' : ''}>
                  {sig ? `${t('signed')} · ${riyadhDay(sig.at) ?? ''}` : t('notSigned')}
                </span>
              </li>
            );
          })}
        </ul>

        {inspection.status === 'sealed' && inspection.digest && (
          <p
            className="flex items-start gap-2 text-caption text-text-muted"
            data-testid="sealed-note"
          >
            <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
            <span>
              {t('sealedNote')}{' '}
              <code dir="ltr" className="tabular break-all">
                {inspection.digest.slice(0, 16)}…
              </code>
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {staff && inspection.status === 'draft' && (
            <SignDialog orgId={orgId} inspectionId={id} party="owner" disabled={!complete} />
          )}
          {!staff &&
            inspection.status === 'pending_signatures' &&
            !inspection.signatures?.tenant && (
              <SignDialog orgId={orgId} inspectionId={id} party="tenant" />
            )}
          {staff && inspection.status === 'draft' && !complete && (
            <p className="text-caption text-text-muted">{t('finishFirst')}</p>
          )}
          {staff && inspection.status === 'pending_signatures' && (
            <p className="text-caption text-text-muted">{t('waitingTenant')}</p>
          )}
        </div>
        <p className="text-caption text-text-muted">{t('complementsEjar')}</p>
      </Card>

      {inspection.rooms.map((room, i) => (
        <RoomSection
          key={room}
          orgId={orgId}
          inspectionId={id}
          room={room}
          kind={inspection.kind}
          itemMap={itemMap}
          beforeMap={beforeMap}
          media={media.rows}
          editable={editable}
          uid={uid}
          defaultOpen={i === 0}
        />
      ))}

      <TenantComment orgId={orgId} id={id} inspection={inspection} staff={staff} />

      {inspection.kind === 'move_out' && inspection.moveInId && (
        <CompareReport
          inspection={inspection}
          leaseLabel={leaseLabel}
          moveIn={moveIn.rows.map((r) => r.data)}
          moveOut={items.rows.map((r) => r.data)}
        />
      )}
    </div>
  );
}

function RoomSection({
  orgId,
  inspectionId,
  room,
  kind,
  itemMap,
  beforeMap,
  media,
  editable,
  uid,
  defaultOpen,
}: {
  orgId: string;
  inspectionId: string;
  room: string;
  kind: InspectionDoc['kind'];
  itemMap: Map<string, ItemDoc>;
  beforeMap: Map<string, ItemDoc>;
  media: Row<MediaDoc>[];
  editable: boolean;
  uid: string;
  defaultOpen: boolean;
}) {
  const t = useTranslations('inspect');
  const keys = itemsOfRoom(room);
  const done = keys.filter((k) => itemMap.has(itemId(room, k))).length;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const allGood = async () => {
    setBusy(true);
    try {
      const batch = writeBatch(firebaseDb());
      for (const k of keys) {
        if (itemMap.has(itemId(room, k))) continue;
        batch.set(
          doc(firebaseDb(), `orgs/${orgId}/inspections/${inspectionId}/items/${itemId(room, k)}`),
          {
            room,
            item: k,
            condition: 'good',
            note: '',
          },
        );
      }
      await batch.commit();
    } finally {
      setBusy(false);
    }
  };

  const roomShots = media.filter((m) => m.data.room === room && !m.data.item);

  return (
    <details
      open={defaultOpen}
      className="hairline rounded-lg bg-surface"
      data-testid={`room-${room}`}
    >
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-5 py-3">
        <span className="text-body font-semibold">{roomLabel(t, room)}</span>
        <span className="tabular text-caption text-text-muted">
          {done}/{keys.length}
        </span>
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5">
        {editable && (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="md" variant="quiet" onClick={() => void allGood()} loading={busy}>
              {t('allGood')}
            </Button>
            <CameraButton
              title={t('photoOf', { what: roomLabel(t, room) })}
              label={t('roomPhoto')}
              onShot={async (blob) => {
                try {
                  await saveEvidence({ orgId, inspectionId, room, uid }, blob);
                } catch {
                  setError(t('uploadFailed'));
                }
              }}
            />
          </div>
        )}
        {roomShots.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {roomShots.map((m) => (
              <MediaThumb key={m.id} media={m.data} />
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
        <ul className="flex flex-col divide-y divide-border/20">
          {keys.map((k) => (
            <ItemRow
              key={k}
              orgId={orgId}
              inspectionId={inspectionId}
              room={room}
              item={k}
              kind={kind}
              value={itemMap.get(itemId(room, k))}
              before={beforeMap.get(itemId(room, k))}
              media={media.filter((m) => m.data.room === room && m.data.item === k)}
              editable={editable}
              uid={uid}
            />
          ))}
        </ul>
      </div>
    </details>
  );
}

function ItemRow({
  orgId,
  inspectionId,
  room,
  item,
  kind,
  value,
  before,
  media,
  editable,
  uid,
}: {
  orgId: string;
  inspectionId: string;
  room: string;
  item: string;
  kind: InspectionDoc['kind'];
  value?: ItemDoc;
  before?: ItemDoc;
  media: Row<MediaDoc>[];
  editable: boolean;
  uid: string;
}) {
  const t = useTranslations('inspect');
  const [note, setNote] = useState(value?.note ?? '');
  const [cost, setCost] = useState(value?.costSar === undefined ? '' : String(value.costSar));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setNote(value?.note ?? ''), [value?.note]);
  useEffect(
    () => setCost(value?.costSar === undefined ? '' : String(value.costSar)),
    [value?.costSar],
  );

  const path = `orgs/${orgId}/inspections/${inspectionId}/items/${itemId(room, item)}`;
  const worse =
    !!value && !!before && conditionRank(value.condition) > conditionRank(before.condition);

  const save = async (patch: {
    condition?: Condition;
    note?: string;
    assessment?: Assessment | '';
    cost?: string;
  }) => {
    const condition = patch.condition ?? value?.condition ?? 'good';
    const isWorse = !!before && conditionRank(condition) > conditionRank(before.condition);
    const assessment =
      patch.assessment === undefined ? value?.assessment : patch.assessment || undefined;
    const costText = patch.cost ?? cost;
    const costNum = costText.trim() === '' ? undefined : Number(costText);
    setError(undefined);
    try {
      await setDoc(doc(firebaseDb(), path), {
        room,
        item,
        condition,
        note: (patch.note ?? note).slice(0, NOTE_MAX),
        // The human decision exists only at move-out and only for items that got worse.
        ...(kind === 'move_out' && isWorse && assessment ? { assessment } : {}),
        ...(kind === 'move_out' &&
        isWorse &&
        assessment === 'damage' &&
        costNum !== undefined &&
        Number.isFinite(costNum) &&
        costNum >= 0
          ? { costSar: costNum }
          : {}),
      });
    } catch {
      setError(t('saveFailed'));
    }
  };

  const id = `${room}-${item}`;
  return (
    <li className="flex flex-col gap-3 py-4" data-testid={`item-${itemId(room, item)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-body">{itemLabel(t, item)}</span>
        {before && value && (
          <span className="text-caption text-text-muted">
            {t('wasAtMoveIn', { cond: conditionLabel(t, before.condition) })}
          </span>
        )}
      </div>

      {editable ? (
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <NativeSelect
            id={`c-${id}`}
            label={t('condition')}
            value={value?.condition ?? ''}
            onChange={(e) => void save({ condition: e.target.value as Condition })}
            options={[
              ...(value ? [] : [{ value: '', label: t('choose') }]),
              ...CONDITIONS.map((c) => ({ value: c, label: conditionLabel(t, c) })),
            ]}
          />
          <Field
            id={`n-${id}`}
            label={t('note')}
            maxLength={NOTE_MAX}
            value={note}
            disabled={!value}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => value && note !== value.note && void save({ note })}
          />
          <CameraButton
            title={t('photoOf', { what: itemLabel(t, item) })}
            label={t('photo')}
            busy={busy}
            onShot={async (blob) => {
              setBusy(true);
              setError(undefined);
              try {
                await saveEvidence({ orgId, inspectionId, room, item, uid }, blob);
              } catch {
                setError(t('uploadFailed'));
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-small">
          {value ? (
            <StatusDot
              status={
                value.condition === 'good' ? 'ok' : value.condition === 'fair' ? 'warn' : 'late'
              }
              label={conditionLabel(t, value.condition)}
            />
          ) : (
            <span className="text-text-muted">{t('notAnswered')}</span>
          )}
          {value?.note && <span className="text-text-muted">{value.note}</span>}
        </div>
      )}

      {kind === 'move_out' && worse && (
        <div
          className="grid gap-3 rounded-md border border-warning p-3 sm:grid-cols-2"
          data-testid="assessment"
        >
          {editable ? (
            <>
              <NativeSelect
                id={`a-${id}`}
                label={t('assessment')}
                value={value?.assessment ?? ''}
                onChange={(e) => void save({ assessment: e.target.value as Assessment | '' })}
                options={[
                  { value: '', label: t('choose') },
                  { value: 'wear', label: t('assessWear') },
                  { value: 'damage', label: t('assessDamage') },
                ]}
              />
              {value?.assessment === 'damage' && (
                <Field
                  id={`k-${id}`}
                  type="number"
                  min="0"
                  label={t('costSar')}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  onBlur={() => void save({ cost })}
                  dir="ltr"
                />
              )}
              <p className="text-caption text-text-muted sm:col-span-2">{t('assessNote')}</p>
            </>
          ) : (
            <p className="text-small sm:col-span-2">
              {value?.assessment === 'damage'
                ? `${t('assessDamage')}${value.costSar !== undefined ? ` · ${value.costSar}` : ''}`
                : value?.assessment === 'wear'
                  ? t('assessWear')
                  : t('notAssessed')}
            </p>
          )}
        </div>
      )}

      {media.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {media.map((m) => (
            <MediaThumb key={m.id} media={m.data} />
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

function MediaThumb({ media }: { media: MediaDoc }) {
  const t = useTranslations('inspect');
  const [url, setUrl] = useState<string>();
  const [check, setCheck] = useState<'idle' | 'busy' | 'ok' | 'bad'>('idle');

  useEffect(() => {
    let on = true;
    void evidenceUrl(media.path)
      .then((u) => on && setUrl(u))
      .catch(() => undefined);
    return () => {
      on = false;
    };
  }, [media.path]);

  const verify = async () => {
    setCheck('busy');
    try {
      setCheck((await verifyEvidence(media.path, media.sha256)) ? 'ok' : 'bad');
    } catch {
      setCheck('bad');
    }
  };

  return (
    <li className="flex w-40 flex-col gap-1.5" data-testid="evidence">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a private Storage URL, not a static asset
        <img
          src={url}
          alt={t('evidenceAlt')}
          className="aspect-[4/3] w-full rounded-md object-cover"
        />
      ) : (
        <div className="aspect-[4/3] w-full rounded-md bg-border/20" aria-hidden="true" />
      )}
      <span className="tabular text-caption text-text-muted" dir="ltr">
        {media.capturedAt.replace('T', ' ').slice(0, 19)}
      </span>
      <span className="tabular text-caption text-text-muted" dir="ltr" data-testid="evidence-hash">
        SHA-256 {media.sha256.slice(0, 10)}…
      </span>
      <span className="text-caption text-text-muted">{media.gps ? t('hasGps') : t('noGps')}</span>
      <button
        type="button"
        onClick={() => void verify()}
        className="text-start text-caption text-brand-text underline"
        data-testid="verify-evidence"
      >
        {t('verify')}
      </button>
      {check !== 'idle' && (
        <span
          role="status"
          data-testid="verify-result"
          className={`text-caption ${check === 'ok' ? 'text-success' : check === 'bad' ? 'text-danger' : 'text-text-muted'}`}
        >
          {check === 'busy' ? t('verifying') : check === 'ok' ? t('verifiedOk') : t('verifiedBad')}
        </span>
      )}
    </li>
  );
}

function TenantComment({
  orgId,
  id,
  inspection,
  staff,
}: {
  orgId: string;
  id: string;
  inspection: InspectionDoc;
  staff: boolean;
}) {
  const t = useTranslations('inspect');
  const [text, setText] = useState(inspection.tenantComment ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const open = inspection.status !== 'sealed';

  if (staff || !open) {
    return inspection.tenantComment ? (
      <Card data-testid="tenant-comment">
        <h3 className="text-body font-semibold">{t('tenantComment')}</h3>
        <p className="mt-1 text-small text-text-muted">{inspection.tenantComment}</p>
      </Card>
    ) : null;
  }
  return (
    <Card className="flex flex-col gap-3" data-testid="tenant-comment">
      <Field
        id="tenant-comment"
        label={t('tenantComment')}
        hint={t('tenantCommentHint')}
        maxLength={500}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
      />
      <div className="flex items-center gap-3">
        <Button
          variant="quiet"
          onClick={() => {
            setError(undefined);
            void updateDoc(doc(firebaseDb(), `orgs/${orgId}/inspections/${id}`), {
              tenantComment: text,
            })
              .then(() => setSaved(true))
              .catch(() => setError(t('saveFailed')));
          }}
        >
          {t('saveComment')}
        </Button>
        {saved && (
          <span role="status" className="text-caption text-success">
            {t('commentSaved')}
          </span>
        )}
        {error && (
          <span role="alert" className="text-caption text-danger">
            {error}
          </span>
        )}
      </div>
    </Card>
  );
}
