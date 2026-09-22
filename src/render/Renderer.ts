import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { GraphicsConfig } from "../config/GameConfig";

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly root: THREE.Group;
  private readonly environmentTarget: THREE.WebGLRenderTarget;
  private readonly composer: EffectComposer | null;
  private readonly occlusion: SSAOPass | null;
  private resizeObserver: ResizeObserver | null = null;
  private container: HTMLElement | null = null;

  constructor(config: GraphicsConfig) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: config.antialias,
      powerPreference: "high-performance",
      alpha: false
    });
    this.renderer.setClearColor(0x091118, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.pixelRatioCap));
    this.renderer.shadowMap.enabled = config.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = config.toneMappingExposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x091118, 6, 22);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentTarget = pmrem.fromScene(room);
    this.scene.environment = this.environmentTarget.texture;
    room.dispose();
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
    this.camera.position.set(3.3, 2.25, 4.6);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    // Keep the direct rendering path when shadows are disabled for low-end GPUs.
    const target = config.shadows ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null;
    if (target && config.antialias) target.samples = Math.min(4, this.renderer.capabilities.maxSamples);
    this.composer = target ? new EffectComposer(this.renderer, target) : null;
    this.occlusion = this.composer ? new SSAOPass(this.scene, this.camera, 1, 1, 16) : null;
    if (this.composer && this.occlusion) {
      this.occlusion.kernelRadius = 0.12;
      this.occlusion.minDistance = 0.001;
      this.occlusion.maxDistance = 0.18;
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(this.occlusion);
      this.composer.addPass(new OutputPass());
    }
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  resize(): void {
    if (!this.container) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
    // Occlusion is blurred and does not need full display resolution.
    const ratio = this.renderer.getPixelRatio();
    this.occlusion?.setSize(Math.max(1, Math.ceil(width * ratio / 2)), Math.max(1, Math.ceil(height * ratio / 2)));
  }

  render(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  add(object: THREE.Object3D): void {
    this.root.add(object);
  }

  remove(object: THREE.Object3D): void {
    this.root.remove(object);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => materials.add(material));
      else if (mesh.material) materials.add(mesh.material);
    });
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    this.composer?.passes.forEach((pass) => pass.dispose());
    this.composer?.dispose();
    this.environmentTarget.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
