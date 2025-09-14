import { PowerUpType } from '@prisma/client'

// Interface pour les effets des power-ups avec sécurité améliorée
export interface PowerUpEffect {
  type: PowerUpType
  duration?: number
  value?: number
  startTime: number
  playerId: string
}

// Interface pour les données de question avec typage strict
export interface QuestionData {
  id: string
  type: string
  question: string
  data: Record<string, any>
  timeLimit: number
  answers?: any[]
  correctAnswer?: any
  [key: string]: any
}

// Définitions des power-ups avec configuration sécurisée
export const POWER_UP_DEFINITIONS = {
  [PowerUpType.FIFTY_FIFTY]: {
    name: '50/50',
    description: 'Élimine 2 mauvaises réponses',
    icon: '🎯',
    cost: 100,
    cooldown: 0,
    usableOn: ['MULTIPLE_CHOICE'],
    maxUsesPerGame: 2
  },
  [PowerUpType.FREEZE_TIME]: {
    name: 'Freeze Time',
    description: 'Arrête le chrono pendant 10 secondes',
    icon: '❄️',
    cost: 150,
    cooldown: 30000, // 30 secondes de cooldown
    usableOn: ['ALL'],
    maxUsesPerGame: 3
  },
  [PowerUpType.DOUBLE_POINTS]: {
    name: 'Double Points',
    description: 'Double les points de la prochaine question',
    icon: '⭐',
    cost: 200,
    cooldown: 60000, // 1 minute de cooldown
    usableOn: ['ALL'],
    maxUsesPerGame: 2
  },
  [PowerUpType.SKIP_QUESTION]: {
    name: 'Skip Question',
    description: 'Passe une question sans pénalité',
    icon: '⏭️',
    cost: 250,
    cooldown: 0,
    usableOn: ['ALL'],
    maxUsesPerGame: 1
  },
  [PowerUpType.HINT]: {
    name: 'Hint',
    description: 'Donne un indice sur la bonne réponse',
    icon: '💡',
    cost: 120,
    cooldown: 0,
    usableOn: ['ALL'],
    maxUsesPerGame: 3
  }
} as const

// Interface pour le tracking des usages
interface PowerUpUsage {
  type: PowerUpType
  usedAt: number
  gameId?: string
}

// Classe PowerUpManager unifiée et sécurisée
export class PowerUpManager {
  private activePowerUps = new Map<string, PowerUpEffect[]>()
  private usageHistory = new Map<string, PowerUpUsage[]>()
  private static instance: PowerUpManager | null = null

  // Singleton pattern pour éviter la duplication
  static getInstance(): PowerUpManager {
    if (!PowerUpManager.instance) {
      PowerUpManager.instance = new PowerUpManager()
    }
    return PowerUpManager.instance
  }

  // Application des effets de power-up avec validation sécurisée
  applyPowerUpEffect(
    questionData: QuestionData,
    powerUpType: PowerUpType,
    playerId: string,
    gameId?: string
  ): QuestionData {
    try {
      // Validation des paramètres
      if (!questionData || !playerId || !powerUpType) {
        console.warn('Invalid parameters for power-up application')
        return questionData
      }

      // Vérifier si le power-up peut être utilisé sur ce type de question
      if (!this.canUsePowerUp(powerUpType, questionData.type)) {
        console.warn(`Power-up ${powerUpType} cannot be used on question type ${questionData.type}`)
        return questionData
      }

      // Vérifier le cooldown
      if (!this.checkCooldown(playerId, powerUpType)) {
        console.warn(`Power-up ${powerUpType} is on cooldown for player ${playerId}`)
        return questionData
      }

      // Enregistrer l'usage
      this.recordUsage(playerId, powerUpType, gameId)

      // Appliquer l'effet spécifique
      return this.applySpecificEffect(questionData, powerUpType, playerId)
    } catch (error) {
      console.error(`Error applying power-up ${powerUpType}:`, error)
      return questionData
    }
  }

  private applySpecificEffect(
    questionData: QuestionData,
    powerUpType: PowerUpType,
    playerId: string
  ): QuestionData {
    switch (powerUpType) {
      case PowerUpType.FIFTY_FIFTY:
        return this.applyFiftyFifty(questionData)

      case PowerUpType.FREEZE_TIME:
        this.addActiveEffect(playerId, {
          type: PowerUpType.FREEZE_TIME,
          duration: 10000,
          startTime: Date.now(),
          playerId
        })
        return questionData

      case PowerUpType.DOUBLE_POINTS:
        this.addActiveEffect(playerId, {
          type: PowerUpType.DOUBLE_POINTS,
          value: 2,
          duration: 300000, // 5 minutes max
          startTime: Date.now(),
          playerId
        })
        return questionData

      case PowerUpType.SKIP_QUESTION:
        return { ...questionData, skipped: true, skipReason: 'power-up' }

      case PowerUpType.HINT:
        return this.applyHint(questionData)

      default:
        console.warn(`Unknown power-up type: ${powerUpType}`)
        return questionData
    }
  }

  // Application du 50/50 avec validation renforcée
  private applyFiftyFifty(questionData: QuestionData): QuestionData {
    if (questionData.type !== 'MULTIPLE_CHOICE') {
      console.warn('50/50 can only be applied to multiple choice questions')
      return questionData
    }

    const answers = questionData.data?.answers || questionData.answers
    if (!Array.isArray(answers) || answers.length < 4) {
      console.warn('Question must have at least 4 answers for 50/50')
      return questionData
    }

    const correctAnswerIndex = questionData.data?.correctAnswer ?? questionData.correctAnswer
    if (typeof correctAnswerIndex !== 'number' || correctAnswerIndex < 0) {
      console.warn('Invalid correct answer index for 50/50')
      return questionData
    }

    // Trouver les indices des mauvaises réponses
    const wrongAnswerIndices = answers
      .map((_, index) => index)
      .filter(index => index !== correctAnswerIndex)

    if (wrongAnswerIndices.length < 2) {
      console.warn('Not enough wrong answers for 50/50')
      return questionData
    }

    // Sélectionner aléatoirement 2 mauvaises réponses à masquer
    const shuffled = [...wrongAnswerIndices].sort(() => 0.5 - Math.random())
    const toRemove = shuffled.slice(0, 2)

    const modifiedAnswers = answers.map((answer, index) =>
      toRemove.includes(index) ? null : answer
    )

    return {
      ...questionData,
      data: {
        ...questionData.data,
        answers: modifiedAnswers
      },
      answers: modifiedAnswers,
      fiftyFiftyUsed: true,
      removedAnswers: toRemove
    }
  }

  // Application d'indice avec hints intelligents
  private applyHint(questionData: QuestionData): QuestionData {
    const hints: Record<string, string> = {
      'MULTIPLE_CHOICE': 'Éliminez d\'abord les réponses qui semblent clairement incorrectes',
      'TRUE_FALSE': 'Réfléchissez aux faits les plus couramment acceptés dans ce domaine',
      'TEXT_INPUT': `La réponse contient ${this.getAnswerLength(questionData)} caractères`,
      'ORDERING': 'Identifiez d\'abord les éléments aux extrémités (premier/dernier)',
      'SLIDER': 'Réfléchissez à l\'ordre de grandeur typique pour ce type de valeur',
      'IMAGE_ZONES': 'Concentrez-vous sur les zones les plus évidentes en premier',
      'MATCHING': 'Commencez par associer les paires les plus évidentes',
      'SPEED': 'La rapidité compte, mais gardez un minimum de précision'
    }

    const hint = hints[questionData.type] || 'Faites confiance à vos connaissances et votre instinct'

    return {
      ...questionData,
      hint,
      hintUsed: true,
      hintType: 'power-up'
    }
  }

  private getAnswerLength(questionData: QuestionData): string {
    const answer = questionData.data?.correctAnswer ?? questionData.data?.answer
    if (typeof answer === 'string') {
      return answer.length.toString()
    }
    return '?'
  }

  // Gestion des effets actifs avec nettoyage automatique
  private addActiveEffect(playerId: string, effect: PowerUpEffect): void {
    if (!playerId || !effect.type) {
      console.warn('Invalid parameters for adding active effect')
      return
    }

    const current = this.activePowerUps.get(playerId) || []

    // Éviter l'accumulation excessive et les doublons
    const filteredCurrent = current.filter(e =>
      e.type !== effect.type &&
      (!e.duration || (Date.now() - e.startTime) < e.duration)
    )

    filteredCurrent.push(effect)
    this.activePowerUps.set(playerId, filteredCurrent)

    // Auto-suppression après expiration
    if (effect.duration && effect.duration > 0) {
      setTimeout(() => {
        this.removeActiveEffect(playerId, effect.type)
      }, effect.duration)
    }
  }

  private removeActiveEffect(playerId: string, effectType: PowerUpType): void {
    const current = this.activePowerUps.get(playerId) || []
    const filtered = current.filter(effect => effect.type !== effectType)

    if (filtered.length > 0) {
      this.activePowerUps.set(playerId, filtered)
    } else {
      this.activePowerUps.delete(playerId)
    }
  }

  // Vérification du cooldown
  private checkCooldown(playerId: string, powerUpType: PowerUpType): boolean {
    const usage = this.usageHistory.get(playerId) || []
    const definition = POWER_UP_DEFINITIONS[powerUpType]

    if (!definition.cooldown) return true

    const lastUsage = usage
      .filter(u => u.type === powerUpType)
      .sort((a, b) => b.usedAt - a.usedAt)[0]

    if (!lastUsage) return true

    return (Date.now() - lastUsage.usedAt) >= definition.cooldown
  }

  // Enregistrement sécurisé des usages
  private recordUsage(playerId: string, powerUpType: PowerUpType, gameId?: string): void {
    const current = this.usageHistory.get(playerId) || []

    // Limiter l'historique pour éviter les fuites mémoire
    const recentUsages = current.filter(u =>
      (Date.now() - u.usedAt) < 24 * 60 * 60 * 1000 // 24 heures
    )

    recentUsages.push({
      type: powerUpType,
      usedAt: Date.now(),
      gameId
    })

    this.usageHistory.set(playerId, recentUsages)
  }

  // Méthodes publiques sécurisées
  hasActiveEffect(playerId: string, effectType: PowerUpType): boolean {
    if (!playerId || !effectType) return false

    const effects = this.getActiveEffects(playerId)
    return effects.some(effect => effect.type === effectType)
  }

  getActiveEffects(playerId: string): PowerUpEffect[] {
    if (!playerId) return []

    const effects = this.activePowerUps.get(playerId) || []
    const now = Date.now()

    // Filtrer les effets expirés
    const validEffects = effects.filter(effect =>
      !effect.duration || (now - effect.startTime) < effect.duration
    )

    // Mettre à jour si des effets ont expiré
    if (validEffects.length !== effects.length) {
      if (validEffects.length > 0) {
        this.activePowerUps.set(playerId, validEffects)
      } else {
        this.activePowerUps.delete(playerId)
      }
    }

    return validEffects
  }

  applyScoreModifiers(
    baseScore: number,
    playerId: string,
    streakMultiplier: number = 1
  ): number {
    if (baseScore < 0 || !playerId) return 0

    let finalScore = baseScore

    // Appliquer le double points si actif
    if (this.hasActiveEffect(playerId, PowerUpType.DOUBLE_POINTS)) {
      finalScore *= 2
      this.removeActiveEffect(playerId, PowerUpType.DOUBLE_POINTS)
    }

    // Appliquer le multiplicateur de série
    finalScore *= Math.max(1, streakMultiplier)

    return Math.floor(Math.max(0, finalScore))
  }

  canUsePowerUp(powerUpType: PowerUpType, questionType: string): boolean {
    const definition = POWER_UP_DEFINITIONS[powerUpType]
    if (!definition) return false

    return definition.usableOn.includes('ALL') ||
           definition.usableOn.includes(questionType)
  }

  // Nettoyage et maintenance
  clearPlayerEffects(playerId: string): void {
    if (playerId) {
      this.activePowerUps.delete(playerId)
    }
  }

  clearAllEffects(): void {
    this.activePowerUps.clear()
  }

  clearUsageHistory(): void {
    this.usageHistory.clear()
  }

  // Utilitaires et statistiques
  getStats(): {
    totalActivePlayers: number
    totalActiveEffects: number
    totalUsagesLast24h: number
  } {
    let totalEffects = 0
    for (const effects of this.activePowerUps.values()) {
      totalEffects += effects.length
    }

    let totalUsages = 0
    const yesterday = Date.now() - 24 * 60 * 60 * 1000
    for (const usages of this.usageHistory.values()) {
      totalUsages += usages.filter(u => u.usedAt > yesterday).length
    }

    return {
      totalActivePlayers: this.activePowerUps.size,
      totalActiveEffects: totalEffects,
      totalUsagesLast24h: totalUsages
    }
  }

  getDefaultInventory(): Array<{ type: PowerUpType; quantity: number }> {
    return [
      { type: PowerUpType.FIFTY_FIFTY, quantity: 2 },
      { type: PowerUpType.FREEZE_TIME, quantity: 1 },
      { type: PowerUpType.DOUBLE_POINTS, quantity: 1 },
      { type: PowerUpType.SKIP_QUESTION, quantity: 1 },
      { type: PowerUpType.HINT, quantity: 2 }
    ]
  }
}

// Export de l'instance singleton
export const powerUpManager = PowerUpManager.getInstance()