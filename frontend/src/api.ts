import axios from 'axios';
import { TodayResponse, SubmitResponse, Stats } from './types';

const api = axios.create({ baseURL: '/api' });

export async function fetchToday(): Promise<TodayResponse> {
  const res = await api.get('/exercise/today');
  return res.data;
}

export async function runCode(exerciseId: string, code: string) {
  const res = await api.post('/exercise/run', { exercise_id: exerciseId, code });
  return res.data;
}

export async function submitExercise(payload: {
  exercise_id: string;
  code: string;
  answer: string;
  time_seconds: number;
  hints_used: number;
}): Promise<SubmitResponse> {
  const res = await api.post('/exercise/submit', payload);
  return res.data;
}

export async function fetchHint(exerciseId: string, hintIndex: number) {
  const res = await api.get(`/hint/${exerciseId}/${hintIndex}`);
  return res.data as { hint: string; cost: number; total_hints: number };
}

export async function fetchNext(excludeIds: string[]): Promise<TodayResponse> {
  const res = await api.get('/exercise/next', {
    params: { exclude: excludeIds.join(',') },
  });
  return res.data;
}

export async function fetchStats(): Promise<Stats> {
  const res = await api.get('/stats');
  return res.data;
}
