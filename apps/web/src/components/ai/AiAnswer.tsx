'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { AiErrorKey, AiResult } from './useAssist';

/**
 * Every AI output is visibly marked (CLAUDE.md §7): a badge with the server's label, the sources it drew on and any
 * disclaimer. A refusal is shown as the polite Arabic message the server sent, never as an answer.
 */
export function AiAnswer({
  result,
  error,
  children,
}: {
  result?: AiResult;
  error?: AiErrorKey;
  children?: ReactNode;
}) {
  const t = useTranslations('ai');
  if (error) {
    return (
      <p role="alert" className="text-small text-danger" data-testid="ai-error">
        {t(error)}
      </p>
    );
  }
  if (!result) return null;
  if (!result.ok) {
    return (
      <p role="status" className="text-small text-warning" data-testid="ai-refused">
        {result.message}
      </p>
    );
  }
  return (
    <div
      data-testid="ai-answer"
      className="hairline flex flex-col gap-3 rounded-md border-s-4 border-brand bg-surface p-4"
    >
      <span
        data-testid="ai-badge"
        className="w-fit rounded-sm bg-brand px-2 py-0.5 text-caption font-semibold text-on-brand"
      >
        {result.label}
      </span>
      <p className="whitespace-pre-line text-body">{result.text}</p>
      {result.citations.length > 0 && (
        <p className="text-caption text-text-muted">
          {t('citations')}: {result.citations.map((c) => c.label).join(' · ')}
        </p>
      )}
      {result.disclaimers.map((d) => (
        <p key={d} data-testid="ai-disclaimer" className="text-caption text-warning">
          {d}
        </p>
      ))}
      {children}
    </div>
  );
}
