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

  const layer: CustomLayerInterface & { setProperties(list: MapProperty[]): void } = {
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
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix as unknown as number[]);
      for (const { group } of groups.values()) {
        const pivot = group.userData as { mc: { x: number; y: number; z: number }; s: number };
        group.matrix
          .makeTranslation(pivot.mc.x, pivot.mc.y, pivot.mc.z)
          .scale(new THREE.Vector3(pivot.s, -pivot.s, pivot.s))
          .multiply(rotX);
        group.matrixAutoUpdate = false;
      }
      renderer.resetState();
      renderer.render(scene, camera);
    },
    onRemove() {
      for (const { group } of groups.values()) scene.remove(group);
      groups.clear();
      renderer?.dispose();
      renderer = null;
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
        };
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
