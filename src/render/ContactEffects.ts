import * as THREE from "three";
import type { CollisionContact } from "../core/types";
import { TABLE } from "../physics/constants";

interface Ripple {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  age: number;
}

/** Short lived tabletop contact cues make a 40 mm ball easier to track during
 * fast rallies. The ring sits on the real impact point and never affects play. */
export class ContactEffects {
  readonly group = new THREE.Group();
  private readonly ripples: Ripple[] = [];
  private cursor = 0;

  constructor() {
    this.group.name = "table-contact-effects";
    const geometry = new THREE.RingGeometry(0.018, 0.026, 32);
    for (let i = 0; i < 12; i += 1) {
      const mesh = new THREE.Mesh(geometry,
        new THREE.MeshBasicMaterial({
          color: 0xd7e6dc, transparent: true, opacity: 0,
          depthWrite: false, toneMapped: false, side: THREE.DoubleSide
        }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 3;
      this.group.add(mesh);
      this.ripples.push({ mesh, age: 1 });
    }
  }

  record(contact: CollisionContact): void {
    if ((contact.kind !== "table" && contact.surfaceId !== "table-edge") ||
        Math.abs(contact.point.x) > TABLE.width / 2 + 0.005 ||
        Math.abs(contact.point.z) > TABLE.length / 2 + 0.005) return;
    const ripple = this.ripples[this.cursor];
    this.cursor = (this.cursor + 1) % this.ripples.length;
    ripple.age = 0;
    ripple.mesh.position.set(contact.point.x, TABLE.top + 0.003, contact.point.z);
    ripple.mesh.scale.setScalar(0.8);
    ripple.mesh.visible = true;
  }

  update(dt: number): void {
    for (const ripple of this.ripples) {
      if (!ripple.mesh.visible) continue;
      ripple.age += Math.max(0, dt);
      const fraction = Math.min(1, ripple.age / 0.25);
      ripple.mesh.visible = fraction < 1;
      ripple.mesh.scale.setScalar(0.8 + fraction * 2.3);
      ripple.mesh.material.opacity = 0.42 * (1 - fraction) ** 2;
    }
  }
}
