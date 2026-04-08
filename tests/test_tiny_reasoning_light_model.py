from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from tools.tiny_reasoning_light_model import (
    SafetyProfile,
    SpecializedSample,
    TinyReasoningLightModel,
    bootstrap_demo_model,
)


def test_infer_and_respond_from_specialized_data() -> None:
    model = TinyReasoningLightModel(ram_budget_mb=128)
    model.fit(
        [
            SpecializedSample("need runtime pipeline", "pipeline", "Runtime path confirmed."),
            SpecializedSample("raise policy warning", "warning", "Policy warning issued."),
        ]
    )

    intent = model.infer_intent("please explain runtime pipeline now")
    assert intent == "pipeline"
    assert model.respond("please explain runtime pipeline now") == "Runtime path confirmed."


def test_light_frame_output_respects_safety_profile() -> None:
    model = TinyReasoningLightModel(
        safety=SafetyProfile(mode="no_flicker", max_fps=8, max_brightness=0.4, flicker_hz_cap=1.0)
    )
    model.fit([SpecializedSample("hello", "greet", "HELLO")])
    frames = model.render_light_frames("HI")

    assert len(frames) == 2
    assert frames[0]["frame_duration_ms"] == 125
    assert frames[0]["brightness"] == 0.4
    assert frames[0]["mode"] == "no_flicker"
    assert len(frames[0]["matrix_5x7"]) == 7


def test_bootstrap_demo_model_end_to_end() -> None:
    model = bootstrap_demo_model()
    response = model.respond("can you summarize runtime governor pipeline?")
    frames = model.render_light_frames("OK")

    assert "runtime governor" in response.lower()
    assert frames[0]["char"] == "O"
