import * as THREE from "three";

export interface MaterialPulse {
  material: THREE.Material & { opacity?: number; emissiveIntensity?: number };
  baseOpacity: number;
  targetOpacity: number;
  elapsed: number;
  duration: number;
}

export class MaterialAnimator {
  private pulses: MaterialPulse[] = [];
  private time = 0;

  pulse(material: THREE.Material & { opacity?: number; emissiveIntensity?: number }, targetOpacity = 1, duration = 0.24): void {
    this.pulses.push({
      material,
      baseOpacity: material.opacity ?? 1,
      targetOpacity,
      elapsed: 0,
      duration: Math.max(0.01, duration)
    });
  }

  update(dt: number): void {
    this.time += dt;
    for (let index = this.pulses.length - 1; index >= 0; index -= 1) {
      const pulse = this.pulses[index];
      pulse.elapsed += dt;
      const normalized = Math.min(1, pulse.elapsed / pulse.duration);
      const wave = Math.sin(normalized * Math.PI);
      if (pulse.material.opacity !== undefined) pulse.material.opacity = pulse.baseOpacity + (pulse.targetOpacity - pulse.baseOpacity) * wave;
      if (pulse.material.emissiveIntensity !== undefined) pulse.material.emissiveIntensity = wave;
      if (normalized >= 1) this.pulses.splice(index, 1);
    }
  }

  oscillate(material: THREE.MeshStandardMaterial, minimum: number, maximum: number, speed: number): void {
    material.emissiveIntensity = minimum + (maximum - minimum) * (0.5 + Math.sin(this.time * speed) * 0.5);
  }

  clear(): void {
    this.pulses.length = 0;
  }
}