import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { fetchToday, fetchNext, runCode, submitExercise } from './api';
import { TodayResponse, SubmitResponse } from './types';
import StatsBar from './components/StatsBar';
import ExercisePanel from './components/ExercisePanel';
import OutputPanel from './components/OutputPanel';
import HintPanel from './components/HintPanel';
import HistoryModal from './components/HistoryModal';

type Tab = 'output' | 'hints';

interface RunOutput {
  success: boolean;
  stdout: string;
  stderr: string;
  phase: string;
}

export default function App() {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [answer, setAnswer] = useState(''); // for predict exercises

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runOutput, setRunOutput] = useState<RunOutput | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('output');
  const [showHistory, setShowHistory] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [loadingNext, setLoadingNext] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  function resetExerciseState(data: TodayResponse) {
    setToday(data);
    setCode(data.exercise.starter_code || '');
    setAnswer('');
    setRunOutput(null);
    setSubmitResult(null);
    setHintsUsed(0);
    setActiveTab('output');
    startTimeRef.current = Date.now();
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchToday();
      resetExerciseState(data);
      setDoneIds([data.exercise.id]);
    } catch (e: unknown) {
      setError('Impossible de charger l\'exercice. Le backend est-il lancé ?');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleNextExercise() {
    setLoadingNext(true);
    try {
      const data = await fetchNext(doneIds);
      resetExerciseState(data);
      setDoneIds(prev => [...prev, data.exercise.id]);
    } finally {
      setLoadingNext(false);
    }
  }

  async function handleRun() {
    if (!today || isRunning) return;
    setIsRunning(true);
    setRunOutput(null);
    setSubmitResult(null);
    setActiveTab('output');
    try {
      const result = await runCode(today.exercise.id, code);
      setRunOutput(result);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmit() {
    if (!today || isSubmitting) return;
    setIsSubmitting(true);
    setActiveTab('output');
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      const result = await submitExercise({
        exercise_id: today.exercise.id,
        code: today.exercise.type === 'predict' ? '' : code,
        answer: today.exercise.type === 'predict' ? answer : '',
        time_seconds: elapsed,
        hints_used: hintsUsed,
      });
      setSubmitResult(result);
      setRunOutput(null);
      // Refresh header stats
      setToday(prev => prev ? {
        ...prev,
        already_submitted: true,
        today_score: result.score,
        today_passed: result.passed,
        current_difficulty: result.new_difficulty,
        streak: result.streak,
        total_score: result.total_score,
      } : prev);
    } finally {
      setIsSubmitting(false);
    }
  }

  const alreadyDone = today?.already_submitted || !!submitResult;
  const exercise = today?.exercise;
  const isPredict = exercise?.type === 'predict';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center gap-3 text-[#8b949e]">
        <div className="w-6 h-6 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
        <span>Chargement de l'exercice du jour...</span>
      </div>
    );
  }

  if (error || !today) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 p-6">
          <div className="text-5xl">⚠️</div>
          <p className="text-[#f85149] font-semibold">{error || 'Erreur inconnue'}</p>
          <p className="text-[#8b949e] text-sm">
            Lance le backend avec : <code className="text-[#58a6ff] bg-[#161b22] px-2 py-0.5 rounded">./start.sh</code>
          </p>
          <button onClick={load} className="px-4 py-2 bg-[#58a6ff]/20 border border-[#58a6ff]/40 rounded-lg text-[#58a6ff] hover:bg-[#58a6ff]/30 transition-colors">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <StatsBar
        difficulty={today.current_difficulty}
        streak={today.streak}
        totalScore={today.total_score}
        onShowHistory={() => setShowHistory(true)}
      />

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Left: Exercise description */}
        <div className="w-[38%] min-w-[320px] border-r border-[#30363d] overflow-auto flex flex-col">
          <ExercisePanel exercise={exercise!} />

          {/* Hint panel at bottom of left column */}
          <div className="border-t border-[#30363d] p-4 bg-[#0d1117]">
            <HintPanel
              exerciseId={exercise!.id}
              hintCosts={exercise!.hint_costs}
              totalHints={exercise!.hints.length}
              disabled={alreadyDone}
              onHintUsed={setHintsUsed}
            />
          </div>
        </div>

        {/* Right: Editor + Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363d] bg-[#161b22] shrink-0">
            <div className="flex items-center gap-2 text-sm">
              {isPredict ? (
                <span className="text-[#bc8cff] font-mono">Réponse</span>
              ) : (
                <>
                  <span className="text-[#8b949e]">solution.c</span>
                  <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse-slow" title="gcc prêt" />
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isPredict && !alreadyDone && (
                <button
                  onClick={handleRun}
                  disabled={isRunning || isSubmitting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-sm text-[#e6edf3] hover:border-[#58a6ff]/50 hover:text-[#58a6ff] transition-colors disabled:opacity-40"
                >
                  <span>▶</span>
                  <span>{isRunning ? 'Exécution...' : 'Tester'}</span>
                </button>
              )}

              {!alreadyDone && (
                <button
                  onClick={handleSubmit}
                  disabled={isRunning || isSubmitting || (isPredict && !answer.trim())}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#238636] border border-[#2ea043] text-sm text-white font-semibold hover:bg-[#2ea043] transition-colors disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Validation...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Soumettre</span>
                    </>
                  )}
                </button>
              )}

              {alreadyDone && (
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                    (submitResult?.passed || today.today_passed)
                      ? 'border-[#3fb950]/40 bg-[#3fb950]/10 text-[#3fb950]'
                      : 'border-[#f85149]/40 bg-[#f85149]/10 text-[#f85149]'
                  }`}>
                    <span>{(submitResult?.passed || today.today_passed) ? '✓' : '✗'}</span>
                    <span>
                      {(submitResult?.passed || today.today_passed) ? 'Réussi' : 'Échoué'}
                      {' '}· {submitResult?.score ?? today.today_score} pts
                    </span>
                  </div>

                  <button
                    onClick={handleNextExercise}
                    disabled={loadingNext}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#58a6ff]/20 border border-[#58a6ff]/50 text-sm text-[#58a6ff] font-semibold hover:bg-[#58a6ff]/30 transition-colors disabled:opacity-40"
                  >
                    {loadingNext ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#58a6ff]/40 border-t-[#58a6ff] rounded-full animate-spin" />
                    ) : (
                      <span>→</span>
                    )}
                    <span>{loadingNext ? 'Chargement...' : 'Exercice suivant'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Editor area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isPredict ? (
              /* Predict: textarea answer */
              <div className="flex-1 flex flex-col p-4 gap-3">
                <label className="text-xs text-[#8b949e] font-semibold uppercase tracking-wider">
                  Sortie attendue du programme :
                </label>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  disabled={alreadyDone}
                  placeholder={'Écris ici la sortie exacte...\nEx: 42\nhello\n'}
                  className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg p-4 font-mono text-sm text-[#e6edf3] resize-none focus:outline-none focus:border-[#58a6ff]/60 placeholder-[#484f58] disabled:opacity-60"
                  spellCheck={false}
                />
                {alreadyDone && submitResult && (
                  <div className={`rounded-lg border p-3 text-sm ${
                    submitResult.passed
                      ? 'border-[#3fb950]/30 bg-[#3fb950]/10 text-[#3fb950]'
                      : 'border-[#f85149]/30 bg-[#f85149]/10'
                  }`}>
                    {submitResult.passed ? (
                      <span>Correct !</span>
                    ) : (
                      <div className="space-y-1 font-mono text-xs">
                        <div className="text-[#f85149] font-semibold">Incorrect</div>
                        <div><span className="text-[#8b949e]">Attendu : </span><span className="text-[#3fb950]">{JSON.stringify(submitResult.test_results[0]?.expected)}</span></div>
                        <div><span className="text-[#8b949e]">Ta réponse : </span><span className="text-[#f85149]">{JSON.stringify(answer.trim())}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Code editor */
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language="c"
                  value={code}
                  onChange={v => !alreadyDone && setCode(v || '')}
                  options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    readOnly: alreadyDone,
                    padding: { top: 12, bottom: 12 },
                    tabSize: 4,
                    wordWrap: 'off',
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    contextmenu: false,
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                    scrollbar: {
                      verticalScrollbarSize: 6,
                      horizontalScrollbarSize: 6,
                    },
                  }}
                  theme="vs-dark"
                  beforeMount={monaco => {
                    monaco.editor.defineTheme('c-challenge', {
                      base: 'vs-dark',
                      inherit: true,
                      rules: [
                        { token: 'keyword', foreground: 'ff7b72' },
                        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
                        { token: 'string', foreground: 'a5d6ff' },
                        { token: 'number', foreground: '79c0ff' },
                        { token: 'type', foreground: 'ffa657' },
                      ],
                      colors: {
                        'editor.background': '#0d1117',
                        'editor.lineHighlightBackground': '#161b22',
                        'editor.selectionBackground': '#58a6ff33',
                        'editorLineNumber.foreground': '#484f58',
                        'editorLineNumber.activeForeground': '#8b949e',
                        'editor.inactiveSelectionBackground': '#58a6ff1a',
                      },
                    });
                    monaco.editor.setTheme('c-challenge');
                  }}
                  onMount={(_, monaco) => monaco.editor.setTheme('c-challenge')}
                />
              </div>
            )}

            {/* Output panel (only for code/debug) */}
            {!isPredict && (
              <div className="h-48 border-t border-[#30363d] flex flex-col shrink-0">
                <div className="flex items-center border-b border-[#30363d] bg-[#161b22] px-3 gap-1 shrink-0">
                  {(['output', 'hints'] as Tab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-2 text-xs font-semibold transition-colors border-b-2 ${
                        activeTab === tab
                          ? 'border-[#58a6ff] text-[#58a6ff]'
                          : 'border-transparent text-[#8b949e] hover:text-white'
                      }`}
                    >
                      {tab === 'output' ? 'Sortie' : `Indices (${hintsUsed})`}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-auto bg-[#0d1117]">
                  {activeTab === 'output' ? (
                    <OutputPanel
                      runOutput={runOutput}
                      testResults={submitResult?.test_results ?? null}
                      isRunning={isRunning || isSubmitting}
                      passed={submitResult?.passed ?? null}
                      score={submitResult?.score ?? null}
                    />
                  ) : (
                    <div className="p-3">
                      <HintPanel
                        exerciseId={exercise!.id}
                        hintCosts={exercise!.hint_costs}
                        totalHints={exercise!.hints.length}
                        disabled={alreadyDone}
                        onHintUsed={setHintsUsed}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}
