'use client';

import { useEffect, useMemo } from 'react';
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
  const ready = allowed && !properties.loading && !units.loading && !leases.loading;

  useEffect(() => {
    if (signedOut || noOrg || (!loading && !allowed)) onData(null);
  }, [signedOut, noOrg, loading, allowed, onData]);

  useEffect(() => {
    if (!ready) return;
    if (!orgId) return;
    onData({
      orgId,
      ...portfolioToMap(
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
      ),
    });
  }, [ready, orgId, properties.rows, units.rows, leases.rows, payments.rows, onData]);

  return null;
}
