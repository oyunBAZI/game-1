import type { Vec3Like } from "../core/types";

export class AudioSpatializer {
  private listener: AudioListener | null = null;
  private nodes = new Map<string, PannerNode>();

  attach(context: AudioContext, target: AudioNode, id: string, position: Vec3Like): PannerNode {
    const panner = context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.maxDistance = 18;
    panner.rolloffFactor = 1.1;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    target.connect(panner);
    this.nodes.set(id, panner);
    return panner;
  }

  move(id: string, position: Vec3Like): void {
    const panner = this.nodes.get(id);
    if (!panner) return;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
  }

  setListener(listener: AudioListener): void {
    this.listener = listener;
  }

  clear(): void {
    for (const node of this.nodes.values()) node.disconnect();
    this.nodes.clear();
    this.listener = null;
  }
}