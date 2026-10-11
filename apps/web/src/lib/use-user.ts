'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { firebaseAuth } from './firebase';

/** `undefined` while loading, `null` when signed out. */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(firebaseAuth(), setUser), []);
  return user;
}

export interface OrgClaims {
  orgs: Record<string, string[]>;
}

export async function readClaims(user: User, forceRefresh = false): Promise<OrgClaims> {
  const res = await user.getIdTokenResult(forceRefresh);
  return { orgs: (res.claims.orgs as Record<string, string[]> | undefined) ?? {} };
}
