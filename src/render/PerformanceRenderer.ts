import * as THREE from "three";

export interface RenderStats {
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  textures: number;
  geometries: number;
}

export class PerformanceRenderer {
  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  snapshot(): RenderStats {
    const info = this.renderer.info;
    return {
      calls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      textures: info.memory.textures,
      geometries: info.memory.geometries
    };
  }

  reset(): void {
    this.renderer.info.reset();
  }
}