'use client';

import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  PRODUCT_SECTIONS,
  SECTION_ROLES,
  type ProductSection,
  type SelfServiceRole,
} from '@rasikh/shared';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { VerifyEmailBanner } from '@/components/ops/VerifyEmailBanner';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import { useRouter } from '@/i18n/navigation';
import { firebaseFunctions } from '@/lib/firebase';
import { PREF, readPref, writePref } from '@/lib/prefs';
import { readClaims, useUser } from '@/lib/use-user';

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const router = useRouter();
  const user = useUser();

  const [section, setSection] = useState<ProductSection>();
  const [roles, setRoles] = useState<SelfServiceRole[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user === null) router.replace('/auth');
    // ?new=1 (account menu): someone already in a workspace creates another one
    else if (user && new URLSearchParams(location.search).get('new') !== '1')
      void readClaims(user).then((c) => Object.keys(c.orgs).length && router.replace('/workspace'));
  }, [user, router]);

  // the section picked on the landing page (or ?section=) comes through sign-in in a device preference
  useEffect(() => {
    const asked = new URLSearchParams(location.search).get('section') ?? readPref(PREF.section);
    const found = PRODUCT_SECTIONS.find((x) => x === asked);
    if (found) choose(found);
  }, []);

  const choose = (s: ProductSection) => {
    setSection(s);
    const list = SECTION_ROLES[s];
    setRoles(list.length === 1 ? [...list] : []);
  };

  const toggle = (r: SelfServiceRole) =>
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const submit = async () => {
    setError(undefined);
    if (roles.length === 0) return setError(t('errors.pickRole'));
    if (!consent) return setError(t('errors.needConsent'));
    setBusy(true);
    try {
      const res = await httpsCallable<unknown, { orgId: string }>(
        firebaseFunctions(),
        'createOrganization',
      )({
        name: orgName,
        displayName,
        roles,
        section,
        consentPdpl: true,
        locale,
      });
      writePref(PREF.org, res.data.orgId); // open the workspace just created
      writePref(PREF.section, null);
      if (user) await readClaims(user, true); // pick up the new custom claims
      router.push('/workspace');
    } catch (e) {
      setError(
        e instanceof FirebaseError && e.code === 'functions/resource-exhausted'
          ? t('errors.tooMany')
          : t('errors.generic'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-theme="dark" className="clear min-h-dvh">
      <SiteHeader />
      <div className="mx-auto mt-6 max-w-xl px-6">
        <VerifyEmailBanner />
      </div>
      <main
        id="main"
        tabIndex={-1}
        className="outline-none panel mx-auto my-10 flex max-w-xl flex-col gap-8 p-6 md:p-10"
      >
        {!section ? (
          <>
            <div>
              <h1 className="text-h2 font-semibold">{t('pickSection')}</h1>
              <p className="mt-2 text-text-muted">{t('pickSectionHint')}</p>
            </div>
            <ul className="flex flex-col gap-3">
              {PRODUCT_SECTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => choose(s)}
                    className="hairline flex min-h-14 w-full items-center justify-between gap-4 rounded-lg px-4 py-3 text-start transition-colors duration-200 hover:border-brand"
                  >
                    <span className="text-body font-medium">{t(`sections.${s}`)}</span>
                    <span className="text-caption text-brand-text">{t('free')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-h2 font-semibold">{t(`sections.${section}`)}</h1>
              <p className="mt-2 text-text-muted">
                {t('subtitle')} · {t('free')}
              </p>
              <button
                type="button"
                onClick={() => setSection(undefined)}
                className="mt-2 text-small text-brand-text underline"
              >
                {t('changeSection')}
              </button>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">{t('title')}</legend>
              {SECTION_ROLES[section].map((r) => {
                const on = roles.includes(r);
                return (
                  <label
                    key={r}
                    className={`hairline flex min-h-14 cursor-pointer items-center gap-4 rounded-lg px-4 py-3 transition-colors duration-200 ${
                      on ? 'border-brand bg-surface' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(r)}
                      className="size-5 accent-[var(--rk-brand)]"
                    />
                    <span className="flex flex-col">
                      <span className="text-body font-medium">{t(`roles.${r}`)}</span>
                      <span className="text-caption text-text-muted">{t(`roleHints.${r}`)}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <Field
              id="displayName"
              label={t('displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
            <Field
              id="orgName"
              label={t('orgName')}
              hint={t('orgNameHint')}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />

            <label className="flex items-start gap-3 text-small text-text-muted">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 size-5 accent-[var(--rk-brand)]"
              />
              <span>{t('consent')}</span>
            </label>

            {error && (
              <p role="alert" className="text-small text-danger">
                {error}
              </p>
            )}
            <Button
              onClick={() => void submit()}
              disabled={busy || orgName.trim().length < 2 || displayName.trim().length < 2}
            >
              {t('submit')}
            </Button>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
