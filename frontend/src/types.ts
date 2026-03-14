export type ExerciseType = 'code' | 'predict' | 'debug';

export interface TestCase {
  input: string;
  expected: string;
  description?: string;
}

export interface Exercise {
  id: string;
  difficulty: number;
  type: ExerciseType;
  topic: string;
  title: string;
  description: string;
  starter_code: string;
  test_cases: TestCase[];
  hints: string[];
  hint_costs: number[];
}

export interface TestResult {
  passed: boolean;
  case?: number;
  expected?: string;
  got?: string;
  error?: string;
  phase?: string;
}

export interface SubmitResponse {
  passed: boolean;
  score: number;
  feedback: string;
  test_results: TestResult[];
  new_difficulty: number;
  streak: number;
  total_score: number;
  already_submitted?: boolean;
}

export interface TodayResponse {
  exercise: Exercise;
  already_submitted: boolean;
  today_score: number | null;
  today_passed: boolean | null;
  current_difficulty: number;
  streak: number;
  total_score: number;
}

export interface HistoryEntry {
  date: string;
  exercise_id: string;
  score: number;
  passed: boolean;
  difficulty: number;
  type: ExerciseType;
  hints_used: number;
  time_seconds: number;
}

export interface Stats {
  current_difficulty: number;
  total_score: number;
  streak: number;
  total_exercises: number;
  pass_rate: number;
  history: HistoryEntry[];
}
