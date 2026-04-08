"""
Intent Interpreter Agent
รับคำขอจากผู้ใช้ แยกส่วนประกอบ และมอบสิ่งที่รันไทม์ต้องรู้
"""

import json
import asyncio
from typing import Dict, Any, Optional
from enum import Enum


class IntentType(Enum):
    CREATE_FORM = "create_form"
    RESPOND_TO_EMOTION = "respond_to_emotion"
    VISUALIZE_CONCEPT = "visualize_concept"
    MANIFEST_ERROR = "manifest_error"
    DISSOLVE = "dissolve"


class AbstractionLevel(Enum):
    CONCRETE = "concrete"      # "ทรงกลมสีม่วง"
    SYMBOLIC = "symbolic"      # "ความสงบ"
    ABSTRACT = "abstract"       # "ลมหายใจ"


class IntentInterpreter:
    """
    วิเคราะห์คำขอเป็นภาษาธรรมชาติ
    แปลงเป็น structured control packet
    """
    
    def __init__(self, model_name: str = "gpt-4"):
        self.model = model_name
        self.cache = {}
    
    async def parse_user_request(self, user_text: str) -> Dict[str, Any]:
        """
        Main entry point: รับข้อความจากผู้ใช้ เอาออก intent
        """
        
        # ตรวจสอบ cache ก่อน
        cache_key = hash(user_text)
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # ใช้ LLM (จำลอง)
        intent_analysis = await self._call_llm_for_intent(user_text)
        
        control_packet = self._build_control_packet(
            user_text=user_text,
            analysis=intent_analysis
        )
        
        # เก็บ cache
        self.cache[cache_key] = control_packet
        
        return control_packet
    
    async def _call_llm_for_intent(self, user_text: str) -> Dict[str, Any]:
        """
        เรียก LLM เพื่อวิเคราะห์ intent
        (ในการใช้งานจริง: เรียก OpenAI / Claude / เครื่องท้องถิ่น)
        """
        
        prompt = f"""
        Analyze this light manifestation request:
        "{user_text}"
        
        Extract:
        1. primary_goal: what does the user want to SEE?
        2. emotional_tone: calm, energetic, sad, confused, growing, breaking, etc.
        3. form_hint: shapes, concepts, or metaphors mentioned
        4. speed_preference: slow, moderate, fast
        5. duration_hint: brief flash, sustained, fading, looping
        6. abstraction_level: concrete (specific shape), symbolic (emotion), abstract (concept)
        
        Return JSON.
        """
        
        # จำลอง LLM response
        return {
            "primary_goal": "manifest_feeling",
            "emotional_tone": "thinking",
            "form_hint": "spiral of contemplation",
            "speed_preference": "slow",
            "abstraction_level": "symbolic",
            "confidence": 0.87
        }
    
    def _build_control_packet(self, 
                             user_text: str, 
                             analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        แปลง LLM analysis เป็น LCL control packet
        """
        
        # เลือก intent type
        intent_type = self._classify_intent(analysis)
        
        # เลือก morphology
        morphology = self._select_morphology(analysis, intent_type)
        
        # เลือก motion archetype
        motion = self._select_motion(analysis, intent_type)
        
        # เลือก optics
        optics = self._select_optics(analysis)
        
        # สร้าง packet
        packet = {
            "version": "3.0",
            "intent": {
                "user_request": user_text,
                "primary_goal": intent_type.value,
                "abstraction_level": analysis.get("abstraction_level", "symbolic"),
                "mode": "shape"  # routed by controller render strategy
            },
            "morphology": morphology,
            "motion": motion,
            "optics": optics,
            "field": {
                "coherence": 0.65,
                "turbulence": 0.15,
                "flow_magnitude": 0.5,
                "noise_level": 0.2,
                "vorticity": 0.0
            },
            "motion_bias": {
                "archetype": motion.get("archetype", "stabilization"),
                "rhythm_hz": motion.get("tempo_hz", 0.2),
                "attack": 0.7 if motion.get("tempo_hz", 0.2) < 0.4 else 0.5,
                "settling": 0.82,
                "drift": 0.11,
                "collapse_tendency": 0.03 if intent_type != IntentType.MANIFEST_ERROR else 0.22
            },
            "safety": {
                "max_targets": 14000,
                "max_particle_energy": 1.4
            },
            "constraints": {
                "max_targets": 12000,
                "max_particles": 12000,
                "max_energy": 1.4,
                "max_brightness": 0.95,
                "duration_ms": None,  # continuous
                "safety_level": "normal"
            },
            "reference": {
                "book_of_formation_id": f"{morphology.get('family')}_{motion.get('archetype')}",
                "motion_archetype_id": motion.get('archetype'),
                "evaluation_mode": "periodic"  # ตรวจสอบทุก N เฟรม
            }
        }
        
        return packet
    
    def _classify_intent(self, analysis: Dict) -> IntentType:
        """เลือก intent type จาก LLM analysis"""
        goal = analysis.get("primary_goal", "").lower()
        
        if "error" in goal or "broken" in goal or "fracture" in goal:
            return IntentType.MANIFEST_ERROR
        elif "dissolve" in goal or "fade" in goal or "disappear" in goal:
            return IntentType.DISSOLVE
        elif "feeling" in goal or "emotion" in goal:
            return IntentType.RESPOND_TO_EMOTION
        elif "concept" in goal or "idea" in goal or "thinking" in goal:
            return IntentType.VISUALIZE_CONCEPT
        else:
            return IntentType.CREATE_FORM
    
    def _select_morphology(self, analysis: Dict, intent_type: IntentType) -> Dict:
        """เลือก morphology family และ parameters"""
        
        form_hint = analysis.get("form_hint", "sphere").lower()
        
        # แมป form hint -> family
        families = {
            "spiral": "spiral_vortex",
            "sphere": "sphere",
            "flower": "flower_shell",
            "wave": "wave_ribbon",
            "cloud": "nebula_cloud",
            "fracture": "fracture_shell",
            "spiral of contemplation": "spiral_convergence"
        }
        
        family = next(
            (v for k, v in families.items() if k in form_hint),
            "sphere"
        )
        
        return {
            "family": family,
            "symmetry": 5 if "flower" in family else (3 if "spiral" in family else 1),
            "complexity": 0.6,
            "edge_softness": 0.4,
            "density": 0.7
        }
    
    def _select_motion(self, analysis: Dict, intent_type: IntentType) -> Dict:
        """เลือก motion archetype และ timing"""
        
        emotion = analysis.get("emotional_tone", "neutral").lower()
        speed = analysis.get("speed_preference", "moderate").lower()
        
        # เลือก archetype
        archetype_map = {
            "calm": "stabilization",
            "peaceful": "stabilization",
            "thinking": "reasoning",
            "confused": "error",
            "broken": "dissolution",
            "growing": "emergence",
            "breathing": "wave",
            "energetic": "spiral_convergence"
        }
        
        archetype = next(
            (v for k, v in archetype_map.items() if k in emotion),
            "stabilization"
        )
        
        # Timing based on speed
        speed_map = {
            "slow": {"attack": 1200, "settle": 3000, "release": 2000},
            "moderate": {"attack": 800, "settle": 2000, "release": 1500},
            "fast": {"attack": 400, "settle": 1000, "release": 800}
        }
        
        timing = speed_map.get(speed, speed_map["moderate"])
        
        return {
            "archetype": archetype,
            "tempo_hz": 0.2 if speed == "slow" else (0.5 if speed == "moderate" else 1.0),
            "coherence_target": 0.75,
            "flow_mode": "spiral_convergence" if archetype == "reasoning" else "radial_bloom",
            "attack_ms": timing["attack"],
            "settle_ms": timing["settle"],
            "release_ms": timing["release"]
        }
    
    def _select_optics(self, analysis: Dict) -> Dict:
        """เลือกสี และ light properties"""
        
        emotion = analysis.get("emotional_tone", "neutral").lower()
        
        # โปรแกรม emotion -> colors
        emotion_colors = {
            "calm": {"primary": ["#B0E0E6", "#87CEEB"], "secondary": ["#E0FFFF", "#F0F8FF"]},
            "thinking": {"primary": ["#9370DB", "#8A2BE2"], "secondary": ["#DDA0DD", "#EE82EE"]},
            "energetic": {"primary": ["#FFD700", "#FF6347"], "secondary": ["#FFA500", "#FFB6C1"]},
            "sad": {"primary": ["#4169E1", "#1E90FF"], "secondary": ["#B0C4DE", "#87CEEB"]},
            "growth": {"primary": ["#00FA9A", "#7FFF00"], "secondary": ["#90EE90", "#00FF00"]},
            "breaking": {"primary": ["#FF1493", "#FF4500"], "secondary": ["#FF6347", "#FFA07A"]}
        }
        
        colors = emotion_colors.get(emotion, emotion_colors["calm"])
        
        return {
            "palette_mode": "emotional",
            "primary_colors": colors["primary"],
            "secondary_colors": colors["secondary"],
            "glow_strength": 0.7,
            "luminance": 0.8,
            "contrast": 0.6
        }


# Example usage
async def main():
    interpreter = IntentInterpreter()
    
    test_requests = [
        "ขอแสงที่ดูเหมือนกำลังคิด",
        "ทำให้เหมือนลมหายใจ",
        "ขอรูปดอกไม้ไฟแต่สงบ",
        "อยากได้ทรงกลมที่ค่อย ๆ แตกเป็นฝุ่น"
    ]
    
    for request in test_requests:
        packet = await interpreter.parse_user_request(request)
        print(json.dumps(packet, indent=2, ensure_ascii=False))
        print("---")


if __name__ == "__main__":
    asyncio.run(main())