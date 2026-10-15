'use client';

import { CheckCircle2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { usePathname } from '@/i18n/navigation';

const YES = ['clear', 'found', 'easy'] as const;
const NO = ['unclear', 'missing', 'technical', 'other'] as const;

/**
 * DGA rating section: "Was this page helpful?" with yes/no, optional reasons and a note,
 * then a confirmation. Stored anonymously (no account, no personal data) in `siteFeedback`.
 */
export function PageFeedback() {
  const t = useTranslations('nav.feedback');
  const locale = useLocale();
  const pathname = usePathname();
  const id = useId();
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async () => {
    if (helpful === null) return;
    setState('sending');
    try {
      const [{ addDoc, collection, serverTimestamp }, { firebaseDb }] = await Promise.all([
        import('firebase/firestore'),
        import('@/lib/firebase'),
      ]);
      await addDoc(collection(firebaseDb(), 'siteFeedback'), {
        page: pathname.slice(0, 120) || '/',
        helpful,
        reasons,
        comment: comment.trim().slice(0, 500),
        locale,
        createdAt: serverTimestamp(),
      });
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <section
        data-testid="page-feedback"
        className="hairline mt-16 flex items-center gap-3 rounded-xl bg-surface p-5"
      >
        <CheckCircle2 size={22} aria-hidden="true" className="shrink-0 text-success" />
        <p role="status" className="text-body">
          {t('thanks')}
        </p>
      </section>
    );
  }

  const options = helpful ? YES : NO;
  return (
    <section
      data-testid="page-feedback"
      aria-labelledby={`${id}-q`}
      className="hairline mt-16 flex flex-col gap-4 rounded-xl bg-surface p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id={`${id}-q`} className="text-body font-semibold">
          {t('question')}
        </h2>
        <div className="flex gap-2">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={helpful === v}
              onClick={() => {
                setHelpful(v);
                setReasons([]);
              }}
              className={cn(
                'hairline inline-flex min-h-11 min-w-24 items-center justify-center gap-2 rounded-md px-4 text-small transition-colors duration-200',
                helpful === v ? 'bg-brand text-on-brand' : 'text-text hover:bg-bg',
              )}
            >
              {v ? (
                <ThumbsUp size={16} aria-hidden="true" />
              ) : (
                <ThumbsDown size={16} aria-hidden="true" />
              )}
              {v ? t('yes') : t('no')}
            </button>
          ))}
        </div>
      </div>

      {helpful !== null && (
        <form
          className="rise-in flex flex-col gap-4 border-t border-border/20 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-small font-semibold">
              {helpful ? t('whyYes') : t('whyNo')}
            </legend>
            {options.map((r) => (
              <label key={r} className="flex min-h-11 items-center gap-3 text-small">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--rk-brand)]"
                  checked={reasons.includes(r)}
                  onChange={(e) =>
                    setReasons((x) => (e.target.checked ? [...x, r] : x.filter((y) => y !== r)))
                  }
                />
                {t(`reason.${r}`)}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-c`} className="text-small font-semibold">
              {t('comment')}
            </label>
            <textarea
              id={`${id}-c`}
              rows={3}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              aria-describedby={`${id}-h`}
              className="hairline rounded-md bg-bg p-3 text-body"
            />
            <p id={`${id}-h`} className="text-caption text-text-muted">
              {t('commentHint')}
            </p>
          </div>
          {state === 'error' && (
            <p role="alert" className="text-small text-danger">
              {t('error')}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={state === 'sending'}
              aria-busy={state === 'sending' || undefined}
              className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 text-small font-semibold text-on-brand hover:brightness-110 disabled:opacity-60"
            >
              {state === 'sending' ? t('sending') : t('submit')}
            </button>
            <button
              type="button"
              onClick={() => setHelpful(null)}
              className="hairline inline-flex min-h-11 items-center rounded-md px-5 text-small text-text hover:bg-bg"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
