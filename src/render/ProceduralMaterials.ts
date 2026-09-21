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
  return {
    table: standard(0x0876a5, 0.38),
    tableEdge: standard(0x092d3c, 0.52, 0.15),
    tableLine: new THREE.MeshBasicMaterial({ color: 0xf1f8fb }),
    floor: standard(0x1b2c35, 0.62),
    wall: standard(0x101d27, 0.78),
    net: standard(0x0c1519, 0.85),
    ball: standard(0xf7f6e8, 0.32),
    rubberRed: standard(0xb31d2c, 0.54),
    rubberBlack: standard(0x070a0c, 0.64),
    wood: standard(0x6f3d21, 0.54),
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
  for (let index = 0; index < image.data.length; index += 4) {
    const value = 116 + Math.floor(Math.random() * 35);
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