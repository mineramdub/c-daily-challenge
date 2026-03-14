import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Exercise } from '../types';

interface Props {
  exercise: Exercise;
}

function typeConfig(type: string) {
  if (type === 'code') return { label: 'Code', color: 'text-[#58a6ff] bg-[#58a6ff]/10 border-[#58a6ff]/30', icon: '💻' };
  if (type === 'predict') return { label: 'Prédire la sortie', color: 'text-[#bc8cff] bg-[#bc8cff]/10 border-[#bc8cff]/30', icon: '🔮' };
  return { label: 'Debug', color: 'text-[#e3b341] bg-[#e3b341]/10 border-[#e3b341]/30', icon: '🐛' };
}

function difficultyStars(d: number) {
  const filled = Math.round(d);
  return '★'.repeat(filled) + '☆'.repeat(Math.max(0, 10 - filled));
}

function topicBadge(topic: string) {
  const map: Record<string, string> = {
    pointers: 'Pointeurs',
    memory: 'Mémoire',
    algorithms: 'Algorithmes',
    datastructures: 'Structures de données',
    system: 'Système',
    optimization: 'Optimisation',
    strings: 'Strings',
  };
  return map[topic] || topic;
}

export default function ExercisePanel({ exercise }: Props) {
  const { label, color, icon } = typeConfig(exercise.type);
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <div className="h-full overflow-auto p-5 space-y-5">
      {/* Date */}
      <div className="text-xs text-[#8b949e] capitalize">{today}</div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`diff-badge border ${color}`}>
          {icon} {label}
        </span>
        <span className="diff-badge border border-[#30363d] text-[#8b949e]">
          {topicBadge(exercise.topic)}
        </span>
        <span className="diff-badge border border-[#30363d] text-[#8b949e] font-mono">
          <span className="text-[#e3b341]">{difficultyStars(exercise.difficulty).slice(0, exercise.difficulty)}</span>
          <span className="opacity-30">{difficultyStars(exercise.difficulty).slice(exercise.difficulty)}</span>
          <span className="ml-1">{exercise.difficulty}/10</span>
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white leading-tight">{exercise.title}</h1>

      {/* Description */}
      <div className="prose-custom text-sm leading-relaxed">
        <ReactMarkdown>{exercise.description}</ReactMarkdown>
      </div>

      {/* Predict: show the code read-only */}
      {exercise.type === 'predict' && exercise.starter_code === '' && (
        <div className="rounded-lg border border-[#bc8cff]/20 bg-[#bc8cff]/5 p-3">
          <p className="text-xs text-[#bc8cff] font-semibold mb-1">Instructions</p>
          <p className="text-sm text-[#8b949e]">
            Analyse le code affiché dans l'énoncé et écris la sortie exacte dans le champ réponse ci-dessous.
            Sois précis : espaces, retours à la ligne, tout compte.
          </p>
        </div>
      )}

      {/* Debug hint */}
      {exercise.type === 'debug' && (
        <div className="rounded-lg border border-[#e3b341]/20 bg-[#e3b341]/5 p-3">
          <p className="text-xs text-[#e3b341] font-semibold mb-1">Mode Debug</p>
          <p className="text-sm text-[#8b949e]">
            Le code contient un ou plusieurs bugs. Corrige-les pour obtenir la sortie attendue.
          </p>
        </div>
      )}
    </div>
  );
}
