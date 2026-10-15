import { area } from './layout.js';
import { openingsOf } from './openings.js';
import type { DesignPlan, PlanRoom } from './schemas.js';

/**
 * Drawing exports written as plain text, so they run anywhere (browser or server) with no extra service.
 * DXF R12 (ASCII) for CAD and IFC4 (STEP) for Revit/ArchiCAD hand-off. Furniture is never exported.
 */

/** Canonical JSON of a plan (sorted keys) — the input to the SHA-256 that approvals sign. */
export function canonicalPlan(plan: DesignPlan): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v as Record<string, unknown>)
              .sort()
              .map((k) => [k, sort((v as Record<string, unknown>)[k])]),
          )
        : v;
  return JSON.stringify(sort(plan));
}

// ------------------------------------------------------------------------------------------------ DXF

const dxfText = (s: string) =>
  [...s]
    .map((c) =>
      c.charCodeAt(0) > 126
        ? `\\U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`
        : c,
    )
    .join('');

/** One DXF per plan: each floor drawn side by side, rooms as closed outlines, doors/windows and labels on layers. */
export function toDxf(plan: DesignPlan, label: (r: PlanRoom) => string = (r) => r.type): string {
  const out: string[] = [];
  const pair = (code: number, value: string | number) => out.push(String(code), String(value));
  const layers = ['A-WALL', 'A-ROOM', 'A-DOOR', 'A-GLAZ', 'A-ANNO', 'A-PLOT'];
  pair(0, 'SECTION');
  pair(2, 'HEADER');
  pair(9, '$ACADVER');
  pair(1, 'AC1009');
  pair(9, '$INSUNITS');
  pair(70, 6); // metres
  pair(0, 'ENDSEC');
  pair(0, 'SECTION');
  pair(2, 'TABLES');
  pair(0, 'TABLE');
  pair(2, 'LAYER');
  pair(70, layers.length);
  layers.forEach((l, i) => {
    pair(0, 'LAYER');
    pair(2, l);
    pair(70, 0);
    pair(62, i + 1);
    pair(6, 'CONTINUOUS');
  });
  pair(0, 'ENDTAB');
  pair(0, 'ENDSEC');
  pair(0, 'SECTION');
  pair(2, 'ENTITIES');
  const line = (layer: string, x1: number, y1: number, x2: number, y2: number) => {
    pair(0, 'LINE');
    pair(8, layer);
    pair(10, x1.toFixed(3));
    pair(20, y1.toFixed(3));
    pair(30, 0);
    pair(11, x2.toFixed(3));
    pair(21, y2.toFixed(3));
    pair(31, 0);
  };
  const text = (layer: string, x: number, y: number, h: number, s: string) => {
    pair(0, 'TEXT');
    pair(8, layer);
    pair(10, x.toFixed(3));
    pair(20, y.toFixed(3));
    pair(30, 0);
    pair(40, h);
    pair(1, dxfText(s));
  };
  // floors side by side, plot depth flipped so the street is at the bottom of the sheet
  const gap = plan.plot.width + 4;
  const X = (f: number, x: number) => f * gap + x;
  const Y = (y: number) => plan.plot.depth - y;
  const ops = openingsOf(plan);
  for (let f = 0; f < plan.floors; f++) {
    const { width: w, depth: d } = plan.plot;
    line('A-PLOT', X(f, 0), Y(0), X(f, w), Y(0));
    line('A-PLOT', X(f, w), Y(0), X(f, w), Y(d));
    line('A-PLOT', X(f, w), Y(d), X(f, 0), Y(d));
    line('A-PLOT', X(f, 0), Y(d), X(f, 0), Y(0));
    text('A-ANNO', X(f, 0), Y(d) + 1, 0.6, `FLOOR ${f}`);
    for (const r of plan.rooms.filter((r) => r.floor === f)) {
      const [x1, y1, x2, y2] = [X(f, r.x), Y(r.y), X(f, r.x + r.w), Y(r.y + r.h)];
      line('A-WALL', x1, y1, x2, y1);
      line('A-WALL', x2, y1, x2, y2);
      line('A-WALL', x2, y2, x1, y2);
      line('A-WALL', x1, y2, x1, y1);
      text('A-ROOM', X(f, r.x + 0.3), Y(r.y + r.h / 2), 0.3, label(r));
      text('A-ANNO', X(f, r.x + 0.3), Y(r.y + r.h / 2) - 0.45, 0.22, `${area(r).toFixed(1)} m2`);
    }
    for (const o of ops.filter((o) => o.floor === f))
      line(o.kind === 'window' ? 'A-GLAZ' : 'A-DOOR', X(f, o.x1), Y(o.y1), X(f, o.x2), Y(o.y2));
  }
  pair(0, 'ENDSEC');
  pair(0, 'EOF');
  return out.join('\n') + '\n';
}

// ------------------------------------------------------------------------------------------------ IFC4

const ifcString = (s: string) =>
  `'${[...s]
    .map((c) => {
      const code = c.charCodeAt(0);
      if (c === "'") return "''";
      if (c === '\\') return '\\\\';
      return code > 126 ? `\\X2\\${code.toString(16).toUpperCase().padStart(4, '0')}\\X0\\` : c;
    })
    .join('')}'`;

/** 22-character IFC GlobalId from a deterministic seed (stable across exports of the same plan). */
function guid(seed: string): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let out = '';
  for (let i = 0; i < 22; i++) {
    for (const c of seed + i) {
      h1 = Math.imul(h1 ^ c.charCodeAt(0), 16777619);
      h2 = Math.imul(h2 + c.charCodeAt(0), 2246822519);
    }
    out += chars[((h1 ^ h2) >>> 0) % (i === 0 ? 4 : 64)];
  }
  return out;
}

/**
 * IFC4 model: project, site, building, one storey per floor, an IfcSpace per room (extruded rectangle) and
 * IfcWindow/IfcDoor placeholders. Enough for a BIM hand-off to start from; the office's model is the reference.
 */
export function toIfc(
  plan: DesignPlan,
  opts: { project: string; label?: (r: PlanRoom) => string; when?: string },
): string {
  const label = opts.label ?? ((r: PlanRoom) => r.type);
  const lines: string[] = [];
  let n = 0;
  const e = (body: string) => {
    lines.push(`#${++n}=${body};`);
    return `#${n}`;
  };
  const pt = (x: number, y: number, z: number) =>
    e(`IFCCARTESIANPOINT((${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}))`);
  const dir = (x: number, y: number, z: number) => e(`IFCDIRECTION((${x}.,${y}.,${z}.))`);
  const zAxis = dir(0, 0, 1);
  const xAxis = dir(1, 0, 0);
  const origin = pt(0, 0, 0);
  const place3 = (p: string) => e(`IFCAXIS2PLACEMENT3D(${p},${zAxis},${xAxis})`);
  const worldPlacement = place3(origin);
  const context = e(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${worldPlacement},$)`);
  const body = e(
    `IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${context},$,.MODEL_VIEW.,$)`,
  );
  const lenUnit = e(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`);
  const areaUnit = e(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`);
  const volUnit = e(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`);
  const units = e(`IFCUNITASSIGNMENT((${lenUnit},${areaUnit},${volUnit}))`);
  const project = e(
    `IFCPROJECT('${guid('project' + opts.project)}',$,${ifcString(opts.project)},${ifcString('DRAFT - requires review and approval by a licensed engineer')},$,$,$,(${context}),${units})`,
  );
  const local = (rel: string | null, x: number, y: number, z: number) =>
    e(`IFCLOCALPLACEMENT(${rel ?? '$'},${place3(pt(x, y, z))})`);
  const sitePl = local(null, 0, 0, 0);
  const site = e(
    `IFCSITE('${guid('site' + opts.project)}',$,'Site',$,$,${sitePl},$,$,.ELEMENT.,$,$,$,$,$)`,
  );
  const bldPl = local(sitePl, 0, 0, 0);
  const building = e(
    `IFCBUILDING('${guid('bld' + opts.project)}',$,'Building',$,$,${bldPl},$,$,.ELEMENT.,$,$,$)`,
  );
  e(`IFCRELAGGREGATES('${guid('agg1' + opts.project)}',$,$,$,${project},(${site}))`);
  e(`IFCRELAGGREGATES('${guid('agg2' + opts.project)}',$,$,$,${site},(${building}))`);
  const storeys: string[] = [];
  const ops = openingsOf(plan);
  for (let f = 0; f < plan.floors; f++) {
    const z = f * plan.floorHeight;
    const pl = local(bldPl, 0, 0, z);
    const storey = e(
      `IFCBUILDINGSTOREY('${guid(`storey${f}${opts.project}`)}',$,${ifcString(`Floor ${f}`)},$,$,${pl},$,$,.ELEMENT.,${z.toFixed(3)})`,
    );
    storeys.push(storey);
    const spaces: string[] = [];
    for (const r of plan.rooms.filter((r) => r.floor === f)) {
      const rp = local(pl, r.x + r.w / 2, r.y + r.h / 2, 0);
      const profile = e(
        `IFCRECTANGLEPROFILEDEF(.AREA.,$,${e(`IFCAXIS2PLACEMENT2D(${e('IFCCARTESIANPOINT((0.,0.))')},$)`)},${r.w.toFixed(3)},${r.h.toFixed(3)})`,
      );
      const solid = e(
        `IFCEXTRUDEDAREASOLID(${profile},${place3(origin)},${zAxis},${plan.clearHeight.toFixed(3)})`,
      );
      const rep = e(`IFCSHAPEREPRESENTATION(${body},'Body','SweptSolid',(${solid}))`);
      const shape = e(`IFCPRODUCTDEFINITIONSHAPE($,$,(${rep}))`);
      spaces.push(
        e(
          `IFCSPACE('${guid(r.id + opts.project)}',$,${ifcString(r.id)},${ifcString(label(r))},$,${rp},${shape},$,.ELEMENT.,.INTERNAL.,$)`,
        ),
      );
    }
    const elems = ops
      .filter((o) => o.floor === f)
      .map((o) => {
        const op = local(pl, (o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2, o.sill);
        const w = Math.hypot(o.x2 - o.x1, o.y2 - o.y1).toFixed(3);
        const h = (o.head - o.sill).toFixed(3);
        return o.kind === 'window'
          ? e(
              `IFCWINDOW('${guid(o.id + f + opts.project)}',$,'Window',$,$,${op},$,$,${h},${w},.WINDOW.,.SINGLE_PANEL.,$)`,
            )
          : e(
              `IFCDOOR('${guid(o.id + f + opts.project)}',$,'Door',$,$,${op},$,$,${h},${w},.DOOR.,.SINGLE_SWING_LEFT.,$)`,
            );
      });
    if (spaces.length)
      e(
        `IFCRELAGGREGATES('${guid(`aggs${f}${opts.project}`)}',$,$,$,${storey},(${spaces.join(',')}))`,
      );
    if (elems.length)
      e(
        `IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid(`cont${f}${opts.project}`)}',$,$,$,(${elems.join(',')}),${storey})`,
      );
  }
  e(`IFCRELAGGREGATES('${guid('agg3' + opts.project)}',$,$,$,${building},(${storeys.join(',')}))`);
  const when = opts.when ?? '2026-01-01T00:00:00';
  return [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]'),'2;1');",
    `FILE_NAME(${ifcString(opts.project + '.ifc')},'${when}',('Rasikh'),('Rasikh'),'Rasikh engineering office','Rasikh','DRAFT');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
    ...lines,
    'ENDSEC;',
    'END-ISO-10303-21;',
    '',
  ].join('\n');
}
