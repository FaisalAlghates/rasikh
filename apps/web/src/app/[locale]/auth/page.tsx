'use client';

import {
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { SaudiPhoneSchema } from '@rasikh/shared';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import { useRouter } from '@/i18n/navigation';
import { firebaseAuth } from '@/lib/firebase';

type Tab = 'phone' | 'email';

export default function AuthPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('phone');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // phone
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const confirmation = useRef<ConfirmationResult | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const verifier = useRef<RecaptchaVerifier | null>(null);

  // email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => () => verifier.current?.clear(), []);

  const fail = (e: unknown) => {
    const c = e instanceof FirebaseError ? e.code : '';
    setError(
      c === 'auth/invalid-verification-code'
        ? t('errors.invalidCode')
        : c === 'auth/invalid-credential' ||
            c === 'auth/wrong-password' ||
            c === 'auth/user-not-found'
          ? t('errors.invalidCredentials')
          : c === 'auth/email-already-in-use'
            ? t('errors.emailInUse')
            : c === 'auth/weak-password'
              ? t('errors.weakPassword')
              : c === 'auth/too-many-requests'
                ? t('errors.tooMany')
                : t('errors.generic'),
    );
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

  const sendCode = () =>
    run(async () => {
      const e164 = '+966' + phone.replace(/\D/g, '').replace(/^0/, '');
      if (!SaudiPhoneSchema.safeParse(e164).success) {
        setError(t('errors.invalidPhone'));
        return;
      }
      const auth = firebaseAuth();
      verifier.current ??= new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      confirmation.current = await signInWithPhoneNumber(auth, e164, verifier.current);
      setCodeSent(true);
    });

  const verifyCode = () =>
    run(async () => {
      await confirmation.current?.confirm(code);
      router.push('/onboarding');
    });

  const submitEmail = () =>
    run(async () => {
      const auth = firebaseAuth();
      if (creating) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      router.push('/onboarding');
    });

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 pb-24 pt-10">
        <div>
          <h1 className="text-h2 font-semibold">{t('title')}</h1>
          <p className="mt-2 text-text-muted">{t('subtitle')}</p>
        </div>

        <div role="tablist" className="hairline flex rounded-md p-1">
          {(['phone', 'email'] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => {
                setTab(k);
                setError(undefined);
              }}
              className={`min-h-10 flex-1 rounded-sm text-small transition-colors duration-200 ${
                tab === k ? 'bg-surface text-text' : 'text-text-muted'
              }`}
            >
              {t(k === 'phone' ? 'tabPhone' : 'tabEmail')}
            </button>
          ))}
        </div>

        {tab === 'phone' ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void (codeSent ? verifyCode() : sendCode());
            }}
          >
            <div className="flex items-end gap-2">
              <span className="hairline tabular flex min-h-11 items-center rounded-md px-3 text-text-muted">
                +966
              </span>
              <div className="flex-1">
                <Field
                  id="phone"
                  label={t('phoneLabel')}
                  hint={t('phoneHint')}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={codeSent}
                  dir="ltr"
                  className="tabular"
                />
              </div>
            </div>
            {codeSent && (
              <div>
                <Field
                  id="code"
                  dir="ltr"
                  label={t('codeLabel')}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            )}
            {error && (
              <p role="alert" className="text-small text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {codeSent ? t('verify') : t('sendCode')}
            </Button>
            <div id="recaptcha-container" />
          </form>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitEmail();
            }}
          >
            <Field
              id="email"
              type="email"
              label={t('emailLabel')}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
            <Field
              id="password"
              type="password"
              label={t('passwordLabel')}
              autoComplete={creating ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
            />
            {error && (
              <p role="alert" className="text-small text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {creating ? t('createAccount') : t('signIn')}
            </Button>
            <button
              type="button"
              onClick={() => setCreating((c) => !c)}
              className="text-small text-brand-text"
            >
              {creating ? t('toSignIn') : t('toCreate')}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
