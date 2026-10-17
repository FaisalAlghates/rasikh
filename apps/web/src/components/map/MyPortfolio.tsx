'use client';

import type { DesignPlan } from '@rasikh/shared';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import type { DesignLinkDoc } from '@/components/eng/HandOffPanel';
import type { VersionDoc } from '@/lib/eng/data';
import { firebaseDb } from '@/lib/firebase';
import { today, useOrgCollection, useSession } from '@/lib/ops/hooks';
import type { LeaseDoc, PaymentDoc, PropertyDoc, UnitDoc } from '@/lib/ops/types';
import { portfolioToMap } from '@/lib/map/portfolio';
import type { MapProperty } from '@/lib/map/sample-data';
import { accessFor } from '@/lib/roles';

export interface MyPortfolioData {
  items: MapProperty[];
  unplaced: number;
  /** The organization the pins belong to (owners and managers may move them). */
  orgId: string;
}

/**
 * Loads the signed-in owner's portfolio for the map (owners, managers and admins only; the Firestore
 * rules enforce the same). Reports `null` when the person may not see an organization portfolio.
 */
export default function MyPortfolio({ onData }: { onData: (d: MyPortfolioData | null) => void }) {
  const { session, loading, signedOut, noOrg } = useSession();
  const allowed = !!session && accessFor(session.roles).seesPortfolioOnMap;
  const orgId = allowed ? session?.orgId : undefined;
  const none: never[] = useMemo(() => [], []);
  const properties = useOrgCollection<PropertyDoc>(orgId, 'properties', none, allowed);
  const units = useOrgCollection<UnitDoc>(orgId, 'units', none, allowed);
  const leases = useOrgCollection<LeaseDoc>(orgId, 'leases', none, allowed);
  const payments = useOrgCollection<PaymentDoc>(orgId, 'payments', none, allowed);
  const designs = useOrgCollection<DesignLinkDoc>(orgId, 'designs', none, allowed);
  // the released designs handed off to a property: the map stands exactly that house on its pin
  const [plans, setPlans] = useState<Record<string, DesignPlan>>({});
  useEffect(() => {
    let on = true;
    void Promise.all(
      designs.rows.map(async (d) => {
        try {
          const snap = await getDoc(
            doc(firebaseDb(), `designProjects/${d.data.projectId}/versions/${d.data.versionId}`),
          );
          const plan = (snap.data() as VersionDoc | undefined)?.plan;
          return plan ? ([d.data.propertyId, plan] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((list) => {
      if (on)
        setPlans(Object.fromEntries(list.filter((x): x is readonly [string, DesignPlan] => !!x)));
    });
    return () => {
      on = false;
    };
  }, [designs.rows]);
  const ready = allowed && !properties.loading && !units.loading && !leases.loading;

  useEffect(() => {
    if (signedOut || noOrg || (!loading && !allowed)) onData(null);
  }, [signedOut, noOrg, loading, allowed, onData]);

  useEffect(() => {
    if (!ready) return;
    if (!orgId) return;
    const mapped = portfolioToMap(
      properties.rows.map((p) => ({
        id: p.id,
        name: p.data.name,
        city: p.data.city,
        district: p.data.district,
        kind: p.data.kind,
        location: p.data.location,
      })),
      units.rows.map((u) => ({ id: u.id, propertyId: u.data.propertyId, label: u.data.label })),
      leases.rows.map((l) => ({
        id: l.id,
        unitId: l.data.unitId,
        propertyId: l.data.propertyId,
        status: l.data.status,
        endDate: l.data.endDate,
        annualRent: l.data.annualRent,
        tenantName: l.data.tenantName,
      })),
      payments.rows.map((p) => ({
        leaseId: p.data.leaseId,
        dueDate: p.data.dueDate,
        amount: p.data.amount,
        status: p.data.status,
      })),
      today(),
    );
    onData({
      orgId,
      ...mapped,
      items: mapped.items.map((i) => (plans[i.id] ? { ...i, plan: plans[i.id] } : i)),
    });
  }, [ready, orgId, properties.rows, units.rows, leases.rows, payments.rows, plans, onData]);

  return null;
}
