'use client';

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  type User,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Input';
import { Link, useRouter } from '@/i18n/navigation';
import { firebaseAuth, firebaseFunctions } from '@/lib/firebase';

/** PDPL rights: download everything held about me, and delete my account (after a fresh password sign-in). */
export function PrivacyPanel({ user }: { user: User }) {
  const t = useTranslations('account');
  const router = useRouter();
  const [busy, setBusy] = useState<'export' | 'delete'>();
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [password, setPassword] = useState('');
  const [sure, setSure] = useState(false);
  const hasPassword = user.providerData.some((p) => p.providerId === 'password');

  const download = async () => {
    setBusy('export');
    setMsg(undefined);
    try {
      const r = await httpsCallable<unknown, unknown>(firebaseFunctions(), 'exportMyData')();
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'rasikh-my-data.json';
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg({ ok: true, text: t('exported') });
    } catch {
      setMsg({ ok: false, text: t('failed') });
    } finally {
      setBusy(undefined);
    }
  };

  const remove = async () => {
    if (!user.email) return;
    setBusy('delete');
    setMsg(undefined);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    } catch {
      setBusy(undefined);
      return setMsg({ ok: false, text: t('wrongPassword') });
    }
    try {
      await user.getIdToken(true); // carries the fresh sign-in time to the server
      await httpsCallable(firebaseFunctions(), 'deleteMyAccount')();
      await signOut(firebaseAuth());
      router.replace('/');
    } catch (e) {
      const m = (e as { message?: string }).message ?? '';
      setMsg({ ok: false, text: m.includes('transfer_ownership_first') ? t('transfer') : t('failed') });
      setBusy(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-testid="privacy-panel">
      <p className="text-small text-text-muted">
        {t('intro')}{' '}
        <Link href="/privacy" className="text-brand-text underline">
          {t('policy')}
        </Link>
      </p>
      <Card className="flex flex-col gap-3">
        <Button variant="quiet" loading={busy === 'export'} onClick={() => void download()}>
          {busy === 'export' ? t('exporting') : t('export')}
        </Button>
      </Card>
      <Card className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-danger">{t('deleteTitle')}</h3>
        <p className="text-small text-text-muted">{t('deleteWarn')}</p>
        {hasPassword ? (
          <form
            className="flex flex-col gap-3"
            aria-label={t('deleteTitle')}
            onSubmit={(e) => {
              e.preventDefault();
              if (sure && password) void remove();
            }}
          >
            <Field
              id="del-pw"
              type="password"
              autoComplete="current-password"
              label={t('password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="flex items-center gap-2 text-small">
              <input
                id="del-sure"
                type="checkbox"
                checked={sure}
                onChange={(e) => setSure(e.target.checked)}
              />
              {t('confirm')}
            </label>
            <div>
              <Button type="submit" loading={busy === 'delete'} disabled={!sure || !password}>
                {t('delete')}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-small">{t('phoneNote')}</p>
        )}
      </Card>
      {msg && (
        <p role="status" className={msg.ok ? 'text-small text-success' : 'text-small text-danger'}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
