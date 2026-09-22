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
  private readonly soles: THREE.Mesh[] = [];
  private readonly knees: THREE.Mesh[] = [];
  private readonly socks: THREE.Mesh[] = [];
  private readonly hand: THREE.Mesh;
  private readonly otherHand: THREE.Mesh;
  private readonly elbows: THREE.Mesh[] = [];
  private readonly materials: THREE.Material[];
  private readonly forward: number;

  constructor(side: Side) {
    this.group.name = side + "-athlete";
    this.forward = side === "home" ? -1 : 1;
    const jersey = new THREE.MeshStandardMaterial({ color: side === "home" ? 0x136e7e : 0xb03b37, roughness: 0.76 });
    const stripe = new THREE.MeshStandardMaterial({ color: side === "home" ? 0xe1c78b : 0xf1e3cb, roughness: 0.72 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x18242c, roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: side === "home" ? 0xc18b65 : 0x9d654b, roughness: 0.85 });
    const hair = new THREE.MeshStandardMaterial({ color: side === "home" ? 0x1c242a : 0x30231d, roughness: 0.96 });
    const shoe = new THREE.MeshStandardMaterial({ color: side === "home" ? 0xeee7d8 : 0x26313d, roughness: 0.65 });
    const sole = new THREE.MeshStandardMaterial({ color: 0xe2e2d8, roughness: 0.8 });
    const sock = new THREE.MeshStandardMaterial({ color: 0xd9ded7, roughness: 0.9 });
    this.materials = [jersey, stripe, shorts, skin, hair, shoe, sole, sock];
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      return mesh;
    };

    const torso = add(new THREE.CylinderGeometry(0.19, 0.135, 0.47, 12), jersey, 0, 1.08, 0);
    torso.scale.z = 0.72;
    const chest = add(new THREE.SphereGeometry(0.177, 18, 12), jersey, 0, 1.215, 0);
    chest.scale.set(1, 0.35, 0.72);
    const collar = add(new THREE.TorusGeometry(0.076, 0.012, 6, 20), stripe, 0, 1.325, 0);
    collar.rotation.x = Math.PI / 2;
    const neck = add(new THREE.CylinderGeometry(0.058, 0.065, 0.085, 12), skin, 0, 1.36, 0);
    neck.castShadow = true;
    add(new THREE.BoxGeometry(0.035, 0.37, 0.008), stripe, -0.15, 1.09, this.forward * 0.101);
    add(new THREE.BoxGeometry(0.035, 0.37, 0.008), stripe, 0.15, 1.09, this.forward * 0.101);
    const crest = add(new THREE.CircleGeometry(0.032, 16), stripe, 0, 1.205, this.forward * 0.129);
    crest.rotation.y = this.forward > 0 ? 0 : Math.PI;
    const face = add(new THREE.SphereGeometry(0.105, 20, 16), skin, 0, 1.51, 0);
    face.scale.set(0.93, 1.06, 0.96);
    const cap = add(new THREE.SphereGeometry(0.109, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), hair, 0, 1.535, 0);
    cap.scale.z = 1.04;
    for (const x of [-0.101, 0.101]) {
      const ear = add(new THREE.SphereGeometry(0.025, 10, 8), skin, x, 1.505, 0);
      ear.scale.z = 0.63;
    }
    const nose = add(new THREE.SphereGeometry(0.015, 8, 6), skin, 0, 1.49, this.forward * 0.108);
    nose.scale.z = 1.5;
    for (const x of [-0.037, 0.037]) {
      add(new THREE.SphereGeometry(0.007, 8, 6), hair, x, 1.51, this.forward * 0.101);
      const brow = add(new THREE.BoxGeometry(0.028, 0.005, 0.004), hair, x, 1.535, this.forward * 0.098);
      brow.rotation.z = x > 0 ? -0.12 : 0.12;
    }
    add(new THREE.BoxGeometry(0.032, 0.004, 0.004), hair, 0, 1.456, this.forward * 0.105);
    add(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 12), shorts, 0, 0.745, 0);
    const limbGeometry = new THREE.CylinderGeometry(0.046, 0.063, 1, 12);
    const forearmGeometry = new THREE.CylinderGeometry(0.033, 0.044, 1, 12);
    this.upperArm = add(limbGeometry, jersey, 0, 0, 0);
    this.forearm = add(forearmGeometry, skin, 0, 0, 0);
    this.leftArm = add(limbGeometry.clone(), jersey, 0, 0, 0);
    this.leftForearm = add(forearmGeometry.clone(), skin, 0, 0, 0);
    this.hand = add(new THREE.SphereGeometry(0.042, 12, 10), skin, 0, 0, 0);
    this.otherHand = add(new THREE.SphereGeometry(0.042, 12, 10), skin, 0, 0, 0);
    this.elbows.push(add(new THREE.SphereGeometry(0.044, 12, 10), skin, 0, 0, 0));
    this.elbows.push(add(new THREE.SphereGeometry(0.044, 12, 10), skin, 0, 0, 0));
    for (const x of [-0.088, 0.088]) {
      const thigh = add(new THREE.CylinderGeometry(0.067, 0.087, 1, 12), shorts, x, 0.55, 0);
      const calf = add(new THREE.CylinderGeometry(0.058, 0.042, 1, 12), skin, x, 0.24, 0);
      const foot = add(new THREE.SphereGeometry(0.11, 14, 10), shoe, x, 0.06, this.forward * 0.07);
      foot.scale.set(0.67, 0.38, 1.2);
      const knee = add(new THREE.SphereGeometry(0.064, 12, 10), skin, x, 0.38, 0);
      const sockBand = add(new THREE.CylinderGeometry(0.053, 0.049, 0.10, 10), sock, x, 0.14, 0);
      const outsole = add(new THREE.SphereGeometry(0.106, 12, 8), sole, x, 0.025, this.forward * 0.1);
      outsole.scale.set(0.67, 0.11, 1.2);
      this.thighs.push(thigh);
      this.calves.push(calf);
      this.shoes.push(foot);
      this.soles.push(outsole);
      this.knees.push(knee);
      this.socks.push(sockBand);
    }
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
    this.hand.position.copy(hand);
    const otherShoulder = new THREE.Vector3(-0.205, 1.27, 0);
    const otherElbow = new THREE.Vector3(-0.32, 1.03, -this.forward * 0.02);
    const otherHand = new THREE.Vector3(-0.26, 0.90, this.forward * 0.13);
    this.placeSegment(this.leftArm, otherShoulder, otherElbow);
    this.placeSegment(this.leftForearm, otherElbow, otherHand);
    this.elbows[1].position.copy(otherElbow);
    this.otherHand.position.copy(otherHand);

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
      this.socks[index].position.copy(ankle).setY(0.145);
      this.shoes[index].position.set(ankle.x, 0.045, ankle.z + this.forward * 0.05);
      this.soles[index].position.set(ankle.x, 0.018, ankle.z + this.forward * 0.05);
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
  }
}
