'use client';

import { builtUpArea, entryFromRelease } from '@rasikh/shared';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Library } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useDocAt, type ProjectDoc, type VersionDoc } from '@/lib/eng/data';
import { firebaseDb } from '@/lib/firebase';
import type { Row } from '@/lib/ops/hooks';

/**
 * The design library, on a released project: the client agrees (or no longer agrees) to share the design without
 * their data; with that consent the office lead adds it, as its pattern only or with the plan, credited to the office.
 * Other offices' engines then learn from it. Withdrawing the consent takes it out of the library.
 */
export function LibraryPanel({
  pid,
  project,
  version,
  officeName,
  isClient,
  isLead,
  uid,
}: {
  pid: string;
  project: ProjectDoc;
  version: Row<VersionDoc>;
  officeName: string;
  isClient: boolean;
  isLead: boolean;
  uid: string;
}) {
  const t = useTranslations('eng.library');
  const e = useTranslations('eng');
  const entry = useDocAt<Record<string, unknown>>(`designLibrary/${pid}`);
  const [share, setShare] = useState<'pattern' | 'plan'>('pattern');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  // the switch answers at once; it goes back if the save fails
  const [pending, setPending] = useState<boolean>();
  const consent = pending ?? project.libraryConsent === true;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
      setPending(undefined);
    } finally {
      setBusy(false);
    }
  };

  const setConsent = (on: boolean) => {
    setPending(on);
    return run(async () => {
      await updateDoc(doc(firebaseDb(), 'designProjects', pid), {
        libraryConsent: on,
        libraryConsentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // no longer agreeing takes the design out of the library
      if (!on) await deleteDoc(doc(firebaseDb(), 'designLibrary', pid));
    }).then(() => setPending((v) => (v === on ? v : undefined)));
  };

  const contribute = () =>
    run(async () => {
      const plan = version.data.plan;
      const data = entryFromRelease({
        officeId: project.officeId,
        officeName,
        // a generic title, never the project's own (it may carry the client's name)
        title: `${e(`type.${project.program.type}`)} · ${e('floors')} ${project.program.floors} · ${e(
          'bedrooms',
        )} ${project.program.bedrooms}`,
        city: project.plot.city,
        program: project.program,
        plan,
        builtUpM2: builtUpArea(plan),
        share,
      });
      if (!data) throw new Error('entry');
      await setDoc(doc(firebaseDb(), 'designLibrary', pid), {
        ...JSON.parse(JSON.stringify(data)),
        contributedBy: uid,
        createdAt: serverTimestamp(),
      });
    });

  if (!isClient && !isLead) return null;
  return (
    <section
      className="hairline flex flex-col gap-3 rounded-xl bg-surface p-4"
      aria-labelledby="library-h"
      data-testid="library-panel"
    >
      <h2 id="library-h" className="flex items-center gap-2 text-body font-semibold">
        <Library size={18} aria-hidden="true" className="text-brand-text" />
        {t('title')}
      </h2>
      {isClient && (
        <>
          <p className="text-small text-text-muted">{t('clientLead')}</p>
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(ev) => void setConsent(ev.target.checked)}
              className="size-5 accent-[var(--rk-brand)]"
            />
            {t('consent')}
          </label>
        </>
      )}
      {isLead &&
        (entry ? (
          <div
            className="flex flex-wrap items-center gap-2"
            role="status"
            data-testid="library-added"
          >
            <p className="text-small text-success">
              {t('added', { share: t(`share.${String(entry.share)}`) })}
            </p>
            <Button
              variant="ghost"
              loading={busy}
              onClick={() => void run(() => deleteDoc(doc(firebaseDb(), 'designLibrary', pid)))}
            >
              {t('remove')}
            </Button>
          </div>
        ) : consent ? (
          <div className="flex flex-col gap-2">
            <p className="text-small text-text-muted">{t('leadLead')}</p>
            <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
              <legend className="mb-1 text-small font-semibold">{t('shareLegend')}</legend>
              {(['pattern', 'plan'] as const).map((s) => (
                <label key={s} className="flex min-h-11 items-center gap-2 text-small">
                  <input
                    type="radio"
                    name="library-share"
                    checked={share === s}
                    onChange={() => setShare(s)}
                    className="size-5 accent-[var(--rk-brand)]"
                  />
                  {t(`share.${s}`)}
                </label>
              ))}
            </fieldset>
            <Button onClick={() => void contribute()} loading={busy} className="self-start">
              {t('add')}
            </Button>
          </div>
        ) : (
          <p className="text-small text-text-muted">{t('waiting')}</p>
        ))}
      {error && (
        <p role="alert" className="text-small text-danger">
          {t('failed')}
        </p>
      )}
    </section>
  );
}
