'use client';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { BadgeCheck, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { firebaseDb } from '@/lib/firebase';
import type { EngineerDoc, OfficeDoc } from '@/lib/eng/data';
import { useCollectionAt } from '@/lib/ops/hooks';

/**
 * The Rasikh team verifies engineering offices (commercial registration, SCE classification, Balady activation) and
 * each engineer's SCE membership. Until verified, an office cannot approve or release anything.
 */
export function OfficeVerification() {
  const t = useTranslations('eng');
  const offices = useCollectionAt<OfficeDoc>('offices');
  const setVerified = (path: string, verified: boolean) =>
    void updateDoc(doc(firebaseDb(), path), { verified, verifiedAt: serverTimestamp() });
  return (
    <section className="flex flex-col gap-4" data-testid="office-verification">
      <p className="text-small text-text-muted">{t('admin.lead')}</p>
      {offices.rows.length === 0 && !offices.loading && (
        <p className="text-small text-text-muted">{t('admin.noOffices')}</p>
      )}
      <ul className="flex flex-col gap-3">
        {offices.rows.map((o) => (
          <li
            key={o.id}
            data-testid="verify-office"
            className="hairline flex flex-col gap-3 rounded-xl bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 text-small">
                <p className="flex items-center gap-2 text-body font-semibold">
                  {o.data.verified ? (
                    <BadgeCheck size={16} aria-hidden="true" className="text-success" />
                  ) : (
                    <Clock size={16} aria-hidden="true" className="text-warning" />
                  )}
                  {o.data.name}
                </p>
                <p dir="ltr" className="text-start">
                  CR {o.data.crNo || '—'} · SCE {o.data.sceClass || '—'} · Balady{' '}
                  {o.data.baladyActive ? '✓' : '✗'}
                </p>
                <p className="text-text-muted">
                  {o.data.disciplines.map((d) => t(`discipline.${d}`)).join('، ')}
                </p>
              </div>
              <Button
                variant={o.data.verified ? 'quiet' : 'primary'}
                onClick={() => setVerified(`offices/${o.id}`, !o.data.verified)}
              >
                {o.data.verified ? t('admin.unverify') : t('admin.verify')}
              </Button>
            </div>
            <Engineers officeId={o.id} onToggle={setVerified} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Engineers({
  officeId,
  onToggle,
}: {
  officeId: string;
  onToggle: (path: string, v: boolean) => void;
}) {
  const t = useTranslations('eng');
  const rows = useCollectionAt<EngineerDoc>(`offices/${officeId}/engineers`);
  if (rows.rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-border/20 pt-3">
      <p className="text-caption font-semibold text-text-muted">{t('admin.engineers')}</p>
      <ul className="flex flex-col gap-1.5">
        {rows.rows.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-small">
            <span>
              {e.data.name} · {t(`discipline.${e.data.discipline}`)} ·{' '}
              <span dir="ltr">SCE {e.data.sceNo}</span> ·{' '}
              <span dir="ltr">{e.data.expiresAt.toDate().toISOString().slice(0, 10)}</span>
            </span>
            <Button
              variant={e.data.verified ? 'ghost' : 'quiet'}
              onClick={() => onToggle(`offices/${officeId}/engineers/${e.id}`, !e.data.verified)}
            >
              {e.data.verified ? t('admin.unverify') : t('admin.verify')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
