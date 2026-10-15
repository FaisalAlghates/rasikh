import { describe, expect, it } from 'vitest';
import {
  FOOTER_GROUPS,
  HEADER_NAV,
  ROUTES,
  SEARCHABLE,
  isCurrent,
  normalize,
  searchDocs,
} from './nav';
import { accessFor, pickOrg, pickSection } from './roles';

describe('navigation map', () => {
  it('every linked page has a route', () => {
    const keys = [...HEADER_NAV, ...FOOTER_GROUPS.flatMap((g) => g.items), ...SEARCHABLE];
    for (const k of keys) expect(ROUTES[k]).toMatch(/^\//);
  });

  it('marks the current page and its parents only', () => {
    expect(isCurrent('/', '/')).toBe(true);
    expect(isCurrent('/help', '/')).toBe(false);
    expect(isCurrent('/help', '/help')).toBe(true);
    expect(isCurrent('/helpful', '/help')).toBe(false);
  });
});

describe('search', () => {
  const docs = [
    { id: 'a', title: 'سياسة الخصوصية', body: 'بياناتك', href: '/privacy', section: 'القانونية' },
    {
      id: 'b',
      title: 'كيف أسجّل دفعة؟',
      body: 'ارفع الإيصال في سجل الدفعات',
      href: '/help',
      section: 'مساعدة',
    },
    {
      id: 'c',
      title: 'الفحص عند الاستلام',
      body: 'صور مع الوقت',
      href: '/help',
      section: 'مساعدة',
    },
  ];

  it('ignores diacritics and alef/ta-marbuta variants', () => {
    expect(normalize('إيصالٌ')).toBe(normalize('ايصال'));
    expect(normalize('دفعة')).toBe(normalize('دفعه'));
  });

  it('needs every word and ranks title hits first', () => {
    expect(searchDocs(docs, 'الايصال').map((d) => d.id)).toEqual(['b']);
    expect(searchDocs(docs, 'الخصوصية بياناتك').map((d) => d.id)).toEqual(['a']);
    expect(searchDocs(docs, 'صور').map((d) => d.id)).toEqual(['c']);
    expect(searchDocs(docs, '   ')).toEqual([]);
  });
});

describe('role-based access', () => {
  it('owners get the full workspace and their portfolio on the map', () => {
    const a = accessFor(['owner']);
    expect(a.staff).toBe(true);
    expect(a.sections).toContain('expenses');
    expect(a.sections).not.toContain('broker');
    expect(a.seesPortfolioOnMap).toBe(true);
    expect(accessFor(['owner', 'broker']).sections).toContain('broker');
  });

  it('tenants never see management sections', () => {
    const a = accessFor(['tenant']);
    expect(a.staff).toBe(false);
    expect(a.sections).toEqual([
      'myLease',
      'inspections',
      'maintenance',
      'assistant',
      'reminders',
      'privacy',
    ]);
    expect(a.sections).not.toContain('expenses');
    expect(a.seesPortfolioOnMap).toBe(false);
  });

  it('a vendor sees only assigned work; a broker only the broker desk', () => {
    expect(accessFor(['vendor']).sections).toEqual(['assigned', 'reminders', 'privacy']);
    expect(accessFor(['broker']).sections).toEqual(['broker', 'privacy']);
    expect(accessFor(['building_owner']).sections).toContain('myBuildings');
  });

  it('a requested section is opened only when allowed', () => {
    expect(pickSection(accessFor(['owner']), 'leases')).toBe('leases');
    expect(pickSection(accessFor(['tenant']), 'expenses')).toBe('myLease');
    expect(pickSection(accessFor([]), null)).toBe('reminders');
  });
});

describe('engineering office access', () => {
  it('an office lead or engineer gets the office workspace, not property management', () => {
    const lead = accessFor(['office_lead']);
    expect(lead).toMatchObject({
      office: true,
      officeLead: true,
      staff: false,
      seesPortfolioOnMap: false,
    });
    expect(lead.sections).toEqual(['officeProjects', 'privacy']);
    expect(accessFor(['engineer'])).toMatchObject({ office: true, officeLead: false });
    expect(accessFor(['owner']).office).toBe(false);
  });
});

describe('several organizations', () => {
  const orgs = { a: ['tenant'], b: ['owner'] };
  it('opens the one chosen last, while the person still belongs to it', () => {
    expect(pickOrg(orgs, 'b')).toEqual({ orgId: 'b', roles: ['owner'] });
    expect(pickOrg(orgs, 'gone')).toEqual({ orgId: 'a', roles: ['tenant'] });
    expect(pickOrg(orgs, null)).toEqual({ orgId: 'a', roles: ['tenant'] });
    expect(pickOrg({}, 'b')).toBeNull();
  });
});
