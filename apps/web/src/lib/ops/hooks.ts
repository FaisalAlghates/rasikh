'use client';

import type { User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firebaseDb } from '@/lib/firebase';
import { readClaims, useUser } from '@/lib/use-user';

export interface Row<T> {
  id: string;
  data: T;
}

export interface Session {
  user: User;
  orgId: string;
  roles: string[];
  isStaff: boolean;
  isTenant: boolean;
}

/** The signed-in user plus their (first) organization and roles from the server-set claims. */
export function useSession(): {
  session?: Session;
  loading: boolean;
  signedOut: boolean;
  noOrg: boolean;
} {
  const user = useUser();
  const [state, setState] = useState<{ orgId: string; roles: string[] } | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!user) return;
    let on = true;
    void readClaims(user, true).then((c) => {
      if (!on) return;
      const first = Object.entries(c.orgs)[0];
      setState(first ? { orgId: first[0], roles: first[1] } : null);
    });
    return () => {
      on = false;
    };
  }, [user]);

  if (user === undefined) return { loading: true, signedOut: false, noOrg: false };
  if (user === null) return { loading: false, signedOut: true, noOrg: false };
  if (state === undefined) return { loading: true, signedOut: false, noOrg: false };
  if (state === null) return { loading: false, signedOut: false, noOrg: true };
  const isStaff = state.roles.some((r) => r === 'owner' || r === 'manager' || r === 'admin');
  return {
    loading: false,
    signedOut: false,
    noOrg: false,
    session: {
      user,
      orgId: state.orgId,
      roles: state.roles,
      isStaff,
      isTenant: state.roles.includes('tenant'),
    },
  };
}

/** Live collection at any Firestore path. Pass constraints to scope tenant queries (the rules require it). */
export function useCollectionAt<T = DocumentData>(
  path: string | undefined,
  constraints: QueryConstraint[] = [],
  enabled = true,
): { rows: Row<T>[]; loading: boolean } {
  const [rows, setRows] = useState<Row<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const key = constraints.map((c) => JSON.stringify(c)).join('|');

  useEffect(() => {
    if (!path || !enabled) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(firebaseDb(), path), ...constraints);
    return onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as T })));
        setLoading(false);
      },
      () => {
        setRows([]);
        setLoading(false);
      },
    );
    // `key` stands in for the constraint objects, which are recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, key]);

  return { rows, loading };
}

/** Live collection under `orgs/{orgId}/{name}`. */
export function useOrgCollection<T = DocumentData>(
  orgId: string | undefined,
  name: string,
  constraints: QueryConstraint[] = [],
  enabled = true,
): { rows: Row<T>[]; loading: boolean } {
  return useCollectionAt<T>(orgId ? `orgs/${orgId}/${name}` : undefined, constraints, enabled);
}
export const tenantScope = (uid: string) => [where('tenantUid', '==', uid)];
export const today = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10); // Riyadh date
