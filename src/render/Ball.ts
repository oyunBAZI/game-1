import * as THREE from "three";
import { Quat } from "../core/Quat";
import { Vec3 } from "../core/Vec3";
import { BALL } from "../physics/constants";
import type { BallState } from "../physics/State";
import type { MaterialPalette } from "./ProceduralMaterials";

export class BallVisual {
  readonly mesh: THREE.Mesh;
  readonly group = new THREE.Group();
  private readonly trail: THREE.Line;
  private readonly trailPositions: THREE.Vector3[] = [];
  private readonly ballQuaternion = new Quat();
  private readonly print: THREE.CanvasTexture;
  private readonly shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;

  constructor(materials: MaterialPalette) {
    const geometry = new THREE.SphereGeometry(BALL.radius, 32, 24);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#fff5df"; ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = "#c75d36"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(165, 130, 52, 48, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#343d40"; ctx.font = "bold 34px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("40+", 165, 141);
    }
    this.print = new THREE.CanvasTexture(canvas);
    this.print.colorSpace = THREE.SRGBColorSpace;
    materials.ball.map = this.print;
    materials.ball.needsUpdate = true;
    this.mesh = new THREE.Mesh(geometry, materials.ball);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.name = "ball-visual";
    this.group.add(this.mesh);
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(BALL.radius * 1.4, 24),
      new THREE.MeshBasicMaterial({ color: 0x021019, transparent: true, opacity: 0.35, depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 1;
    this.group.add(this.shadow);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.trail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({ color: 0xd5fbf4, transparent: true, opacity: 0.22 })
    );
    this.trail.visible = false;
    this.group.add(this.trail);
  }

  sync(state: BallState, alpha: number, dt: number, showTrail = false): void {
    const interpolated = Vec3.from(state.previousPosition).lerp(state.position, alpha);
    this.group.position.set(interpolated.x, interpolated.y, interpolated.z);
    const overTable = Math.abs(interpolated.x) < 0.7625 && Math.abs(interpolated.z) < 1.37;
    const surface = overTable ? 0.76 : 0.007;
    const height = Math.max(0, interpolated.y - surface);
    this.shadow.position.y = surface - interpolated.y + 0.003;
    this.shadow.scale.setScalar(1 + Math.min(4, height * 2.2));
    this.shadow.material.opacity = 0.35 / (1 + height * 3.5);
    const spinAxis = state.angularVelocity.clone();
    const angle = spinAxis.length() * Math.min(dt, 1 / 30);
    if (angle > 0.0001) {
      spinAxis.normalize();
      this.ballQuaternion.copy(Quat.fromAxisAngle(spinAxis, angle));
      const quaternion = new THREE.Quaternion(
        this.ballQuaternion.x,
        this.ballQuaternion.y,
        this.ballQuaternion.z,
        this.ballQuaternion.w
      );
      this.mesh.quaternion.multiply(quaternion);
    }
    this.trail.visible = showTrail;
    if (showTrail) {
      if (this.trailPositions.length && this.trailPositions[this.trailPositions.length - 1].distanceTo(this.group.position) > 0.8) {
        this.trailPositions.length = 0;
      }
      this.trailPositions.push(new THREE.Vector3(interpolated.x, interpolated.y, interpolated.z));
      if (this.trailPositions.length > 18) this.trailPositions.shift();
      const geometry = this.trail.geometry;
      geometry.setFromPoints(this.trailPositions);
      this.trail.position.copy(this.group.position).negate();
    } else {
      this.trailPositions.length = 0;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.print.dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
  }
}
