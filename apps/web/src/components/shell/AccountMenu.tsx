'use client';

import { signOut } from 'firebase/auth';
import {
  ChevronDown,
  CircleUserRound,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Map,
  ShieldCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { Link, useRouter } from '@/i18n/navigation';
import { firebaseAuth } from '@/lib/firebase';
import { ROUTES } from '@/lib/nav';
import { ROLE_ORDER, accessFor } from '@/lib/roles';
import { readClaims, useUser } from '@/lib/use-user';

/** Signed-in account menu: who you are, your roles, and the places your roles may go. */
export function AccountMenu() {
  const t = useTranslations('nav');
  const router = useRouter();
  const user = useUser();
  const [roles, setRoles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!user) return;
    let on = true;
    void readClaims(user).then((c) => {
      if (on) setRoles(Object.values(c.orgs)[0] ?? []);
    });
    return () => {
      on = false;
    };
  }, [user]);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const access = accessFor(roles);
  const ordered = ROLE_ORDER.filter((r) => roles.includes(r));
  const item =
    'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-small text-text hover:bg-bg';

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={t('account')}
        data-testid="account-menu"
        onClick={() => setOpen((o) => !o)}
        className="hairline inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-small text-text hover:bg-surface"
      >
        <CircleUserRound size={18} aria-hidden="true" />
        <span className="hidden sm:inline">{t('account')}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn('transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div
          id={id}
          className="search-pop hairline absolute end-0 top-full z-50 mt-2 w-72 rounded-xl bg-surface p-2 shadow-2xl"
          data-state="open"
        >
          <div className="border-b border-border/20 px-3 pb-3 pt-2">
            <p className="truncate text-small font-semibold" dir="ltr">
              {user.email ?? user.phoneNumber}
            </p>
            {ordered.length > 0 && (
              <>
                <p className="mt-2 text-caption text-text-muted">{t('rolesLabel')}</p>
                <ul className="mt-1 flex flex-wrap gap-1.5" data-testid="role-badges">
                  {ordered.map((r) => (
                    <li
                      key={r}
                      className="rounded-full bg-brand/15 px-2.5 py-0.5 text-caption font-semibold text-brand-text"
                    >
                      {t(`role.${r}`)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <ul className="flex flex-col gap-0.5 pt-2">
            <li>
              <Link href={ROUTES.workspace} className={item} onClick={() => setOpen(false)}>
                <LayoutGrid size={16} aria-hidden="true" className="text-brand-text" />
                {t('workspace')}
              </Link>
            </li>
            {access.seesPortfolioOnMap && (
              <li>
                <Link href={ROUTES.map} className={item} onClick={() => setOpen(false)}>
                  <Map size={16} aria-hidden="true" className="text-brand-text" />
                  {t('map')}
                </Link>
              </li>
            )}
            <li>
              <Link
                href={`${ROUTES.workspace}?s=privacy`}
                className={item}
                onClick={() => setOpen(false)}
              >
                <ShieldCheck size={16} aria-hidden="true" className="text-brand-text" />
                {t('section.privacy')}
              </Link>
            </li>
            <li>
              <Link href={ROUTES.help} className={item} onClick={() => setOpen(false)}>
                <HelpCircle size={16} aria-hidden="true" className="text-brand-text" />
                {t('help')}
              </Link>
            </li>
            <li className="mt-1 border-t border-border/20 pt-1">
              <button
                type="button"
                className={item}
                onClick={() => void signOut(firebaseAuth()).then(() => router.replace('/'))}
              >
                <LogOut size={16} aria-hidden="true" className="text-danger" />
                {t('signOut')}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
