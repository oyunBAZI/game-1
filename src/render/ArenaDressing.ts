import * as THREE from "three";
import type { ArenaProfile } from "../content/ArenaCatalog";

/** Architectural layers sit outside the playable volume. All repeated ceiling
 * panels and court lights are instanced to keep the additional draw calls low. */
export class ArenaDressing {
  readonly group = new THREE.Group();
  readonly national = new THREE.Group();
  readonly finals = new THREE.Group();
  readonly club = new THREE.Group();
  readonly lab = new THREE.Group();
  readonly night = new THREE.Group();
  private readonly accent = new THREE.MeshBasicMaterial({ color: 0x6acfc8, toneMapped: false });
  private readonly fixture = new THREE.MeshStandardMaterial({
    color: 0xc7dedc, emissive: 0x97d9d2, emissiveIntensity: 0.38, roughness: 0.25
  });
  private readonly glass = new THREE.MeshPhysicalMaterial({
    color: 0x779199, metalness: 0.27, roughness: 0.2,
    transparent: true, opacity: 0.56, depthWrite: false, clearcoat: 0.8
  });
  private readonly displayTexture: THREE.CanvasTexture;

  constructor() {
    this.group.name = "arena-architecture";
    this.national.name = "national-broadcast-architecture";
    this.finals.name = "world-finals-architecture";
    this.club.name = "club-architecture";
    this.lab.name = "training-architecture";
    this.night.name = "night-architecture";
    this.group.add(this.national, this.finals, this.club, this.lab, this.night);
    const structural = new THREE.MeshStandardMaterial({ color: 0x1a2a31, roughness: 0.55, metalness: 0.55 });
    this.addCeiling(structural);
    this.addNational(structural);
    this.addFinals(structural);
    this.addClub(structural);
    this.displayTexture = this.makeTrainingDisplay();
    this.addLab(structural);
    this.addNight(structural);
  }

  private addCeiling(structural: THREE.Material): void {
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(13.9, 11.4),
      new THREE.MeshStandardMaterial({ color: 0x17242c, roughness: 0.94, side: THREE.DoubleSide }));
    roof.name = "acoustic-ceiling";
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, 5.12, -0.35);
    this.group.add(roof);

    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.72, 0.035, 0.72), structural, 48);
    mesh.name = "ceiling-coffers";
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        dummy.position.set((col - 3.5) * 1.73, 5.02, (row - 2.5) * 1.78 - 0.35);
        dummy.updateMatrix();
        mesh.setMatrixAt(index++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);

    // Soft luminous patches read as large broadcast fixtures in reflections.
    const lights = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.42, 0.23), this.fixture, 16);
    lights.name = "overhead-softboxes";
    index = 0;
    for (const x of [-4.25, -1.4, 1.4, 4.25]) {
      for (const z of [-3.05, -1.05, 1.05, 3.05]) {
        dummy.position.set(x, 4.96, z);
        dummy.rotation.set(Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        lights.setMatrixAt(index++, dummy.matrix);
      }
    }
    lights.instanceMatrix.needsUpdate = true;
    this.group.add(lights);
  }

  private addNational(structural: THREE.Material): void {
    // An upper concourse behind the lower spectator seating, split to keep
    // the central game scoreboard clear in the competitive camera.
    const seating = new THREE.MeshStandardMaterial({ color: 0x34515c, roughness: 0.86 });
    const dummy = new THREE.Object3D();
    const count = 2 * 4 * 14;
    const chairs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.22, 0.23), seating, count);
    chairs.name = "upper-gallery-seats";
    let index = 0;
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 4; tier += 1) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.15, 0.36), structural);
        shelf.position.set(side * 4.55, 1.44 + tier * 0.29, -5.08 - tier * 0.17);
        this.national.add(shelf);
        for (let chair = 0; chair < 14; chair += 1) {
          dummy.position.set(side * (2.63 + chair * 0.293), 1.61 + tier * 0.29, -5.08 - tier * 0.17);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          chairs.setMatrixAt(index, dummy.matrix);
          chairs.setColorAt(index, new THREE.Color((chair + tier) % 6 === 0 ? 0x8c9e9c : 0x416a73));
          index += 1;
        }
      }
    }
    chairs.instanceMatrix.needsUpdate = true;
    this.national.add(chairs);
    for (const side of [-1, 1]) {
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(4.13, 0.035, 0.055), this.accent);
      ribbon.position.set(side * 4.55, 1.35, -4.83);
      this.national.add(ribbon);
      const header = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.29, 0.1), structural);
      header.position.set(side * 4.55, 2.85, -5.48);
      this.national.add(header);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(3.88, 0.014, 0.012), this.accent);
      edge.position.set(side * 4.55, 2.69, -5.42);
      this.national.add(edge);
    }
    this.addRectangularRig(this.national, structural, 4.25, 2.95, 4.64);
  }

  /** A distinct championship silhouette. The ring, rear pennants and tiers
   * live outside the playing space, leaving the ball and scoreboard readable. */
  private addFinals(structural: THREE.Material): void {
    const copper = new THREE.MeshPhysicalMaterial({
      color: 0xa88259, metalness: 0.79, roughness: 0.3, clearcoat: 0.24
    });
    const inner = new THREE.MeshStandardMaterial({ color: 0x273944, metalness: 0.52, roughness: 0.52 });
    const fabric = new THREE.MeshStandardMaterial({
      color: 0xd6a365, roughness: 0.85, side: THREE.DoubleSide
    });
    for (const radius of [0, 0.23]) {
      const ring = new THREE.EllipseCurve(0, 0, 4.95 + radius, 3.72 + radius, 0, Math.PI * 2);
      const path = new THREE.CatmullRomCurve3(ring.getPoints(96).map(({ x, y }) =>
        new THREE.Vector3(x, 4.61, y - 0.3)), true);
      const rim = new THREE.Mesh(new THREE.TubeGeometry(path, 128, radius ? 0.042 : 0.075, 8, true),
        radius ? this.accent : copper);
      rim.name = "championship-light-ring";
      this.finals.add(rim);
    }
    for (const side of [-1, 1]) {
      for (const x of [2.55, 4.65]) {
        const centerX = side * x;
        const support = new THREE.Mesh(new THREE.BoxGeometry(0.13, 3.5, 0.24), structural);
        support.position.set(centerX, 2.8, -5.48);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.35), copper);
        foot.position.set(centerX, 1.11, -5.42);
        this.finals.add(support, foot);
      }
      const gallery = new THREE.Mesh(new THREE.BoxGeometry(3.88, 0.19, 0.68), inner);
      gallery.position.set(side * 3.62, 1.48, -5.05);
      const litEdge = new THREE.Mesh(new THREE.BoxGeometry(3.88, 0.029, 0.074), copper);
      litEdge.position.set(side * 3.62, 1.60, -4.68);
      this.finals.add(gallery, litEdge);

      for (const x of [2.85, 4.28]) {
        const banner = new THREE.PlaneGeometry(1.08, 1.4, 12, 14);
        const position = banner.getAttribute("position");
        for (let index = 0; index < position.count; index += 1) {
          const px = position.getX(index);
          const py = position.getY(index);
          position.setZ(index, Math.sin(px * 7 + py * 3) * 0.025 * (1 - py / 1.6));
        }
        banner.computeVertexNormals();
        const pennant = new THREE.Mesh(banner, fabric);
        pennant.name = "championship-pennant";
        pennant.position.set(side * x, 3.4, -5.31);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.055, 0.055), copper);
        cap.position.set(side * x, 4.14, -5.29);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.24, 0.012), inner);
        stripe.position.set(side * x, 3.44, -5.272);
        this.finals.add(pennant, cap, stripe);
      }
    }
    for (const z of [-4.5, 4.15]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(10.3, 0.12, 0.14), structural);
      beam.position.set(0, 4.72, z);
      this.finals.add(beam);
    }
  }

  private addRectangularRig(group: THREE.Group, structural: THREE.Material,
    width: number, depth: number, height: number): void {
    for (const x of [-width, width]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, depth * 2), structural);
      beam.position.set(x, height, 0);
      group.add(beam);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.012, depth * 2), this.accent);
      edge.position.set(x, height - 0.085, 0);
      group.add(edge);
    }
    for (const z of [-depth, depth]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(width * 2, 0.13, 0.09), structural);
      beam.position.set(0, height, z);
      group.add(beam);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(width * 2, 0.012, 0.015), this.accent);
      edge.position.set(0, height - 0.085, z);
      group.add(edge);
    }
  }

  private addClub(structural: THREE.Material): void {
    const timber = new THREE.MeshStandardMaterial({ color: 0x896b4f, roughness: 0.67, metalness: 0.02 });
    const slat = new THREE.InstancedMesh(new THREE.BoxGeometry(0.068, 0.22, 10.2), timber, 36);
    slat.name = "club-ceiling-timber";
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 36; i += 1) {
      dummy.position.set((i - 17.5) * 0.37, 4.78, -0.3);
      dummy.updateMatrix();
      slat.setMatrixAt(i, dummy.matrix);
    }
    slat.instanceMatrix.needsUpdate = true;
    this.club.add(slat);
    const shade = new THREE.MeshStandardMaterial({ color: 0x34291f, roughness: 0.57, metalness: 0.45 });
    for (const x of [-3.85, 3.85]) {
      for (const z of [-2.6, 0, 2.6]) {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.68, 6), structural);
        cord.position.set(x, 4.46, z);
        const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.28, 0.18, 24, 1, true), shade);
        pendant.position.set(x, 4.09, z);
        const diffuser = new THREE.Mesh(new THREE.CircleGeometry(0.25, 24),
          new THREE.MeshBasicMaterial({ color: 0xffe0ab, toneMapped: false }));
        diffuser.position.set(x, 4.0, z);
        diffuser.rotation.x = Math.PI / 2;
        this.club.add(cord, pendant, diffuser);
      }
    }
  }

  private makeTrainingDisplay(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#0a2531";
      context.fillRect(0, 0, 512, 256);
      context.strokeStyle = "#1f5564";
      context.lineWidth = 1;
      for (let x = 0; x < 512; x += 32) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 256); context.stroke();
      }
      for (let y = 0; y < 256; y += 32) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(512, y); context.stroke();
      }
      context.strokeStyle = "#71e5d3";
      context.lineWidth = 3;
      context.beginPath();
      for (let x = 28; x < 490; x += 5) {
        const y = 150 - Math.sin(x * 0.019) * 34 - Math.sin(x * 0.047) * 12;
        if (x === 28) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
      context.fillStyle = "#d9f7ee";
      context.font = "bold 24px Arial, sans-serif";
      context.fillText("TRAJECTORY  /  SPIN", 28, 42);
      context.font = "18px monospace";
      context.fillText("240 Hz  •  LIVE TRACKING", 28, 222);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  private addLab(structural: THREE.Material): void {
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.28, 1.14),
      new THREE.MeshBasicMaterial({ map: this.displayTexture, toneMapped: false }));
    screen.name = "training-trajectory-display";
    screen.position.set(0, 2.79, -5.49);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.39, 1.25, 0.08), structural);
    frame.position.set(0, 2.79, -5.55);
    this.lab.add(frame, screen);
    for (const x of [-5.85, 5.85]) {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.07, 3.9, 0.12), structural);
      upright.position.set(x, 2.4, -5.53);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), this.glass);
      glass.position.set(x + (x < 0 ? 0.48 : -0.48), 2.7, -5.48);
      this.lab.add(upright, glass);
    }
  }

  private addNight(structural: THREE.Material): void {
    for (const z of [-5.2, -4.95, -4.7]) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i += 1) {
        const x = -5.55 + (i / 24) * 11.1;
        points.push(new THREE.Vector3(x, 1.28 + 2.77 * Math.sqrt(Math.max(0, 1 - (x / 5.6) ** 2)), z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const arch = new THREE.Mesh(new THREE.TubeGeometry(curve, 88, 0.042, 8, false), structural);
      const strip = new THREE.Mesh(new THREE.TubeGeometry(curve, 88, 0.012, 6, false), this.accent);
      arch.name = "night-portal";
      this.night.add(arch, strip);
    }
    for (const x of [-5.55, 5.55]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), structural);
      base.position.set(x, 0.07, -5.0);
      this.night.add(base);
    }
  }

  setProfile(profile: ArenaProfile): void {
    this.national.visible = profile.id === "national-arena";
    this.finals.visible = profile.id === "world-finals";
    this.club.visible = profile.id === "club-hall";
    this.lab.visible = profile.id === "training-lab";
    this.night.visible = profile.id === "night-court";
    this.accent.color.setHex(profile.accentColor);
    this.fixture.emissive.setHex(profile.lightColor);
    this.fixture.emissiveIntensity = profile.id === "night-court" ? 0.14 : 0.38;
  }

  dispose(): void {
    this.displayTexture.dispose();
  }
}
