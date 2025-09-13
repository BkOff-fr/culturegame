'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Trash2, Plus } from 'lucide-react'
import { useGame } from '@/context/GameContext'

interface QuestionEditorProps {
  onClose: () => void
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ onClose }) => {
  const [questions, setQuestions] = useState<any[]>([])
  const [newQuestion, setNewQuestion] = useState({
    type: 'MULTIPLE_CHOICE',
    question: '',
    data: { answers: ['', '', '', ''], correct: 0 },
    category: 'Culture',
    difficulty: 'MEDIUM',
    points: 100,
    timeLimit: 30
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { loadQuestions, createQuestion } = useGame()

  const questionTypes = [
    { id: 'MULTIPLE_CHOICE', name: 'Choix Multiple', icon: '☑️' },
    { id: 'TEXT_INPUT', name: 'Réponse Texte', icon: '✍️' },
    { id: 'TRUE_FALSE', name: 'Vrai ou Faux', icon: '✅' }
  ]

  const categories = [
    'Culture', 'Sciences', 'Histoire', 'Géographie', 
    'Sport', 'Cinéma', 'Musique', 'Art', 'Littérature', 'Technologie'
  ]

  useEffect(() => {
    loadUserQuestions()
  }, [])

  const loadUserQuestions = async () => {
    try {
      const userQuestions = await loadQuestions({ limit: 50 })
      setQuestions(userQuestions.filter((q: any) => !q.isPublic))
    } catch (error) {
      console.error('Failed to load questions:', error)
    }
  }

  const handleSaveQuestion = async () => {
    if (!newQuestion.question.trim()) {
      setError('La question est requise')
      return
    }

    if (newQuestion.type === 'MULTIPLE_CHOICE') {
      const validAnswers = newQuestion.data.answers.filter((a: string) => a.trim())
      if (validAnswers.length < 2) {
        setError('Au moins 2 réponses sont requises')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      await createQuestion({
        ...newQuestion,
        isPublic: false
      })

      // Reset form
      setNewQuestion({
        type: 'MULTIPLE_CHOICE',
        question: '',
        data: { answers: ['', '', '', ''], correct: 0 },
        category: 'Culture',
        difficulty: 'MEDIUM',
        points: 100,
        timeLimit: 30
      })

      // Reload questions
      await loadUserQuestions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateAnswers = (index: number, value: string) => {
    const newAnswers = [...newQuestion.data.answers]
    newAnswers[index] = value
    setNewQuestion({
      ...newQuestion,
      data: { ...newQuestion.data, answers: newAnswers }
    })
  }

  const setCorrectAnswer = (index: number) => {
    setNewQuestion({
      ...newQuestion,
      data: { ...newQuestion.data, correct: index }
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      <div className="max-w-6xl mx-auto relative">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl">
                <Plus className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Question Editor</h2>
                <p className="text-slate-400 text-sm">Create and manage your custom questions</p>
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
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">New Question</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type de question
                  </label>
                  <select
                    value={newQuestion.type}
                    onChange={(e) => setNewQuestion({...newQuestion, type: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  >
                    {questionTypes.map(type => (
                      <option key={type.id} value={type.id} className="bg-slate-800">
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Question
                  </label>
                  <textarea
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:outline-none resize-none"
                    rows={3}
                    placeholder="Écris ta question ici..."
                  />
                </div>

                {newQuestion.type === 'MULTIPLE_CHOICE' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Réponses
                    </label>
                    {newQuestion.data.answers.map((answer: string, index: number) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => updateAnswers(index, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
                          placeholder={`Réponse ${index + 1}`}
                        />
                        <button
                          onClick={() => setCorrectAnswer(index)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            newQuestion.data.correct === index 
                              ? 'bg-green-600 text-white' 
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600 border border-slate-600'
                          }`}
                          title="Marquer comme bonne réponse"
                        >
                          ✓
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {newQuestion.type === 'TEXT_INPUT' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Réponses acceptées (séparées par des virgules)
                    </label>
                    <input
                      type="text"
                      onChange={(e) => setNewQuestion({
                        ...newQuestion, 
                        data: { correct: e.target.value.split(',').map((s: string) => s.trim()) }
                      })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
                      placeholder="réponse1, réponse2, réponse3"
                    />
                  </div>
                )}

                {newQuestion.type === 'TRUE_FALSE' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Bonne réponse
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setNewQuestion({
                          ...newQuestion, 
                          data: { correct: true }
                        })}
                        className={`p-3 rounded-lg transition-colors border ${
                          newQuestion.data.correct === true
                            ? 'bg-green-600 text-white border-green-500'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700'
                        }`}
                      >
                        ✅ VRAI
                      </button>
                      <button
                        onClick={() => setNewQuestion({
                          ...newQuestion, 
                          data: { correct: false }
                        })}
                        className={`p-3 rounded-lg transition-colors border ${
                          newQuestion.data.correct === false
                            ? 'bg-green-600 text-white border-green-500'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700'
                        }`}
                      >
                        ❌ FAUX
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Catégorie
                    </label>
                    <select
                      value={newQuestion.category}
                      onChange={(e) => setNewQuestion({...newQuestion, category: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat} className="bg-slate-800">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Points
                    </label>
                    <input
                      type="number"
                      value={newQuestion.points}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion, 
                        points: parseInt(e.target.value) || 100
                      })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:border-slate-600 focus:outline-none"
                      min="50"
                      max="500"
                      step="50"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-950/50 border border-red-800 rounded-lg p-3">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSaveQuestion}
                  disabled={loading || !newQuestion.question.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Mes Questions ({questions.length})
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    Aucune question personnalisée
                  </p>
                ) : (
                  questions.map((q) => (
                    <div key={q.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-slate-100 font-medium">{q.question}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">
                              {questionTypes.find(t => t.id === q.type)?.name}
                            </span>
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">
                              {q.category}
                            </span>
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-500/30">
                              {q.points} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuestionEditor