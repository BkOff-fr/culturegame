'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PowerUpType } from '@prisma/client';
import { PowerUpInventory } from '@/types/game';
import { POWER_UP_DEFINITIONS } from '@/lib/powerups';

interface PowerUpBarProps {
  inventory: PowerUpInventory[];
  onUsePowerUp: (powerUpId: string, type: PowerUpType) => Promise<void>;
  questionType: string;
  gameId: string;
  questionId: string;
  disabled?: boolean;
}

export default function PowerUpBar({
  inventory,
  onUsePowerUp,
  questionType,
  gameId,
  questionId,
  disabled = false
}: PowerUpBarProps) {
  const [selectedPowerUp, setSelectedPowerUp] = useState<string | null>(null);
  const [isUsing, setIsUsing] = useState(false);

  const handleUsePowerUp = async (powerUpId: string, type: PowerUpType) => {
    if (isUsing || disabled) return;

    // Check compatibility
    const definition = POWER_UP_DEFINITIONS[type];
    if (!definition.usableOn.includes('ALL') && !definition.usableOn.includes(questionType)) {
      return;
    }

    setIsUsing(true);
    setSelectedPowerUp(powerUpId);

    try {
      await onUsePowerUp(powerUpId, type);
    } catch (error) {
      console.error('Error using power-up:', error);
    } finally {
      setIsUsing(false);
      setSelectedPowerUp(null);
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl p-3 shadow-2xl">
        <div className="flex items-center gap-3">
          {inventory.map((item) => {
            const definition = POWER_UP_DEFINITIONS[item.type];
            const canUse = !disabled &&
                          item.quantity > 0 &&
                          (definition.usableOn.includes('ALL') ||
                           definition.usableOn.includes(questionType));

            return (
              <div key={item.powerUpId} className="relative">
                <motion.button
                  whileHover={canUse ? { scale: 1.1 } : undefined}
                  whileTap={canUse ? { scale: 0.95 } : undefined}
                  onClick={() => handleUsePowerUp(item.powerUpId, item.type)}
                  disabled={!canUse || isUsing}
                  className={`
                    relative flex flex-col items-center justify-center
                    w-16 h-16 rounded-lg border-2 transition-all duration-200
                    ${canUse
                      ? 'bg-slate-800 border-slate-600 hover:border-blue-400 hover:bg-slate-700'
                      : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                    }
                    ${selectedPowerUp === item.powerUpId ? 'animate-pulse border-yellow-400' : ''}
                  `}
                >
                  <span className="text-2xl mb-1">{item.icon}</span>

                  {/* Quantity badge */}
                  {item.quantity > 0 && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {item.quantity}
                    </div>
                  )}

                  {/* Cooldown overlay */}
                  {!canUse && item.quantity > 0 && (
                    <div className="absolute inset-0 bg-slate-900/70 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-slate-400">N/A</span>
                    </div>
                  )}
                </motion.button>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-slate-800 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-slate-300">{item.description}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {item.quantity} disponible{item.quantity > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Usage feedback */}
        <AnimatePresence>
          {isUsing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm rounded-xl flex items-center justify-center"
            >
              <div className="flex items-center gap-2 text-yellow-400">
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold">Power-up en cours...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Power-up guide */}
      <div className="mt-2 text-center text-xs text-slate-400">
        Utilisez vos power-ups pour obtenir un avantage !
      </div>
    </motion.div>
  );
}

// Power-up effect animations
export function PowerUpEffect({ type, onComplete }: {
  type: PowerUpType;
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const effects = {
    [PowerUpType.FIFTY_FIFTY]: {
      icon: '🎯',
      color: 'text-green-400',
      message: '50/50 activé ! Deux mauvaises réponses éliminées'
    },
    [PowerUpType.FREEZE_TIME]: {
      icon: '❄️',
      color: 'text-blue-400',
      message: 'Temps gelé ! Vous avez 10 secondes supplémentaires'
    },
    [PowerUpType.DOUBLE_POINTS]: {
      icon: '⭐',
      color: 'text-yellow-400',
      message: 'Points doublés ! Votre prochaine réponse vaut 2x plus'
    },
    [PowerUpType.SKIP_QUESTION]: {
      icon: '⏭️',
      color: 'text-purple-400',
      message: 'Question passée sans pénalité !'
    },
    [PowerUpType.HINT]: {
      icon: '💡',
      color: 'text-orange-400',
      message: 'Indice révélé ! Vérifiez le message d\'aide'
    }
  };

  const effect = effects[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: -50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -50 }}
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60]"
    >
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-2xl max-w-sm text-center">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ duration: 0.6, repeat: 2 }}
          className="text-6xl mb-4"
        >
          {effect.icon}
        </motion.div>

        <div className={`text-lg font-bold ${effect.color} mb-2`}>
          Power-up Activé !
        </div>

        <div className="text-slate-300 text-sm">
          {effect.message}
        </div>
      </div>
    </motion.div>
  );
}