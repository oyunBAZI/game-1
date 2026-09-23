import * as THREE from "three";
import type { ArenaProfile } from "../content/ArenaCatalog";

/** Small, authored lighting accents. One generated texture is shared by every
 * floor pool, and both venue displays share another texture and material. */
export class ArenaAtmosphere {
  readonly group = new THREE.Group();
  private readonly poolTexture: THREE.CanvasTexture;
  private readonly boardTexture: THREE.CanvasTexture;
  private readonly boardCanvas: HTMLCanvasElement;
  private readonly pools: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly accents: THREE.MeshBasicMaterial[] = [];

  constructor() {
    this.group.name = "arena-atmosphere";
    this.poolTexture = this.makePoolTexture();
    this.boardCanvas = document.createElement("canvas");
    this.boardCanvas.width = 768;
    this.boardCanvas.height = 384;
    this.boardTexture = new THREE.CanvasTexture(this.boardCanvas);
    this.boardTexture.colorSpace = THREE.SRGBColorSpace;
    this.boardTexture.anisotropy = 4;

    const poolMaterial = new THREE.MeshBasicMaterial({
      map: this.poolTexture, transparent: true, depthWrite: false,
      opacity: 0.28, blending: THREE.AdditiveBlending, toneMapped: false
    });
    const poolGeometry = new THREE.PlaneGeometry(2.3, 2.8);
    for (const x of [-2.05, 0, 2.05]) {
      for (const z of [-2.35, 0, 2.35]) {
        const pool = new THREE.Mesh(poolGeometry, poolMaterial);
        pool.name = "court-light-pool";
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x, 0.009, z);
        pool.renderOrder = 1;
        this.group.add(pool);
        this.pools.push(pool);
      }
    }

    const bezel = new THREE.MeshStandardMaterial({ color: 0x14252e, metalness: 0.55, roughness: 0.4 });
    const screen = new THREE.MeshBasicMaterial({ map: this.boardTexture, toneMapped: false });
    const accent = new THREE.MeshBasicMaterial({ color: 0x68ddd4, toneMapped: false });
    this.accents.push(accent);
    for (const x of [-3.75, 3.75]) {
      const mount = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.18, 0.12), bezel);
      mount.position.set(x, 2.9, -5.535);
      const display = new THREE.Mesh(new THREE.PlaneGeometry(2.17, 1.04), screen);
      display.name = "venue-display";
      display.position.set(x, 2.9, -5.461);
      const indicator = new THREE.Mesh(new THREE.BoxGeometry(2.17, 0.018, 0.012), accent);
      indicator.position.set(x, 2.353, -5.45);
      this.group.add(mount, display, indicator);
    }
  }

  setProfile(profile: ArenaProfile): void {
    const color = new THREE.Color(profile.lightColor).lerp(new THREE.Color(profile.accentColor), 0.27);
    for (const pool of this.pools) {
      pool.material.color.copy(color);
      pool.material.opacity = profile.id === "night-court" ? 0.18 :
        profile.id === "national-arena" ? 0.27 : 0.20;
    }
    for (const accent of this.accents) accent.color.setHex(profile.accentColor);
    const context = this.boardCanvas.getContext("2d");
    if (!context) return;
    const accent = `#${profile.accentColor.toString(16).padStart(6, "0")}`;
    const gradient = context.createLinearGradient(0, 0, 768, 384);
    gradient.addColorStop(0, "#0c1a23");
    gradient.addColorStop(1, "#1b313b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 768, 384);
    context.strokeStyle = accent;
    context.globalAlpha = 0.28;
    context.lineWidth = 2;
    if (profile.id === "training-lab") {
      for (let x = 0; x < 768; x += 48) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 384); context.stroke();
      }
      for (let y = 0; y < 384; y += 48) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(768, y); context.stroke();
      }
      context.lineWidth = 6;
      context.beginPath();
      for (let x = 0; x <= 768; x += 8) {
        const y = 300 - Math.sin(x * 0.018) * 40 - Math.sin(x * 0.039) * 13;
        if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    } else if (profile.id === "club-hall") {
      for (let x = 0; x < 768; x += 23) {
        context.fillStyle = x % 3 === 0 ? "#ca985d" : accent;
        context.fillRect(x, 0, x % 4 === 0 ? 5 : 2, 384);
      }
      context.fillStyle = "#d2a879";
      context.fillRect(0, 300, 768, 17);
    } else if (profile.id === "night-court") {
      context.lineWidth = 7;
      for (const radius of [90, 154, 224, 300]) {
        context.beginPath(); context.ellipse(690, 185, radius, radius * 0.8, 0, 0, Math.PI * 2);
        context.stroke();
      }
    } else {
      context.lineWidth = 13;
      for (let index = -3; index < 12; index += 1) {
        context.beginPath();
        context.moveTo(index * 92, 384);
        context.lineTo(index * 92 + 340, 0);
        context.stroke();
      }
      context.fillStyle = accent;
      context.fillRect(0, 310, 768, 14);
    }
    context.globalAlpha = 1;
    context.fillStyle = accent;
    context.fillRect(42, 48, 100, 7);
    context.fillRect(42, 328, 684, 5);
    context.fillStyle = "#f5f3e9";
    context.font = "bold 34px Arial, sans-serif";
    context.fillText("TABLE TENNIS ULTRA", 42, 112);
    context.font = "bold 62px Arial, sans-serif";
    context.fillText(profile.label.toUpperCase(), 42, 201, 685);
    context.fillStyle = accent;
    context.font = "bold 26px Arial, sans-serif";
    context.fillText("COURT 01    /    LIVE MATCH", 42, 273);
    this.boardTexture.needsUpdate = true;
  }

  dispose(): void {
    this.poolTexture.dispose();
    this.boardTexture.dispose();
  }

  private makePoolTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,255,255,0.58)");
      gradient.addColorStop(0.32, "rgba(255,255,255,0.31)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }
}
