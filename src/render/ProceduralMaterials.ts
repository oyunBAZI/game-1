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
  const grain = createCanvasNoiseTexture(256);
  grain.repeat.set(9, 18);
  grain.anisotropy = 8;
  const floorGrain = grain.clone();
  floorGrain.repeat.set(45, 55);
  floorGrain.needsUpdate = true;
  const table = new THREE.MeshPhysicalMaterial({
    color: 0x06678e, roughness: 0.38, metalness: 0.015,
    clearcoat: 0.34, clearcoatRoughness: 0.48, bumpMap: grain, bumpScale: 0.00075
  });
  const floor = new THREE.MeshStandardMaterial({
    color: 0x23333c, roughness: 0.82, bumpMap: floorGrain, bumpScale: 0.002
  });
  return {
    table,
    tableEdge: standard(0x142d39, 0.34, 0.18),
    tableLine: new THREE.MeshBasicMaterial({ color: 0xf1f8fb }),
    floor,
    wall: standard(0x101d27, 0.78),
    net: standard(0x0c1519, 0.85),
    ball: new THREE.MeshPhysicalMaterial({ color: 0xfff5d8, roughness: 0.36, clearcoat: 0.2 }),
    rubberRed: standard(0xb02433, 0.8),
    rubberBlack: standard(0x151b22, 0.78),
    wood: standard(0x915c37, 0.59),
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
