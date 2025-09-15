'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Target, Clock, TrendingUp, Flame, Award } from 'lucide-react'

interface PerformanceIndicatorsProps {
  timeLeft: number;
  totalTime: number;
  streak: number;
  accuracy: number; // Pourcentage de bonnes réponses
  averageResponseTime: number;
  currentScore: number;
  position: number;
  totalPlayers: number;
}

const PerformanceIndicators: React.FC<PerformanceIndicatorsProps> = ({
  timeLeft,
  totalTime,
  streak,
  accuracy,
  averageResponseTime,
  currentScore,
  position,
  totalPlayers
}) => {
  const timePercentage = (timeLeft / totalTime) * 100;
  const speedRating = averageResponseTime < 3 ? 'fast' : averageResponseTime < 7 ? 'medium' : 'slow';

  const getSpeedColor = () => {
    switch (speedRating) {
      case 'fast': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'slow': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getPositionColor = () => {
    if (position === 1) return 'text-yellow-400';
    if (position <= Math.ceil(totalPlayers * 0.3)) return 'text-green-400';
    if (position <= Math.ceil(totalPlayers * 0.7)) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed top-4 right-4 space-y-3 z-40">

      {/* Streak */}
      {streak > 0 && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="bg-slate-900/80 backdrop-blur-sm border border-orange-500/50 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-slate-300">Série</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              className="text-2xl font-bold text-orange-400"
              animate={streak >= 3 ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, repeat: streak >= 5 ? Infinity : 0 }}
            >
              {streak}
            </motion.div>
            {streak >= 5 && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                🔥
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Précision */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Précision</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-lg font-bold ${
            accuracy >= 80 ? 'text-green-400' :
            accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {accuracy.toFixed(0)}%
          </div>
          <div className="w-16 bg-slate-700 rounded-full h-1">
            <motion.div
              className={`h-full rounded-full ${
                accuracy >= 80 ? 'bg-green-400' :
                accuracy >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${accuracy}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Vitesse de réponse */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Vitesse</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-lg font-bold ${getSpeedColor()}`}>
            {averageResponseTime.toFixed(1)}s
          </div>
          <div className={`text-xs px-2 py-1 rounded-full ${
            speedRating === 'fast' ? 'bg-green-900 text-green-300' :
            speedRating === 'medium' ? 'bg-yellow-900 text-yellow-300' :
            'bg-red-900 text-red-300'
          }`}>
            {speedRating === 'fast' ? '⚡ Rapide' :
             speedRating === 'medium' ? '🚀 Moyen' : '🐌 Lent'}
          </div>
        </div>
      </motion.div>

      {/* Position dans le classement */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <Award className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-lg font-bold ${getPositionColor()}`}>
            #{position}
          </div>
          <span className="text-sm text-slate-400">/ {totalPlayers}</span>
          {position === 1 && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              👑
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Score actuel */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Score</span>
        </div>
        <motion.div
          className="text-xl font-bold text-yellow-400"
          key={currentScore}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {currentScore.toLocaleString()}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PerformanceIndicators;