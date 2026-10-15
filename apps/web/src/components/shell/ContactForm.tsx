'use client';

import { CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';

const TOPICS = ['question', 'problem', 'idea', 'privacy', 'accessibility'] as const;
type Field = 'name' | 'email' | 'message' | 'consent';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * DGA contact + form templates: labelled fields, an error summary that takes focus, inline errors
 * tied to each field, and a confirmation with a reference. Stored create-only in `siteMessages`.
 */
export function ContactForm() {
  const t = useTranslations('pages.contact');
  const locale = useLocale();
  const [v, setV] = useState({
    name: '',
    email: '',
    topic: 'question' as (typeof TOPICS)[number],
    message: '',
    consent: false,
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [ref, setRef] = useState<string>();
  const summary = useRef<HTMLDivElement>(null);

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    if (!v.name.trim()) e.name = t('errName');
    if (!EMAIL.test(v.email.trim())) e.email = t('errEmail');
    if (v.message.trim().length < 10) e.message = t('errMessage');
    if (!v.consent) e.consent = t('errConsent');
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    setState('sending');
    try {
      const [{ addDoc, collection, serverTimestamp }, { firebaseDb }] = await Promise.all([
        import('firebase/firestore'),
        import('@/lib/firebase'),
      ]);
      const doc = await addDoc(collection(firebaseDb(), 'siteMessages'), {
        name: v.name.trim().slice(0, 80),
        email: v.email.trim().slice(0, 120),
        topic: v.topic,
        message: v.message.trim().slice(0, 2000),
        consent: true,
        locale,
        createdAt: serverTimestamp(),
      });
      setRef(doc.id.slice(0, 8).toUpperCase());
      setState('idle');
    } catch {
      setState('error');
    }
  };

  if (ref) {
    return (
      <div
        data-testid="contact-sent"
        className="hairline flex flex-col items-start gap-4 rounded-xl bg-surface p-6"
      >
        <CheckCircle2 size={28} aria-hidden="true" className="text-success" />
        <h2 className="text-h3 font-semibold" role="status">
          {t('sent')}
        </h2>
        <p className="text-body text-text-muted">{t('sentBody', { ref })}</p>
        <button
          type="button"
          onClick={() => {
            setRef(undefined);
            setV({ name: '', email: '', topic: 'question', message: '', consent: false });
          }}
          className="hairline inline-flex min-h-11 items-center rounded-md px-5 text-small text-text hover:bg-bg"
        >
          {t('another')}
        </button>
      </div>
    );
  }

  const fieldCls = (f: Field) =>
    cn('hairline w-full rounded-md bg-bg px-3 text-body', errors[f] && 'border-danger');
  const err = (f: Field) =>
    errors[f] ? (
      <p id={`c-${f}-err`} className="text-small text-danger">
        {errors[f]}
      </p>
    ) : null;
  const described = (f: Field, extra?: string) =>
    [errors[f] ? `c-${f}-err` : '', extra ?? ''].filter(Boolean).join(' ') || undefined;
  const entries = Object.entries(errors) as Array<[Field, string]>;

  return (
    <form
      noValidate
      aria-labelledby="contact-form-title"
      className="hairline flex flex-col gap-5 rounded-xl bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <h2 id="contact-form-title" className="text-h3 font-semibold">
          {t('formTitle')}
        </h2>
        <p className="text-small text-text-muted">{t('required')}</p>
      </div>

      {entries.length > 0 && (
        <div
          ref={summary}
          tabIndex={-1}
          role="alert"
          data-testid="error-summary"
          className="rounded-md border-s-4 border-danger bg-bg p-4 outline-none"
        >
          <p className="text-small font-semibold">{t('errorSummary')}</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-small">
            {entries.map(([f, msg]) => (
              <li key={f}>
                <a href={`#c-${f}`} className="text-danger underline underline-offset-4">
                  {msg}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-name" className="text-small font-semibold">
            {t('name')} *
          </label>
          <input
            id="c-name"
            autoComplete="name"
            maxLength={80}
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            aria-invalid={!!errors.name}
            aria-describedby={described('name')}
            className={cn(fieldCls('name'), 'min-h-12')}
          />
          {err('name')}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-email" className="text-small font-semibold">
            {t('email')} *
          </label>
          <input
            id="c-email"
            type="email"
            dir="ltr"
            autoComplete="email"
            maxLength={120}
            value={v.email}
            onChange={(e) => setV({ ...v, email: e.target.value })}
            aria-invalid={!!errors.email}
            aria-describedby={described('email')}
            className={cn(fieldCls('email'), 'min-h-12 text-start')}
          />
          {err('email')}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-topic" className="text-small font-semibold">
          {t('topic')}
        </label>
        <select
          id="c-topic"
          value={v.topic}
          onChange={(e) => setV({ ...v, topic: e.target.value as (typeof TOPICS)[number] })}
          className="hairline min-h-12 rounded-md bg-bg px-3 text-body"
        >
          {TOPICS.map((k) => (
            <option key={k} value={k}>
              {t(`topics.${k}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-message" className="text-small font-semibold">
          {t('message')} *
        </label>
        <textarea
          id="c-message"
          rows={6}
          maxLength={2000}
          value={v.message}
          onChange={(e) => setV({ ...v, message: e.target.value })}
          aria-invalid={!!errors.message}
          aria-describedby={described('message', 'c-message-hint')}
          className={cn(fieldCls('message'), 'py-3')}
        />
        <p id="c-message-hint" className="text-caption text-text-muted">
          {t('messageHint')} <span className="tabular">({v.message.length}/2000)</span>
        </p>
        {err('message')}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 items-start gap-3 text-small">
          <input
            id="c-consent"
            type="checkbox"
            checked={v.consent}
            onChange={(e) => setV({ ...v, consent: e.target.checked })}
            aria-invalid={!!errors.consent}
            aria-describedby={described('consent')}
            className="mt-0.5 size-5 shrink-0 accent-[var(--rk-brand)]"
          />
          {t('consent')}
        </label>
        {err('consent')}
      </div>

      {state === 'error' && (
        <p role="alert" className="text-small text-danger">
          {t('failed')}
        </p>
      )}
      <button
        type="submit"
        disabled={state === 'sending'}
        aria-busy={state === 'sending' || undefined}
        className="inline-flex min-h-12 items-center justify-center self-start rounded-md bg-brand px-7 text-body font-semibold text-on-brand hover:brightness-110 disabled:opacity-60"
      >
        {state === 'sending' ? t('sending') : t('send')}
      </button>
    </form>
  );
}
