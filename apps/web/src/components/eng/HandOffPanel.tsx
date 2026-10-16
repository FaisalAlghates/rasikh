'use client';

import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { BookMarked } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { useDocAt, type ProjectDoc, type VersionDoc } from '@/lib/eng/data';
import { firebaseDb } from '@/lib/firebase';
import { riyadhDay } from '@/lib/inspect/types';
import { useCollectionAt, type Row } from '@/lib/ops/hooks';
import type { PropertyDoc } from '@/lib/ops/types';
import { readClaims } from '@/lib/use-user';

/** orgs/{orgId}/designs/{projectId}: a released set linked to one of the organization's properties. */
export interface DesignLinkDoc {
  projectId: string;
  versionId: string;
  propertyId: string;
  title: string;
  officeName: string;
  versionLabel: string;
  sha256: string;
  releasedOn: string;
  linkedBy: string;
}

const STAFF = ['owner', 'manager', 'admin'];

/**
 * The client adds the released, approved set to the Property Health Record of one of their properties. The link
 * carries the set's fingerprint; the rules accept it only from the person who commissioned the design, for a
 * released set and an existing property of their organization.
 */
export function HandOffPanel({
  pid,
  project,
  officeName,
  version,
  user,
}: {
  pid: string;
  project: ProjectDoc;
  officeName: string;
  version: Row<VersionDoc>;
  user: User;
}) {
  const t = useTranslations('eng.handoff');
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>();
  const [orgId, setOrgId] = useState<string>();
  const [propertyId, setPropertyId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // the organizations where this person manages properties
  useEffect(() => {
    let on = true;
    void readClaims(user, true).then(async (c) => {
      const ids = Object.keys(c.orgs).filter((id) =>
        (c.orgs[id] ?? []).some((r) => STAFF.includes(r)),
      );
      const list = await Promise.all(
        ids.map(async (id) => {
          const snap = await getDoc(doc(firebaseDb(), 'orgs', id)).catch(() => null);
          return { id, name: (snap?.data()?.name as string | undefined) ?? id.slice(0, 6) };
        }),
      );
      if (!on) return;
      setOrgs(list);
      setOrgId((o) => o ?? list[0]?.id);
    });
    return () => {
      on = false;
    };
  }, [user]);

  const none = useMemo(() => [], []);
  const properties = useCollectionAt<PropertyDoc>(
    orgId ? `orgs/${orgId}/properties` : undefined,
    none,
    !!orgId,
  );
  const linked = useDocAt<DesignLinkDoc>(orgId ? `orgs/${orgId}/designs/${pid}` : undefined);
  const chosen = propertyId ?? properties.rows[0]?.id;

  const add = async () => {
    if (!orgId || !chosen) return;
    setBusy(true);
    setError(false);
    try {
      await setDoc(doc(firebaseDb(), `orgs/${orgId}/designs/${pid}`), {
        projectId: pid,
        versionId: version.id,
        propertyId: chosen,
        title: project.title.slice(0, 100),
        officeName: officeName.slice(0, 100),
        versionLabel: version.data.label.slice(0, 60),
        sha256: version.data.sha256,
        releasedOn: riyadhDay(version.data.releasedAt) ?? new Date().toISOString().slice(0, 10),
        linkedBy: user.uid,
        linkedAt: serverTimestamp(),
      });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="hairline flex flex-col gap-3 rounded-xl bg-surface p-4"
      aria-labelledby="handoff-h"
      data-testid="handoff"
    >
      <h2 id="handoff-h" className="flex items-center gap-2 text-body font-semibold">
        <BookMarked size={18} aria-hidden="true" className="text-brand-text" />
        {t('title')}
      </h2>
      {orgs === undefined ? null : orgs.length === 0 ? (
        <p className="text-small text-text-muted">
          {t('noWorkspace')}{' '}
          <Link href="/onboarding?new=1" className="font-semibold text-brand-text underline">
            {t('createWorkspace')}
          </Link>
        </p>
      ) : linked ? (
        <p className="text-small text-success" role="status" data-testid="handoff-done">
          {t('done', {
            property: properties.rows.find((p) => p.id === linked.propertyId)?.data.name ?? '',
          })}{' '}
          <Link href="/workspace?s=record" className="font-semibold underline">
            {t('openRecord')}
          </Link>
        </p>
      ) : (
        <>
          <p className="text-small text-text-muted">{t('lead')}</p>
          <div className="flex flex-wrap items-end gap-2">
            {orgs.length > 1 && (
              <label className="flex flex-col gap-1 text-small">
                {t('workspace')}
                <select
                  value={orgId}
                  onChange={(e) => {
                    setOrgId(e.target.value);
                    setPropertyId(undefined);
                  }}
                  className="hairline min-h-11 rounded-md bg-bg px-2"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {properties.rows.length > 0 ? (
              <>
                <label className="flex flex-col gap-1 text-small">
                  {t('property')}
                  <select
                    value={chosen}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="hairline min-h-11 rounded-md bg-bg px-2"
                  >
                    {properties.rows.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.data.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button onClick={() => void add()} loading={busy}>
                  {t('add')}
                </Button>
              </>
            ) : (
              !properties.loading && (
                <p className="text-small text-text-muted">
                  {t('noProperty')}{' '}
                  <Link href="/workspace?s=properties" className="font-semibold underline">
                    {t('addProperty')}
                  </Link>
                </p>
              )
            )}
          </div>
          {error && (
            <p role="alert" className="text-small text-danger">
              {t('failed')}
            </p>
          )}
        </>
      )}
    </section>
  );
}
