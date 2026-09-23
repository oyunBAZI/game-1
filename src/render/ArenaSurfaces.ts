import * as THREE from "three";

export type FloorFinish = "training-lab" | "club-hall" | "national-arena" | "night-court" | "world-finals";

/** Repeatable, seeded color/roughness detail. No image download or shader compile is needed. */
export function createArenaSurface(finish: FloorFinish): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const image = context.createImageData(size, size);
    let seed = 0x726f7572;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        const noise = ((seed >>> 0) / 4294967295 - 0.5) * 13;
        let tone = 218 + noise;
        if (finish === "club-hall") {
          // Alternating wood planks with small seams and continuous lengthwise grain.
          const plank = Math.floor(x / 32);
          tone = 207 + Math.sin(x * 0.21 + Math.sin(y * 0.018) * 2) * 9 +
            Math.sin(x * 0.53) * 4 + (plank % 3 - 1) * 7 + noise * 0.42;
          if (x % 32 < 2 || (y + (plank % 2) * 64) % 128 < 2) tone -= 24;
        } else if (finish === "training-lab") {
          // Epoxy tiles and a restrained woven anti-slip finish.
          tone = 212 + noise * 0.75 + Math.sin(x * 0.53) * 2;
          if (x % 64 < 2 || y % 64 < 2) tone -= 12;
        } else if (finish === "night-court") {
          tone = 194 + noise * 1.1 + Math.sin(x * 0.7) * Math.sin(y * 0.7) * 3;
          if (x % 32 === 0 || y % 32 === 0) tone -= 7;
        } else if (finish === "world-finals") {
          // Dense non-slip championship vinyl with fine rolled texture and
          // intermittent skate marks at the outside of the playing volume.
          const grain = Math.sin(x * 0.43) * Math.sin(y * 0.57) * 4;
          const mark = y % 91 < 2 && x > 56 && x < 180 ? -11 : 0;
          tone = 222 + noise * 0.7 + grain + mark;
        } else {
          // Tournament vinyl: subtle factory stipple and rare shoe-scuff streaks.
          const scuff = (y % 83 < 2 && x > 35 && x < 155) ? 12 : 0;
          tone = 216 + noise + Math.sin(x * 0.15 + y * 0.017) * 2 - scuff;
        }
        const offset = (y * size + x) * 4;
        image.data[offset] = tone;
        image.data[offset + 1] = tone;
        image.data[offset + 2] = tone;
        image.data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}
