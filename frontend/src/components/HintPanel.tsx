import React, { useState } from 'react';
import { fetchHint } from '../api';

interface Props {
  exerciseId: string;
  hintCosts: number[];
  totalHints: number;
  disabled: boolean;
  onHintUsed: (count: number) => void;
}

interface RevealedHint {
  index: number;
  text: string;
  cost: number;
}

export default function HintPanel({ exerciseId, hintCosts, totalHints, disabled, onHintUsed }: Props) {
  const [revealed, setRevealed] = useState<RevealedHint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<number | null>(null);

  const nextIndex = revealed.length;
  const canReveal = nextIndex < totalHints && !disabled;

  async function revealHint(index: number) {
    setShowConfirm(null);
    setLoading(true);
    try {
      const data = await fetchHint(exerciseId, index);
      const newRevealed = [...revealed, { index, text: data.hint, cost: data.cost }];
      setRevealed(newRevealed);
      onHintUsed(newRevealed.length);
    } finally {
      setLoading(false);
    }
  }

  const nextCost = nextIndex < hintCosts.length ? hintCosts[nextIndex] : 10;

  const vagueness = ['Indice vague', 'Indice modéré', 'Indice précis'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider">Indices</h3>
        {revealed.length > 0 && (
          <span className="text-xs text-[#f85149] font-mono">
            -{revealed.reduce((a, h) => a + h.cost, 0)} pts
          </span>
        )}
      </div>

      {/* Revealed hints */}
      {revealed.map((hint) => (
        <div
          key={hint.index}
          className="rounded-lg border border-[#d29922]/30 bg-[#d29922]/5 p-3 animate-fade-in"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[#d29922] text-xs font-semibold">{vagueness[hint.index] || `Indice ${hint.index + 1}`}</span>
            <span className="text-xs text-[#8b949e]">(-{hint.cost} pts)</span>
          </div>
          <p className="text-sm text-[#e6edf3] leading-relaxed font-mono">{hint.text}</p>
        </div>
      ))}

      {/* Next hint button */}
      {canReveal && (
        <div>
          {showConfirm === nextIndex ? (
            <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-3 space-y-2 animate-fade-in">
              <p className="text-sm text-[#e6edf3]">
                Cet indice coûte <span className="text-[#f85149] font-semibold font-mono">-{nextCost} pts</span>.
                <br />
                <span className="text-[#8b949e] text-xs">{vagueness[nextIndex] || `Indice ${nextIndex + 1}`}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => revealHint(nextIndex)}
                  disabled={loading}
                  className="flex-1 py-1.5 rounded bg-[#d29922]/20 border border-[#d29922]/40 text-[#d29922] text-sm font-semibold hover:bg-[#d29922]/30 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : 'Confirmer'}
                </button>
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-1.5 rounded border border-[#30363d] text-[#8b949e] text-sm hover:text-white transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(nextIndex)}
              disabled={loading || disabled}
              className="w-full py-2 rounded-lg border border-[#30363d] border-dashed text-[#8b949e] text-sm hover:text-[#d29922] hover:border-[#d29922]/40 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <span>💡</span>
              <span>
                {vagueness[nextIndex] || `Indice ${nextIndex + 1}`}
                <span className="text-xs ml-1 opacity-60">(-{nextCost} pts)</span>
              </span>
            </button>
          )}
        </div>
      )}

      {!canReveal && revealed.length === 0 && (
        <p className="text-xs text-[#8b949e] italic text-center py-2">Essaie par toi-même d'abord !</p>
      )}

      {nextIndex >= totalHints && totalHints > 0 && (
        <p className="text-xs text-[#8b949e] text-center py-1">Tous les indices révélés</p>
      )}
    </div>
  );
}
