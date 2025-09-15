'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PowerUpType } from '@prisma/client';
import { PowerUpInventory } from '@/types/game';
import { POWER_UP_DEFINITIONS } from '@/lib/powerups';

interface PowerUpShopProps {
  userCoins: number;
  inventory: PowerUpInventory[];
  onPurchase: (powerUpId: string, quantity: number) => Promise<void>;
  onClose: () => void;
}

interface ShopItem {
  id: string;
  type: PowerUpType;
  name: string;
  description: string;
  icon: string;
  cost: number;
  owned: number;
}

export default function PowerUpShop({
  userCoins,
  inventory,
  onPurchase,
  onClose
}: PowerUpShopProps) {
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Create shop items from power-up definitions
  const shopItems: ShopItem[] = Object.entries(POWER_UP_DEFINITIONS).map(([type, definition]) => {
    const owned = inventory.find(item => item.type === type as PowerUpType)?.quantity || 0;

    return {
      id: `shop-${type}`,
      type: type as PowerUpType,
      name: definition.name,
      description: definition.description,
      icon: definition.icon,
      cost: definition.cost,
      owned
    };
  });

  const handlePurchase = async (item: ShopItem) => {
    const quantity = selectedQuantities[item.id] || 1;
    const totalCost = item.cost * quantity;

    if (totalCost > userCoins || isPurchasing) return;

    setIsPurchasing(item.id);

    try {
      // Find the actual powerUpId from inventory or create one
      const existingItem = inventory.find(inv => inv.type === item.type);
      const powerUpId = existingItem?.powerUpId || `power-up-${item.type}`;

      await onPurchase(powerUpId, quantity);

      // Reset quantity after purchase
      setSelectedQuantities(prev => ({ ...prev, [item.id]: 1 }));
    } catch (error) {
      console.error('Error purchasing power-up:', error);
    } finally {
      setIsPurchasing(null);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, Math.min(10, (prev[itemId] || 1) + delta))
    }));
  };

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
            <h2 className="text-2xl font-bold text-white">Boutique Power-ups</h2>
            <p className="text-blue-100 mt-1">Améliorez vos chances de victoire</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-yellow-400 text-xl">💰</span>
              <span className="text-white font-bold text-lg">{userCoins}</span>
              <span className="text-blue-100 text-sm">coins</span>
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

        {/* Shop Items */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shopItems.map((item) => {
              const quantity = selectedQuantities[item.id] || 1;
              const totalCost = item.cost * quantity;
              const canAfford = totalCost <= userCoins;

              return (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-all duration-200"
                >
                  {/* Power-up Icon & Info */}
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </div>

                  {/* Owned quantity */}
                  {item.owned > 0 && (
                    <div className="bg-slate-700 rounded-lg p-2 mb-4 text-center">
                      <span className="text-slate-300 text-sm">
                        Possédé : <span className="text-blue-400 font-semibold">{item.owned}</span>
                      </span>
                    </div>
                  )}

                  {/* Quantity selector */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white transition-colors"
                      disabled={quantity <= 1}
                    >
                      -
                    </button>

                    <span className="text-white font-semibold text-lg w-8 text-center">
                      {quantity}
                    </span>

                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white transition-colors"
                      disabled={quantity >= 10}
                    >
                      +
                    </button>
                  </div>

                  {/* Cost & Purchase */}
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-sm text-slate-400">
                        {quantity > 1 && (
                          <span>{item.cost} × {quantity} = </span>
                        )}
                      </div>
                      <div className="text-xl font-bold text-yellow-400">
                        {totalCost} 💰
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={!canAfford || isPurchasing === item.id}
                      className={`
                        w-full py-3 rounded-lg font-semibold transition-all duration-200
                        ${canAfford
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }
                        ${isPurchasing === item.id ? 'opacity-50' : ''}
                      `}
                    >
                      {isPurchasing === item.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Achat...
                        </div>
                      ) : canAfford ? (
                        'Acheter'
                      ) : (
                        'Coins insuffisants'
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Tips section */}
          <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">💡 Conseils d'utilisation</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div>• <span className="text-blue-400">50/50</span> : Utilisez sur les questions difficiles à choix multiples</div>
              <div>• <span className="text-blue-400">Freeze Time</span> : Parfait quand vous avez besoin de plus de temps</div>
              <div>• <span className="text-blue-400">Double Points</span> : Gardez pour les questions de fin de partie</div>
              <div>• <span className="text-blue-400">Skip Question</span> : Évitez les questions impossibles</div>
              <div>• <span className="text-blue-400">Hint</span> : Obtenez un indice pour vous guider</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}