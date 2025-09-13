'use client'

import React, { useState } from 'react'
import { X, Settings, Clock, Hash, Zap, Users } from 'lucide-react'

interface GameSettingsProps {
  onClose: () => void
  onStartGame: (settings: GameSettings) => void
}

interface GameSettings {
  categories: string[]
  difficulty: 'all' | 'EASY' | 'MEDIUM' | 'HARD'
  timePerQuestion: number
  questionCount: number
  maxPlayers: number
}

const GameSettings: React.FC<GameSettingsProps> = ({ onClose, onStartGame }) => {
  const [settings, setSettings] = useState<GameSettings>({
    categories: ['all'],
    difficulty: 'all',
    timePerQuestion: 30,
    questionCount: 10,
    maxPlayers: 4
  })

  const availableCategories = [
    { id: 'all', name: 'Toutes les catégories', icon: '🌟', color: 'from-purple-500 to-pink-500' },
    { id: 'Géographie', name: 'Géographie', icon: '🌍', color: 'from-green-500 to-blue-500' },
    { id: 'Histoire', name: 'Histoire', icon: '📜', color: 'from-yellow-500 to-orange-500' },
    { id: 'Sciences', name: 'Sciences', icon: '🧪', color: 'from-blue-500 to-cyan-500' },
    { id: 'Littérature', name: 'Littérature', icon: '📚', color: 'from-indigo-500 to-purple-500' },
    { id: 'Art', name: 'Art', icon: '🎨', color: 'from-pink-500 to-red-500' },
    { id: 'Cinéma', name: 'Cinéma', icon: '🎬', color: 'from-gray-600 to-gray-800' },
    { id: 'Musique', name: 'Musique', icon: '🎵', color: 'from-purple-500 to-blue-500' },
    { id: 'Sport', name: 'Sport', icon: '⚽', color: 'from-green-500 to-emerald-500' },
    { id: 'Technologie', name: 'Technologie', icon: '💻', color: 'from-slate-500 to-gray-600' },
    { id: 'Gastronomie', name: 'Gastronomie', icon: '🍽️', color: 'from-orange-500 to-yellow-500' }
  ]

  const toggleCategory = (categoryId: string) => {
    if (categoryId === 'all') {
      setSettings({ ...settings, categories: ['all'] })
    } else {
      const newCategories = settings.categories.includes('all') 
        ? [categoryId]
        : settings.categories.includes(categoryId)
          ? settings.categories.filter(c => c !== categoryId)
          : [...settings.categories.filter(c => c !== 'all'), categoryId]
      
      setSettings({ ...settings, categories: newCategories.length ? newCategories : ['all'] })
    }
  }

  const handleStartGame = () => {
    onStartGame(settings)
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      <div className="max-w-4xl mx-auto relative">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl">
                <Settings className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Game Configuration</h2>
                <p className="text-slate-400 text-sm">Customize your quiz experience</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Catégories */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Catégories
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {availableCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`p-4 rounded-xl border transition-all transform hover:scale-105 ${
                        settings.categories.includes(category.id) || (settings.categories.includes('all') && category.id === 'all')
                          ? `bg-gradient-to-r ${category.color} text-white border-transparent shadow-lg`
                          : 'bg-white/5 text-gray-300 border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-2">{category.icon}</div>
                      <div className="text-sm font-medium">{category.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Paramètres */}
            <div className="space-y-6">
              {/* Difficulté */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Difficulté
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'all', name: 'Mixte', color: 'from-purple-500 to-pink-500' },
                    { id: 'EASY', name: 'Facile', color: 'from-green-500 to-emerald-500' },
                    { id: 'MEDIUM', name: 'Moyen', color: 'from-yellow-500 to-orange-500' },
                    { id: 'HARD', name: 'Difficile', color: 'from-red-500 to-pink-500' }
                  ].map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setSettings({ ...settings, difficulty: diff.id as any })}
                      className={`p-3 rounded-xl border transition-all ${
                        settings.difficulty === diff.id
                          ? `bg-gradient-to-r ${diff.color} text-white border-transparent`
                          : 'bg-white/5 text-gray-300 border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {diff.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temps par question */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Temps par question: {settings.timePerQuestion}s
                </h3>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={settings.timePerQuestion}
                  onChange={(e) => setSettings({ ...settings, timePerQuestion: parseInt(e.target.value) })}
                  className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10s</span>
                  <span>120s</span>
                </div>
              </div>

              {/* Nombre de questions */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Nombre de questions: {settings.questionCount}
                </h3>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={settings.questionCount}
                  onChange={(e) => setSettings({ ...settings, questionCount: parseInt(e.target.value) })}
                  className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5</span>
                  <span>50</span>
                </div>
              </div>

              {/* Joueurs max */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Joueurs maximum: {settings.maxPlayers}
                </h3>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSettings({ ...settings, maxPlayers: num })}
                      className={`w-12 h-12 rounded-lg border transition-all ${
                        settings.maxPlayers === num
                          ? 'bg-blue-500 text-white border-blue-400'
                          : 'bg-white/5 text-gray-300 border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/20">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleStartGame}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-xl transform hover:scale-105 transition-all"
            >
              Créer la Partie
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  )
}

export default GameSettings