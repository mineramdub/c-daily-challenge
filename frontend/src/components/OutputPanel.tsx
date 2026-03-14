import React from 'react';
import { TestResult } from '../types';

interface RunOutput {
  success: boolean;
  stdout: string;
  stderr: string;
  phase: string;
}

interface Props {
  runOutput: RunOutput | null;
  testResults: TestResult[] | null;
  isRunning: boolean;
  passed: boolean | null;
  score: number | null;
}

export default function OutputPanel({ runOutput, testResults, isRunning, passed, score }: Props) {
  if (isRunning) {
    return (
      <div className="h-full flex items-center justify-center text-[#8b949e] gap-3">
        <div className="w-4 h-4 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Compilation en cours...</span>
      </div>
    );
  }

  if (!runOutput && !testResults) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#8b949e] gap-2">
        <span className="text-3xl opacity-30">⚡</span>
        <span className="text-sm">Lance ton code pour voir le résultat</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-3 space-y-3 font-mono text-sm">
      {/* Submission results */}
      {testResults && testResults.length > 0 && (
        <div className="space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            passed ? 'bg-[#3fb950]/10 border border-[#3fb950]/30' : 'bg-[#f85149]/10 border border-[#f85149]/30'
          }`}>
            <span className="text-lg">{passed ? '✅' : '❌'}</span>
            <span className={`font-semibold ${passed ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
              {passed ? 'Tous les tests passent !' : 'Échec'}
            </span>
            {score !== null && (
              <span className="ml-auto text-[#58a6ff] font-bold">+{score} pts</span>
            )}
          </div>

          {testResults.map((tr, i) => (
            <div
              key={i}
              className={`rounded-lg border p-2.5 text-xs ${
                tr.passed
                  ? 'border-[#3fb950]/20 bg-[#3fb950]/5'
                  : 'border-[#f85149]/20 bg-[#f85149]/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span>{tr.passed ? '✓' : '✗'}</span>
                <span className={tr.passed ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                  {tr.error ? `Erreur (${tr.phase})` : `Test ${tr.case}`}
                </span>
              </div>

              {tr.error ? (
                <pre className="text-[#f85149] whitespace-pre-wrap break-all">{tr.error}</pre>
              ) : !tr.passed && (
                <div className="space-y-1">
                  <div>
                    <span className="text-[#8b949e]">Attendu : </span>
                    <span className="text-[#3fb950]">{JSON.stringify(tr.expected)}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">Obtenu  : </span>
                    <span className="text-[#f85149]">{JSON.stringify(tr.got)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Run output */}
      {runOutput && !testResults && (
        <div>
          {!runOutput.success ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#f85149] mb-2">
                <span>✗</span>
                <span className="font-semibold capitalize">{runOutput.phase} error</span>
              </div>
              <pre className="text-[#f85149] whitespace-pre-wrap break-all text-xs leading-relaxed">
                {runOutput.stderr}
              </pre>
            </div>
          ) : (
            <div>
              {runOutput.stdout ? (
                <pre className="text-[#e6edf3] whitespace-pre-wrap break-all leading-relaxed">
                  {runOutput.stdout}
                </pre>
              ) : (
                <span className="text-[#8b949e] italic">(pas de sortie)</span>
              )}
              {runOutput.stderr && (
                <pre className="text-[#d29922] whitespace-pre-wrap text-xs mt-2 opacity-70">
                  {runOutput.stderr}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
