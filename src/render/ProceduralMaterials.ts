import * as THREE from "three";

export interface MaterialPalette {
  table: THREE.MeshStandardMaterial;
  tableEdge: THREE.MeshStandardMaterial;
  tableLine: THREE.MeshBasicMaterial;
  floor: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  net: THREE.MeshStandardMaterial;
  ball: THREE.MeshStandardMaterial;
  rubberRed: THREE.MeshStandardMaterial;
  rubberBlack: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
}

function standard(color: number, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    envMapIntensity: metalness > 0 ? 1.25 : 0.55
  });
}

export function createMaterialPalette(): MaterialPalette {
  const grain = createCanvasNoiseTexture(128);
  grain.repeat.set(20, 36);
  const floorGrain = grain.clone();
  floorGrain.repeat.set(55, 70);
  floorGrain.needsUpdate = true;
  const table = new THREE.MeshPhysicalMaterial({
    color: 0x075273, roughness: 0.5, metalness: 0.02,
    clearcoat: 0.14, clearcoatRoughness: 0.68, bumpMap: grain, bumpScale: 0.0015
  });
  const floor = new THREE.MeshStandardMaterial({
    color: 0x263b44, roughness: 0.88, bumpMap: floorGrain, bumpScale: 0.003
  });
  const woodGrain = createSurfaceTexture("wood");
  const rubberGrain = createSurfaceTexture("rubber");
  rubberGrain.repeat.set(3, 3);
  const wood = standard(0xb78a55, 0.55);
  wood.map = woodGrain;
  wood.bumpMap = woodGrain;
  wood.bumpScale = 0.0005;
  const rubberRed = standard(0xb02433, 0.8);
  const rubberBlack = standard(0x151b22, 0.78);
  for (const rubber of [rubberRed, rubberBlack]) {
    rubber.bumpMap = rubberGrain;
    rubber.bumpScale = 0.00035;
  }
  return {
    table,
    tableEdge: standard(0x16272f, 0.43, 0.22),
    tableLine: new THREE.MeshBasicMaterial({ color: 0xf1f8fb }),
    floor,
    wall: standard(0x101d27, 0.78),
    net: standard(0x0c1519, 0.85),
    ball: new THREE.MeshPhysicalMaterial({ color: 0xfff5d8, roughness: 0.36, clearcoat: 0.2 }),
    rubberRed,
    rubberBlack,
    wood,
    metal: standard(0x8998a0, 0.3, 0.72),
    accent: standard(0x54d6c7, 0.35, 0.2)
  };
}

export function createLineMaterial(color = 0xf1f8fb): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.92 });
}

export function createGlowMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
}

export function createCanvasNoiseTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const image = context.createImageData(size, size);
  let seed = 2463534242;
  for (let index = 0; index < image.data.length; index += 4) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const value = 108 + (seed >>> 0) % 56;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  return texture;
}

/** Deterministic material-scale patterns; no downloads or random per-frame noise. */
export function createSurfaceTexture(kind: "fabric" | "wood" | "rubber", size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size * Math.PI * 2;
      const v = y / size * Math.PI * 2;
      let value: number;
      if (kind === "wood") value = 185 + 30 * Math.sin(u * 10 + Math.sin(v) * 1.6) + 12 * Math.sin(u * 31 + Math.sin(v * 2));
      else if (kind === "fabric") value = 145 + 34 * Math.sin(u * 16) * Math.cos(v * 16) + 12 * Math.sin(v * 32);
      else value = 155 + 28 * Math.cos(u * 16) * Math.cos(v * 16);
      const index = (y * size + x) * 4;
      data[index] = data[index + 1] = data[index + 2] = Math.round(value);
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
