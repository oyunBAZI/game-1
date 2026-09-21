import * as THREE from "three";
import type { Side } from "../core/types";
import type { PaddleState, PlayerState } from "../physics/State";

/** Lightweight articulated athlete whose striking hand follows the actual racket. */
export class PlayerVisual {
  readonly group = new THREE.Group();
  private readonly upperArm: THREE.Mesh;
  private readonly forearm: THREE.Mesh;
  private readonly leftArm: THREE.Mesh;
  private readonly leftForearm: THREE.Mesh;
  private readonly thighs: THREE.Mesh[] = [];
  private readonly calves: THREE.Mesh[] = [];
  private readonly shoes: THREE.Mesh[] = [];
  private readonly elbows: THREE.Mesh[] = [];
  private readonly hands: THREE.Mesh[] = [];
  private readonly knees: THREE.Mesh[] = [];
  private readonly shadow: THREE.Mesh;
  private readonly materials: THREE.Material[];
  private readonly forward: number;

  constructor(side: Side) {
    this.group.name = side + "-athlete";
    this.forward = side === "home" ? -1 : 1;
    const jersey = new THREE.MeshStandardMaterial({ color: side === "home" ? 0x087b91 : 0xc34b3d, roughness: 0.82 });
    const stripe = new THREE.MeshStandardMaterial({ color: side === "home" ? 0xe1c78b : 0xf1e3cb, roughness: 0.72 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x18242c, roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: side === "home" ? 0xc18b65 : 0x9d654b, roughness: 0.85 });
    const hair = new THREE.MeshStandardMaterial({ color: side === "home" ? 0x1c242a : 0x30231d, roughness: 0.96 });
    const shoe = new THREE.MeshStandardMaterial({ color: side === "home" ? 0xece9dc : 0x25313c, roughness: 0.65 });
    const sole = new THREE.MeshStandardMaterial({ color: side === "home" ? 0x243c46 : 0xf0d9b7, roughness: 0.86 });
    this.materials = [jersey, stripe, shorts, skin, hair, shoe, sole];
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      return mesh;
    };

    const torso = add(new THREE.SphereGeometry(1, 24, 16), jersey, 0, 1.09, 0);
    torso.scale.set(0.205, 0.255, 0.139);
    for (const x of [-0.196, 0.196]) {
      const shoulder = add(new THREE.SphereGeometry(0.071, 12, 10), jersey, x, 1.26, 0);
      shoulder.scale.z = 0.82;
    }
    const collar = add(new THREE.TorusGeometry(0.076, 0.012, 6, 20), stripe, 0, 1.325, 0);
    collar.rotation.x = Math.PI / 2;
    const sidePanels = [-0.153, 0.153];
    for (const x of sidePanels) {
      const panel = add(new THREE.BoxGeometry(0.022, 0.28, 0.013), stripe, x, 1.095, this.forward * 0.082);
      panel.rotation.z = x < 0 ? -0.1 : 0.1;
      const ear = add(new THREE.SphereGeometry(0.022, 10, 8), skin, x < 0 ? -0.103 : 0.103, 1.51, 0);
      ear.scale.z = 0.55;
    }
    add(new THREE.CylinderGeometry(0.059, 0.065, 0.075, 12), skin, 0, 1.365, 0);
    const head = add(new THREE.SphereGeometry(0.106, 24, 16), skin, 0, 1.51, 0);
    head.scale.z = 0.92;
    const cap = add(new THREE.SphereGeometry(0.109, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), hair, 0, 1.535, 0);
    cap.scale.z = 1.04;
    const nose = add(new THREE.SphereGeometry(0.015, 8, 6), skin, 0, 1.49, this.forward * 0.108);
    nose.scale.z = 1.5;
    for (const x of [-0.037, 0.037]) {
      add(new THREE.SphereGeometry(0.008, 8, 6), hair, x, 1.522, this.forward * 0.098);
      const eyebrow = add(new THREE.BoxGeometry(0.025, 0.004, 0.006), hair, x, 1.548, this.forward * 0.095);
      eyebrow.rotation.z = x < 0 ? 0.12 : -0.12;
    }
    add(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 12), shorts, 0, 0.745, 0);
    add(new THREE.TorusGeometry(0.137, 0.009, 5, 18), stripe, 0, 0.847, 0).rotation.x = Math.PI / 2;
    const limbGeometry = new THREE.CylinderGeometry(0.047, 0.055, 1, 9);
    const forearmGeometry = new THREE.CylinderGeometry(0.038, 0.045, 1, 9);
    this.upperArm = add(limbGeometry, jersey, 0, 0, 0);
    this.forearm = add(forearmGeometry, skin, 0, 0, 0);
    this.leftArm = add(limbGeometry.clone(), jersey, 0, 0, 0);
    this.leftForearm = add(forearmGeometry.clone(), skin, 0, 0, 0);
    for (let index = 0; index < 2; index += 1) {
      this.elbows.push(add(new THREE.SphereGeometry(0.045, 12, 10), skin, 0, 0, 0));
      this.hands.push(add(new THREE.SphereGeometry(0.05, 12, 10), skin, 0, 0, 0));
    }
    for (const x of [-0.088, 0.088]) {
      const thigh = add(new THREE.CylinderGeometry(0.072, 0.083, 1, 12), shorts, x, 0.55, 0);
      const calf = add(new THREE.CylinderGeometry(0.047, 0.056, 1, 12), skin, x, 0.24, 0);
      const foot = add(new THREE.SphereGeometry(1, 16, 12), shoe, x, 0.05, this.forward * 0.07);
      foot.scale.set(0.075, 0.052, 0.139);
      const outsole = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), sole);
      outsole.scale.set(0.075, 0.018, 0.142);
      outsole.position.y = -0.032;
      foot.add(outsole);
      this.thighs.push(thigh);
      this.calves.push(calf);
      this.shoes.push(foot);
      this.knees.push(add(new THREE.SphereGeometry(0.057, 12, 10), skin, x, 0.38, 0));
    }
    this.shadow = add(
      new THREE.CircleGeometry(0.38, 32),
      new THREE.MeshBasicMaterial({ color: 0x02121c, transparent: true, opacity: 0.23, depthWrite: false }),
      0, 0.009, 0
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.castShadow = false;
  }

  sync(player: PlayerState, paddle: PaddleState, alpha: number, time: number): void {
    const position = player.previousPosition.clone().lerp(player.position, alpha);
    this.group.position.set(position.x, position.y, position.z);
    const hand = new THREE.Vector3(
      paddle.previousPosition.x + (paddle.position.x - paddle.previousPosition.x) * alpha - position.x,
      paddle.previousPosition.y + (paddle.position.y - paddle.previousPosition.y) * alpha - position.y - 0.105,
      paddle.previousPosition.z + (paddle.position.z - paddle.previousPosition.z) * alpha - position.z
    );
    const shoulder = new THREE.Vector3(0.205, 1.27, 0);
    const elbow = shoulder.clone().lerp(hand, 0.48).add(new THREE.Vector3(0.11, -0.08, -this.forward * 0.06));
    this.placeSegment(this.upperArm, shoulder, elbow);
    this.placeSegment(this.forearm, elbow, hand);
    this.elbows[0].position.copy(elbow);
    this.hands[0].position.copy(hand);
    const otherShoulder = new THREE.Vector3(-0.205, 1.27, 0);
    const otherElbow = new THREE.Vector3(-0.32, 1.03, -this.forward * 0.02);
    const otherHand = new THREE.Vector3(-0.26, 0.90, this.forward * 0.13);
    this.placeSegment(this.leftArm, otherShoulder, otherElbow);
    this.placeSegment(this.leftForearm, otherElbow, otherHand);
    this.elbows[1].position.copy(otherElbow);
    this.hands[1].position.copy(otherHand);

    const pace = Math.min(1, player.velocity.length() / Math.max(1, player.maxSpeed));
    const sway = Math.sin(time * 12) * 0.07 * pace;
    for (let index = 0; index < 2; index += 1) {
      const x = index ? 0.088 : -0.088;
      const stride = sway * (index ? -1 : 1);
      const hip = new THREE.Vector3(x, 0.69, 0);
      const knee = new THREE.Vector3(x * 1.25, 0.38, this.forward * (0.06 + stride));
      const ankle = new THREE.Vector3(x * 1.5, 0.08, this.forward * (0.08 - stride));
      this.placeSegment(this.thighs[index], hip, knee);
      this.placeSegment(this.calves[index], knee, ankle);
      this.knees[index].position.copy(knee);
      this.shoes[index].position.set(ankle.x, 0.045, ankle.z + this.forward * 0.05);
    }
  }

  private placeSegment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
    const direction = b.clone().sub(a);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.y = direction.length();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  }

  dispose(): void {
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
    });
    for (const material of this.materials) material.dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
