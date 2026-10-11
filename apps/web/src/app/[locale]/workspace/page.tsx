'use client';

import { signOut } from 'firebase/auth';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { firebaseAuth } from '@/lib/firebase';
import { readClaims, useUser, type OrgClaims } from '@/lib/use-user';

export default function WorkspacePage() {
  const t = useTranslations();
  const router = useRouter();
  const user = useUser();
  const [claims, setClaims] = useState<OrgClaims>();

  useEffect(() => {
    if (user === null) router.replace('/auth');
    else if (user) void readClaims(user).then(setClaims);
  }, [user, router]);

  const orgs = Object.entries(claims?.orgs ?? {});

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-24 pt-10">
        <h1 className="text-h2 font-semibold">{t('workspace.title')}</h1>
        {claims === undefined ? (
          <p className="text-text-muted">{t('common.loading')}</p>
        ) : orgs.length === 0 ? (
          <p className="text-text-muted">{t('workspace.noOrg')}</p>
        ) : (
          <>
            <p className="text-text-muted">{t('workspace.ready')}</p>
            <ul className="flex flex-col gap-3" data-testid="org-list">
              {orgs.map(([id, roles]) => (
                <li key={id} className="hairline flex flex-wrap items-center gap-2 rounded-lg p-4">
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-sm bg-surface px-2 py-1 text-caption text-brand-text"
                    >
                      {t(`onboarding.roles.${r}` as 'onboarding.roles.owner')}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </>
        )}
        <div>
          <Button
            variant="quiet"
            onClick={() => void signOut(firebaseAuth()).then(() => router.replace('/'))}
          >
            {t('common.signOut')}
          </Button>
        </div>
      </main>
    </>
  );
}
