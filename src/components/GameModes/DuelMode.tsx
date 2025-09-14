'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Zap, Clock, Target } from 'lucide-react';
import { EloChange } from '@/types/game';

interface DuelModeProps {
  player1: {
    id: string;
    username: string;
    avatar: string;
    score: number;
    eloRating: number;
    correctAnswers: number;
  };
  player2: {
    id: string;
    username: string;
    avatar: string;
    score: number;
    eloRating: number;
    correctAnswers: number;
  };
  currentUserId: string;
  currentQuestion: number;
  totalQuestions: number;
  gameEnded?: boolean;
  eloChanges?: {
    player1: number;
    player2: number;
  };
}

export default function DuelMode({
  player1,
  player2,
  currentUserId,
  currentQuestion,
  totalQuestions,
  gameEnded = false,
  eloChanges
}: DuelModeProps) {
  const [showResults, setShowResults] = useState(false);

  const isCurrentUser1 = currentUserId === player1.id;
  const currentUser = isCurrentUser1 ? player1 : player2;
  const opponent = isCurrentUser1 ? player2 : player1;

  const scoreLeader = player1.score > player2.score ? player1 :
                     player2.score > player1.score ? player2 : null;

  useEffect(() => {
    if (gameEnded) {
      setTimeout(() => setShowResults(true), 1000);
    }
  }, [gameEnded]);

  return (
    <div className="relative">
      {/* Duel Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-900/20 to-blue-900/20 backdrop-blur-sm border border-slate-700 rounded-xl p-4 mb-4"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <Swords className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Mode Duel</h2>
          <div className="text-slate-300 text-sm">
            Question {currentQuestion} / {totalQuestions}
          </div>
        </div>

        {/* Players Comparison */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Player 1 */}
          <motion.div
            animate={{
              scale: player1.id === currentUserId ? 1.05 : 1,
              borderColor: player1.id === currentUserId ? '#3b82f6' : '#64748b'
            }}
            className="bg-slate-800/50 border-2 rounded-lg p-3 text-center"
          >
            <div className="text-2xl mb-2">{player1.avatar}</div>
            <div className="text-white font-semibold text-sm mb-1">{player1.username}</div>
            <div className="text-slate-400 text-xs mb-2">ELO: {player1.eloRating}</div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-400">{player1.score}</div>
              <div className="text-xs text-slate-400">{player1.correctAnswers} correct</div>
            </div>

            {/* Leader indicator */}
            {scoreLeader?.id === player1.id && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute -top-2 left-1/2 transform -translate-x-1/2"
              >
                <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-semibold">
                  👑 Leader
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* VS Indicator */}
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="text-4xl text-red-400 mb-2"
            >
              ⚔️
            </motion.div>
            <div className="text-slate-400 text-sm font-bold">VS</div>

            {/* Score difference */}
            {Math.abs(player1.score - player2.score) > 0 && (
              <div className="text-xs text-slate-500 mt-1">
                Écart: {Math.abs(player1.score - player2.score)}
              </div>
            )}
          </div>

          {/* Player 2 */}
          <motion.div
            animate={{
              scale: player2.id === currentUserId ? 1.05 : 1,
              borderColor: player2.id === currentUserId ? '#3b82f6' : '#64748b'
            }}
            className="bg-slate-800/50 border-2 rounded-lg p-3 text-center relative"
          >
            <div className="text-2xl mb-2">{player2.avatar}</div>
            <div className="text-white font-semibold text-sm mb-1">{player2.username}</div>
            <div className="text-slate-400 text-xs mb-2">ELO: {player2.eloRating}</div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-400">{player2.score}</div>
              <div className="text-xs text-slate-400">{player2.correctAnswers} correct</div>
            </div>

            {/* Leader indicator */}
            {scoreLeader?.id === player2.id && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute -top-2 left-1/2 transform -translate-x-1/2"
              >
                <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-semibold">
                  👑 Leader
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Game Results */}
      <AnimatePresence>
        {showResults && gameEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <DuelResults
                player1={player1}
                player2={player2}
                currentUserId={currentUserId}
                eloChanges={eloChanges}
                onClose={() => setShowResults(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Duel Results Component
function DuelResults({
  player1,
  player2,
  currentUserId,
  eloChanges,
  onClose
}: {
  player1: any;
  player2: any;
  currentUserId: string;
  eloChanges?: { player1: number; player2: number };
  onClose: () => void;
}) {
  const winner = player1.score > player2.score ? player1 :
                 player2.score > player1.score ? player2 : null;

  const isWinner = winner?.id === currentUserId;
  const isDraw = player1.score === player2.score;

  const currentUser = currentUserId === player1.id ? player1 : player2;
  const currentUserEloChange = currentUserId === player1.id ? eloChanges?.player1 : eloChanges?.player2;

  return (
    <div className="text-center">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0]
        }}
        transition={{ duration: 1 }}
        className="text-8xl mb-6"
      >
        {isDraw ? '🤝' : isWinner ? '🏆' : '💔'}
      </motion.div>

      <h2 className={`text-3xl font-bold mb-4 ${
        isDraw ? 'text-yellow-400' :
        isWinner ? 'text-green-400' : 'text-red-400'
      }`}>
        {isDraw ? 'Match Nul !' :
         isWinner ? 'Victoire !' : 'Défaite !'}
      </h2>

      {/* Final Scores */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{player1.username}</div>
            <div className="text-3xl font-bold text-blue-400">{player1.score}</div>
          </div>

          <div className="text-2xl text-slate-400 font-bold">VS</div>

          <div className="text-center">
            <div className="text-lg font-semibold text-white">{player2.username}</div>
            <div className="text-3xl font-bold text-red-400">{player2.score}</div>
          </div>
        </div>
      </div>

      {/* ELO Changes */}
      {eloChanges && currentUserEloChange !== undefined && (
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="text-sm text-slate-400 mb-2">Changement de classement ELO</div>
          <div className={`text-2xl font-bold ${
            currentUserEloChange > 0 ? 'text-green-400' :
            currentUserEloChange < 0 ? 'text-red-400' : 'text-slate-400'
          }`}>
            {currentUserEloChange > 0 ? '+' : ''}{currentUserEloChange}
          </div>
          <div className="text-sm text-slate-400">
            Nouveau ELO: {currentUser.eloRating + currentUserEloChange}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.href = '/duel'}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Nouveau Duel
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
    </div>
  );
}

// Duel Matchmaking Component
export function DuelMatchmaking({
  isSearching,
  estimatedWaitTime,
  onCancel
}: {
  isSearching: boolean;
  estimatedWaitTime?: number;
  onCancel: () => void;
}) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isSearching) return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [isSearching]);

  if (!isSearching) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center max-w-md w-full mx-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl mb-6"
        >
          ⚔️
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-4">
          Recherche d'adversaire{dots}
        </h2>

        <p className="text-slate-300 mb-6">
          Nous cherchons un adversaire de niveau similaire...
        </p>

        {estimatedWaitTime && (
          <div className="text-sm text-slate-400 mb-6">
            Temps d'attente estimé : {estimatedWaitTime}s
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Annuler
        </motion.button>
      </div>
    </motion.div>
  );
}