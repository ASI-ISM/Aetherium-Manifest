const particleVertexSource = `#version 300 es
precision highp float;
in vec2 a_position;
in vec3 a_color;
out vec3 v_color;
void main() {
  v_color = a_color;
  gl_Position = vec4(a_position, 0.0, 1.0);
  gl_PointSize = 2.5;
}`;

const particleFragmentSource = `#version 300 es
precision highp float;
in vec3 v_color;
uniform float u_glowAlpha;
out vec4 fragColor;
void main() {
  fragColor = vec4(v_color, u_glowAlpha);
}`;

const glowFragmentSource = `#version 300 es
precision highp float;
in vec3 v_color;
uniform float u_glowAlpha;
out vec4 fragColor;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float halo = exp(-12.0 * dot(uv, uv));
  fragColor = vec4(v_color * 1.25, halo * u_glowAlpha);
}`;

export interface RendererPhotonSnapshot {
  x: number;
  y: number;
  color: [number, number, number];
}

export interface RendererFrameSnapshot {
  width: number;
  height: number;
  glowAlpha: number;
  photons: RendererPhotonSnapshot[];
}

export class RendererWebGL {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly particleProgram: WebGLProgram;
  private readonly glowProgram: WebGLProgram;
  private readonly positionBuffer: WebGLBuffer;
  private readonly colorBuffer: WebGLBuffer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, premultipliedAlpha: false });
    if (!gl) {
      throw new Error('WebGL2 unavailable');
    }

    this.gl = gl;
    this.particleProgram = createProgram(gl, particleVertexSource, particleFragmentSource);
    this.glowProgram = createProgram(gl, particleVertexSource, glowFragmentSource);
    this.positionBuffer = must(gl.createBuffer(), 'position buffer');
    this.colorBuffer = must(gl.createBuffer(), 'color buffer');
  }

  get context(): WebGL2RenderingContext {
    return this.gl;
  }

  render(frame: RendererFrameSnapshot): void {
    const gl = this.gl;
    gl.viewport(0, 0, frame.width, frame.height);
    gl.clearColor(0.003, 0.003, 0.008, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const positions = new Float32Array(frame.photons.length * 2);
    const colors = new Float32Array(frame.photons.length * 3);
    for (let i = 0; i < frame.photons.length; i++) {
      const photon = frame.photons[i];
      positions[i * 2] = (photon.x / frame.width) * 2 - 1;
      positions[i * 2 + 1] = 1 - (photon.y / frame.height) * 2;
      colors[i * 3] = photon.color[0];
      colors[i * 3 + 1] = photon.color[1];
      colors[i * 3 + 2] = photon.color[2];
    }

    gl.useProgram(this.particleProgram);
    bindAttribute(gl, this.particleProgram, this.positionBuffer, 'a_position', positions, 2);
    bindAttribute(gl, this.particleProgram, this.colorBuffer, 'a_color', colors, 3);
    gl.uniform1f(gl.getUniformLocation(this.particleProgram, 'u_glowAlpha'), frame.glowAlpha);
    gl.drawArrays(gl.POINTS, 0, frame.photons.length);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.glowProgram);
    bindAttribute(gl, this.glowProgram, this.positionBuffer, 'a_position', positions, 2);
    bindAttribute(gl, this.glowProgram, this.colorBuffer, 'a_color', colors, 3);
    gl.uniform1f(gl.getUniformLocation(this.glowProgram, 'u_glowAlpha'), frame.glowAlpha * 0.5);
    gl.drawArrays(gl.POINTS, 0, frame.photons.length);
    gl.disable(gl.BLEND);
  }
}

function bindAttribute(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  buffer: WebGLBuffer,
  name: string,
  data: Float32Array,
  size: number,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  const location = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = must(gl.createProgram(), 'program');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WebGL link error: ${gl.getProgramInfoLog(program)}`);
  }

  return program;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = must(gl.createShader(type), 'shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`WebGL compile error: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function must<T>(value: T | null, name: string): T {
  if (!value) {
    throw new Error(`Failed to create ${name}`);
  }
  return value;
}
