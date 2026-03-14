from typing import List
from models import Submission, UserState


def update_difficulty(state: UserState, submissions: List[Submission]) -> float:
    """
    Adaptive difficulty algorithm:
    - Looks at the last 7 submissions (exponential recency weighting)
    - High scores → increase difficulty
    - Low scores → decrease difficulty
    - Smooth clamped to [1.0, 10.0]
    """
    if not submissions:
        return state.current_difficulty

    recent = submissions[-7:]
    if len(recent) < 2:
        return state.current_difficulty

    # Exponential weights: more recent = more important
    weights = [1.6 ** i for i in range(len(recent))]
    total_w = sum(weights)
    avg_score = sum(s.score * w for s, w in zip(recent, weights)) / total_w

    # Determine adjustment magnitude based on score
    if avg_score >= 85:
        adjustment = +0.7
    elif avg_score >= 70:
        adjustment = +0.4
    elif avg_score >= 55:
        adjustment = +0.15
    elif avg_score >= 40:
        adjustment = 0.0
    elif avg_score >= 25:
        adjustment = -0.3
    else:
        adjustment = -0.6

    # Dampen adjustment if score is near boundaries
    new_diff = state.current_difficulty + adjustment
    return round(max(1.0, min(10.0, new_diff)), 2)


def compute_score(
    passed: bool,
    hints_used: int,
    hint_costs: List[int],
    time_seconds: int,
    difficulty: float,
) -> int:
    """
    Score computation:
    - Base: 100 if passed, 20 if failed (for effort)
    - Hint deductions: cumulative cost of hints used
    - Time bonus: up to +15 for fast solves
    - Difficulty multiplier: harder = more points possible
    """
    if not passed:
        return max(0, 20 - hints_used * 5)

    base = 100
    hint_deduction = sum(hint_costs[:hints_used])
    base -= hint_deduction

    # Time bonus (max +15, threshold 10min)
    time_bonus = 0
    if time_seconds > 0:
        if time_seconds < 120:
            time_bonus = 15
        elif time_seconds < 300:
            time_bonus = 10
        elif time_seconds < 600:
            time_bonus = 5

    raw = base + time_bonus
    # Difficulty multiplier: difficulty 3→×0.8, 10→×1.5
    mult = 0.7 + (difficulty / 10.0) * 0.8
    final = int(raw * mult)
    return max(0, min(200, final))
