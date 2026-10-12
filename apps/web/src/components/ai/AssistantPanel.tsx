'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, NativeSelect } from '@/components/ui/Input';
import type { Row } from '@/lib/ops/hooks';
import type { LeaseDoc } from '@/lib/ops/types';
import { AiAnswer } from './AiAnswer';
import { useAssist } from './useAssist';

/** Free question plus "explain this lease". Answers come from the person's own records, server-side. */
export function AssistantPanel({ orgId, leases }: { orgId: string; leases: Row<LeaseDoc>[] }) {
  const t = useTranslations('ai');
  const [q, setQ] = useState('');
  const [leaseId, setLeaseId] = useState('');
  const ask = useAssist(orgId);
  const explain = useAssist(orgId);
  const pick = leaseId || leases[0]?.id || '';

  return (
    <div className="flex flex-col gap-6" data-testid="assistant-panel">
      <p className="text-small text-text-muted">{t('intro')}</p>
      <Card className="flex flex-col gap-3">
        <form
          className="flex flex-col gap-3"
          aria-label={t('question')}
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim().length >= 2) void ask.run('assistant', { question: q.trim() });
          }}
        >
          <Field id="ai-q" label={t('question')} value={q} onChange={(e) => setQ(e.target.value)} />
          <div>
            <Button type="submit" loading={ask.busy}>
              {ask.busy ? t('sending') : t('send')}
            </Button>
          </div>
        </form>
        <AiAnswer result={ask.result} error={ask.error} />
      </Card>

      {leases.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h3 className="text-body font-semibold">{t('explainLease')}</h3>
          <NativeSelect
            id="ai-lease"
            label={t('pickLease')}
            value={pick}
            onChange={(e) => setLeaseId(e.target.value)}
            options={leases.map((l) => ({
              value: l.id,
              label: [l.data.propertyName, l.data.unitLabel, l.data.ejarContractNo]
                .filter(Boolean)
                .join(' · '),
            }))}
          />
          <div>
            <Button
              variant="quiet"
              loading={explain.busy}
              onClick={() => void explain.run('explainLease', { leaseId: pick })}
            >
              {t('explainSend')}
            </Button>
          </div>
          <AiAnswer result={explain.result} error={explain.error} />
        </Card>
      )}
    </div>
  );
}
