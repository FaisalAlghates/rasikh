'use client';

import { Cookie } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { PREF, readPref, writePref } from '@/lib/prefs';

/**
 * DGA cookie banner. Rasikh sets essential storage only, so there is nothing to accept or reject:
 * the banner informs, links to the policy, and stays dismissed on this device.
 */
export function CookieNotice() {
  const t = useTranslations('nav');
  const [show, setShow] = useState(false);
  useEffect(() => setShow(readPref(PREF.cookie) !== '1'), []);
  if (!show) return null;
  return (
    <section
      aria-label={t('cookie.title')}
      data-testid="cookie-notice"
      className="rise-in hairline fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-col gap-3 rounded-xl bg-surface p-4 text-text shadow-2xl sm:flex-row sm:items-center sm:gap-5 sm:p-5"
    >
      <Cookie size={22} aria-hidden="true" className="hidden shrink-0 text-brand-text sm:block" />
      <div className="flex-1">
        <h2 className="text-small font-semibold">{t('cookie.title')}</h2>
        <p className="text-small text-text-muted">
          {t('cookie.body')}{' '}
          <Link href="/privacy#cookies" className="text-brand-text underline underline-offset-4">
            {t('cookie.more')}
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          writePref(PREF.cookie, '1');
          setShow(false);
        }}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-brand px-5 text-small font-semibold text-on-brand hover:brightness-110"
      >
        {t('cookie.accept')}
      </button>
    </section>
  );
}
