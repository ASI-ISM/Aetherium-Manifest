from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable
import math
import re


TOKEN_RE = re.compile(r"[a-z0-9']+")


@dataclass(frozen=True)
class SpecializedSample:
    """Domain-tuned example for tiny reasoning model bootstrap."""

    user_query: str
    intent: str
    response: str


@dataclass(frozen=True)
class SafetyProfile:
    """Low-sensory profile for light output constraints."""

    mode: str = "low_sensory"
    max_fps: int = 12
    max_brightness: float = 0.65
    flicker_hz_cap: float = 2.0


class TinyReasoningLightModel:
    """Small retrieval+reasoning model with deterministic light-text emitter.

    This is not a foundation LLM. It is a compact, RAM-friendly reasoning module
    that can be trained on specialized samples and emits text as light matrix frames.
    """

    def __init__(self, ram_budget_mb: int = 256, safety: SafetyProfile | None = None):
        self.ram_budget_mb = ram_budget_mb
        self.safety = safety or SafetyProfile()
        self._intent_term_counts: dict[str, dict[str, int]] = {}
        self._intent_response_bank: dict[str, list[str]] = {}

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return TOKEN_RE.findall(text.lower())

    def fit(self, samples: Iterable[SpecializedSample]) -> None:
        for sample in samples:
            intent_terms = self._intent_term_counts.setdefault(sample.intent, {})
            self._intent_response_bank.setdefault(sample.intent, []).append(sample.response)
            for token in self._tokenize(sample.user_query):
                intent_terms[token] = intent_terms.get(token, 0) + 1

    def _score_intent(self, tokens: list[str], intent: str) -> float:
        term_counts = self._intent_term_counts.get(intent, {})
        if not tokens:
            return 0.0
        numer = sum(term_counts.get(t, 0) for t in tokens)
        denom = math.sqrt(sum(v * v for v in term_counts.values())) or 1.0
        return numer / denom

    def infer_intent(self, user_query: str) -> str:
        if not self._intent_term_counts:
            raise RuntimeError("Model must be trained with fit() before inference.")
        tokens = self._tokenize(user_query)
        scored = [
            (intent, self._score_intent(tokens, intent))
            for intent in self._intent_term_counts
        ]
        best_intent, _ = max(scored, key=lambda item: item[1])
        return best_intent

    def respond(self, user_query: str) -> str:
        intent = self.infer_intent(user_query)
        response_bank = self._intent_response_bank[intent]
        return response_bank[0]

    @staticmethod
    def _char_to_matrix(char: str) -> list[str]:
        # 5x7 subset for high-readability projection. Unknown chars fallback to block.
        font = {
            "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
            "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
            "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
            "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
            "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
            "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
            "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
            "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
            "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
            "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
            "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
            "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
            "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
            "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
            " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
        }
        return font.get(char.upper(), ["11111", "10001", "00100", "00100", "00100", "00000", "00100"])

    def render_light_frames(self, text: str) -> list[dict[str, object]]:
        """Render deterministic frame list to display text using light pixels."""
        frames: list[dict[str, object]] = []
        safe_fps = min(max(self.safety.max_fps, 1), 24)
        safe_brightness = min(max(self.safety.max_brightness, 0.05), 1.0)
        for char in text:
            frames.append(
                {
                    "char": char,
                    "matrix_5x7": self._char_to_matrix(char),
                    "frame_duration_ms": int(1000 / safe_fps),
                    "brightness": safe_brightness,
                    "flicker_hz_cap": self.safety.flicker_hz_cap,
                    "mode": self.safety.mode,
                }
            )
        return frames


def bootstrap_demo_model() -> TinyReasoningLightModel:
    samples = [
        SpecializedSample(
            user_query="summarize runtime governor pipeline",
            intent="explain_pipeline",
            response="The runtime governor validates, clamps, applies fallback, and emits safe telemetry.",
        ),
        SpecializedSample(
            user_query="show warning about policy violation",
            intent="policy_warning",
            response="Policy warning: requested control mutation was denied by safety gate.",
        ),
    ]
    model = TinyReasoningLightModel(ram_budget_mb=192)
    model.fit(samples)
    return model
