'use client';

import { httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { firebaseFunctions } from '@/lib/firebase';

export type AiFeature =
  | 'explainLease'
  | 'compareInspections'
  | 'triageTicket'
  | 'adHelper'
  | 'buildingSummary'
  | 'assistant';

export interface AiOk {
  ok: true;
  ai: true;
  label: string;
  text: string;
  citations: { label: string; path: string }[];
  suggestion?: Record<string, unknown>;
  disclaimers: string[];
}
export interface AiRefused {
  ok: false;
  refused: string;
  message: string;
}
export type AiResult = AiOk | AiRefused;
export type AiErrorKey = 'limitDaily' | 'limitMonthly' | 'unavailable' | 'notAllowed' | 'failed';

/** Calls the server-side AI entry. Nothing is applied here: the caller shows the answer and waits for a tap. */
export function useAssist(orgId: string) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiResult>();
  const [error, setError] = useState<AiErrorKey>();

  const run = async (feature: AiFeature, input: Record<string, unknown>) => {
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const r = await httpsCallable<unknown, AiResult>(firebaseFunctions(), 'aiAssist')({
        orgId,
        feature,
        input,
      });
      setResult(r.data);
      return r.data;
    } catch (e) {
      const msg = (e as { message?: string; code?: string }).message ?? '';
      const code = (e as { code?: string }).code ?? '';
      setError(
        msg.includes('daily_limit')
          ? 'limitDaily'
          : msg.includes('monthly_cap')
            ? 'limitMonthly'
            : code.endsWith('unavailable')
              ? 'unavailable'
              : code.endsWith('permission-denied')
                ? 'notAllowed'
                : 'failed',
      );
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  return { busy, result, error, run };
}
