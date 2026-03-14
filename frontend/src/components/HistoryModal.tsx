import React, { useEffect, useState } from 'react';
import { fetchStats } from '../api';
import { Stats, HistoryEntry } from '../types';

interface Props {
  onClose: () => void;
}

function typeColor(type: string) {
  if (type === 'code') return 'text-[#58a6ff] bg-[#58a6ff]/10';
  if (type === 'predict') return 'text-[#bc8cff] bg-[#bc8cff]/10';
  return 'text-[#e3b341] bg-[#e3b341]/10';
}

function typeLabel(type: string) {
  if (type === 'code') return 'Code';
  if (type === 'predict') return 'Prédire';
  return 'Debug';
}

export default function HistoryModal({ onClose }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats().then(setStats).catch(console.error);
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <h2 className="text-lg font-bold text-white">Historique & Statistiques</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>

        {!stats ? (
          <div className="flex-1 flex items-center justify-center text-[#8b949e]">Chargement...</div>
        ) : (
          <div className="flex-1 overflow-auto p-5 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Niveau', value: stats.current_difficulty.toFixed(1), emoji: '🎯' },
                { label: 'Score total', value: stats.total_score.toLocaleString(), emoji: '⭐' },
                { label: 'Streak', value: `${stats.streak}j`, emoji: '🔥' },
                { label: 'Réussite', value: `${stats.pass_rate}%`, emoji: '✅' },
              ].map(({ label, value, emoji }) => (
                <div key={label} className="bg-[#0d1117] rounded-xl p-3 border border-[#30363d] text-center">
                  <div className="text-xl mb-1">{emoji}</div>
                  <div className="text-lg font-bold text-white font-mono">{value}</div>
                  <div className="text-xs text-[#8b949e]">{label}</div>
                </div>
              ))}
            </div>

            {/* History list */}
            <div>
              <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">
                Derniers exercices ({stats.history.length})
              </h3>

              {stats.history.length === 0 ? (
                <p className="text-[#8b949e] text-sm text-center py-6">Aucun exercice soumis pour l'instant.</p>
              ) : (
                <div className="space-y-2">
                  {stats.history.map((entry: HistoryEntry, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[#30363d] bg-[#0d1117] hover:border-[#484f58] transition-colors"
                    >
                      <span className="text-lg">{entry.passed ? '✅' : '❌'}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">{entry.exercise_id}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${typeColor(entry.type)}`}>
                            {typeLabel(entry.type)}
                          </span>
                        </div>
                        <div className="text-xs text-[#8b949e] mt-0.5">
                          {entry.date} · Difficulté {entry.difficulty} · {entry.hints_used} indice(s)
                          {entry.time_seconds > 0 && ` · ${Math.floor(entry.time_seconds / 60)}min`}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[#58a6ff] font-bold font-mono text-sm">+{entry.score}</div>
                        <div className="text-xs text-[#8b949e]">pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
