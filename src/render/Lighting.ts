import * as THREE from "three";
import type { ArenaProfile } from "../content/ArenaCatalog";

export class ArenaLighting {
  readonly group = new THREE.Group();
  readonly key: THREE.DirectionalLight;
  readonly fill: THREE.HemisphereLight;
  readonly rim: THREE.PointLight;
  private readonly practicals: THREE.SpotLight[] = [];

  constructor(shadows = true, shadowMapSize = 2048) {
    this.group.name = "arena-lighting";
    this.fill = new THREE.HemisphereLight(0xd8e8f1, 0x20303b, 0.84);
    this.group.add(this.fill);
    this.key = new THREE.DirectionalLight(0xfff1de, 2.35);
    this.key.position.set(2.5, 5.8, 3.6);
    this.key.castShadow = shadows;
    this.key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    this.key.shadow.camera.near = 0.1;
    this.key.shadow.camera.far = 18;
    this.key.shadow.camera.left = -5;
    this.key.shadow.camera.right = 5;
    this.key.shadow.camera.top = 5;
    this.key.shadow.camera.bottom = -5;
    this.key.shadow.bias = -0.00012;
    this.key.shadow.normalBias = 0.018;
    this.key.shadow.radius = 2;
    this.group.add(this.key);
    const bounce = new THREE.DirectionalLight(0xbedce9, 0.72);
    bounce.position.set(-4.3, 2.8, -3.5);
    this.group.add(bounce);
    this.rim = new THREE.PointLight(0x72bfc4, 9, 8, 2);
    this.rim.position.set(-3.5, 2.6, -2.5);
    this.group.add(this.rim);
    this.addPracticalLights();
  }

  private addPracticalLights(): void {
    for (const x of [-3.2, 0, 3.2]) {
      const light = new THREE.SpotLight(0xe5fbf4, 10, 8, Math.PI / 3, 0.75, 2);
      light.position.set(x, 4.7, 0);
      light.target.position.set(x * 0.15, 0, 0);
      this.group.add(light.target);
      this.group.add(light);
      this.practicals.push(light);
    }
  }

  setProfile(profile: ArenaProfile): void {
    this.fill.color.setHex(profile.lightColor);
    this.fill.intensity = profile.id === "night-court" ? 0.38 : 0.82;
    this.key.color.setHex(profile.lightColor);
    this.key.intensity = profile.lightIntensity * 0.6;
    this.rim.color.setHex(profile.accentColor);
    this.rim.intensity = profile.id === "night-court" ? 13 : 7;
    for (const light of this.practicals) {
      light.color.setHex(profile.lightColor);
      light.intensity = profile.id === "training-lab" ? 6 : 10;
    }
  }

  setExposure(renderer: THREE.WebGLRenderer, exposure: number): void {
    renderer.toneMappingExposure = exposure;
  }
}
