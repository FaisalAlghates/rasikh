'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { firebaseAuth } from './firebase';
import { PREF, writePref } from './prefs';

/** `undefined` while loading, `null` when signed out. */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(
    () =>
      onAuthStateChanged(firebaseAuth(), (u) => {
        // A hint for public pages, so their header can offer "Workspace" without loading Firebase.
        writePref(PREF.signedIn, u ? '1' : null);
        setUser(u);
      }),
    [],
  );
  return user;
}

export interface OrgClaims {
  orgs: Record<string, string[]>;
  /** The Rasikh team (reads the public contact messages and page ratings). */
  platformAdmin: boolean;
}

export async function readClaims(user: User, forceRefresh = false): Promise<OrgClaims> {
  const res = await user.getIdTokenResult(forceRefresh);
  return {
    orgs: (res.claims.orgs as Record<string, string[]> | undefined) ?? {},
    platformAdmin: res.claims.platformAdmin === true,
  };
}
