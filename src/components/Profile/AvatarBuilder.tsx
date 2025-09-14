'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Eye, Shirt, Crown, Sparkles } from 'lucide-react';
import { AvatarData } from '@/types/game';

interface AvatarBuilderProps {
  initialAvatar?: AvatarData;
  onSave: (avatar: AvatarData) => void;
  onClose: () => void;
}

// Avatar configuration
const AVATAR_CONFIG = {
  shapes: [
    { id: 'circle', name: 'Rond', emoji: '🔵' },
    { id: 'square', name: 'Carré', emoji: '🟦' },
    { id: 'diamond', name: 'Diamant', emoji: '🔷' },
    { id: 'heart', name: 'Cœur', emoji: '💙' },
    { id: 'star', name: 'Étoile', emoji: '⭐' },
    { id: 'hexagon', name: 'Hexagone', emoji: '🔹' },
    { id: 'triangle', name: 'Triangle', emoji: '🔺' },
    { id: 'oval', name: 'Ovale', emoji: '🥚' },
    { id: 'flower', name: 'Fleur', emoji: '🌸' },
    { id: 'lightning', name: 'Éclair', emoji: '⚡' }
  ],

  colors: [
    { id: 'blue', name: 'Bleu', value: '#3B82F6', gradient: 'from-blue-400 to-blue-600' },
    { id: 'red', name: 'Rouge', value: '#EF4444', gradient: 'from-red-400 to-red-600' },
    { id: 'green', name: 'Vert', value: '#10B981', gradient: 'from-green-400 to-green-600' },
    { id: 'purple', name: 'Violet', value: '#8B5CF6', gradient: 'from-purple-400 to-purple-600' },
    { id: 'yellow', name: 'Jaune', value: '#F59E0B', gradient: 'from-yellow-400 to-yellow-600' },
    { id: 'pink', name: 'Rose', value: '#EC4899', gradient: 'from-pink-400 to-pink-600' },
    { id: 'indigo', name: 'Indigo', value: '#6366F1', gradient: 'from-indigo-400 to-indigo-600' },
    { id: 'teal', name: 'Sarcelle', value: '#14B8A6', gradient: 'from-teal-400 to-teal-600' },
    { id: 'orange', name: 'Orange', value: '#F97316', gradient: 'from-orange-400 to-orange-600' },
    { id: 'cyan', name: 'Cyan', value: '#06B6D4', gradient: 'from-cyan-400 to-cyan-600' },
    { id: 'emerald', name: 'Émeraude', value: '#059669', gradient: 'from-emerald-400 to-emerald-600' },
    { id: 'rose', name: 'Rose Foncé', value: '#F43F5E', gradient: 'from-rose-400 to-rose-600' },
    { id: 'violet', name: 'Violet Foncé', value: '#7C3AED', gradient: 'from-violet-400 to-violet-600' },
    { id: 'lime', name: 'Lime', value: '#84CC16', gradient: 'from-lime-400 to-lime-600' },
    { id: 'amber', name: 'Ambre', value: '#F59E0B', gradient: 'from-amber-400 to-amber-600' },
    { id: 'sky', name: 'Ciel', value: '#0EA5E9', gradient: 'from-sky-400 to-sky-600' },
    { id: 'slate', name: 'Ardoise', value: '#64748B', gradient: 'from-slate-400 to-slate-600' },
    { id: 'gray', name: 'Gris', value: '#6B7280', gradient: 'from-gray-400 to-gray-600' },
    { id: 'zinc', name: 'Zinc', value: '#71717A', gradient: 'from-zinc-400 to-zinc-600' },
    { id: 'stone', name: 'Pierre', value: '#78716C', gradient: 'from-stone-400 to-stone-600' }
  ],

  accessories: [
    { id: 'none', name: 'Aucun', emoji: '🚫', cost: 0 },
    { id: 'hat', name: 'Chapeau', emoji: '👒', cost: 100 },
    { id: 'crown', name: 'Couronne', emoji: '👑', cost: 500 },
    { id: 'glasses', name: 'Lunettes', emoji: '🤓', cost: 200 },
    { id: 'sunglasses', name: 'Lunettes de soleil', emoji: '😎', cost: 150 },
    { id: 'headphones', name: 'Casque', emoji: '🎧', cost: 300 },
    { id: 'cap', name: 'Casquette', emoji: '🧢', cost: 150 },
    { id: 'helmet', name: 'Casque', emoji: '⛑️', cost: 200 },
    { id: 'mask', name: 'Masque', emoji: '🎭', cost: 250 },
    { id: 'monocle', name: 'Monocle', emoji: '🧐', cost: 400 }
  ],

  backgrounds: [
    { id: 'none', name: 'Aucun', emoji: '⬜', cost: 0 },
    { id: 'city', name: 'Ville', emoji: '🏙️', cost: 100 },
    { id: 'nature', name: 'Nature', emoji: '🌲', cost: 100 },
    { id: 'space', name: 'Espace', emoji: '🌌', cost: 200 },
    { id: 'ocean', name: 'Océan', emoji: '🌊', cost: 150 },
    { id: 'desert', name: 'Désert', emoji: '🏜️', cost: 150 },
    { id: 'mountains', name: 'Montagnes', emoji: '🏔️', cost: 150 },
    { id: 'rainbow', name: 'Arc-en-ciel', emoji: '🌈', cost: 300 },
    { id: 'fire', name: 'Feu', emoji: '🔥', cost: 250 },
    { id: 'ice', name: 'Glace', emoji: '❄️', cost: 250 }
  ]
};

export default function AvatarBuilder({
  initialAvatar,
  onSave,
  onClose
}: AvatarBuilderProps) {
  const [avatar, setAvatar] = useState<AvatarData>({
    shape: initialAvatar?.shape || 'circle',
    color: initialAvatar?.color || 'blue',
    accessories: initialAvatar?.accessories || [],
    background: initialAvatar?.background || 'none'
  });

  const [activeTab, setActiveTab] = useState<'shape' | 'color' | 'accessories' | 'background'>('shape');
  const [userCoins, setUserCoins] = useState(1000); // This would come from user profile

  const getShapeEmoji = (shapeId: string) => {
    return AVATAR_CONFIG.shapes.find(s => s.id === shapeId)?.emoji || '🔵';
  };

  const getColorConfig = (colorId: string) => {
    return AVATAR_CONFIG.colors.find(c => c.id === colorId) || AVATAR_CONFIG.colors[0];
  };

  const getAccessoryEmoji = (accessoryId: string) => {
    return AVATAR_CONFIG.accessories.find(a => a.id === accessoryId)?.emoji || '';
  };

  const getBackgroundEmoji = (backgroundId: string) => {
    return AVATAR_CONFIG.backgrounds.find(b => b.id === backgroundId)?.emoji || '';
  };

  const calculateTotalCost = () => {
    let total = 0;

    avatar.accessories.forEach(accessoryId => {
      const accessory = AVATAR_CONFIG.accessories.find(a => a.id === accessoryId);
      if (accessory) total += accessory.cost;
    });

    const background = AVATAR_CONFIG.backgrounds.find(b => b.id === avatar.background);
    if (background) total += background.cost;

    return total;
  };

  const canAfford = () => {
    return calculateTotalCost() <= userCoins;
  };

  const toggleAccessory = (accessoryId: string) => {
    if (accessoryId === 'none') {
      setAvatar(prev => ({ ...prev, accessories: [] }));
      return;
    }

    setAvatar(prev => ({
      ...prev,
      accessories: prev.accessories.includes(accessoryId)
        ? prev.accessories.filter(id => id !== accessoryId)
        : [...prev.accessories, accessoryId]
    }));
  };

  const handleSave = () => {
    if (!canAfford()) {
      alert('Coins insuffisants !');
      return;
    }
    onSave(avatar);
  };

  const renderPreview = () => {
    const colorConfig = getColorConfig(avatar.color);

    return (
      <div className="relative w-32 h-32 mx-auto mb-6">
        {/* Background */}
        {avatar.background !== 'none' && (
          <div className="absolute inset-0 text-6xl flex items-center justify-center opacity-30">
            {getBackgroundEmoji(avatar.background)}
          </div>
        )}

        {/* Main Shape */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colorConfig.gradient} flex items-center justify-center text-4xl`}>
          {getShapeEmoji(avatar.shape)}
        </div>

        {/* Accessories */}
        {avatar.accessories.map((accessoryId, index) => (
          <div
            key={accessoryId}
            className={`absolute text-2xl ${
              accessoryId === 'crown' ? '-top-2 left-1/2 transform -translate-x-1/2' :
              accessoryId === 'hat' ? '-top-1 left-1/2 transform -translate-x-1/2' :
              accessoryId === 'glasses' || accessoryId === 'sunglasses' ? 'top-8 left-1/2 transform -translate-x-1/2' :
              accessoryId === 'headphones' ? 'top-4 left-1/2 transform -translate-x-1/2' :
              accessoryId === 'cap' ? '-top-1 left-1/2 transform -translate-x-1/2' :
              'top-6 right-2'
            }`}
            style={{ zIndex: 10 + index }}
          >
            {getAccessoryEmoji(accessoryId)}
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'shape', name: 'Forme', icon: Eye },
    { id: 'color', name: 'Couleur', icon: Palette },
    { id: 'accessories', name: 'Accessoires', icon: Crown },
    { id: 'background', name: 'Arrière-plan', icon: Sparkles }
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Créateur d'Avatar</h2>
            <p className="text-blue-100 mt-1">Personnalisez votre apparence</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-yellow-400 text-xl">💰</span>
              <span className="text-white font-bold text-lg">{userCoins}</span>
            </div>

            <button
              onClick={onClose}
              className="text-white hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-full">
          {/* Preview Section */}
          <div className="lg:w-1/3 p-6 bg-slate-800/50">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-4">Aperçu</h3>

              {renderPreview()}

              {/* Cost */}
              <div className="bg-slate-700 rounded-lg p-3 mb-4">
                <div className="text-sm text-slate-400 mb-1">Coût total</div>
                <div className={`text-xl font-bold ${canAfford() ? 'text-green-400' : 'text-red-400'}`}>
                  {calculateTotalCost()} 💰
                </div>
              </div>

              {/* Save Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={!canAfford()}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  canAfford()
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {canAfford() ? 'Sauvegarder Avatar' : 'Coins insuffisants'}
              </motion.button>
            </div>
          </div>

          {/* Customization Section */}
          <div className="lg:w-2/3 p-6 overflow-y-auto">
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-slate-800 p-1 rounded-lg">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'shape' && (
                  <div className="grid grid-cols-5 gap-3">
                    {AVATAR_CONFIG.shapes.map((shape) => (
                      <motion.button
                        key={shape.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAvatar(prev => ({ ...prev, shape: shape.id }))}
                        className={`aspect-square rounded-lg border-2 p-3 flex flex-col items-center justify-center transition-colors ${
                          avatar.shape === shape.id
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-2xl mb-1">{shape.emoji}</span>
                        <span className="text-xs text-slate-300">{shape.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {activeTab === 'color' && (
                  <div className="grid grid-cols-5 gap-3">
                    {AVATAR_CONFIG.colors.map((color) => (
                      <motion.button
                        key={color.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAvatar(prev => ({ ...prev, color: color.id }))}
                        className={`aspect-square rounded-lg border-2 p-3 flex flex-col items-center justify-center transition-colors ${
                          avatar.color === color.id
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color.gradient} mb-1`}></div>
                        <span className="text-xs text-slate-300">{color.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {activeTab === 'accessories' && (
                  <div className="grid grid-cols-5 gap-3">
                    {AVATAR_CONFIG.accessories.map((accessory) => {
                      const isSelected = avatar.accessories.includes(accessory.id) ||
                                        (accessory.id === 'none' && avatar.accessories.length === 0);

                      return (
                        <motion.button
                          key={accessory.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleAccessory(accessory.id)}
                          className={`aspect-square rounded-lg border-2 p-3 flex flex-col items-center justify-center transition-colors relative ${
                            isSelected
                              ? 'border-blue-500 bg-blue-900/20'
                              : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                          }`}
                        >
                          <span className="text-2xl mb-1">{accessory.emoji}</span>
                          <span className="text-xs text-slate-300 text-center">{accessory.name}</span>

                          {accessory.cost > 0 && (
                            <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs px-1 rounded-full font-bold">
                              {accessory.cost}
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'background' && (
                  <div className="grid grid-cols-5 gap-3">
                    {AVATAR_CONFIG.backgrounds.map((background) => (
                      <motion.button
                        key={background.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAvatar(prev => ({ ...prev, background: background.id }))}
                        className={`aspect-square rounded-lg border-2 p-3 flex flex-col items-center justify-center transition-colors relative ${
                          avatar.background === background.id
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-2xl mb-1">{background.emoji}</span>
                        <span className="text-xs text-slate-300 text-center">{background.name}</span>

                        {background.cost > 0 && (
                          <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs px-1 rounded-full font-bold">
                            {background.cost}
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}