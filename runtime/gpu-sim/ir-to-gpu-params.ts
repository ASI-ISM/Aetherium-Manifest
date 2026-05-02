import type { GpuSimulationIR } from './engine.ts';

export interface GpuRuntimeConfig {
  numParticles: number;
  noiseAmplitude: number;
  forceDirection: string;
  forceKernel: string;
  renderIntensity: number;
  chunks: SimulationChunk[];
  farFieldUpdateDivisor: number;
}

export interface SimulationChunk {
  id: number;
  visible: boolean;
  priority: number;
  updateEveryNFrames: number;
  particleStart: number;
  particleCount: number;
}

export interface RuntimePressureSignals {
  fps: number;
  memoryPressure: number;
  frameIndex: number;
  visibleChunkIds?: number[];
}

export const MAX_PARTICLES = 1_500_000;
const CHUNK_SIZE = 250_000;
const FPS_TARGET = 60;
const LOW_FPS_THRESHOLD = 45;

export function mapIRToGpuParams(ir: GpuSimulationIR, signals: RuntimePressureSignals): GpuRuntimeConfig {
  const irDensity = clamp01((ir as GpuSimulationIR & { visual?: { density?: number } }).visual?.density ?? ir.lcl.morphology.density);
  const scaledParticles = Math.floor(MAX_PARTICLES * irDensity);
  const adjustedParticles = applyDynamicScaling(scaledParticles, signals);
  const chunks = createChunks(adjustedParticles, signals);

  return {
    numParticles: adjustedParticles,
    noiseAmplitude: ir.lcl.particle_control.turbulence,
    forceDirection: ir.lcl.particle_control.flow_direction,
    forceKernel: ir.lcl.morphology.family,
    renderIntensity: ir.lcl.particle_control.glow_intensity,
    chunks,
    farFieldUpdateDivisor: adjustedParticles > 1_000_000 ? 3 : 2,
  };
}

function applyDynamicScaling(baseParticles: number, signals: RuntimePressureSignals): number {
  const fpsFactor = signals.fps < LOW_FPS_THRESHOLD ? clamp01(signals.fps / FPS_TARGET) : 1;
  const memoryFactor = clamp01(1 - signals.memoryPressure);
  const combined = Math.min(fpsFactor, memoryFactor);
  return Math.max(1, Math.floor(baseParticles * Math.max(0.2, combined)));
}

function createChunks(totalParticles: number, signals: RuntimePressureSignals): SimulationChunk[] {
  const chunkCount = Math.max(1, Math.ceil(totalParticles / CHUNK_SIZE));
  const visibleIds = new Set(signals.visibleChunkIds ?? []);
  const chunks: SimulationChunk[] = [];

  for (let i = 0; i < chunkCount; i += 1) {
    const particleStart = i * CHUNK_SIZE;
    const particleCount = Math.min(CHUNK_SIZE, totalParticles - particleStart);
    const visible = visibleIds.size === 0 ? i < 2 : visibleIds.has(i);
    const updateEveryNFrames = visible ? 1 : 4;
    chunks.push({
      id: i,
      visible,
      priority: visible ? 100 - i : 10,
      updateEveryNFrames,
      particleStart,
      particleCount,
    });
  }

  return chunks;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
