'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Skull, Trophy } from 'lucide-react';

interface SurvivalModeProps {
  lives: number;
  maxLives: number;
  currentStreak: number;
  questionsAnswered: number;
  onLifeLost?: () => void;
  onEliminated?: () => void;
}

export default function SurvivalMode({
  lives,
  maxLives,
  currentStreak,
  questionsAnswered,
  onLifeLost,
  onEliminated
}: SurvivalModeProps) {
  const [showLifeLost, setShowLifeLost] = useState(false);
  const [showEliminated, setShowEliminated] = useState(false);

  useEffect(() => {
    if (lives === 0 && !showEliminated) {
      setShowEliminated(true);
      onEliminated?.();
    }
  }, [lives, showEliminated, onEliminated]);

  const handleLifeLost = () => {
    setShowLifeLost(true);
    onLifeLost?.();

    setTimeout(() => setShowLifeLost(false), 2000);
  };

  return (
    <div className="relative">
      {/* Lives Display */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl p-4 mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-red-400" />
            <span className="text-white font-semibold">Mode Survie</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Lives */}
            <div className="flex items-center gap-2">
              <span className="text-slate-300 text-sm">Vies :</span>
              <div className="flex gap-1">
                {Array.from({ length: maxLives }).map((_, index) => (
                  <motion.div
                    key={index}
                    animate={{
                      scale: index < lives ? 1 : 0.7,
                      opacity: index < lives ? 1 : 0.3
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        index < lives
                          ? 'text-red-500 fill-red-500'
                          : 'text-slate-600 fill-slate-600'
                      }`}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>Série : {currentStreak}</span>
              </div>
              <div>Questions : {questionsAnswered}</div>
            </div>
          </div>
        </div>

        {/* Danger Warning */}
        {lives === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-300 font-semibold">
              ⚠️ Dernière vie ! Une erreur et c'est fini !
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Life Lost Animation */}
      <AnimatePresence>
        {showLifeLost && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 1, repeat: 1 }}
              className="bg-red-900/90 border border-red-700 rounded-2xl p-8 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-6xl mb-4"
              >
                💔
              </motion.div>
              <h2 className="text-2xl font-bold text-red-300 mb-2">
                Vie perdue !
              </h2>
              <p className="text-red-200">
                Il vous reste {lives} vie{lives > 1 ? 's' : ''} !
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elimination Screen */}
      <AnimatePresence>
        {showEliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center max-w-md"
            >
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-8xl mb-6"
              >
                💀
              </motion.div>

              <h2 className="text-3xl font-bold text-red-400 mb-4">
                Éliminé !
              </h2>

              <div className="space-y-2 text-slate-300 mb-6">
                <p>Vous avez survécu à <span className="text-white font-semibold">{questionsAnswered}</span> questions</p>
                <p>Meilleure série : <span className="text-yellow-400 font-semibold">{currentStreak}</span></p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Rejouer
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Survival Mode Stats Component
export function SurvivalStats({
  questionsAnswered,
  correctAnswers,
  currentStreak,
  bestStreak,
  timeRemaining
}: {
  questionsAnswered: number;
  correctAnswers: number;
  currentStreak: number;
  bestStreak: number;
  timeRemaining?: number;
}) {
  const accuracy = questionsAnswered > 0 ? (correctAnswers / questionsAnswered * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-white">{questionsAnswered}</div>
        <div className="text-sm text-slate-400">Questions</div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-green-400">{accuracy}%</div>
        <div className="text-sm text-slate-400">Précision</div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-yellow-400">{currentStreak}</div>
        <div className="text-sm text-slate-400">Série actuelle</div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-purple-400">{bestStreak}</div>
        <div className="text-sm text-slate-400">Meilleure série</div>
      </div>
    </div>
  );
}

// Survival Mode Settings Component
export function SurvivalModeSettings({
  lives = 3,
  timeLimit = 25,
  onSettingsChange
}: {
  lives?: number;
  timeLimit?: number;
  onSettingsChange: (settings: { lives: number; timeLimit: number }) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Nombre de vies
        </label>
        <select
          value={lives}
          onChange={(e) => onSettingsChange({ lives: parseInt(e.target.value), timeLimit })}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
        >
          <option value={3}>3 vies (Normal)</option>
          <option value={5}>5 vies (Facile)</option>
          <option value={1}>1 vie (Extreme)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Temps par question
        </label>
        <select
          value={timeLimit}
          onChange={(e) => onSettingsChange({ lives, timeLimit: parseInt(e.target.value) })}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
        >
          <option value={15}>15 secondes (Rapide)</option>
          <option value={25}>25 secondes (Normal)</option>
          <option value={35}>35 secondes (Détendu)</option>
        </select>
      </div>
    </div>
  );
}