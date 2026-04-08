#version 300 es
precision highp float;
in vec3 v_color;
uniform float u_glowAlpha;
out vec4 fragColor;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float halo = exp(-12.0 * dot(uv, uv));
  fragColor = vec4(v_color * 1.25, halo * u_glowAlpha);
}
