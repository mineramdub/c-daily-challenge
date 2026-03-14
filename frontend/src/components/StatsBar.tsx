import React from 'react';

interface Props {
  difficulty: number;
  streak: number;
  totalScore: number;
  onShowHistory: () => void;
}

function difficultyLabel(d: number): { label: string; color: string } {
  if (d <= 3) return { label: 'Intermédiaire', color: 'text-green-400 bg-green-400/10 border-green-400/30' };
  if (d <= 5) return { label: 'Avancé', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  if (d <= 7) return { label: 'Expert', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' };
  return { label: 'Maître', color: 'text-red-400 bg-red-400/10 border-red-400/30' };
}

export default function StatsBar({ difficulty, streak, totalScore, onShowHistory }: Props) {
  const { label, color } = difficultyLabel(difficulty);

  return (
    <header className="border-b border-[#30363d] bg-[#161b22]/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xl font-bold text-white tracking-tight font-mono">
            <span className="text-[#58a6ff]">C</span> Daily Challenge
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className={`diff-badge border ${color}`}>
            <span>Niveau</span>
            <span>{difficulty.toFixed(1)}</span>
            <span className="opacity-60">·</span>
            <span>{label}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#e3b341]">
            <span className="text-base">🔥</span>
            <span className="font-mono font-semibold">{streak}</span>
            <span className="text-[#8b949e] text-xs">jours</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#58a6ff]">
            <span className="text-base">⭐</span>
            <span className="font-mono font-semibold">{totalScore.toLocaleString()}</span>
            <span className="text-[#8b949e] text-xs">pts</span>
          </div>

          <button
            onClick={onShowHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#58a6ff]/50 transition-colors text-sm"
          >
            <span>📅</span>
            <span>Historique</span>
          </button>
        </div>
      </div>
    </header>
  );
}
