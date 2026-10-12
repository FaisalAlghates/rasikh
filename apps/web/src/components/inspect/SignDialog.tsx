'use client';

import type { SignParty } from '@rasikh/shared';
import {
  EmailAuthProvider,
  RecaptchaVerifier,
  reauthenticateWithCredential,
  reauthenticateWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Input';
import { firebaseAuth, firebaseFunctions } from '@/lib/firebase';

const KNOWN = new Set([
  'recent_login_required',
  'checklist_incomplete',
  'evidence_missing',
  'media_hash_mismatch',
  'owner_must_sign_first',
  'already_signed',
  'already_sealed',
  'content_changed',
  'move_in_not_sealed',
  'not_a_party',
  'same_person',
]);

/**
 * Signing needs a fresh proof of identity: a one-time SMS code for phone accounts, the password for
 * email accounts. The server also checks that the sign-in is recent, so this step cannot be skipped.
 */
export function SignDialog({
  orgId,
  inspectionId,
  party,
  disabled,
  onDone,
}: {
  orgId: string;
  inspectionId: string;
  party: SignParty;
  disabled?: boolean;
  onDone?: (status: 'pending_signatures' | 'sealed') => void;
}) {
  const t = useTranslations('inspect');
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const confirmation = useRef<ConfirmationResult | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);

  const user = open ? firebaseAuth().currentUser : null;
  const usesPassword = !!user?.providerData.some((p) => p.providerId === 'password');
  const usesPhone = !usesPassword && !!user?.phoneNumber;

  useEffect(() => () => verifier.current?.clear(), []);

  // Duck-typed on purpose: SDK errors can come from a different copy of the Firebase error class.
  const fail = (e: unknown) => {
    const { code = '', message = '' } = (e ?? {}) as { code?: string; message?: string };
    if (code.startsWith('functions/')) {
      // The SDK appends the HTTP status: "media_hash_mismatch [400]".
      const key = message.replace(/\s*\[\d+\]$/, '');
      setError(KNOWN.has(key) ? t(`err_${key}`) : t('errGeneric'));
    } else if (code.startsWith('auth/')) {
      setError(t('errAuth'));
    } else setError(t('errGeneric'));
  };
  const sign = async () => {
    const auth = firebaseAuth();
    await auth.currentUser?.getIdToken(true); // carry the fresh auth_time to the server
    const res = await httpsCallable<unknown, { status: 'pending_signatures' | 'sealed' }>(
      firebaseFunctions(),
      'signInspection',
    )({ orgId, inspectionId });
    setOpen(false);
    onDone?.(res.data.status);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const withPassword = () =>
    run(async () => {
      const u = firebaseAuth().currentUser;
      if (!u?.email) throw new Error('no email');
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
      setPassword('');
      await sign();
    });

  const sendCode = () =>
    run(async () => {
      const auth = firebaseAuth();
      const u = auth.currentUser;
      if (!u?.phoneNumber) throw new Error('no phone');
      verifier.current ??= new RecaptchaVerifier(auth, 'sign-recaptcha', { size: 'invisible' });
      confirmation.current = await reauthenticateWithPhoneNumber(
        u,
        u.phoneNumber,
        verifier.current,
      );
      setCodeSent(true);
    });

  const withCode = () =>
    run(async () => {
      await confirmation.current?.confirm(code);
      setCode('');
      await sign();
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(undefined);
      }}
      title={party === 'owner' ? t('signAsOwner') : t('signAsTenant')}
      description={t('signExplain')}
      trigger={
        <Button disabled={disabled} data-testid={`sign-${party}`}>
          {party === 'owner' ? t('signAsOwner') : t('signAsTenant')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {usesPassword && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void withPassword();
            }}
          >
            <Field
              id="sign-password"
              type="password"
              autoComplete="current-password"
              label={t('confirmPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
            />
            <Button
              type="submit"
              loading={busy}
              disabled={password.length < 6}
              data-testid="sign-confirm"
            >
              {t('confirmAndSign')}
            </Button>
          </form>
        )}
        {usesPhone &&
          (codeSent ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void withCode();
              }}
            >
              <Field
                id="sign-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                label={t('smsCode')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                dir="ltr"
              />
              <Button
                type="submit"
                loading={busy}
                disabled={code.length < 6}
                data-testid="sign-confirm"
              >
                {t('confirmAndSign')}
              </Button>
            </form>
          ) : (
            <Button onClick={() => void sendCode()} loading={busy} data-testid="sign-send-code">
              {t('sendCode')}
            </Button>
          ))}
        <div id="sign-recaptcha" />
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
        <p className="text-caption text-text-muted">{t('signLegal')}</p>
      </div>
    </Dialog>
  );
}
