import * as THREE from "three";
import { TABLE } from "../physics/constants";
import type { MaterialPalette } from "./ProceduralMaterials";

export class TableVisual {
  readonly group = new THREE.Group();
  private readonly top: THREE.Mesh;
  private readonly legs = new THREE.Group();
  private readonly net = new THREE.Group();
  private readonly netSurface: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly netTexture: THREE.CanvasTexture;
  private readonly badgeTexture: THREE.CanvasTexture;

  constructor(private readonly materials: MaterialPalette) {
    this.group.name = "table-visual";
    const topGeometry = new THREE.BoxGeometry(TABLE.width, TABLE.thickness, TABLE.length);
    this.top = new THREE.Mesh(topGeometry, materials.table);
    this.top.position.y = TABLE.top - TABLE.thickness / 2;
    this.top.castShadow = true;
    this.top.receiveShadow = true;
    this.group.add(this.top);
    this.addBoundaryLines();
    this.addUnderframe();
    this.addLegs();
    this.badgeTexture = this.addBranding();
    this.netTexture = this.makeNetTexture();
    this.netSurface = this.addNet();
  }

  private addBoundaryLines(): void {
    const lineHeight = TABLE.top + 0.001;
    const lineWidth = 0.018;
    const horizontal = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.width - 0.03, 0.002, lineWidth),
      this.materials.tableLine
    );
    horizontal.position.set(0, lineHeight, -TABLE.length / 2 + 0.018);
    const horizontal2 = horizontal.clone();
    horizontal2.position.z = TABLE.length / 2 - 0.018;
    const vertical = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, 0.002, TABLE.length - 0.03),
      this.materials.tableLine
    );
    vertical.position.set(-TABLE.width / 2 + 0.018, lineHeight, 0);
    const vertical2 = vertical.clone();
    vertical2.position.x = TABLE.width / 2 - 0.018;
    this.group.add(horizontal, horizontal2, vertical, vertical2);
    const center = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.002, TABLE.length - 0.04),
      this.materials.tableLine
    );
    center.position.set(0, lineHeight + 0.0005, 0);
    this.group.add(center);
  }

  private addUnderframe(): void {
    const lowerLip = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.width + 0.009, 0.009, TABLE.length + 0.009),
      this.materials.metal
    );
    lowerLip.position.y = TABLE.top - TABLE.thickness - 0.004;
    lowerLip.castShadow = true;
    this.group.add(lowerLip);
    const railY = TABLE.top - 0.08;
    const longRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, TABLE.length + 0.12),
      this.materials.tableEdge
    );
    longRail.position.set(-TABLE.width / 2 + 0.07, railY, 0);
    const longRail2 = longRail.clone();
    longRail2.position.x = TABLE.width / 2 - 0.07;
    const endRail = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.width - 0.08, 0.06, 0.06),
      this.materials.tableEdge
    );
    endRail.position.set(0, railY, -TABLE.length / 2 + 0.07);
    const endRail2 = endRail.clone();
    endRail2.position.z = TABLE.length / 2 - 0.07;
    this.group.add(longRail, longRail2, endRail, endRail2);
    for (const z of [-0.82, 0.82]) {
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(TABLE.width - 0.12, 0.035, 0.035), this.materials.metal);
      crossbar.position.set(0, TABLE.top - 0.24, z);
      crossbar.castShadow = true;
      this.group.add(crossbar);
    }
    for (const x of [-0.59, 0.59]) {
      for (const z of [-1.09, 1.09]) {
        const from = new THREE.Vector3(x, 0.39, z);
        const to = new THREE.Vector3(x * 0.7, TABLE.top - 0.10, z * 0.68);
        const direction = to.clone().sub(from);
        const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, direction.length(), 8), this.materials.metal);
        brace.position.copy(from).add(to).multiplyScalar(0.5);
        brace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        brace.castShadow = true;
        this.group.add(brace);
      }
    }
    for (const z of [-TABLE.length / 2 + 0.018, TABLE.length / 2 - 0.018]) {
      const apron = new THREE.Mesh(new THREE.BoxGeometry(TABLE.width, 0.047, 0.013), this.materials.tableEdge);
      apron.position.set(0, TABLE.top - 0.038, z);
      this.group.add(apron);
    }
  }

  private addBranding(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#14262d";
      ctx.fillRect(0, 0, 512, 96);
      ctx.fillStyle = "#e9f2e9";
      ctx.font = "bold 55px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PRO CIRCUIT", 256, 66);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    for (const sign of [-1, 1]) {
      const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.063), material);
      badge.position.set(0, TABLE.top - 0.051, sign * (TABLE.length / 2 + 0.009));
      badge.rotation.y = sign < 0 ? Math.PI : 0;
      this.group.add(badge);
    }
    return texture;
  }

  private addLegs(): void {
    const positions = [
      [-TABLE.width / 2 + 0.11, -TABLE.length / 2 + 0.14],
      [TABLE.width / 2 - 0.11, -TABLE.length / 2 + 0.14],
      [-TABLE.width / 2 + 0.11, TABLE.length / 2 - 0.14],
      [TABLE.width / 2 - 0.11, TABLE.length / 2 - 0.14]
    ];
    for (const [x, z] of positions) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, TABLE.top - 0.08, 12),
        this.materials.metal
      );
      leg.position.set(x, (TABLE.top - 0.08) / 2, z);
      leg.castShadow = true;
      this.legs.add(leg);
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.035, 0.12),
        this.materials.metal
      );
      foot.position.set(x, 0.018, z);
      this.legs.add(foot);
    }
    this.group.add(this.legs);
  }

  private makeNetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 256, 128);
      ctx.strokeStyle = "rgba(226,237,231,.72)";
      ctx.lineWidth = 1.3;
      for (let x = 0; x <= 256; x += 13) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 128); ctx.stroke();
      }
      for (let y = 0; y <= 128; y += 13) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(256, y + 0.5); ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 1);
    return texture;
  }

  private addNet(): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> {
    const postHeight = TABLE.netHeight + 0.08;
    const netWidth = TABLE.width + 0.08;
    for (const x of [-netWidth / 2, netWidth / 2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.018, postHeight, 12),
        this.materials.metal
      );
      post.position.set(x, TABLE.top + postHeight / 2, 0);
      post.castShadow = true;
      this.net.add(post);
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.042), this.materials.metal);
      clamp.position.set(x, TABLE.top + TABLE.netHeight + 0.012, 0);
      this.net.add(clamp);
    }
    const netGeometry = new THREE.PlaneGeometry(netWidth, TABLE.netHeight, 12, 4);
    const netMesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>(
      netGeometry,
      new THREE.MeshStandardMaterial({
        color: 0xc7d8d8,
        map: this.netTexture,
        alphaTest: 0.2,
        roughness: 0.9,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    netMesh.name = "woven-net";
    netMesh.position.set(0, TABLE.top + TABLE.netHeight / 2, 0);
    netMesh.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, netWidth, 8), this.materials.tableLine);
    band.position.set(0, TABLE.top + TABLE.netHeight + 0.004, 0);
    band.rotation.z = Math.PI / 2;
    this.net.add(netMesh, band);
    this.group.add(this.net);
    return netMesh;
  }

  updateNet(nodes: Array<{ x: number; y: number; z: number }>): void {
    const positions = this.netSurface.geometry.getAttribute("position");
    for (let index = 0; index < Math.min(nodes.length, positions.count); index += 1) {
      const node = nodes[index];
      positions.setXYZ(index, node.x, node.y - (TABLE.top + TABLE.netHeight / 2), node.z);
    }
    positions.needsUpdate = true;
    this.netSurface.geometry.computeVertexNormals();
  }

  dispose(): void {
    this.netTexture.dispose();
    this.badgeTexture.dispose();
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
    });
  }
}
