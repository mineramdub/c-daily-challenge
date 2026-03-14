from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)           # ISO date "2024-01-15"
    exercise_id = Column(String)
    exercise_difficulty = Column(Float)
    exercise_type = Column(String)              # code | predict | debug
    score = Column(Integer, default=0)          # 0-100
    hints_used = Column(Integer, default=0)
    time_seconds = Column(Integer, default=0)
    passed = Column(Boolean, default=False)
    submitted_code = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class UserState(Base):
    __tablename__ = "user_state"

    id = Column(Integer, primary_key=True)
    current_difficulty = Column(Float, default=4.0)
    total_score = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    last_submission_date = Column(String, default="")
    total_exercises = Column(Integer, default=0)
