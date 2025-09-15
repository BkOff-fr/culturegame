'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Users, Zap } from 'lucide-react'

interface MicroChallengeData {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  expiresAt: Date;
  responses: Array<{
    user: {
      id: string;
      username: string;
      avatar: string;
    };
    response: string;
    submittedAt: Date;
  }>;
}

interface MicroChallengeProps {
  challenge: MicroChallengeData | null;
  onRespond: (response: string) => void;
  userHasResponded: boolean;
  currentUserId: string;
}

const MicroChallenge: React.FC<MicroChallengeProps> = ({
  challenge,
  onRespond,
  userHasResponded,
  currentUserId
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState<string>('');

  useEffect(() => {
    if (!challenge) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(challenge.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        // Challenge expired
        return;
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [challenge]);

  const handleSubmit = () => {
    if (selectedResponse && !userHasResponded) {
      onRespond(selectedResponse);
    }
  };

  const getResponseCount = (response: string) => {
    return challenge?.responses.filter(r => r.response === response).length || 0;
  };

  const getTotalResponses = () => {
    return challenge?.responses.length || 0;
  };

  if (!challenge || timeLeft === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-auto p-4"
    >
      <div className="bg-gradient-to-r from-purple-900/90 to-indigo-900/90 backdrop-blur-lg border border-purple-500/50 rounded-xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
              {challenge.type === 'poll' ? 'Sondage Express' :
               challenge.type === 'prediction' ? 'Prédiction' : 'Quiz Éclair'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-400" />
            <span className={`text-sm font-mono font-bold ${
              timeLeft <= 3 ? 'text-red-400' : 'text-slate-300'
            }`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Question */}
        <h3 className="text-lg font-semibold text-white mb-4">
          {challenge.question}
        </h3>

        {/* Options pour poll/prediction */}
        {challenge.options && (
          <div className="space-y-2 mb-4">
            {challenge.options.map((option, index) => {
              const responseCount = getResponseCount(option);
              const totalResponses = getTotalResponses();
              const percentage = totalResponses > 0 ? (responseCount / totalResponses) * 100 : 0;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedResponse(option)}
                  disabled={userHasResponded}
                  className={`
                    relative w-full p-3 text-left rounded-lg border transition-all
                    ${selectedResponse === option
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50'
                    }
                    ${userHasResponded ? 'opacity-75' : 'hover:scale-[1.02]'}
                  `}
                >
                  <span className="relative z-10">{option}</span>

                  {/* Progress bar pour les réponses */}
                  {userHasResponded && totalResponses > 0 && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20"
                      />
                    </div>
                  )}

                  {/* Count */}
                  {userHasResponded && (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400">
                      {responseCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Options pour quickTrivia */}
        {challenge.type === 'quickTrivia' && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {['Vrai', 'Faux'].map((option) => (
              <button
                key={option}
                onClick={() => setSelectedResponse(option)}
                disabled={userHasResponded}
                className={`
                  p-3 rounded-lg border transition-all font-medium
                  ${selectedResponse === option
                    ? 'bg-purple-600 border-purple-400 text-white'
                    : 'bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50'
                  }
                  ${userHasResponded ? 'opacity-75' : 'hover:scale-[1.02]'}
                `}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Submit Button ou Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">
              {getTotalResponses()} réponse{getTotalResponses() !== 1 ? 's' : ''}
            </span>
          </div>

          {!userHasResponded ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!selectedResponse}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Valider
            </motion.button>
          ) : (
            <span className="text-sm text-green-400 font-medium">
              ✓ Réponse envoyée
            </span>
          )}
        </div>

        {/* Progress bar du temps */}
        <div className="mt-4 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / 10) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
            className="h-full bg-gradient-to-r from-yellow-400 to-red-500"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default MicroChallenge;