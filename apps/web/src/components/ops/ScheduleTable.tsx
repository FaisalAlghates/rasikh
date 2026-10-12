'use client';

import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { StatusDot } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { firebaseDb, firebaseStorage } from '@/lib/firebase';
import { today } from '@/lib/ops/hooks';
import { money, type PaymentDoc } from '@/lib/ops/types';

/** Payment schedule. Staff record payments; the tenant may only attach a receipt to their own. */
export function ScheduleTable({
  orgId,
  payments,
  canMarkPaid,
  canUpload,
}: {
  orgId: string;
  payments: Array<{ id: string; data: PaymentDoc }>;
  canMarkPaid: boolean;
  canUpload: boolean;
}) {
  const t = useTranslations('ops');
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const now = today();
  const rows = [...payments].sort((a, b) => a.data.dueDate.localeCompare(b.data.dueDate));

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setError(undefined);
    try {
      await fn();
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(undefined);
    }
  };

  const markPaid = (id: string) =>
    run(id, () =>
      updateDoc(doc(firebaseDb(), `orgs/${orgId}/payments/${id}`), { status: 'paid', paidAt: now }),
    );

  const upload = (id: string, file: File) =>
    run(id, async () => {
      const path = `orgs/${orgId}/receipts/${id}-${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      await uploadBytes(ref(firebaseStorage(), path), file, { contentType: file.type });
      await updateDoc(doc(firebaseDb(), `orgs/${orgId}/payments/${id}`), { receiptPath: path });
    });

  const openReceipt = async (path: string) => {
    const url = await getDownloadURL(ref(firebaseStorage(), path));
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-start text-small">
          <thead>
            <tr className="text-text-muted">
              <th className="py-2 text-start font-medium">{t('dueDate')}</th>
              <th className="py-2 text-start font-medium">{t('amount')}</th>
              <th className="py-2 text-start font-medium">{t('status')}</th>
              <th className="py-2 text-start font-medium">{t('receipt')}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, data: p }) => {
              const late = p.status === 'due' && p.dueDate < now;
              return (
                <tr key={id} data-testid={`pay-${p.dueDate}`} className="border-t border-border/20">
                  <td className="tabular py-3" dir="ltr">
                    {p.dueDate}
                  </td>
                  <td className="tabular py-3">
                    {money(p.amount)} {t('sar')}
                  </td>
                  <td className="py-3">
                    <StatusDot
                      status={p.status === 'paid' ? 'ok' : late ? 'late' : 'warn'}
                      label={
                        p.status === 'paid'
                          ? t('statusPaid')
                          : late
                            ? t('statusLate')
                            : t('statusDue')
                      }
                    />
                  </td>
                  <td className="py-3">
                    {p.receiptPath ? (
                      <button
                        type="button"
                        className="text-brand-text underline"
                        onClick={() => void openReceipt(p.receiptPath!)}
                      >
                        {t('viewReceipt')}
                      </button>
                    ) : canUpload ? (
                      <label className="cursor-pointer text-brand-text underline">
                        {t('uploadReceipt')}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="sr-only"
                          aria-label={`${t('uploadReceipt')} ${p.dueDate}`}
                          onChange={(e) =>
                            e.target.files?.[0] && void upload(id, e.target.files[0])
                          }
                        />
                      </label>
                    ) : null}
                  </td>
                  <td className="py-3 text-end">
                    {canMarkPaid && p.status === 'due' && (
                      <Button
                        size="md"
                        variant="quiet"
                        disabled={busy === id}
                        onClick={() => void markPaid(id)}
                      >
                        {t('markPaid')}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <p className="text-caption text-text-muted">{t('recordsOnly')}</p>
    </div>
  );
}
