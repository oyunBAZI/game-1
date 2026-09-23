import * as THREE from "three";
import type { Side } from "../core/types";
import type { BallState, PaddleState, PlayerState } from "../physics/State";

/** Lightweight articulated athlete whose striking hand follows the actual racket. */
export class PlayerVisual {
  readonly group = new THREE.Group();
  private readonly upperArm: THREE.Mesh;
  private readonly forearm: THREE.Mesh;
  private readonly leftArm: THREE.Mesh;
  private readonly leftForearm: THREE.Mesh;
  private readonly sleeve: THREE.Mesh;
  private readonly wristband: THREE.Mesh;
  private readonly torso: THREE.Mesh;
  private readonly headPivot: THREE.Group;
  private lastPoseTime = -1;
  private readonly thighs: THREE.Mesh[] = [];
  private readonly calves: THREE.Mesh[] = [];
  private readonly shoes: THREE.Mesh[] = [];
  private readonly soles: THREE.Mesh[] = [];
  private readonly knees: THREE.Mesh[] = [];
  private readonly socks: THREE.Mesh[] = [];
  private readonly footShadows: THREE.Mesh[] = [];
  private readonly hand: THREE.Mesh;
  private readonly otherHand: THREE.Mesh;
  private readonly elbows: THREE.Mesh[] = [];
  private readonly materials: THREE.Material[];
  private readonly fabric: THREE.CanvasTexture;
  private readonly skinGrain: THREE.CanvasTexture;
  private readonly shirtMark: THREE.CanvasTexture;
  private readonly jerseyPrint: THREE.CanvasTexture;
  private readonly groundShadow: THREE.CanvasTexture;
  private readonly forward: number;

  constructor(side: Side) {
    this.group.name = side + "-athlete";
    this.forward = side === "home" ? -1 : 1;
    this.fabric = createFabricTexture();
    this.skinGrain = createSkinTexture();
    this.shirtMark = createShirtMark(side);
    this.jerseyPrint = createJerseyTexture(side);
    this.groundShadow = createGroundShadow();
    const jersey = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, map: this.jerseyPrint,
      roughness: 0.84, sheen: 0.48, sheenRoughness: 0.9,
      bumpMap: this.fabric, bumpScale: 0.001
    });
    const stripe = new THREE.MeshStandardMaterial({ color: side === "home" ? 0xe1c78b : 0xf1e3cb, roughness: 0.72 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x18242c, roughness: 0.92, bumpMap: this.fabric, bumpScale: 0.001 });
    const skin = new THREE.MeshStandardMaterial({
      color: side === "home" ? 0xc18b65 : 0x9d654b,
      roughness: 0.81, bumpMap: this.skinGrain, bumpScale: 0.00035
    });
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

    this.torso = add(createTorsoGeometry(), jersey, 0, 1.08, 0);
    this.torso.name = "athlete-torso";
    const printed = new THREE.MeshStandardMaterial({ map: this.shirtMark, transparent: true, depthWrite: false, roughness: 0.9, side: THREE.DoubleSide });
    this.materials.push(printed);
    for (const z of [-0.125, 0.125]) {
      const print = new THREE.Mesh(new THREE.PlaneGeometry(0.145, 0.145), printed);
      print.position.set(0, 0.04, z);
      if (z < 0) print.rotation.y = Math.PI;
      print.renderOrder = 1;
      this.torso.add(print);
    }
    const chest = add(new THREE.SphereGeometry(0.177, 18, 12), jersey, 0, 1.215, 0);
    chest.scale.set(1, 0.35, 0.72);
    // Rounded shoulders preserve a human silhouette as the arm IK swings.
    for (const x of [-0.17, 0.17]) {
      const shoulderCap = add(new THREE.SphereGeometry(0.082, 16, 12), jersey, x, 1.254, 0);
      shoulderCap.scale.set(1, 0.68, 0.84);
      const sleeveCuff = add(new THREE.TorusGeometry(0.061, 0.005, 5, 20), stripe,
        x > 0 ? 0.245 : -0.245, 1.204, 0);
      sleeveCuff.rotation.z = Math.PI / 2;
    }
    const collar = add(new THREE.TorusGeometry(0.076, 0.012, 6, 20), stripe, 0, 1.325, 0);
    collar.rotation.x = Math.PI / 2;
    const collarShadow = add(new THREE.TorusGeometry(0.061, 0.005, 6, 20), shorts, 0, 1.324, this.forward * 0.005);
    collarShadow.rotation.x = Math.PI / 2;
    const neck = add(new THREE.CylinderGeometry(0.058, 0.065, 0.085, 12), skin, 0, 1.36, 0);
    neck.castShadow = true;
    add(new THREE.BoxGeometry(0.035, 0.37, 0.008), stripe, -0.15, 1.09, this.forward * 0.101);
    add(new THREE.BoxGeometry(0.035, 0.37, 0.008), stripe, 0.15, 1.09, this.forward * 0.101);
    const crest = add(new THREE.CircleGeometry(0.032, 16), stripe, 0, 1.205, this.forward * 0.129);
    crest.rotation.y = this.forward > 0 ? 0 : Math.PI;
    for (const x of [-0.17, 0.17]) {
      const seam = add(new THREE.BoxGeometry(0.007, 0.32, 0.007), stripe, x, 1.06, this.forward * 0.06);
      seam.rotation.z = x < 0 ? -0.1 : 0.1;
    }
    for (const z of [-0.089, 0.089]) {
      add(new THREE.BoxGeometry(0.255, 0.007, 0.01), stripe, 0, 0.848, z);
    }
    const shirtHem = add(new THREE.TorusGeometry(0.122, 0.006, 5, 28), stripe, 0, 0.847, 0);
    shirtHem.rotation.x = Math.PI / 2;
    shirtHem.scale.set(1.13, 0.82, 1);
    const firstHeadPart = this.group.children.length;
    const face = add(createHeadGeometry(), skin, 0, 1.51, 0);
    face.scale.set(0.93, 1.06, 0.96);
    const jaw = add(new THREE.SphereGeometry(0.081, 18, 12), skin, 0, 1.451, this.forward * 0.017);
    jaw.scale.set(0.85, 0.42, 0.83);
    const cap = add(new THREE.SphereGeometry(0.109, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), hair, 0, 1.535, 0);
    cap.scale.z = 1.04;
    for (const [x, z, rotation] of [[-0.052, 0.048, 0.36], [0, 0.084, 0], [0.055, 0.05, -0.33]] as const) {
      const lock = add(new THREE.SphereGeometry(0.033, 12, 8), hair, x, 1.61, this.forward * z);
      lock.scale.set(0.87, 1.35, 0.68);
      lock.rotation.z = rotation;
    }
    for (const x of [-0.101, 0.101]) {
      const ear = add(new THREE.SphereGeometry(0.025, 10, 8), skin, x, 1.505, 0);
      ear.scale.z = 0.63;
    }
    const nose = add(new THREE.SphereGeometry(0.015, 8, 6), skin, 0, 1.49, this.forward * 0.108);
    nose.scale.z = 1.5;
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xe9e4d9, roughness: 0.43 });
    const iris = new THREE.MeshStandardMaterial({ color: 0x302922, roughness: 0.27 });
    this.materials.push(eyeWhite, iris);
    for (const x of [-0.037, 0.037]) {
      const eye = add(new THREE.SphereGeometry(0.012, 12, 8), eyeWhite, x, 1.512, this.forward * 0.098);
      eye.scale.set(1.1, 0.64, 0.5);
      add(new THREE.SphereGeometry(0.006, 10, 8), iris, x, 1.511, this.forward * 0.107);
      const brow = add(new THREE.BoxGeometry(0.028, 0.005, 0.004), hair, x, 1.535, this.forward * 0.098);
      brow.rotation.z = x > 0 ? -0.12 : 0.12;
    }
    add(new THREE.BoxGeometry(0.032, 0.004, 0.004), hair, 0, 1.456, this.forward * 0.105);
    // Parent the whole face to one neck pivot. The athlete can track the real
    // ball without separate eyes, hair and facial features drifting apart.
    const headParts = this.group.children.slice(firstHeadPart);
    this.headPivot = new THREE.Group();
    this.headPivot.name = "athlete-head-rig";
    this.headPivot.position.set(0, 1.465, 0);
    this.group.add(this.headPivot);
    this.group.updateMatrixWorld(true);
    for (const part of headParts) this.headPivot.attach(part);
    add(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 12), shorts, 0, 0.745, 0);
    for (const x of [-0.14, 0.14]) {
      add(new THREE.BoxGeometry(0.009, 0.17, 0.015), stripe, x, 0.745, this.forward * 0.03);
    }
    const limbGeometry = new THREE.CylinderGeometry(0.046, 0.063, 1, 12);
    const forearmGeometry = new THREE.CylinderGeometry(0.033, 0.044, 1, 12);
    this.upperArm = add(limbGeometry, jersey, 0, 0, 0);
    this.forearm = add(forearmGeometry, skin, 0, 0, 0);
    this.leftArm = add(limbGeometry.clone(), jersey, 0, 0, 0);
    this.leftForearm = add(forearmGeometry.clone(), skin, 0, 0, 0);
    this.sleeve = add(new THREE.CylinderGeometry(0.061, 0.058, 1, 16), jersey, 0, 0, 0);
    this.wristband = add(new THREE.CylinderGeometry(0.043, 0.043, 0.045, 14), stripe, 0, 0, 0);
    this.hand = add(new THREE.SphereGeometry(0.042, 12, 10), skin, 0, 0, 0);
    this.otherHand = add(new THREE.SphereGeometry(0.042, 12, 10), skin, 0, 0, 0);
    for (let finger = 0; finger < 4; finger += 1) {
      const digit = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.024, 3, 6), skin);
      digit.position.set((finger - 1.5) * 0.016, -0.027, this.forward * 0.01);
      digit.rotation.z = (finger - 1.5) * 0.11;
      this.hand.add(digit);
    }
    this.elbows.push(add(new THREE.SphereGeometry(0.044, 12, 10), skin, 0, 0, 0));
    this.elbows.push(add(new THREE.SphereGeometry(0.044, 12, 10), skin, 0, 0, 0));
    for (const x of [-0.088, 0.088]) {
      const thigh = add(new THREE.CylinderGeometry(0.067, 0.087, 1, 12), shorts, x, 0.55, 0);
      const calf = add(new THREE.CylinderGeometry(0.058, 0.042, 1, 12), skin, x, 0.24, 0);
      const foot = add(new THREE.SphereGeometry(0.11, 14, 10), shoe, x, 0.06, this.forward * 0.07);
      foot.scale.set(0.67, 0.38, 1.2);
      for (let lace = 0; lace < 3; lace += 1) {
        const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.007, 0.008), sole);
        stitch.position.set(0, 0.103 - lace * 0.012, this.forward * (0.012 + lace * 0.027));
        foot.add(stitch);
      }
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 8), sole);
      toe.position.set(0, -0.026, this.forward * 0.055);
      toe.scale.set(0.82, 0.44, 0.61);
      foot.add(toe);
      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.027, 0.04), stripe);
      heel.position.set(0, -0.048, -this.forward * 0.062);
      foot.add(heel);
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
      const shadow = add(new THREE.PlaneGeometry(0.37, 0.54),
        new THREE.MeshBasicMaterial({
          map: this.groundShadow, transparent: true, opacity: 0.36,
          depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
          toneMapped: false
        }), x, 0.009, this.forward * 0.08);
      shadow.rotation.x = -Math.PI / 2;
      shadow.castShadow = false;
      shadow.receiveShadow = false;
      shadow.renderOrder = 2;
      this.materials.push(shadow.material as THREE.Material);
      this.footShadows.push(shadow);
    }
  }

  sync(player: PlayerState, paddle: PaddleState, alpha: number, time: number, ball?: BallState): void {
    const position = player.previousPosition.clone().lerp(player.position, alpha);
    this.group.position.set(position.x, position.y, position.z);
    if (ball) {
      const dx = ball.position.x - position.x;
      const dz = this.forward * (ball.position.z - position.z);
      const dy = ball.position.y - position.y - 1.465;
      const horizontal = Math.max(0.35, Math.hypot(dx, dz));
      const yaw = THREE.MathUtils.clamp(this.forward * Math.atan2(dx, Math.max(0.2, dz)), -0.42, 0.42);
      const pitch = THREE.MathUtils.clamp(-this.forward * Math.atan2(dy, horizontal), -0.22, 0.22);
      const elapsed = this.lastPoseTime < 0 ? 1 / 60 : Math.max(0, Math.min(0.05, time - this.lastPoseTime));
      const weight = 1 - Math.exp(-10 * elapsed);
      this.headPivot.rotation.y += (yaw - this.headPivot.rotation.y) * weight;
      this.headPivot.rotation.x += (pitch - this.headPivot.rotation.x) * weight;
    }
    this.lastPoseTime = time;
    const hand = new THREE.Vector3(
      paddle.previousPosition.x + (paddle.position.x - paddle.previousPosition.x) * alpha - position.x,
      paddle.previousPosition.y + (paddle.position.y - paddle.previousPosition.y) * alpha - position.y - 0.105,
      paddle.previousPosition.z + (paddle.position.z - paddle.previousPosition.z) * alpha - position.z
    );
    const shoulder = new THREE.Vector3(0.205, 1.27, 0);
    const elbow = this.solveElbow(shoulder, hand);
    this.placeSegment(this.upperArm, shoulder, elbow);
    this.placeSegment(this.forearm, elbow, hand);
    this.placeSegment(this.sleeve, shoulder, shoulder.clone().lerp(elbow, 0.48));
    const wrist = hand.clone().lerp(elbow, 0.13);
    this.wristband.position.copy(wrist);
    this.wristband.quaternion.copy(this.forearm.quaternion);
    const lateral = Math.max(-1, Math.min(1, player.velocity.x / Math.max(1, player.maxSpeed)));
    this.torso.rotation.z = Math.max(-0.16, Math.min(0.16, -hand.x * 0.09 - lateral * 0.065));
    this.torso.rotation.x = Math.max(-0.08, Math.min(0.08, player.velocity.z * this.forward * 0.018));
    this.elbows[0].position.copy(elbow);
    this.hand.position.copy(hand);
    const otherShoulder = new THREE.Vector3(-0.205, 1.27, 0);
    const otherElbow = new THREE.Vector3(-0.32, 1.03, -this.forward * (0.02 + player.velocity.z * 0.009));
    const otherHand = new THREE.Vector3(-0.26, 0.90, this.forward * (0.13 + player.velocity.x * 0.025));
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
      const knee = new THREE.Vector3(x * 1.25 + lateral * 0.045, 0.38, this.forward * (0.06 + stride));
      const ankle = new THREE.Vector3(x * 1.5 + lateral * 0.09, 0.08, this.forward * (0.08 - stride));
      this.placeSegment(this.thighs[index], hip, knee);
      this.placeSegment(this.calves[index], knee, ankle);
      this.knees[index].position.copy(knee);
      this.socks[index].position.copy(ankle).setY(0.145);
      this.shoes[index].position.set(ankle.x, 0.045, ankle.z + this.forward * 0.05);
      this.soles[index].position.set(ankle.x, 0.018, ankle.z + this.forward * 0.05);
      this.footShadows[index].position.set(ankle.x, 0.009, ankle.z + this.forward * 0.05);
      (this.footShadows[index].material as THREE.MeshBasicMaterial).opacity = 0.36 - pace * 0.08;
    }
  }

  private placeSegment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
    const direction = b.clone().sub(a);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.y = direction.length();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  }

  private solveElbow(shoulder: THREE.Vector3, hand: THREE.Vector3): THREE.Vector3 {
    const direction = hand.clone().sub(shoulder);
    const reach = Math.max(0.001, direction.length());
    direction.divideScalar(reach);
    const upper = 0.335;
    const lower = 0.305;
    const constrainedReach = Math.min(reach, upper + lower - 0.001);
    const along = (upper * upper - lower * lower + constrainedReach * constrainedReach) / (2 * constrainedReach);
    const bend = new THREE.Vector3(0.42, -0.32, -this.forward * 0.27).projectOnPlane(direction).normalize();
    const height = Math.sqrt(Math.max(0, upper * upper - along * along));
    return shoulder.clone().addScaledVector(direction, reach > upper + lower ? reach * 0.52 : along)
      .addScaledVector(bend, height);
  }

  dispose(): void {
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
    });
    for (const material of this.materials) material.dispose();
    this.fabric.dispose();
    this.skinGrain.dispose();
    this.shirtMark.dispose();
    this.jerseyPrint.dispose();
    this.groundShadow.dispose();
  }
}

function createGroundShadow(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const image = context.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const distance = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
        const index = (y * size + x) * 4;
        image.data[index] = 8;
        image.data[index + 1] = 18;
        image.data[index + 2] = 23;
        image.data[index + 3] = Math.round(220 * Math.max(0, 1 - distance) ** 2);
      }
    }
    context.putImageData(image, 0, 0);
  }
  return new THREE.CanvasTexture(canvas);
}

/** Tapered cheeks and jaw read more naturally at the broadcast camera distance. */
function createHeadGeometry(): THREE.BufferGeometry {
  const head = new THREE.SphereGeometry(0.105, 28, 20);
  const positions = head.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const y = positions.getY(index) / 0.105;
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const jaw = y < -0.12 ? 1 - (Math.abs(y) - 0.12) * 0.2 : 1;
    positions.setXYZ(index, x * jaw, positions.getY(index), z * (0.93 + 0.07 * (1 - Math.abs(y))));
  }
  head.computeVertexNormals();
  return head;
}

function createJerseyTexture(side: Side): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const image = context.createImageData(size, size);
    const base = side === "home" ? [24, 109, 126] : [151, 48, 48];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const weave = ((x * 31 + y * 17 + x * y * 7) % 11) - 5;
        const panel = Math.abs(x - 128) > 95 ? -22 : Math.abs(x - 128) > 69 ? 8 : 0;
        const shoulder = y < 43 ? 13 : 0;
        const index = (y * size + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          image.data[index + channel] = base[channel] + weave + panel + shoulder;
        }
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Elliptical loft gives the shirt shoulders, ribcage and waist distinct mass. */
function createTorsoGeometry(): THREE.BufferGeometry {
  const rings = [
    [-0.235, 0.13, 0.085], [-0.17, 0.145, 0.104], [-0.04, 0.155, 0.114],
    [0.10, 0.18, 0.12], [0.19, 0.19, 0.105], [0.235, 0.155, 0.083]
  ];
  const segments = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row < rings.length; row += 1) {
    const [y, width, depth] = rings[row];
    for (let column = 0; column <= segments; column += 1) {
      const angle = column / segments * Math.PI * 2;
      positions.push(Math.cos(angle) * width, y, Math.sin(angle) * depth);
      uvs.push(column / segments, row / (rings.length - 1));
      if (row < rings.length - 1 && column < segments) {
        const a = row * (segments + 1) + column;
        const b = a + 1;
        const c = a + segments + 1;
        indices.push(a, c, b, b, c, c + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createSkinTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const image = context.createImageData(size, size);
    let seed = 82532;
    for (let index = 0; index < image.data.length; index += 4) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const value = 122 + (seed >>> 0) % 13;
      image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function createShirtMark(side: Side): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, 256, 256);
    context.fillStyle = "#f1e9d5";
    context.textAlign = "center";
    context.font = "bold 111px Arial, sans-serif";
    context.fillText(side === "home" ? "01" : "02", 128, 148);
    context.font = "bold 25px Arial, sans-serif";
    context.fillText("ULTRA TOUR", 128, 190);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFabricTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const image = context.createImageData(128, 128);
    for (let y = 0; y < 128; y += 1) {
      for (let x = 0; x < 128; x += 1) {
        const value = 110 + ((x * 19 + y * 23 + x * y * 3) % 26) + (x % 4 === 0 ? 14 : 0);
        const index = (y * 128 + x) * 4;
        image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 6);
  return texture;
}
