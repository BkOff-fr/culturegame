'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, TrendingUp, Clock, Star } from 'lucide-react';

interface MarathonModeProps {
  currentQuestion: number;
  score: number;
  streak: number;
  bestStreak: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  multiplier: number;
  timeRemaining: number;
  lives?: number;
  onGameEnd?: () => void;
}

export default function MarathonMode({
  currentQuestion,
  score,
  streak,
  bestStreak,
  difficulty,
  multiplier,
  timeRemaining,
  lives,
  onGameEnd
}: MarathonModeProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [previousDifficulty, setPreviousDifficulty] = useState(difficulty);

  // Check for difficulty level up
  useEffect(() => {
    if (difficulty !== previousDifficulty) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
      setPreviousDifficulty(difficulty);
    }
  }, [difficulty, previousDifficulty]);

  const difficultyConfig = {
    EASY: { color: 'text-green-400', bg: 'bg-green-900/20', icon: '🟢', name: 'Facile' },
    MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', icon: '🟡', name: 'Moyen' },
    HARD: { color: 'text-orange-400', bg: 'bg-orange-900/20', icon: '🟠', name: 'Difficile' },
    EXPERT: { color: 'text-red-400', bg: 'bg-red-900/20', icon: '🔴', name: 'Expert' }
  };

  const difficultyInfo = difficultyConfig[difficulty];

  return (
    <div className="relative">
      {/* Marathon Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm border border-slate-700 rounded-xl p-4 mb-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <span className="text-white font-semibold">Mode Marathon</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-300">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{timeRemaining}s</span>
            </div>
            <div>Question #{currentQuestion}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Score */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{score.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Score</div>
          </div>

          {/* Current Streak */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-1">
              <Zap className="w-5 h-5" />
              {streak}
            </div>
            <div className="text-xs text-slate-400">Série</div>
          </div>

          {/* Best Streak */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-400 flex items-center justify-center gap-1">
              <Star className="w-5 h-5" />
              {bestStreak}
            </div>
            <div className="text-xs text-slate-400">Meilleure</div>
          </div>

          {/* Multiplier */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">×{multiplier.toFixed(1)}</div>
            <div className="text-xs text-slate-400">Multiplicateur</div>
          </div>
        </div>

        {/* Difficulty Level */}
        <div className="mt-4 flex items-center justify-between">
          <div className={`flex items-center gap-2 ${difficultyInfo.bg} border border-slate-600 rounded-lg px-3 py-2`}>
            <span className="text-lg">{difficultyInfo.icon}</span>
            <span className={`font-semibold ${difficultyInfo.color}`}>
              Niveau {difficultyInfo.name}
            </span>
          </div>

          {/* Progress to next level */}
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">Prochain niveau</div>
            <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, ((currentQuestion % 5) / 5) * 100)}%`
                }}
                className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
              />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {5 - (currentQuestion % 5)} questions
            </div>
          </div>
        </div>
      </motion.div>

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -100 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 2, repeat: 1 }}
              className={`${difficultyInfo.bg} border-2 border-current ${difficultyInfo.color} rounded-2xl p-6 text-center backdrop-blur-sm`}
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: 2 }}
                className="text-6xl mb-4"
              >
                {difficultyInfo.icon}
              </motion.div>

              <h2 className={`text-2xl font-bold ${difficultyInfo.color} mb-2`}>
                Niveau Supérieur !
              </h2>

              <p className="text-white">
                Difficulté : {difficultyInfo.name}
              </p>

              <p className="text-slate-300 text-sm mt-2">
                Les questions deviennent plus difficiles !
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Marathon Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 mt-4"
      >
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-white font-semibold mb-2">Conseils Marathon</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• La difficulté augmente toutes les 5 questions</li>
              <li>• Les séries donnent des multiplicateurs de points</li>
              <li>• Plus vous répondez vite, plus vous gagnez de points</li>
              <li>• Les power-ups sont essentiels aux niveaux élevés</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Marathon Results Component
export function MarathonResults({
  finalScore,
  questionsAnswered,
  bestStreak,
  highestDifficulty,
  timeSpent,
  onRestart,
  onClose
}: {
  finalScore: number;
  questionsAnswered: number;
  bestStreak: number;
  highestDifficulty: string;
  timeSpent: number;
  onRestart: () => void;
  onClose: () => void;
}) {
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  const performance = finalScore >= 5000 ? 'Excellent' :
                     finalScore >= 2000 ? 'Très Bien' :
                     finalScore >= 1000 ? 'Bien' :
                     finalScore >= 500 ? 'Correct' : 'À améliorer';

  const performanceColor = finalScore >= 5000 ? 'text-purple-400' :
                          finalScore >= 2000 ? 'text-blue-400' :
                          finalScore >= 1000 ? 'text-green-400' :
                          finalScore >= 500 ? 'text-yellow-400' : 'text-red-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 text-center"
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 2 }}
        className="text-8xl mb-6"
      >
        🏃‍♂️
      </motion.div>

      <h2 className="text-3xl font-bold text-white mb-2">
        Marathon Terminé !
      </h2>

      <p className={`text-lg font-semibold mb-6 ${performanceColor}`}>
        Performance : {performance}
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-400">
            {finalScore.toLocaleString()}
          </div>
          <div className="text-sm text-slate-400">Score Final</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">{questionsAnswered}</div>
          <div className="text-sm text-slate-400">Questions</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-400">{bestStreak}</div>
          <div className="text-sm text-slate-400">Meilleure Série</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-orange-400">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-sm text-slate-400">Temps</div>
        </div>
      </div>

      {/* Highest Difficulty Reached */}
      <div className="bg-slate-800 rounded-lg p-3 mb-6">
        <div className="text-sm text-slate-400 mb-1">Plus haut niveau atteint</div>
        <div className="text-lg font-bold text-red-400">{highestDifficulty}</div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Recommencer Marathon
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Fermer
        </motion.button>
      </div>
    </motion.div>
  );
}