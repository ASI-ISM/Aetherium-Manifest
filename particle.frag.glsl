#version 300 es
precision highp float;
in vec3 v_color;
uniform float u_glowAlpha;
out vec4 fragColor;
void main() {
  fragColor = vec4(v_color, u_glowAlpha);
}
