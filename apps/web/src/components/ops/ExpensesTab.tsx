'use client';

import { EXPENSE_CATEGORIES, ExpenseSchema } from '@rasikh/shared';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, NativeSelect } from '@/components/ui/Input';
import { firebaseDb, firebaseStorage } from '@/lib/firebase';
import { today, type Row } from '@/lib/ops/hooks';
import { money, type ExpenseDoc, type PropertyDoc } from '@/lib/ops/types';

const CAT_KEY = {
  maintenance: 'catMaintenance',
  utilities: 'catUtilities',
  insurance: 'catInsurance',
  fees: 'catFees',
  other: 'catOther',
} as const;

export function ExpensesTab({
  orgId,
  properties,
  expenses,
}: {
  orgId: string;
  properties: Row<PropertyDoc>[];
  expenses: Row<ExpenseDoc>[];
}) {
  const t = useTranslations('ops');
  const [f, setF] = useState({
    propertyId: '',
    category: 'maintenance',
    amount: '',
    date: today(),
    note: '',
  });
  const [file, setFile] = useState<File>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const nameOf = (id: string) => properties.find((p) => p.id === id)?.data.name ?? '';

  const submit = async () => {
    setError(undefined);
    const propertyId = f.propertyId || properties[0]?.id || '';
    const parsed = ExpenseSchema.safeParse({ ...f, propertyId, amount: Number(f.amount) });
    if (!parsed.success) return setError(t('required'));
    setBusy(true);
    try {
      let receiptPath: string | undefined;
      if (file) {
        receiptPath = `orgs/${orgId}/receipts/exp-${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        await uploadBytes(ref(firebaseStorage(), receiptPath), file, { contentType: file.type });
      }
      await addDoc(collection(firebaseDb(), `orgs/${orgId}/expenses`), {
        ...parsed.data,
        ...(receiptPath ? { receiptPath } : {}),
        createdAt: serverTimestamp(),
      });
      setF((s) => ({ ...s, amount: '', note: '' }));
      setFile(undefined);
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...expenses].sort((a, b) => b.data.date.localeCompare(a.data.date));

  return (
    <div className="flex flex-col gap-6">
      <form
        className="hairline grid gap-4 rounded-lg bg-surface p-5 sm:grid-cols-2"
        aria-label={t('addExpense')}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <NativeSelect
          id="xp"
          label={t('property')}
          value={f.propertyId || properties[0]?.id || ''}
          onChange={(e) => setF({ ...f, propertyId: e.target.value })}
          options={properties.map((p) => ({ value: p.id, label: p.data.name }))}
        />
        <NativeSelect
          id="xc"
          label={t('category')}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(CAT_KEY[c]) }))}
        />
        <Field
          id="xa"
          type="number"
          min="0"
          label={t('amount')}
          value={f.amount}
          onChange={(e) => setF({ ...f, amount: e.target.value })}
          dir="ltr"
        />
        <Field
          id="xd"
          type="date"
          label={t('date')}
          value={f.date}
          onChange={(e) => setF({ ...f, date: e.target.value })}
          dir="ltr"
        />
        <Field
          id="xn"
          label={t('note')}
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
        <label className="flex flex-col gap-1.5 text-small text-text-muted">
          {t('receipt')}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0])}
            className="text-body text-text"
          />
        </label>
        {error && (
          <p role="alert" className="text-small text-danger sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={busy} disabled={properties.length === 0}>
            {t('addExpense')}
          </Button>
        </div>
      </form>

      {sorted.length === 0 ? (
        <EmptyState title={t('noExpenses')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((e) => (
            <li
              key={e.id}
              data-testid="expense-row"
              className="hairline flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface p-4"
            >
              <span>
                <span className="block text-body font-medium">
                  {t(CAT_KEY[e.data.category])} · {nameOf(e.data.propertyId)}
                </span>
                <span className="tabular block text-caption text-text-muted" dir="ltr">
                  {e.data.date} {e.data.note && `· ${e.data.note}`}
                </span>
              </span>
              <span className="tabular text-body font-medium">
                {money(e.data.amount)} {t('sar')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
