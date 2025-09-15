'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ReactionBarProps {
  onReaction: (reaction: string) => void;
  disabled?: boolean;
}

const REACTIONS = ['🔥', '😰', '🤔', '💪', '😅', '🎯', '⚡'];

const ReactionBar: React.FC<ReactionBarProps> = ({ onReaction, disabled = false }) => {
  const [recentReaction, setRecentReaction] = useState<string | null>(null);

  const handleReaction = (reaction: string) => {
    if (disabled) return;

    onReaction(reaction);
    setRecentReaction(reaction);

    // Clear the recent reaction after animation
    setTimeout(() => {
      setRecentReaction(null);
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center gap-2 p-3 bg-slate-900/30 backdrop-blur-sm border border-slate-800/50 rounded-lg">
      <span className="text-xs text-slate-400 mr-2">Réaction:</span>

      {REACTIONS.map((reaction, index) => (
        <motion.button
          key={reaction}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleReaction(reaction)}
          disabled={disabled}
          className={`
            relative w-10 h-10 rounded-full border border-slate-700
            hover:border-slate-600 transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800/50'}
            ${recentReaction === reaction ? 'bg-blue-600/30 border-blue-500' : 'bg-slate-800/30'}
          `}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <span className="text-lg">{reaction}</span>

          {recentReaction === reaction && (
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-500/20"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
};

interface FloatingReactionsProps {
  reactions: Array<{
    id: string;
    reaction: string;
    user: {
      id: string;
      username: string;
      avatar: string;
    };
    timestamp: Date;
  }>;
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="fixed top-1/2 right-4 transform -translate-y-1/2 pointer-events-none z-50">
      <AnimatePresence mode="popLayout">
        {reactions.slice(-5).map((reaction, index) => (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 0, x: 100, scale: 0 }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1,
              y: index * -60
            }}
            exit={{
              opacity: 0,
              x: 100,
              scale: 0.5,
              transition: { duration: 0.3 }
            }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300
            }}
            className="flex items-center gap-2 mb-2 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-full px-3 py-2"
          >
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {reaction.user.avatar ? (
                <img src={reaction.user.avatar} alt="" className="w-full h-full" />
              ) : (
                <span className="text-xs font-medium text-slate-300">
                  {reaction.user.username[0]}
                </span>
              )}
            </div>
            <span className="text-2xl">{reaction.reaction}</span>
            <span className="text-xs text-slate-400 font-medium">
              {reaction.user.username}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ReactionBar;