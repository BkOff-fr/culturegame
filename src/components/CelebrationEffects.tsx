'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Zap, Crown, Star, Medal, Flame } from 'lucide-react'

interface CelebrationEffectsProps {
  isCorrect: boolean;
  pointsEarned: number;
  streak: number;
  isNewLeader?: boolean;
  isPersonalBest?: boolean;
  trigger: boolean;
  onComplete?: () => void;
}

const CelebrationEffects: React.FC<CelebrationEffectsProps> = ({
  isCorrect,
  pointsEarned,
  streak,
  isNewLeader = false,
  isPersonalBest = false,
  trigger,
  onComplete
}) => {
  const [showEffect, setShowEffect] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShowEffect(true);
      const timer = setTimeout(() => {
        setShowEffect(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!showEffect || !isCorrect) return null;

  const getCelebrationLevel = () => {
    if (isNewLeader) return 'legendary';
    if (streak >= 5) return 'excellent';
    if (streak >= 3) return 'great';
    if (pointsEarned >= 100) return 'good';
    return 'normal';
  };

  const level = getCelebrationLevel();

  const animations = {
    normal: {
      icon: Star,
      color: 'text-yellow-400',
      bgColor: 'from-yellow-400/20 to-orange-400/20',
      particles: 8,
      scale: 1.0,
      title: 'Bien joué !',
      sound: '🎵'
    },
    good: {
      icon: Medal,
      color: 'text-blue-400',
      bgColor: 'from-blue-400/20 to-purple-400/20',
      particles: 12,
      scale: 1.1,
      title: 'Excellent !',
      sound: '🎊'
    },
    great: {
      icon: Flame,
      color: 'text-orange-400',
      bgColor: 'from-orange-400/20 to-red-400/20',
      particles: 16,
      scale: 1.2,
      title: 'En feu !',
      sound: '🔥'
    },
    excellent: {
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'from-purple-400/20 to-pink-400/20',
      particles: 20,
      scale: 1.3,
      title: 'Incroyable !',
      sound: '⚡'
    },
    legendary: {
      icon: Crown,
      color: 'text-yellow-300',
      bgColor: 'from-yellow-300/20 to-yellow-500/20',
      particles: 25,
      scale: 1.4,
      title: 'NOUVEAU LEADER !',
      sound: '👑'
    }
  };

  const config = animations[level];
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {/* Background Flash */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 bg-gradient-to-r ${config.bgColor}`}
          transition={{ duration: 0.3 }}
        />

        {/* Confetti Particles */}
        {Array.from({ length: config.particles }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: `hsl(${(i * 360) / config.particles}, 70%, 60%)`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{
              scale: 0,
              rotate: 0,
              x: 0,
              y: 0,
            }}
            animate={{
              scale: [0, 1, 0],
              rotate: [0, 360, 720],
              x: [(Math.random() - 0.5) * 200, (Math.random() - 0.5) * 400],
              y: [0, (Math.random() - 0.5) * 300, 100],
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              ease: "easeOut"
            }}
          />
        ))}

        {/* Main Celebration */}
        <div className="flex items-center justify-center h-full">
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{
              scale: [0, config.scale * 1.2, config.scale],
              rotate: [0, 10, -10, 0],
              opacity: [0, 1, 1, 0.8]
            }}
            transition={{
              duration: 1.5,
              times: [0, 0.3, 0.7, 1]
            }}
            className="text-center"
          >
            <div className="mb-4">
              <IconComponent
                className={`w-20 h-20 mx-auto ${config.color} drop-shadow-lg`}
              />
            </div>

            <motion.h2
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-4xl font-bold text-white mb-2 drop-shadow-lg"
            >
              {config.title}
            </motion.h2>

            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-2xl font-semibold text-yellow-300 mb-2"
            >
              +{pointsEarned} points
            </motion.div>

            {streak > 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="flex items-center justify-center gap-2 text-orange-300"
              >
                <Flame className="w-5 h-5" />
                <span className="text-lg font-medium">
                  Série de {streak} !
                </span>
                <Flame className="w-5 h-5" />
              </motion.div>
            )}

            {isPersonalBest && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="mt-2 text-purple-300 font-medium"
              >
                🏆 Nouveau record personnel !
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Side Bursts */}
        <motion.div
          initial={{ scale: 0, x: -100 }}
          animate={{ scale: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="absolute left-10 top-1/2 transform -translate-y-1/2"
        >
          <div className="text-6xl animate-bounce">
            {config.sound}
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0, x: 100 }}
          animate={{ scale: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="absolute right-10 top-1/2 transform -translate-y-1/2"
        >
          <div className="text-6xl animate-bounce" style={{ animationDelay: '0.2s' }}>
            {config.sound}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CelebrationEffects;