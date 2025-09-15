'use client';

import { useState, useEffect, useCallback } from 'react';
import { PowerUpType } from '@prisma/client';
import { PowerUpInventory, UsePowerUpRequest } from '@/types/game';

interface UsePowerUpsProps {
  gameId?: string;
  userId?: string;
}

interface UsePowerUpsReturn {
  inventory: PowerUpInventory[];
  loading: boolean;
  error: string | null;
  usePowerUp: (powerUpId: string, questionId: string) => Promise<any>;
  purchasePowerUp: (powerUpId: string, quantity: number) => Promise<void>;
  refreshInventory: () => Promise<void>;
}

export function usePowerUps({ gameId, userId }: UsePowerUpsProps = {}): UsePowerUpsReturn {
  const [inventory, setInventory] = useState<PowerUpInventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }, []);

  const refreshInventory = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/powerups/inventory', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'inventaire');
      }

      const result = await response.json();

      if (result.success) {
        setInventory(result.data);
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [userId, getAuthHeaders]);

  const usePowerUp = useCallback(async (powerUpId: string, questionId: string) => {
    if (!gameId || !questionId) {
      throw new Error('Game ID et Question ID requis');
    }

    setError(null);

    try {
      const response = await fetch('/api/powerups/use', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          powerUpId,
          questionId,
          gameId
        })
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Erreur lors de l\'utilisation du power-up');
      }

      const result = await response.json();

      if (result.success) {
        // Update inventory to reflect used power-up
        setInventory(prev => prev.map(item =>
          item.powerUpId === powerUpId
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        ));

        return result.data;
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Error using power-up:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [gameId, getAuthHeaders]);

  const purchasePowerUp = useCallback(async (powerUpId: string, quantity: number) => {
    setError(null);

    try {
      const response = await fetch('/api/powerups/purchase', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          powerUpId,
          quantity
        })
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Erreur lors de l\'achat');
      }

      const result = await response.json();

      if (result.success) {
        // Update inventory to reflect purchase
        setInventory(prev => prev.map(item =>
          item.powerUpId === powerUpId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ));
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Error purchasing power-up:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [getAuthHeaders]);

  // Load inventory on mount
  useEffect(() => {
    if (userId) {
      refreshInventory();
    }
  }, [userId, refreshInventory]);

  return {
    inventory,
    loading,
    error,
    usePowerUp,
    purchasePowerUp,
    refreshInventory
  };
}

// Hook for power-up effects in games
export function usePowerUpEffects() {
  const [activeEffects, setActiveEffects] = useState<Map<PowerUpType, any>>(new Map());

  const addEffect = useCallback((type: PowerUpType, data?: any) => {
    setActiveEffects(prev => new Map(prev).set(type, data));

    // Auto-remove timed effects
    if (type === PowerUpType.FREEZE_TIME) {
      setTimeout(() => {
        setActiveEffects(prev => {
          const newMap = new Map(prev);
          newMap.delete(type);
          return newMap;
        });
      }, 10000); // 10 seconds
    }

    // Double points effect is removed after one use
    if (type === PowerUpType.DOUBLE_POINTS) {
      // This will be removed when the next answer is submitted
    }
  }, []);

  const removeEffect = useCallback((type: PowerUpType) => {
    setActiveEffects(prev => {
      const newMap = new Map(prev);
      newMap.delete(type);
      return newMap;
    });
  }, []);

  const hasEffect = useCallback((type: PowerUpType) => {
    return activeEffects.has(type);
  }, [activeEffects]);

  const getEffect = useCallback((type: PowerUpType) => {
    return activeEffects.get(type);
  }, [activeEffects]);

  const clearAllEffects = useCallback(() => {
    setActiveEffects(new Map());
  }, []);

  return {
    activeEffects,
    addEffect,
    removeEffect,
    hasEffect,
    getEffect,
    clearAllEffects
  };
}

// Hook for power-up animations and UI feedback
export function usePowerUpUI() {
  const [currentAnimation, setCurrentAnimation] = useState<PowerUpType | null>(null);
  const [showEffect, setShowEffect] = useState(false);

  const triggerPowerUpAnimation = useCallback((type: PowerUpType) => {
    setCurrentAnimation(type);
    setShowEffect(true);

    // Auto-hide after animation
    setTimeout(() => {
      setShowEffect(false);
      setCurrentAnimation(null);
    }, 2000);
  }, []);

  return {
    currentAnimation,
    showEffect,
    triggerPowerUpAnimation
  };
}