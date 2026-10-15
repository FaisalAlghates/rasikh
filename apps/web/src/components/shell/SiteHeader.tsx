'use client';

import * as RDialog from '@radix-ui/react-dialog';
import { LayoutGrid, Menu, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/components/ui/cn';
import { Link, usePathname } from '@/i18n/navigation';
import { HEADER_NAV, ROUTES, isCurrent } from '@/lib/nav';
import { PREF, readPref } from '@/lib/prefs';
import { SearchDialog } from './SearchDialog';

/**
 * The one header for the whole site (DGA navigation header: brand, primary links with a clear
 * current state, search, language, and the sign-in or workspace action; a drawer on small screens).
 * `overlay` sits transparently on the landing hero; `solid` is a sticky bar for every other page.
 * Pass `account` on signed-in pages to show the account menu instead of the sign-in action.
 */
export function SiteHeader({
  variant = 'solid',
  account,
}: {
  variant?: 'overlay' | 'solid';
  account?: ReactNode;
}) {
  const t = useTranslations('nav');
  const c = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === 'ar' ? 'en' : 'ar';
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setSignedIn(readPref(PREF.signedIn) === '1'), []);
  // close the drawer after navigating
  useEffect(() => setOpen(false), [pathname]);

  const cta = signedIn ? (
    <Link
      href={ROUTES.workspace}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 text-small font-semibold text-on-brand transition-[filter] duration-200 hover:brightness-110"
    >
      <LayoutGrid size={16} aria-hidden="true" />
      {t('workspace')}
    </Link>
  ) : (
    <Link
      href={ROUTES.auth}
      className="inline-flex min-h-11 items-center rounded-md bg-brand px-4 text-small font-semibold text-on-brand transition-[filter] duration-200 hover:brightness-110"
    >
      {t('signIn')}
    </Link>
  );

  const langLink = (
    <Link
      href={pathname}
      locale={other}
      lang={other}
      className="hairline inline-flex min-h-11 items-center rounded-md px-3 text-small text-text-muted transition-colors duration-200 hover:text-text"
    >
      {c('switchLanguage')}
    </Link>
  );

  return (
    <header
      className={cn(
        'z-30 w-full',
        variant === 'solid' &&
          'sticky top-0 border-b border-border/20 bg-bg/95 supports-[backdrop-filter]:bg-bg/85 supports-[backdrop-filter]:backdrop-blur-md',
      )}
    >
      <div className="rk-container flex min-h-[4.5rem] items-center justify-between gap-4">
        <Link
          href={ROUTES.home}
          className="flex shrink-0 items-center gap-3 text-brand-text"
          aria-label={`${c('appName')} · ${t('home')}`}
        >
          <BrandMark size={28} />
          <span className="display-font text-h3 text-text">{c('appName')}</span>
        </Link>

        <nav aria-label={t('primary')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {HEADER_NAV.map((k) => {
              const href = ROUTES[k];
              const on = isCurrent(pathname, href);
              return (
                <li key={k}>
                  <Link
                    href={href}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-11 items-center rounded-md px-3 text-small transition-colors duration-200 hover:text-text',
                      on ? 'font-semibold text-text' : 'text-text-muted',
                      'after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-brand after:transition-transform after:duration-300 after:ease-rk',
                      on ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-50',
                    )}
                  >
                    {t(k)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <SearchDialog />
          <div className="hidden items-center gap-2 lg:flex">
            {langLink}
            <ThemeToggle />
            {!account && cta}
          </div>
          {account}

          {/* drawer for small screens */}
          <RDialog.Root open={open} onOpenChange={setOpen}>
            <RDialog.Trigger
              aria-label={t('openMenu')}
              className="hairline inline-flex size-11 items-center justify-center rounded-md text-text lg:hidden"
            >
              <Menu size={20} aria-hidden="true" />
            </RDialog.Trigger>
            <RDialog.Portal>
              <RDialog.Overlay className="drawer-overlay fixed inset-0 z-40 bg-night/60" />
              <RDialog.Content
                aria-describedby={undefined}
                className="drawer fixed inset-y-0 start-0 z-50 flex w-[min(86vw,22rem)] flex-col gap-6 overflow-y-auto bg-surface p-6 text-text"
              >
                <div className="flex items-center justify-between">
                  <RDialog.Title className="flex items-center gap-3 text-brand-text">
                    <BrandMark size={24} />
                    <span className="display-font text-h3 text-text">{t('menu')}</span>
                  </RDialog.Title>
                  <RDialog.Close
                    aria-label={c('close')}
                    className="inline-flex size-11 items-center justify-center rounded-md text-text-muted hover:text-text"
                  >
                    <X size={20} aria-hidden="true" />
                  </RDialog.Close>
                </div>
                <nav aria-label={t('primary')}>
                  <ul className="flex flex-col gap-1">
                    {HEADER_NAV.map((k) => {
                      const href = ROUTES[k];
                      const on = isCurrent(pathname, href);
                      return (
                        <li key={k}>
                          <Link
                            href={href}
                            aria-current={on ? 'page' : undefined}
                            className={cn(
                              'flex min-h-12 items-center rounded-md px-3 text-body',
                              on
                                ? 'bg-brand/10 font-semibold text-brand-text'
                                : 'text-text hover:bg-bg',
                            )}
                          >
                            {t(k)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="flex flex-wrap items-center gap-2 border-t border-border/20 pt-5">
                  {langLink}
                  <ThemeToggle />
                </div>
                {!account && <div className="[&>a]:w-full [&>a]:justify-center">{cta}</div>}
              </RDialog.Content>
            </RDialog.Portal>
          </RDialog.Root>
        </div>
      </div>
    </header>
  );
}
