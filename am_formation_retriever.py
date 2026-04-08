"""
Formation Retriever + Morphology Compiler
ค้นหา Book of Formation archetypes
แล้วคอมไพล์เป็นคำสั่ง field + render
"""

import json
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass


@dataclass
class FormationArchetype:
    """Motion archetype จาก Book of Formation"""
    id: str
    name: str
    description: str
    base_field_config: Dict
    rhythm_profile: Dict
    visual_signature: Dict


class FormationRetrievalSystem:
    """คลังต้นแบบการเคลื่อนไหว"""
    
    def __init__(self):
        # หนังสือแหล่งรู้
        self.book_of_formation = self._initialize_book()
    
    def _initialize_book(self) -> Dict[str, FormationArchetype]:
        """สร้าง Book of Formation archetypes"""
        
        return {
            # ======== EMERGENCE ========
            "emergence/nebula_birth": FormationArchetype(
                id="emergence/nebula_birth",
                name="Nebula Birth",
                description="สิ่งที่กำลังเกิด ดอกไม้ปะจำน่า ควัน ชีวิต",
                base_field_config={
                    "flow_pattern": "radial_bloom",
                    "coherence_start": 0.2,
                    "coherence_target": 0.75,
                    "turbulence": 0.35,
                    "vorticity": 0.1
                },
                rhythm_profile={
                    "attack_characteristic": "slow_gradient",
                    "attack_duration_ms": 1200,
                    "peak_hold_ms": 2400,
                    "release_duration_ms": 1800,
                    "pulse_tendency": 0.0  # smooth
                },
                visual_signature={
                    "particle_behavior": "soft_expansion",
                    "color_shift": "cool_to_warm",
                    "edge_clarity": "soft",
                    "glow_quality": "diffuse"
                }
            ),
            
            # ======== STABILIZATION ========
            "stabilization/sphere_equilibrium": FormationArchetype(
                id="stabilization/sphere_equilibrium",
                name="Sphere Equilibrium",
                description="สมดุล สงบ มั่นคง อยู่ในตำแหน่ง",
                base_field_config={
                    "flow_pattern": "radial_static",
                    "coherence_start": 0.7,
                    "coherence_target": 0.85,
                    "turbulence": 0.05,
                    "vorticity": 0.0
                },
                rhythm_profile={
                    "attack_characteristic": "instant",
                    "attack_duration_ms": 400,
                    "peak_hold_ms": 10000,  # long
                    "release_duration_ms": 1000,
                    "pulse_tendency": 0.08  # subtle breathing
                },
                visual_signature={
                    "particle_behavior": "static_formation",
                    "color_shift": "monochrome",
                    "edge_clarity": "sharp",
                    "glow_quality": "focused"
                }
            ),
            
            # ======== DISSOLUTION ========
            "dissolution/light_fade": FormationArchetype(
                id="dissolution/light_fade",
                name="Light Fade",
                description="สลาย จาง หายไป ลมที่พัดไป",
                base_field_config={
                    "flow_pattern": "dispersal",
                    "coherence_start": 0.8,
                    "coherence_target": 0.0,
                    "turbulence": 0.5,
                    "vorticity": 0.0
                },
                rhythm_profile={
                    "attack_characteristic": "none",
                    "attack_duration_ms": 0,
                    "peak_hold_ms": 1000,
                    "release_duration_ms": 3000,
                    "pulse_tendency": 0.0
                },
                visual_signature={
                    "particle_behavior": "dispersal_outward",
                    "color_shift": "fade_to_black",
                    "edge_clarity": "degrading",
                    "glow_quality": "dimming"
                }
            ),
            
            # ======== REASONING ========
            "reasoning/spiral_convergence": FormationArchetype(
                id="reasoning/spiral_convergence",
                name="Spiral Convergence",
                description="คิด รวมตัว ตรรมศาสตร์ เข้มข้น",
                base_field_config={
                    "flow_pattern": "spiral_inward",
                    "coherence_start": 0.3,
                    "coherence_target": 0.88,
                    "turbulence": 0.2,
                    "vorticity": 0.7
                },
                rhythm_profile={
                    "attack_characteristic": "moderate_curve",
                    "attack_duration_ms": 900,
                    "peak_hold_ms": 2000,
                    "release_duration_ms": 1200,
                    "pulse_tendency": 0.15  # rhythmic
                },
                visual_signature={
                    "particle_behavior": "spiral_inbound",
                    "color_shift": "cool_concentration",
                    "edge_clarity": "sharp",
                    "glow_quality": "concentrated"
                }
            ),
            
            # ======== ERROR ========
            "error/fracture_shell": FormationArchetype(
                id="error/fracture_shell",
                name="Fracture Shell",
                description="ปัญหา แตก ขาด ความผิดพลาด",
                base_field_config={
                    "flow_pattern": "radial_shatter",
                    "coherence_start": 0.5,
                    "coherence_target": 0.1,
                    "turbulence": 0.8,
                    "vorticity": 0.0
                },
                rhythm_profile={
                    "attack_characteristic": "sharp_spike",
                    "attack_duration_ms": 300,
                    "peak_hold_ms": 800,
                    "release_duration_ms": 1500,
                    "pulse_tendency": 0.3  # jagged
                },
                visual_signature={
                    "particle_behavior": "sharp_burst",
                    "color_shift": "red_orange_decay",
                    "edge_clarity": "very_sharp",
                    "glow_quality": "harsh"
                }
            )
        }
    
    def retrieve_archetype(self, archetype_id: str) -> FormationArchetype:
        """ค้น archetype จาก Book of Formation"""
        return self.book_of_formation.get(
            archetype_id,
            self.book_of_formation["stabilization/sphere_equilibrium"]
        )
    
    def compile_morphology_to_runtime_control(self,
                                             intent_packet: Dict[str, Any]) \
                                             -> Dict[str, Any]:
        """
        แปลง intent packet + archetype เป็น runtime control
        ขั้นที่ 2: ดัดแปลง archetype ตามคำขอ
        """
        
        # เก็บ archetype ฐาน
        archetype = self._resolve_archetype(intent_packet)
        
        # ดัดแปลง base config ตามมอร์ฟโลยีและออปติกส์
        runtime_control = {
            "field_recipe": self._adapt_field_parameters(
                archetype.base_field_config,
                intent_packet["morphology"],
                intent_packet["motion"]
            ),
            "timing_envelope": self._adapt_timing(
                archetype.rhythm_profile,
                intent_packet["motion"]
            ),
            "visual_recipe": self._adapt_visuals(
                archetype.visual_signature,
                intent_packet["optics"],
                intent_packet["morphology"]
            ),
            "constraints": intent_packet.get("constraints", {}),
            "motion_bias": intent_packet.get("motion_bias", {}),
            "render_mode": self._select_render_mode(
                intent_packet["intent"]["mode"],
                intent_packet["morphology"]
            )
        }
        
        return runtime_control
    
    def _resolve_archetype(self, intent_packet: Dict[str, Any]) -> FormationArchetype:
        """Map motion archetype labels to canonical Book of Formation IDs."""

        requested = intent_packet.get("reference", {}).get("motion_archetype_id")
        if requested and requested in self.book_of_formation:
            return self.book_of_formation[requested]

        motion = intent_packet.get("motion", {}).get("archetype", "stabilization")
        mapping = {
            "emergence": "emergence/nebula_birth",
            "stabilization": "stabilization/sphere_equilibrium",
            "dissolution": "dissolution/light_fade",
            "reasoning": "reasoning/spiral_convergence",
            "error": "error/fracture_shell",
        }
        canonical = mapping.get(motion, "stabilization/sphere_equilibrium")
        return self.book_of_formation.get(canonical, self.book_of_formation["stabilization/sphere_equilibrium"])

    def _adapt_field_parameters(self, 
                               base_config: Dict,
                               morphology: Dict,
                               motion: Dict) -> Dict:
        """ดัดแปลง field parameters ตามคำขอ"""
        
        # ปรับ coherence ขึ้นถ้า density สูง
        coherence_adjustment = morphology.get("density", 0.7) * 0.15
        
        # ปรับ turbulence ตามความซับซ้อน
        turbulence_adjustment = morphology.get("complexity", 0.6) * 0.1
        
        return {
            **base_config,
            "coherence_start": min(
                base_config["coherence_start"] + coherence_adjustment, 1.0
            ),
            "coherence_target": min(
                base_config["coherence_target"] + coherence_adjustment, 1.0
            ),
            "turbulence": base_config["turbulence"] + turbulence_adjustment,
            "flow_magnitude": motion.get("tempo_hz", 0.5) * 2.0  # scale by tempo
        }
    
    def _adapt_timing(self, base_timing: Dict, motion: Dict) -> Dict:
        """ดัดแปลง timing envelope ตามอารมณ์"""
        
        # scale timing ตาม tempo
        tempo_scale = motion.get("tempo_hz", 0.5) / 0.5  # 0.5 Hz เป็น baseline
        
        return {
            "attack_ms": int(motion.get("attack_ms", 800) * tempo_scale),
            "hold_ms": int(motion.get("settle_ms", 2000) * tempo_scale),
            "release_ms": int(motion.get("release_ms", 1500) * tempo_scale),
            "pulse_hz": 1.0 / motion.get("tempo_hz", 0.5),
            "pulse_strength": base_timing.get("pulse_tendency", 0.0)
        }
    
    def _adapt_visuals(self, base_visuals: Dict, 
                       optics: Dict, morphology: Dict) -> Dict:
        """ดัดแปลง visual signature ตามสี"""
        
        return {
            "particle_behavior": base_visuals["particle_behavior"],
            "primary_color": optics["primary_colors"][0] if optics["primary_colors"] else "#FFFFFF",
            "secondary_color": optics["secondary_colors"][0] if optics["secondary_colors"] else "#888888",
            "glow_strength": optics.get("glow_strength", 0.5),
            "luminance": optics.get("luminance", 0.8),
            "edge_softness": morphology.get("edge_softness", 0.5),
            "glow_quality": base_visuals["glow_quality"]
        }
    
    def _select_render_mode(self, intent_mode: str, morphology: Dict) -> str:
        """เลือก render mode ตามความตั้งใจและรูปทรง"""
        
        family = morphology.get("family", "")
        
        if intent_mode in {"scene", "world"}:
            return "scene_field"
        if intent_mode in {"motion", "feedback"}:
            return "motion_field"
        if "fracture" in family:
            return "motion_field"
        if "nebula" in family or "cloud" in family:
            return "scene_field"
        return "shape_field"


# Example usage
if __name__ == "__main__":
    retriever = FormationRetrievalSystem()
    
    # Example intent packet
    intent_packet = {
        "intent": {"mode": "auto"},
        "morphology": {
            "family": "spiral_vortex",
            "complexity": 0.7,
            "density": 0.8
        },
        "motion": {
            "archetype": "reasoning",
            "tempo_hz": 0.3,
            "attack_ms": 900,
            "settle_ms": 2400,
            "release_ms": 1300
        },
        "optics": {
            "primary_colors": ["#7C3AED"],
            "secondary_colors": ["#F472B6"],
            "glow_strength": 0.72
        },
        "reference": {
            "motion_archetype_id": "reasoning/spiral_convergence"
        }
    }
    
    runtime_control = retriever.compile_morphology_to_runtime_control(intent_packet)
    print(json.dumps(runtime_control, indent=2))