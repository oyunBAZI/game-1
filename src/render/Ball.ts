import * as THREE from "three";
import { Quat } from "../core/Quat";
import { Vec3 } from "../core/Vec3";
import { BALL } from "../physics/constants";
import { TABLE } from "../physics/constants";
import type { BallState } from "../physics/State";
import type { MaterialPalette } from "./ProceduralMaterials";

export class BallVisual {
  readonly mesh: THREE.Mesh;
  readonly group = new THREE.Group();
  private readonly trail: THREE.Line;
  private readonly trailPositions: THREE.Vector3[] = [];
  private readonly ballQuaternion = new Quat();
  private readonly print: THREE.CanvasTexture;
  private readonly shadowTexture: THREE.CanvasTexture;
  private readonly tableShadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

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
    this.shadowTexture = this.makeShadowTexture();
    this.tableShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.19, 0.19),
      new THREE.MeshBasicMaterial({
        map: this.shadowTexture, transparent: true, opacity: 0.64,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
        toneMapped: false
      })
    );
    this.tableShadow.rotation.x = -Math.PI / 2;
    this.tableShadow.renderOrder = 2;
    this.group.add(this.tableShadow);
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
    const altitude = Math.max(0, interpolated.y - TABLE.top);
    this.tableShadow.visible = Math.abs(interpolated.x) < TABLE.width / 2 - 0.02 &&
      Math.abs(interpolated.z) < TABLE.length / 2 - 0.02 && altitude < 1.4;
    this.tableShadow.position.set(0, TABLE.top + 0.003 - interpolated.y, 0);
    const shadowSize = 0.53 + altitude * 2.3;
    this.tableShadow.scale.set(shadowSize, shadowSize, 1);
    this.tableShadow.material.opacity = 0.72 * Math.exp(-altitude * 2.8);
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

  private makeShadowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const image = context.createImageData(128, 128);
      for (let y = 0; y < 128; y += 1) {
        for (let x = 0; x < 128; x += 1) {
          const radius = Math.hypot((x - 63.5) / 63.5, (y - 63.5) / 63.5);
          const opacity = Math.pow(Math.max(0, 1 - radius), 2.3);
          const index = (y * 128 + x) * 4;
          image.data[index] = 3;
          image.data[index + 1] = 13;
          image.data[index + 2] = 19;
          image.data[index + 3] = Math.round(255 * opacity);
        }
      }
      context.putImageData(image, 0, 0);
    }
    return new THREE.CanvasTexture(canvas);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.print.dispose();
    this.shadowTexture.dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
    this.tableShadow.geometry.dispose();
    this.tableShadow.material.dispose();
  }
}
