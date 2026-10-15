/**
 * What a signed-in person may see, from the roles the server put in their claims.
 * The Firestore rules enforce the same boundaries; this only decides what the UI offers.
 */
export type Role =
  | 'owner'
  | 'manager'
  | 'admin'
  | 'tenant'
  | 'vendor'
  | 'building_owner'
  | 'broker'
  | 'office_lead'
  | 'engineer';

export type Section =
  | 'overview'
  | 'properties'
  | 'leases'
  | 'inspections'
  | 'maintenance'
  | 'buildings'
  | 'assistant'
  | 'broker'
  | 'record'
  | 'expenses'
  | 'report'
  | 'privacy'
  | 'myLease'
  | 'assigned'
  | 'myBuildings'
  | 'reminders'
  | 'officeProjects';

export interface Access {
  /** Owner, manager or admin of the organization: the full management workspace. */
  staff: boolean;
  tenant: boolean;
  vendorOnly: boolean;
  unitOwner: boolean;
  broker: boolean;
  brokerOnly: boolean;
  /** Workspace sections this person may open, in display order. */
  sections: Section[];
  /** May see the organization's own properties on the Kingdom map. */
  seesPortfolioOnMap: boolean;
  /** An engineering office (its lead or one of its engineers): the office workspace instead of property management. */
  office: boolean;
  officeLead: boolean;
}

const STAFF_SECTIONS: Section[] = [
  'overview',
  'properties',
  'leases',
  'inspections',
  'maintenance',
  'buildings',
  'privacy',
  'assistant',
  'record',
  'expenses',
  'report',
];

export function accessFor(roles: readonly string[]): Access {
  const has = (r: Role) => roles.includes(r);
  const staff = has('owner') || has('manager') || has('admin');
  const tenant = has('tenant');
  const broker = has('broker');
  const vendorOnly = !staff && has('vendor') && !tenant;
  const unitOwner = !staff && has('building_owner');
  const brokerOnly = !staff && broker && !tenant;
  const officeLead = has('office_lead');
  const office = officeLead || has('engineer');

  let sections: Section[];
  if (office) {
    sections = ['officeProjects', 'privacy'];
  } else if (staff) {
    sections = [...STAFF_SECTIONS];
    if (broker) sections.splice(sections.indexOf('assistant') + 1, 0, 'broker');
  } else if (brokerOnly) {
    sections = ['broker', 'privacy'];
  } else {
    sections = [];
    if (tenant) sections.push('myLease', 'inspections', 'maintenance', 'assistant');
    if (vendorOnly) sections.push('assigned');
    if (unitOwner) sections.push('myBuildings');
    sections.push('reminders', 'privacy');
  }
  return {
    staff,
    tenant,
    vendorOnly,
    unitOwner,
    broker,
    brokerOnly,
    sections,
    seesPortfolioOnMap: staff && !office,
    office,
    officeLead,
  };
}

/** The section to open: the requested one when allowed, otherwise the first allowed one. */
export function pickSection(access: Access, requested: string | null | undefined): Section {
  const s = access.sections.find((x) => x === requested);
  return s ?? access.sections[0] ?? 'privacy';
}

/** Role names shown on the account badge, in a stable order. */
export const ROLE_ORDER: Role[] = [
  'office_lead',
  'engineer',
  'owner',
  'manager',
  'admin',
  'broker',
  'tenant',
  'building_owner',
  'vendor',
];

/**
 * The organization a person works in now: the one they last chose (if they still belong to it),
 * otherwise their first. One account may hold up to five (e.g. tenant in one, owner of another).
 */
export function pickOrg(
  orgs: Record<string, string[]>,
  preferred: string | null | undefined,
): { orgId: string; roles: string[] } | null {
  const ids = Object.keys(orgs);
  const id = preferred && ids.includes(preferred) ? preferred : ids[0];
  return id ? { orgId: id, roles: orgs[id] ?? [] } : null;
}
