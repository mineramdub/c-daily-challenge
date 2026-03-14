from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
import os

from database import engine, get_db, Base
from models import Submission, UserState
from sandbox import compile_and_run
from adaptive import update_difficulty, compute_score
from exercises_db import load_exercises, get_exercise_by_id, get_exercise_for_day

Base.metadata.create_all(bind=engine)

app = FastAPI(title="C Daily Challenge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── helpers ──────────────────────────────────────────────────────────────────

def get_or_create_state(db: Session) -> UserState:
    state = db.query(UserState).first()
    if not state:
        state = UserState()
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def get_submission_for_exercise(db: Session, exercise_id: str) -> Optional[Submission]:
    today = date.today().isoformat()
    return db.query(Submission).filter(
        Submission.date == today,
        Submission.exercise_id == exercise_id,
    ).first()


# ─── models ───────────────────────────────────────────────────────────────────

class RunRequest(BaseModel):
    code: str
    exercise_id: str

class SubmitRequest(BaseModel):
    exercise_id: str
    code: str           # empty for predict exercises
    answer: str         # typed output for predict, empty for code
    time_seconds: int
    hints_used: int

class HintRequest(BaseModel):
    exercise_id: str
    hint_index: int     # 0, 1, or 2


# ─── routes ───────────────────────────────────────────────────────────────────

@app.get("/exercise/today")
def get_today_exercise(db: Session = Depends(get_db)):
    state = get_or_create_state(db)

    # IDs done in last 30 days
    recent = db.query(Submission).order_by(Submission.created_at.desc()).limit(30).all()
    done_ids = {s.exercise_id for s in recent}

    today = date.today()
    exercise = get_exercise_for_day(today, state.current_difficulty, done_ids)

    if not exercise:
        raise HTTPException(status_code=404, detail="No exercise available")

    today_sub = get_submission_for_exercise(db, exercise["id"])

    # Strip solution from response
    safe = {k: v for k, v in exercise.items() if k != "solution"}

    return {
        "exercise": safe,
        "already_submitted": today_sub is not None,
        "today_score": today_sub.score if today_sub else None,
        "today_passed": today_sub.passed if today_sub else None,
        "current_difficulty": state.current_difficulty,
        "streak": state.streak,
        "total_score": state.total_score,
    }


@app.post("/exercise/run")
def run_code(req: RunRequest):
    """Run code without submitting — for testing."""
    exercise = get_exercise_by_id(req.exercise_id)
    if not exercise:
        raise HTTPException(status_code=404)

    if exercise["type"] == "predict":
        return {"error": "Cannot run predict exercises"}

    result = compile_and_run(req.code)
    return {
        "success": result.success,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "phase": result.phase,
    }


@app.post("/exercise/submit")
def submit_exercise(req: SubmitRequest, db: Session = Depends(get_db)):
    exercise = get_exercise_by_id(req.exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    state = get_or_create_state(db)
    today = date.today().isoformat()

    # Check already submitted this exercise today
    existing = get_submission_for_exercise(db, req.exercise_id)
    if existing:
        return {
            "already_submitted": True,
            "score": existing.score,
            "passed": existing.passed,
        }

    passed = False
    feedback = ""
    test_results = []

    if exercise["type"] == "predict":
        # Compare answer to expected output
        expected = exercise["test_cases"][0]["expected"].strip()
        user_answer = req.answer.strip()
        passed = (user_answer == expected)
        feedback = "Correct !" if passed else f"Incorrect. Attendu:\n{expected}"
        test_results = [{"passed": passed, "expected": expected, "got": user_answer}]

    else:
        # code or debug: run test cases
        all_passed = True
        for i, tc in enumerate(exercise["test_cases"]):
            result = compile_and_run(req.code, tc.get("input", ""))
            if not result.success:
                all_passed = False
                test_results.append({
                    "passed": False,
                    "phase": result.phase,
                    "error": result.stderr[:500],
                    "case": i + 1,
                })
                break
            got = result.stdout
            expected = tc["expected"]
            tc_passed = got == expected
            if not tc_passed:
                all_passed = False
            test_results.append({
                "passed": tc_passed,
                "expected": expected,
                "got": got,
                "case": i + 1,
            })
        passed = all_passed
        feedback = "Tous les tests passent !" if passed else "Certains tests ont échoué."

    # Compute score
    hint_costs = exercise.get("hint_costs", [5, 15, 25])
    score = compute_score(
        passed=passed,
        hints_used=req.hints_used,
        hint_costs=hint_costs,
        time_seconds=req.time_seconds,
        difficulty=exercise["difficulty"],
    )

    # Save submission
    sub = Submission(
        date=today,
        exercise_id=req.exercise_id,
        exercise_difficulty=exercise["difficulty"],
        exercise_type=exercise["type"],
        score=score,
        hints_used=req.hints_used,
        time_seconds=req.time_seconds,
        passed=passed,
        submitted_code=req.code[:4000],
    )
    db.add(sub)

    # Update state
    state.total_score += score
    state.total_exercises += 1

    # Update streak
    yesterday = (date.today().replace(day=date.today().day - 1)).isoformat() \
        if date.today().day > 1 else None
    last = state.last_submission_date
    if last == yesterday or last == "":
        state.streak = (state.streak or 0) + 1
    elif last != today:
        state.streak = 1

    state.last_submission_date = today

    # Update difficulty
    all_subs = db.query(Submission).order_by(Submission.created_at).all()
    state.current_difficulty = update_difficulty(state, all_subs)

    db.commit()

    return {
        "passed": passed,
        "score": score,
        "feedback": feedback,
        "test_results": test_results,
        "new_difficulty": state.current_difficulty,
        "streak": state.streak,
        "total_score": state.total_score,
    }


@app.get("/hint/{exercise_id}/{hint_index}")
def get_hint(exercise_id: str, hint_index: int):
    exercise = get_exercise_by_id(exercise_id)
    if not exercise:
        raise HTTPException(status_code=404)
    hints = exercise.get("hints", [])
    if hint_index >= len(hints):
        raise HTTPException(status_code=400, detail="Hint index out of range")
    costs = exercise.get("hint_costs", [5, 15, 25])
    return {
        "hint": hints[hint_index],
        "cost": costs[hint_index] if hint_index < len(costs) else 10,
        "total_hints": len(hints),
    }


@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    state = get_or_create_state(db)
    submissions = db.query(Submission).order_by(Submission.created_at.desc()).limit(30).all()

    history = [
        {
            "date": s.date,
            "exercise_id": s.exercise_id,
            "score": s.score,
            "passed": s.passed,
            "difficulty": s.exercise_difficulty,
            "type": s.exercise_type,
            "hints_used": s.hints_used,
            "time_seconds": s.time_seconds,
        }
        for s in submissions
    ]

    pass_rate = 0
    if submissions:
        pass_rate = round(sum(1 for s in submissions if s.passed) / len(submissions) * 100)

    return {
        "current_difficulty": state.current_difficulty,
        "total_score": state.total_score,
        "streak": state.streak,
        "total_exercises": state.total_exercises,
        "pass_rate": pass_rate,
        "history": history,
    }


@app.get("/exercise/next")
def get_next_exercise(exclude: str = "", db: Session = Depends(get_db)):
    """Returns the next exercise to do, excluding already-seen IDs."""
    state = get_or_create_state(db)

    # IDs to exclude: passed as comma-separated query param + last 30 submissions
    session_done = set(exclude.split(",")) if exclude else set()
    recent = db.query(Submission).order_by(Submission.created_at.desc()).limit(30).all()
    done_ids = session_done | {s.exercise_id for s in recent}

    exercise = get_exercise_for_day(date.today(), state.current_difficulty, done_ids)
    if not exercise:
        raise HTTPException(status_code=404, detail="Plus d'exercices disponibles !")

    already = get_submission_for_exercise(db, exercise["id"])
    safe = {k: v for k, v in exercise.items() if k != "solution"}
    return {
        "exercise": safe,
        "already_submitted": already is not None,
        "today_score": already.score if already else None,
        "today_passed": already.passed if already else None,
        "current_difficulty": state.current_difficulty,
        "streak": state.streak,
        "total_score": state.total_score,
    }


@app.get("/exercises")
def list_exercises():
    exercises = load_exercises()
    return [
        {
            "id": ex["id"],
            "title": ex["title"],
            "difficulty": ex["difficulty"],
            "type": ex["type"],
            "topic": ex["topic"],
        }
        for ex in exercises
    ]
