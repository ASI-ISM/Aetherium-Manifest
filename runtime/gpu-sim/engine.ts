import type { LightControlLanguage } from '../../light-control-language.ts';
import type { CompiledField } from '../../shape-compiler.ts';

export type GpuPassName = 'Reset' | 'Count' | 'PrefixSum' | 'Scatter' | 'Integrate' | 'Render' | 'Swap';

export interface GpuSimulationIR {
  lcl: LightControlLanguage;
  field: CompiledField | null;
  deltaTime: number;
  frameTime: number;
}

export interface GpuUniforms {
  deltaTime: number;
  coherence: number;
  velocity: number;
  turbulence: number;
  glowIntensity: number;
  flicker: number;
  targetCount: number;
}

export interface GpuUniformAdapterInput {
  lcl: LightControlLanguage;
  field: CompiledField | null;
  deltaTime: number;
}

export function mapIRToGpuUniforms(input: GpuUniformAdapterInput): GpuUniforms {
  return {
    deltaTime: input.deltaTime,
    coherence: input.lcl.particle_control.cohesion,
    velocity: input.lcl.particle_control.velocity,
    turbulence: input.lcl.particle_control.turbulence,
    glowIntensity: input.lcl.particle_control.glow_intensity,
    flicker: input.lcl.particle_control.flicker,
    targetCount: input.field?.points.length ?? 0,
  };
}

export class GpuSimulationEngine {
  static readonly PASS_ORDER: readonly GpuPassName[] = [
    'Reset',
    'Count',
    'PrefixSum',
    'Scatter',
    'Integrate',
    'Render',
    'Swap',
  ];

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  async dispatch(ir: GpuSimulationIR): Promise<void> {
    const uniforms = mapIRToGpuUniforms({
      lcl: ir.lcl,
      field: ir.field,
      deltaTime: ir.deltaTime,
    });

    for (const pass of GpuSimulationEngine.PASS_ORDER) {
      this.dispatchPass(pass, uniforms);
    }
  }

  private dispatchPass(pass: GpuPassName, uniforms: GpuUniforms): void {
    // Placeholder wiring for staged WebGPU migration.
    // Real shader pipeline dispatch is attached per pass in a follow-up change.
    void uniforms;
    void pass;
  }
}
