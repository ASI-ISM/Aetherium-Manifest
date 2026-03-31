# 10 — AM-UI Color System (Thermodynamic Color Subsystem)

เอกสารนี้นิยาม **AM-UI Color System** เป็น canonical color subsystem ของ Manifest
เพื่อให้ “สี” ทำหน้าที่เป็นสัญญะเชิง cognition/thermodynamics ที่ deterministic และใช้ร่วมกันได้ทั้ง UI, particle layer, และ shader pipeline

## 1) Positioning in Aetherium Architecture

AM-UI Color System เป็น sublayer ของ AI Cognition Visualization Pipeline:

`Intention Vector / LifeState → Color Semantics → Palette Mapping → Shader Uniforms → Particle/Field Rendering`

โดยอยู่ระหว่าง **Signal Translation** และ **Visualization Mapping**

## 2) Source of Truth

- Runtime source: `am_color_system.js`
- Canonical doc: ไฟล์นี้
- Integration points:
  - frontend rendering (`index.html`)
  - GenUI / particle shaders
  - AetherBus visual payload hints (optional)

## 3) Full Palette Specification

### 3.1 Core Cognition

| Name | Hex | RGB | Use |
|---|---|---|---|
| Aether Blue | `#4FC3FF` | `79,195,255` | Idle / calm / ready |
| Aether Cyan | `#00F5FF` | `0,245,255` | Connection active / listening / reasoning flow |
| Aether Purple | `#8A7CFF` | `138,124,255` | Deep reasoning / System 2 / wisdom |
| Aether Pink | `#FF4FD8` | `255,79,216` | Creative / playful / co-create |
| Aether Gold | `#FFC857` | `255,200,87` | Searching / discovery / highlights |

### 3.2 Status & Risk

| Name | Hex | RGB | Use |
|---|---|---|---|
| Plasma Red | `#FF3D3D` | `255,61,61` | Error, crisis, policy violation |
| Solar Orange | `#FF7A18` | `255,122,24` | Warning, overload approaching |
| Decay Brown | `#A52A2A` | `165,42,42` | Exhaustion, memory full, DECAY state |
| High-Load Gold | `#FFD700` | `255,215,0` | High processing load / CPU hot |
| Neutral White | `#FFFFFF` | `255,255,255` | Neutral / base text |

### 3.3 Background & Void

| Name | Hex | RGB | Use |
|---|---|---|---|
| Deep Void | `#050505` | `5,5,5` | Base canvas / true void |
| Deep Space | `#0B1026` | `11,16,38` | Nirodha / low activity background |
| Nebula Blue | `#0B1736` | `11,23,54` | Normal background layer 1 |
| Nebula Purple | `#402A6E` | `64,42,110` | Background layer 2 / gradient top |
| Dark Phi | `#00008B` | `0,0,139` | Nirodha / maintenance / sleep tone |

### 3.4 Interaction & Accent

| Name | Hex | RGB | Use |
|---|---|---|---|
| Aurora Green | `#00FFB3` | `0,255,179` | Success / affirmation |
| Selection Cyan | `#00FFFF` | `0,255,255` | Selection ring / focus reticle |
| Gesture Gold | `#FFB347` | `255,179,71` | Gesture trace / writing light |
| Ripple Teal | `#00E0FF` | `0,224,255` | Touch ripple / hover feedback |
| Crack Highlight | `#DC143C` | `220,20,60` | Crack edges / error fissures |

## 4) State Mapping (Manifest / LifeState)

| AI / LifeState | Primary | Secondary | Layer focus |
|---|---|---|---|
| IDLE / NEBULA | `#4FC3FF` | `#0B1736` | cognition, background |
| LISTENING / EQUILIBRIUM | `#00F5FF` | `#00FFFF` | cognition, interaction |
| THINKING | `#8A7CFF` | `#4FC3FF` | cognition, particles |
| DEEP REASONING | `#8A7CFF` | `#00F5FF` | cognition, vortex |
| CREATIVE / CO-CREATE | `#FF4FD8` | `#FFC857` | cognition, accents |
| SEARCHING | `#FFC857` | `#00FFB3` | cognition, particles |
| HIGH LOAD | `#FFD700` | `#FF7A18` | cognition, HUD indicators |
| DECAY / EXHAUSTION | `#A52A2A` | `#0B1026` | cognition, background |
| WARNING | `#FF7A18` | `#FFD700` | HUD, pre-error edges |
| ERROR / CRACKS | `#FF3D3D` | `#DC143C` | cracks, error glyphs |
| NIRODHA | `#0B1026` | `#402A6E` (dim) | background, minimal glow |

## 5) Gradient Sets

```js
const AMGradients = {
  THINKING: ['#4FC3FF', '#00F5FF', '#8A7CFF'],
  CO_CREATE: ['#8A7CFF', '#FF4FD8', '#FFC857'],
  WARNING: ['#FFC857', '#FF7A18', '#FF3D3D'],
  NIRODHA: ['#0B1026', '#050505']
};
```

## 6) Deterministic Contract with Intent Vector / LifeState

Manifest consumes:
- `intent.intent_category`
- `intent.energy_level`
- `intent.emotional_valence`
- `LifeState.mode`

Mapping outputs are deterministic and target:
- `background field color`
- `cognition halo`
- `particle tint`
- `HUD accent`

## 7) Payload Hint Extension (Optional)

Schema can optionally carry visual hints while frontend keeps semantic authority:

```json
{
  "visual_manifestation": {
    "color_semantics": {
      "color_mode": "THERMODYNAMIC",
      "palette_key": "REASONING"
    }
  }
}
```

หมายเหตุ: hint เป็นเพียง suggestion; runtime ยัง resolve ด้วย `am_color_system.js`

## 8) Plugin Renderer Compatibility

Plugin renderers:
- SHOULD respect state-to-color mapping และ reserved slots (`ERROR`, `WARNING`, `NIRODHA`)
- MAY add extension palettes สำหรับโหมดเฉพาะทาง
- MUST NOT overwrite core error semantics (Plasma Red family must remain distinguishable)
