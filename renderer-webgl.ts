import particleVertexSource from './particle.vert.glsl';
import particleFragmentSource from './particle.frag.glsl';
import glowFragmentSource from './glow.frag.glsl';

interface ParticleLike {
  pos: { x: number; y: number };
  color: number[];
}

export class RendererWebGL {
  private gl: WebGL2RenderingContext;
  private particleProgram: WebGLProgram;
  private glowProgram: WebGLProgram;
  private positionBuffer: WebGLBuffer;
  private colorBuffer: WebGLBuffer;

  constructor(private readonly canvas: HTMLCanvasElement) {
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

  render(photons: ParticleLike[], width: number, height: number, glowAlpha: number): void {
    const gl = this.gl;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.003, 0.003, 0.008, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const positions = new Float32Array(photons.length * 2);
    const colors = new Float32Array(photons.length * 3);
    for (let i = 0; i < photons.length; i++) {
      const p = photons[i];
      positions[i * 2] = (p.pos.x / width) * 2 - 1;
      positions[i * 2 + 1] = 1 - (p.pos.y / height) * 2;
      colors[i * 3] = p.color[0];
      colors[i * 3 + 1] = p.color[1];
      colors[i * 3 + 2] = p.color[2];
    }

    gl.useProgram(this.particleProgram);
    bindAttribute(gl, this.particleProgram, this.positionBuffer, 'a_position', positions, 2);
    bindAttribute(gl, this.particleProgram, this.colorBuffer, 'a_color', colors, 3);
    gl.uniform1f(gl.getUniformLocation(this.particleProgram, 'u_glowAlpha'), glowAlpha);
    gl.drawArrays(gl.POINTS, 0, photons.length);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.glowProgram);
    bindAttribute(gl, this.glowProgram, this.positionBuffer, 'a_position', positions, 2);
    bindAttribute(gl, this.glowProgram, this.colorBuffer, 'a_color', colors, 3);
    gl.uniform1f(gl.getUniformLocation(this.glowProgram, 'u_glowAlpha'), glowAlpha * 0.5);
    gl.drawArrays(gl.POINTS, 0, photons.length);
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
