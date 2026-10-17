import type { CustomLayerInterface, Map as MapboxMap } from 'mapbox-gl';
import type { Group, Matrix4, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { MapProperty } from './sample-data';

type Three = typeof import('three');
type Build = typeof import('@/lib/eng/model3d').buildModel;
type Mercator = (
  lngLat: [number, number],
  altitude: number,
) => {
  x: number;
  y: number;
  z: number;
  meterInMercatorCoordinateUnits(): number;
};

/**
 * A three.js layer inside the map: each property's building (its released design, or a plausible one) stands on its
 * pin at true scale and orientation, so zooming in shows the house, not a marker. Placement follows the Mapbox custom
 * layer recipe: model x east, y up, z toward the south; plot north is turned by the plot's `northDeg`.
 */
type Pivot = {
  mc: { x: number; y: number; z: number };
  s: number;
  rot: number;
  ll: [number, number];
  aligned: boolean;
  /** metres from the pin to the plot's front edge (half the plot depth) */
  front: number;
  off: { x: number; y: number };
};

export function createHouseLayer(
  THREE: Three,
  build: Build,
  mercator: Mercator,
  houseFor: (p: MapProperty) => { plan: import('@rasikh/shared').DesignPlan } | null,
) {
  const camera: PerspectiveCamera = new THREE.PerspectiveCamera();
  const scene: Scene = new THREE.Scene();
  let renderer: WebGLRenderer | null = null;
  let map: MapboxMap | null = null;
  const groups = new Map<string, { group: Group; key: string }>();
  const rotX: Matrix4 = new THREE.Matrix4().makeRotationAxis(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2,
  );

  // the scene is in Mercator units: x east, y south, z up
  const sky = new THREE.HemisphereLight(0xdfeaf5, 0xb8a98f, 1.6);
  sky.position.set(0, 0, 1);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3);
  sun.position.set(-0.45, 0.55, 1);
  scene.add(sky, sun);

  const layer: CustomLayerInterface & {
    setProperties(list: MapProperty[]): void;
    align(roadLayer: string): void;
  } = {
    id: 'houses',
    type: 'custom',
    renderingMode: '3d',
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(_gl, matrix) {
      if (!renderer || !map || map.getZoom() < 14) return;
      // The translation to the pin is folded into the projection on the CPU (double precision) and each house is drawn
      // on its own with only scale and rotation as its model matrix: a Mercator translation near 0.5 next to a scale
      // near 1e-7 loses its precision in the GPU's single-precision matrices, which shows as a jittering, striped house.
      const base = new THREE.Matrix4().fromArray(matrix as unknown as number[]);
      renderer.resetState();
      for (const { group } of groups.values()) {
        const pivot = group.userData as Pivot;
        for (const other of groups.values()) other.group.visible = other.group === group;
        camera.projectionMatrix = base
          .clone()
          .multiply(
            new THREE.Matrix4().makeTranslation(
              pivot.mc.x + pivot.off.x,
              pivot.mc.y + pivot.off.y,
              pivot.mc.z,
            ),
          );
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
        group.matrix
          .makeRotationZ(pivot.rot)
          .multiply(new THREE.Matrix4().makeScale(pivot.s, -pivot.s, pivot.s))
          .multiply(rotX);
        group.matrixAutoUpdate = false;
        renderer.render(scene, camera);
      }
      for (const other of groups.values()) other.group.visible = true;
    },
    onRemove() {
      for (const { group } of groups.values()) scene.remove(group);
      groups.clear();
      renderer?.dispose();
      renderer = null;
    },
    /**
     * Turn each house so its front faces the nearest street and its sides run parallel to it. The street geometry
     * comes from the rendered tiles near the pin (an invisible line layer), so a house is aligned once its tiles load.
     */
    align(roadLayer) {
      if (!map) return;
      let changed = false;
      for (const { group } of groups.values()) {
        const pivot = group.userData as Pivot;
        if (pivot.aligned) continue;
        const at = map.project(pivot.ll);
        const found = map.queryRenderedFeatures(
          [
            [at.x - 160, at.y - 160],
            [at.x + 160, at.y + 160],
          ],
          { layers: [roadLayer] },
        );
        let best: { d: number; dx: number; dy: number } | null = null;
        for (const f of found) {
          const g = (f as unknown as { geometry: { type: string; coordinates: unknown } }).geometry;
          const lines: [number, number][][] =
            g.type === 'LineString'
              ? [g.coordinates as [number, number][]]
              : g.type === 'MultiLineString'
                ? (g.coordinates as [number, number][][])
                : [];
          for (const line of lines) {
            for (let i = 0; i + 1 < line.length; i++) {
              const a = mercator(line[i]!, 0);
              const b = mercator(line[i + 1]!, 0);
              const abx = b.x - a.x;
              const aby = b.y - a.y;
              const len2 = abx * abx + aby * aby;
              if (len2 === 0) continue;
              const t = Math.max(
                0,
                Math.min(1, ((pivot.mc.x - a.x) * abx + (pivot.mc.y - a.y) * aby) / len2),
              );
              const dx = a.x + t * abx - pivot.mc.x;
              const dy = a.y + t * aby - pivot.mc.y;
              const d = Math.hypot(dx, dy);
              if (d > 0 && (!best || d < best.d)) best = { d, dx, dy };
            }
          }
        }
        if (!best) continue;
        // the plot's front is its south side: turn south onto the direction of the nearest point of the street
        pivot.rot = Math.atan2(-best.dx / best.d, best.dy / best.d);
        // keep the plot off the carriageway: its front edge stays a street half-width (7 m) from the street line
        const clearance = (pivot.front + 7) * pivot.s;
        if (best.d < clearance) {
          const push = clearance - best.d;
          pivot.off = { x: (-best.dx / best.d) * push, y: (-best.dy / best.d) * push };
        }
        pivot.aligned = true;
        changed = true;
      }
      if (changed) map.triggerRepaint();
    },
    setProperties(list) {
      const seen = new Set<string>();
      for (const p of list) {
        const h = houseFor(p);
        if (!h) continue;
        seen.add(p.id);
        const key = `${p.coords.join(',')}:${h.plan.rooms.length}:${h.plan.style ?? ''}`;
        const have = groups.get(p.id);
        if (have && have.key === key) continue;
        if (have) scene.remove(have.group);
        const model = build(h.plan, { floorsShown: h.plan.floors, realistic: true });
        const pivot = new THREE.Group();
        // plot centre at the pin, the plot's top toward the north
        model.position.set(-h.plan.plot.width / 2, 0, h.plan.plot.depth / 2);
        pivot.add(model);
        const outer = new THREE.Group();
        outer.add(pivot);
        const mc = mercator(p.coords, 0);
        outer.userData = {
          mc: { x: mc.x, y: mc.y, z: mc.z },
          s: mc.meterInMercatorCoordinateUnits(),
          rot: 0,
          ll: p.coords,
          aligned: false,
          front: h.plan.plot.depth / 2,
          off: { x: 0, y: 0 },
        } satisfies Pivot;
        scene.add(outer);
        groups.set(p.id, { group: outer, key });
      }
      for (const [id, g] of groups)
        if (!seen.has(id)) {
          scene.remove(g.group);
          groups.delete(id);
        }
      map?.triggerRepaint();
    },
  };
  return layer;
}
