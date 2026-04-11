/**
 * Scholar Visual Mapper (mf-3.30.0)
 * Converts semantic cues and tone from ScholarAgent into AETH parameters.
 * Supports non-linear "blooming" transitions and trusted citation glow.
 */

export interface AethParams {
  shape: string;
  particle_density: number;
  palette_mode: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  flow_direction: string;
  velocity: number;
  turbulence: number;
  glow_intensity: number;
  motion_archetype: string;
  easing: string;
  transition_type: "bloom" | "morph" | "ripple";
  chromatic_aberration: number;
  pulse_core: boolean;
}

export function mapScholarToAeth(
  visualInterpretation: string,
  tone: string,
  unverifiedSource: boolean = false,
  hasTrustedSources: boolean = false
): AethParams {
  const params: AethParams = {
    shape: "sphere",
    particle_density: 0.5,
    palette_mode: "dual_tone",
    primary_color: "#FFFFFF",
    secondary_color: "#BDBDBD",
    flow_direction: "outward",
    velocity: 0.3,
    turbulence: 0.2,
    glow_intensity: 0.6,
    motion_archetype: "stabilization",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)", // Non-linear easing for semantic evolution
    transition_type: "bloom", // Transitions "bloom" out of the previous state
    chromatic_aberration: 0.0,
    pulse_core: false
  };

  // Tone-based Palette Selection
  switch (tone) {
    case "creative":
      params.palette_mode = "spectral";
      params.primary_color = "#FF1493";
      params.secondary_color = "#00CED1";
      params.glow_intensity = 0.8;
      params.turbulence = 0.4;
      break;
    case "casual":
      params.palette_mode = "dual_tone";
      params.primary_color = "#32CD32";
      params.secondary_color = "#ADFF2F";
      params.velocity = 0.5;
      break;
    case "formal":
    default:
      params.palette_mode = "DEEP_REASONING";
      params.primary_color = "#4169E1";
      params.secondary_color = "#B0C4DE";
      params.glow_intensity = 0.7;
      break;
  }

  // Visual Interpretation Mapping
  switch (visualInterpretation) {
    case "ripple pattern":
      params.shape = "spiral_vortex";
      params.flow_direction = "outward";
      params.motion_archetype = "wave";
      params.velocity = 0.4;
      break;
    case "spiral arcs":
      params.shape = "helix";
      params.flow_direction = "clockwise";
      params.motion_archetype = "spiral_convergence";
      params.particle_density = 0.7;
      break;
    case "node diagram":
      params.shape = "lattice";
      params.flow_direction = "still";
      params.motion_archetype = "stabilization";
      params.particle_density = 0.4;
      break;
    case "gravity wells":
      params.shape = "sphere";
      params.flow_direction = "inward";
      params.motion_archetype = "reasoning";
      params.velocity = 0.2;
      break;
    case "prismatic diffusion":
      params.shape = "nebula_cloud";
      params.flow_direction = "bidirectional";
      params.motion_archetype = "emergence";
      params.glow_intensity = 0.9;
      break;
    case "crystalline growth":
      params.shape = "lattice";
      params.flow_direction = "outward";
      params.motion_archetype = "emergence";
      params.velocity = 0.1;
      params.turbulence = 0.05;
      break;
    case "fractal branching":
      params.shape = "burst";
      params.flow_direction = "outward";
      params.motion_archetype = "emergence";
      params.particle_density = 0.8;
      params.turbulence = 0.3;
      break;
    case "nebula diffusion":
      params.shape = "nebula_cloud";
      params.flow_direction = "still";
      params.motion_archetype = "stabilization";
      params.glow_intensity = 0.4;
      params.turbulence = 0.6;
      break;
    case "luminous constellations":
      params.shape = "lattice";
      params.flow_direction = "inward";
      params.motion_archetype = "spiral_convergence";
      params.particle_density = 0.3;
      params.glow_intensity = 0.8;
      break;
  }

  // Trusted Source Glow (Reward verification)
  if (hasTrustedSources && !unverifiedSource) {
    params.chromatic_aberration = 0.05; // Subtle rainbow edges on verified knowledge
    params.pulse_core = true; // Pulsing core signal for high integrity
    params.glow_intensity += 0.1;
  }

  // Amber Alert for Unverified Sources
  if (unverifiedSource) {
    params.accent_color = "#FFBF00"; // Amber
    params.glow_intensity = Math.min(params.glow_intensity, 0.5);
    params.turbulence += 0.1;
    params.chromatic_aberration = 0.0;
  }

  return params;
}
