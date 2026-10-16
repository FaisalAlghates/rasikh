import { describe, expect, it } from 'vitest';
import {
  ALL_ITEM_KEYS,
  InspectionItemSchema,
  InspectionSchema,
  MediaSchema,
  ROOM_BASES,
  buildTimeline,
  canonicalJson,
  compareInspections,
  damageTotal,
  inspectionDigest,
  itemId,
  itemsOfRoom,
  matchesHash,
  needsAssessment,
  sha256Hex,
  splitRoomKey,
  templateFor,
  type ConditionRow,
} from './inspection.js';

const enc = (s: string) => new TextEncoder().encode(s);
const HASH = 'a'.repeat(64);

describe('templates', () => {
  it('differ by unit type and honour bedroom/bathroom counts', () => {
    const studio = templateFor('studio').map((r) => r.key);
    expect(studio).toEqual(['entrance', 'living', 'kitchen', 'bathroom_1', 'meters']);

    const apt = templateFor('apartment', { bedrooms: 3, bathrooms: 2 }).map((r) => r.key);
    expect(apt.filter((k) => k.startsWith('bedroom'))).toEqual([
      'bedroom_1',
      'bedroom_2',
      'bedroom_3',
    ]);
    expect(apt.filter((k) => k.startsWith('bathroom'))).toEqual(['bathroom_1', 'bathroom_2']);

    const villa = templateFor('villa').map((r) => r.key);
    expect(villa).toEqual(expect.arrayContaining(['majlis', 'yard', 'parking', 'roof']));
    expect(villa.filter((k) => k.startsWith('bedroom'))).toHaveLength(4);
  });

  it('never exceeds sane room counts', () => {
    expect(
      templateFor('apartment', { bedrooms: 999 }).filter((r) => r.key.startsWith('bedroom')),
    ).toHaveLength(8);
    expect(
      templateFor('apartment', { bedrooms: 0 }).filter((r) => r.key.startsWith('bedroom')),
    ).toHaveLength(1);
  });

  it('uses keys that are safe inside a document id', () => {
    for (const type of ['studio', 'apartment', 'villa'] as const) {
      for (const r of templateFor(type)) {
        expect(r.key).toMatch(/^[a-z]+(_\d+)?$/);
        expect(r.key).not.toContain('__');
        for (const it of r.items) expect(it).toMatch(/^[a-z]+$/);
        expect(r.items).toEqual(itemsOfRoom(r.key));
      }
    }
    expect(itemId('bedroom_2', 'walls')).toBe('bedroom_2__walls');
  });

  it('splits numbered room keys and rejects unknown rooms', () => {
    expect(splitRoomKey('bedroom_3')).toEqual({ base: 'bedroom', index: 3 });
    expect(splitRoomKey('kitchen')).toEqual({ base: 'kitchen' });
    expect(() => splitRoomKey('garage')).toThrow();
    expect(ROOM_BASES).toContain('meters');
    expect(ALL_ITEM_KEYS).toContain('walls');
  });
});

describe('schemas', () => {
  it('accepts a valid inspection and item, rejects bad ones', () => {
    expect(
      InspectionSchema.safeParse({
        unitId: 'u',
        propertyId: 'p',
        leaseId: 'l',
        kind: 'move_in',
        rooms: ['entrance', 'bedroom_1'],
      }).success,
    ).toBe(true);
    expect(
      InspectionSchema.safeParse({
        unitId: 'u',
        propertyId: 'p',
        leaseId: 'l',
        kind: 'x',
        rooms: ['a'],
      }).success,
    ).toBe(false);
    expect(
      InspectionItemSchema.safeParse({ room: 'kitchen', item: 'sink', condition: 'good' }).success,
    ).toBe(true);
    expect(
      InspectionItemSchema.safeParse({ room: 'kitchen', item: 'sink', condition: 'ruined' })
        .success,
    ).toBe(false);
    expect(
      InspectionItemSchema.safeParse({
        room: 'kitchen',
        item: 'sink',
        condition: 'poor',
        costSar: -1,
      }).success,
    ).toBe(false);
  });

  it('only accepts media taken with the in-app camera and a real SHA-256', () => {
    const ok = {
      room: 'kitchen',
      path: 'orgs/o/inspections/i/m1.jpg',
      sha256: HASH,
      size: 1000,
      contentType: 'image/jpeg',
      capturedAt: '2026-10-12T08:00:00.000Z',
      device: 'test',
      source: 'in_app_camera',
    };
    expect(MediaSchema.safeParse(ok).success).toBe(true);
    expect(MediaSchema.safeParse({ ...ok, source: 'gallery' }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...ok, sha256: 'xyz' }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...ok, contentType: 'application/pdf' }).success).toBe(false);
    expect(MediaSchema.safeParse({ ...ok, gps: { lat: 91, lng: 0 } }).success).toBe(false);
  });
});

describe('hashing', () => {
  it('matches the published SHA-256 vector', async () => {
    expect(await sha256Hex(enc('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(await sha256Hex(enc(''))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('detects a tampered file: one flipped byte breaks the match', async () => {
    const photo = new Uint8Array(4096).map((_, i) => (i * 31) % 251);
    const stored = await sha256Hex(photo);
    expect(await matchesHash(photo, stored)).toBe(true);

    const tampered = photo.slice();
    tampered[2048] ^= 0x01;
    expect(await matchesHash(tampered, stored)).toBe(false);
    expect(await matchesHash(photo.slice(0, 4095), stored)).toBe(false); // truncated
  });

  it('canonical JSON ignores key order and undefined', () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: undefined }] })).toBe('{"a":[2,{"d":1}],"b":1}');
  });
});

describe('inspection digest', () => {
  const base = {
    inspectionId: 'i1',
    kind: 'move_in' as const,
    unitId: 'u1',
    leaseId: 'l1',
    items: [
      { id: 'kitchen__sink', condition: 'good' as const, note: '' },
      { id: 'entrance__door', condition: 'fair' as const, note: 'خدش بسيط' },
    ],
    media: [
      {
        id: 'm1',
        room: 'kitchen',
        item: 'sink',
        sha256: HASH,
        capturedAt: '2026-10-12T08:00:00.000Z',
      },
    ],
  };

  it('is stable regardless of order', async () => {
    const a = await inspectionDigest(base);
    const b = await inspectionDigest({ ...base, items: [...base.items].reverse() });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes when any answer, note, photo hash or time changes', async () => {
    const a = await inspectionDigest(base);
    const edits = [
      { ...base, items: [{ ...base.items[0]!, condition: 'poor' as const }, base.items[1]!] },
      { ...base, items: [base.items[0]!, { ...base.items[1]!, note: 'x' }] },
      { ...base, media: [{ ...base.media[0]!, sha256: 'b'.repeat(64) }] },
      { ...base, media: [{ ...base.media[0]!, capturedAt: '2026-10-12T08:00:00.001Z' }] },
      { ...base, media: [] },
    ];
    for (const e of edits) expect(await inspectionDigest(e)).not.toBe(a);
  });
});

describe('move-out comparison', () => {
  const row = (
    room: string,
    item: string,
    condition: ConditionRow['condition'],
    extra = {},
  ): ConditionRow => ({
    room,
    item,
    condition,
    ...extra,
  });
  const moveIn = [
    row('kitchen', 'sink', 'good'),
    row('living', 'walls', 'fair'),
    row('living', 'floor', 'good'),
    row('yard', 'gate', 'good'),
  ];
  const moveOut = [
    row('kitchen', 'sink', 'damaged', { assessment: 'damage', costSar: 350.5 }),
    row('living', 'walls', 'poor', { assessment: 'wear' }),
    row('living', 'floor', 'good'),
    row('bedroom_1', 'walls', 'good'),
  ];

  it('classifies every row', () => {
    const rows = compareInspections(moveIn, moveOut);
    const by = Object.fromEntries(rows.map((r) => [r.id, r.change]));
    expect(by).toEqual({
      bedroom_1__walls: 'added',
      kitchen__sink: 'worse',
      living__floor: 'same',
      living__walls: 'worse',
      yard__gate: 'missing',
    });
    expect(needsAssessment(rows).map((r) => r.id)).toEqual(['kitchen__sink', 'living__walls']);
  });

  it('detects improvement', () => {
    const rows = compareInspections(
      [row('living', 'walls', 'poor')],
      [row('living', 'walls', 'good')],
    );
    expect(rows[0]!.change).toBe('better');
  });

  it('charges only what a person marked as damage, in exact halalas', () => {
    expect(damageTotal(compareInspections(moveIn, moveOut))).toBe(350.5);
    const two = compareInspections(
      [row('a', 'x', 'good'), row('b', 'y', 'good')],
      [
        row('a', 'x', 'damaged', { assessment: 'damage', costSar: 0.1 }),
        row('b', 'y', 'damaged', { assessment: 'damage', costSar: 0.2 }),
      ],
    );
    expect(damageTotal(two)).toBe(0.3);
  });
});

describe('property health record', () => {
  it('merges leases, sealed inspections and expenses, newest first', () => {
    const t = buildTimeline('p1', {
      today: '2026-10-12',
      leases: [
        {
          id: 'l1',
          propertyId: 'p1',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          unitLabel: 'شقة 3',
        },
        {
          id: 'l2',
          propertyId: 'p1',
          startDate: '2026-01-01',
          endDate: '2027-01-01',
          unitLabel: 'شقة 3',
        },
        { id: 'lx', propertyId: 'other', startDate: '2026-01-01', endDate: '2027-01-01' },
        { id: 'l3', propertyId: 'p1', startDate: '2027-06-01', endDate: '2028-06-01' },
      ],
      inspections: [
        { id: 'i1', propertyId: 'p1', kind: 'move_in', status: 'sealed', sealedOn: '2026-01-02' },
        { id: 'i2', propertyId: 'p1', kind: 'move_out', status: 'draft' },
      ],
      expenses: [
        { id: 'e1', propertyId: 'p1', date: '2026-06-18', category: 'maintenance', amount: 450 },
        { id: 'e2', propertyId: 'other', date: '2026-06-18', category: 'fees', amount: 1 },
      ],
    });
    expect(t.map((e) => e.key)).toEqual([
      'expense-e1',
      'inspection-i1',
      'lease-start-l2',
      'lease-end-l1',
      'lease-start-l1',
    ]);
    expect(t[0]).toMatchObject({ kind: 'expense', detail: 'maintenance', amount: 450 });
  });

  it('adds design sets released by an engineering office and linked to the property', () => {
    const t = buildTimeline('p1', {
      today: '2026-10-16',
      leases: [],
      inspections: [],
      expenses: [{ id: 'e1', propertyId: 'p1', date: '2026-03-01', category: 'fees', amount: 10 }],
      designs: [
        {
          id: 'd1',
          propertyId: 'p1',
          releasedOn: '2026-10-16',
          title: 'فيلا النرجس',
          officeName: 'مكتب الأفق',
        },
        { id: 'd2', propertyId: 'other', releasedOn: '2026-10-16', title: 'x', officeName: 'y' },
      ],
    });
    expect(t.map((e) => e.key)).toEqual(['design-d1', 'expense-e1']);
    expect(t[0]).toMatchObject({
      kind: 'design_released',
      refId: 'd1',
      label: 'فيلا النرجس · مكتب الأفق',
    });
  });
});
