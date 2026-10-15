'use client';

import { sendEmailVerification } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { firebaseFunctions } from '@/lib/firebase';
import { useUser } from '@/lib/use-user';

/** Invites only attach to a verified email, so unverified email accounts are asked to verify. */
export function VerifyEmailBanner() {
  const t = useTranslations('ops');
  const user = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!user?.email || user.emailVerified) return null;

  const recheck = async () => {
    setBusy(true);
    try {
      await user.reload();
      await user.getIdToken(true);
      await httpsCallable(firebaseFunctions(), 'claimInvites')();
      await user.getIdToken(true);
      router.refresh();
      window.location.assign(window.location.pathname);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      data-testid="verify-banner"
      className="hairline flex flex-wrap items-center gap-3 rounded-lg bg-surface p-4 text-small"
    >
      {/* Full width on phones (buttons wrap below); beside the buttons from the sm breakpoint. */}
      <span className="basis-full sm:basis-auto sm:flex-1">{t('verifyEmail')}</span>
      <Button variant="quiet" onClick={() => void sendEmailVerification(user)}>
        {t('resend')}
      </Button>
      <Button variant="quiet" loading={busy} onClick={() => void recheck()}>
        {t('recheck')}
      </Button>
    </div>
  );
}
