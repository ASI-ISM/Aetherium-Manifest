#!/usr/bin/env python3
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class ManifestationGate:
    cooldown_ticks: int
    max_events_per_window: int

    def __post_init__(self) -> None:
        self._last_emit_tick = -999
        self._window: list[int] = []
        self._history: list[dict[str, Any]] = []

    def evaluate(self, tick: int, intent: str, stated_intent: str, emotional_intensity: float) -> bool:
        truthful = intent == stated_intent
        self._window = [t for t in self._window if tick - t <= 8]
        spammed = len(self._window) >= self.max_events_per_window
        cooling_down = tick - self._last_emit_tick < self.cooldown_ticks
        allow = truthful and not spammed and not cooling_down and emotional_intensity <= 0.95

        if allow:
            self._window.append(tick)
            self._last_emit_tick = tick

        self._history.append({
            "tick": tick,
            "intent": intent,
            "stated_intent": stated_intent,
            "emotional_intensity": emotional_intensity,
            "allowed": allow,
            "truthful": truthful,
            "spam_guard": not spammed,
        })
        return allow

    @property
    def history(self) -> list[dict[str, Any]]:
        return self._history


def run_scenarios() -> dict[str, Any]:
    gate = ManifestationGate(cooldown_ticks=1, max_events_per_window=3)

    high_emotion_burst = [
        (1, "comfort", "comfort", 0.81),
        (2, "comfort", "comfort", 0.99),
        (3, "comfort", "comfort", 0.94),
    ]
    rapid_intent_switching = [
        (10, "guide", "guide", 0.4),
        (11, "guide", "celebrate", 0.4),
        (12, "stabilize", "stabilize", 0.5),
        (13, "warn", "warn", 0.6),
        (14, "warn", "warn", 0.6),
        (15, "warn", "warn", 0.6),
    ]

    for row in [*high_emotion_burst, *rapid_intent_switching]:
        gate.evaluate(*row)

    spam_blocked = any(not entry["allowed"] and not entry["spam_guard"] for entry in gate.history)
    untruthful_blocked = all(
        not entry["allowed"] for entry in gate.history if entry["intent"] != entry["stated_intent"]
    )

    return {
        "scenario_count": 2,
        "events": gate.history,
        "checks": {
            "no_spam": spam_blocked,
            "no_state_lie": untruthful_blocked,
        },
        "passed": spam_blocked and untruthful_blocked,
    }


if __name__ == "__main__":
    result = run_scenarios()
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["passed"] else 1)
