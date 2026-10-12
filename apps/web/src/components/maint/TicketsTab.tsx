'use client';

import {
  TICKET_CATEGORIES,
  TicketCreateSchema,
  URGENCIES,
  slaState,
  type TicketActionInput,
} from '@rasikh/shared';
import { collection, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes } from 'firebase/storage';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, StatusDot } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, NativeSelect } from '@/components/ui/Input';
import { firebaseDb, firebaseFunctions, firebaseStorage } from '@/lib/firebase';
import type { Row } from '@/lib/ops/hooks';
import type { LeaseDoc } from '@/lib/ops/types';

export interface TicketDoc {
  unitId: string;
  propertyId: string;
  leaseId?: string;
  title: string;
  description: string;
  category: (typeof TICKET_CATEGORIES)[number];
  urgency: (typeof URGENCIES)[number];
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
  suggestedParty: 'tenant' | 'owner';
  tenantUid?: string;
  vendorName?: string;
  vendorPhone?: string;
  resolution?: string;
  rating?: number;
  createdAtIso?: string;
  slaDueAt?: string;
  resolvedAtIso?: string;
  photos: string[];
}

const leaseName = (l?: LeaseDoc) =>
  l ? [l.propertyName, l.unitLabel].filter(Boolean).join(' · ') : '';

export function TicketsTab({
  orgId,
  staff,
  vendor: isVendor = false,
  tickets,
  leases,
}: {
  orgId: string;
  staff: boolean;
  /** A vendor with their own login: sees only their tickets, cannot open new ones. */
  vendor?: boolean;
  tickets: Row<TicketDoc>[];
  leases: Row<LeaseDoc>[];
}) {
  const t = useTranslations('maint');
  const [selected, setSelected] = useState<string>();
  const [form, setForm] = useState({
    leaseId: leases[0]?.id ?? '',
    title: '',
    description: '',
    category: 'plumbing',
    urgency: 'normal',
  });
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const current = tickets.find((x) => x.id === selected);
  const leaseId = form.leaseId || leases[0]?.id || '';
  const lease = leases.find((l) => l.id === leaseId);

  const create = async () => {
    setError(undefined);
    if (!lease) return setError(t('needLease'));
    const parsed = TicketCreateSchema.safeParse({
      unitId: lease.data.unitId,
      propertyId: lease.data.propertyId,
      leaseId: lease.id,
      title: form.title,
      description: form.description,
      category: form.category,
      urgency: form.urgency,
    });
    if (!parsed.success) return setError(t('required'));
    setBusy(true);
    try {
      const ticketId = doc(collection(firebaseDb(), `orgs/${orgId}/tickets`)).id;
      const photos: string[] = [];
      if (file) {
        const path = `orgs/${orgId}/tickets/${ticketId}/${Date.now()}.jpg`;
        await uploadBytes(ref(firebaseStorage(), path), file, { contentType: file.type });
        photos.push(path);
      }
      await httpsCallable(
        firebaseFunctions(),
        'createTicket',
      )({ orgId, ticketId, ticket: parsed.data, photos });
      setForm((f) => ({ ...f, title: '', description: '' }));
      setFile(undefined);
      setSelected(ticketId);
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };

  if (current) {
    return (
      <TicketDetail
        orgId={orgId}
        id={current.id}
        ticket={current.data}
        staff={staff}
        vendor={isVendor}
        place={leaseName(leases.find((l) => l.id === current.data.leaseId)?.data)}
        onBack={() => setSelected(undefined)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!isVendor && (
        <Card>
          <form
            className="grid gap-4 sm:grid-cols-2"
            aria-label={t('new')}
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            {staff && (
              <NativeSelect
                id="tk-lease"
                label={t('unit')}
                value={leaseId}
                onChange={(e) => setForm({ ...form, leaseId: e.target.value })}
                options={leases.map((l) => ({ value: l.id, label: leaseName(l.data) }))}
              />
            )}
            <Field
              id="tk-title"
              label={t('title')}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <NativeSelect
              id="tk-cat"
              label={t('category')}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={TICKET_CATEGORIES.map((c) => ({ value: c, label: t(`cat_${c}`) }))}
            />
            <NativeSelect
              id="tk-urg"
              label={t('urgency')}
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
              options={URGENCIES.map((u) => ({ value: u, label: t(`urg_${u}`) }))}
            />
            <div className="sm:col-span-2">
              <Field
                id="tk-desc"
                label={t('description')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-small text-text-muted" htmlFor="tk-photo">
                {t('photo')}
              </label>
              <input
                id="tk-photo"
                type="file"
                accept="image/*"
                className="mt-1 block text-small"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
            </div>
            {error && (
              <p role="alert" className="text-small text-danger sm:col-span-2">
                {error}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" loading={busy}>
                {t('submit')}
              </Button>
            </div>
          </form>
        </Card>
      )}
      {tickets.length === 0 ? (
        <EmptyState title={t('none')} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {tickets.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                data-testid="ticket-row"
                onClick={() => setSelected(x.id)}
                className="hairline w-full rounded-lg bg-surface p-4 text-start"
              >
                <span className="block text-body font-medium">{x.data.title}</span>
                <span className="block text-small text-text-muted">
                  {t(`cat_${x.data.category}`)} · {t(`urg_${x.data.urgency}`)}
                </span>
                <StatusDot
                  status={x.data.status === 'closed' ? 'ok' : 'warn'}
                  label={t(`st_${x.data.status}`)}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TicketDetail({
  orgId,
  id,
  ticket,
  staff,
  vendor: isVendor,
  place,
  onBack,
}: {
  orgId: string;
  id: string;
  ticket: TicketDoc;
  staff: boolean;
  vendor?: boolean;
  place: string;
  onBack: () => void;
}) {
  const t = useTranslations('maint');
  const [vendor, setVendor] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const worker = staff || !!isVendor; // staff or the assigned vendor may start and resolve
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [rating, setRating] = useState('5');
  const [error, setError] = useState<string>();

  const run = async (input: TicketActionInput) => {
    setError(undefined);
    try {
      await httpsCallable(firebaseFunctions(), 'ticketAction')({ orgId, ticketId: id, input });
    } catch {
      setError(t('failed'));
    }
  };
  const sla =
    ticket.createdAtIso && ticket.status !== 'cancelled'
      ? slaState(
          ticket.urgency,
          ticket.createdAtIso,
          new Date().toISOString(),
          ticket.resolvedAtIso,
        )
      : undefined;
  const s = ticket.status;

  return (
    <div className="flex flex-col gap-4" data-testid="ticket-detail">
      <Button variant="ghost" onClick={onBack}>
        {t('back')}
      </Button>
      <Card className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold">{ticket.title}</h3>
        <p className="text-small text-text-muted">
          {place} · {t(`cat_${ticket.category}`)} · {t(`urg_${ticket.urgency}`)}
        </p>
        {ticket.description && <p className="text-small">{ticket.description}</p>}
        <p data-testid="status" className="text-small">
          {t(`st_${s}`)}
          {ticket.vendorName ? ` · ${ticket.vendorName}` : ''}
        </p>
        {sla && (
          <p data-testid="sla" className="text-caption text-text-muted">
            {t(`sla_${sla}`)}
          </p>
        )}
        <p
          data-testid="suggested"
          className="rounded-md border border-border/30 p-3 text-small text-text-muted"
        >
          {t(ticket.suggestedParty === 'tenant' ? 'suggestTenant' : 'suggestOwner')}{' '}
          {t('suggestNote')}
        </p>
        {ticket.resolution && <p className="text-small">{ticket.resolution}</p>}
        {ticket.rating && <p className="text-small">{t('rated', { n: ticket.rating })}</p>}
      </Card>

      {staff && (s === 'open' || s === 'assigned') && (
        <Card className="grid gap-3 sm:grid-cols-2">
          <Field
            id="tk-vendor"
            label={t('vendor')}
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
          <Field
            id="tk-vphone"
            label={t('vendorPhone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
          />
          <div className="sm:col-span-2">
            <Field
              id="tk-vemail"
              type="email"
              label={t('vendorEmail')}
              hint={t('vendorEmailHint')}
              value={vendorEmail}
              onChange={(e) => setVendorEmail(e.target.value)}
              dir="ltr"
            />
          </div>
          <Button
            className="sm:col-span-2"
            onClick={() =>
              void run({
                action: 'assign',
                vendorName: vendor,
                vendorPhone: phone,
                ...(vendorEmail ? { vendorEmail } : {}),
              })
            }
          >
            {t('assign')}
          </Button>
        </Card>
      )}
      <div className="flex flex-wrap gap-3">
        {worker && s === 'assigned' && (
          <Button onClick={() => void run({ action: 'start' })}>{t('start')}</Button>
        )}
        {worker && (s === 'assigned' || s === 'in_progress') && (
          <>
            <Field
              id="tk-note"
              label={t('resolution')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button onClick={() => void run({ action: 'resolve', note })}>{t('resolve')}</Button>
          </>
        )}
        {!staff && !isVendor && s === 'resolved' && (
          <>
            <NativeSelect
              id="tk-rating"
              label={t('rating')}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: String(n) }))}
            />
            <Button
              onClick={() => void run({ action: 'close', rating: Number(rating), ratingNote: '' })}
            >
              {t('closeRate')}
            </Button>
          </>
        )}
        {staff && s === 'resolved' && (
          <Button variant="quiet" onClick={() => void run({ action: 'close', ratingNote: '' })}>
            {t('close')}
          </Button>
        )}
        {!isVendor && (s === 'open' || s === 'assigned') && (
          <Button variant="quiet" onClick={() => void run({ action: 'cancel' })}>
            {t('cancel')}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
