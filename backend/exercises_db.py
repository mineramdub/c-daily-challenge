import json
import os
import hashlib
from datetime import date
from typing import Optional

EXERCISES_PATH = os.path.join(os.path.dirname(__file__), "exercises.json")

_exercises: list = []


def load_exercises() -> list:
    global _exercises
    if not _exercises:
        with open(EXERCISES_PATH, "r") as f:
            _exercises = json.load(f)
    return _exercises


def get_exercise_by_id(exercise_id: str) -> Optional[dict]:
    for ex in load_exercises():
        if ex["id"] == exercise_id:
            return ex
    return None


def get_exercise_for_day(
    target_date: date,
    current_difficulty: float,
    done_ids: set,
) -> Optional[dict]:
    """
    Selects a deterministic exercise for a given day.
    - Filters by difficulty ± 1.5 around target
    - Avoids recently done exercises
    - Uses date-seeded selection for determinism (same day = same exercise)
    """
    exercises = load_exercises()

    candidates = [
        ex for ex in exercises
        if abs(ex["difficulty"] - current_difficulty) <= 1.5
        and ex["id"] not in done_ids
    ]

    if not candidates:
        # Loosen constraint if no candidates
        candidates = [
            ex for ex in exercises
            if abs(ex["difficulty"] - current_difficulty) <= 3.0
        ]

    if not candidates:
        candidates = exercises

    # Deterministic pick: hash of date string → index
    date_str = target_date.isoformat()
    seed = int(hashlib.md5(date_str.encode()).hexdigest(), 16)
    idx = seed % len(candidates)
    return candidates[idx]
