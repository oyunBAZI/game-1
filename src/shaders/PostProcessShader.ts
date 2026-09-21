import * as THREE from "three";

export const VIGNETTE_FRAGMENT_SHADER = [
  "uniform sampler2D tDiffuse;",
  "uniform float intensity;",
  "varying vec2 vUv;",
  "void main() {",
  "  vec4 color = texture2D(tDiffuse, vUv);",
  "  vec2 centered = vUv - 0.5;",
  "  float vignette = smoothstep(0.78, 0.18, dot(centered, centered));",
  "  color.rgb *= mix(1.0 - intensity, 1.0, vignette);",
  "  gl_FragColor = color;",
  "}"
].join("\n");

export function createVignetteMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      intensity: { value: 0.22 }
    },
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "  vUv = uv;",
      "  gl_Position = vec4(position, 1.0);",
      "}"
    ].join("\n"),
    fragmentShader: VIGNETTE_FRAGMENT_SHADER
  });
}