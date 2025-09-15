import { PowerUpType, GameStatus, QuestionType, Difficulty, GameMode } from '@prisma/client'
import { validateUsername, validateEmail, validatePassword } from './auth'

// Types de validation
type ValidationResult = {
  isValid: boolean
  errors: string[]
  sanitizedData?: any
}

// Schémas de validation
export const validationSchemas = {
  // Authentification
  register: {
    username: { required: true, type: 'string', min: 3, max: 30, pattern: /^[a-zA-Z0-9_-]+$/ },
    email: { required: false, type: 'email' },
    password: { required: true, type: 'string', min: 6, max: 128 },
    avatar: { required: false, type: 'string', max: 10 }
  },

  login: {
    username: { required: true, type: 'string', min: 1, max: 30 },
    password: { required: true, type: 'string', min: 1, max: 128 }
  },

  // Jeux
  createGame: {
    settings: {
      required: false,
      type: 'object',
      properties: {
        maxPlayers: { type: 'number', min: 2, max: 20 },
        timePerQuestion: { type: 'number', min: 5, max: 300 },
        categories: { type: 'array', items: { type: 'string' } },
        difficulty: { type: 'string', enum: Object.values(Difficulty) },
        mode: { type: 'string', enum: Object.values(GameMode) }
      }
    }
  },

  joinGame: {
    roomCode: { required: true, type: 'string', pattern: /^[A-Z0-9]{6}$/ }
  },

  // Questions
  createQuestion: {
    type: { required: true, type: 'string', enum: Object.values(QuestionType) },
    question: { required: true, type: 'string', min: 10, max: 500 },
    data: { required: true, type: 'object' },
    category: { required: true, type: 'string', min: 1, max: 50 },
    difficulty: { required: false, type: 'string', enum: Object.values(Difficulty) },
    points: { required: false, type: 'number', min: 10, max: 1000 },
    timeLimit: { required: false, type: 'number', min: 5, max: 300 }
  },

  // Socket events
  socketAnswer: {
    roomCode: { required: true, type: 'string', pattern: /^[A-Z0-9]{6}$/ },
    questionId: { required: true, type: 'string', pattern: /^[a-zA-Z0-9_-]+$/ },
    answer: { required: true, type: 'any' },
    timeSpent: { required: true, type: 'number', min: 0, max: 300000 }
  },

  usePowerup: {
    roomCode: { required: true, type: 'string', pattern: /^[A-Z0-9]{6}$/ },
    powerUpId: { required: true, type: 'string' },
    powerUpType: { required: true, type: 'string', enum: Object.values(PowerUpType) }
  },

  chatMessage: {
    roomCode: { required: true, type: 'string', pattern: /^[A-Z0-9]{6}$/ },
    message: { required: true, type: 'string', min: 1, max: 200 },
    type: { required: false, type: 'string', enum: ['PREDEFINED', 'CUSTOM', 'SYSTEM'] }
  }
}

// Fonction principale de validation
export function validate(data: any, schemaName: keyof typeof validationSchemas): ValidationResult {
  const schema = validationSchemas[schemaName]
  const errors: string[] = []
  const sanitizedData: any = {}

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Data must be an object'] }
  }

  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = data[fieldName]
    const fieldResult = validateField(value, rules, fieldName)

    if (!fieldResult.isValid) {
      errors.push(...fieldResult.errors)
    } else if (fieldResult.sanitizedValue !== undefined) {
      sanitizedData[fieldName] = fieldResult.sanitizedValue
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  }
}

// Validation d'un champ individuel
function validateField(value: any, rules: any, fieldName: string): { isValid: boolean; errors: string[]; sanitizedValue?: any } {
  const errors: string[] = []
  let sanitizedValue = value

  // Vérification si requis
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`)
    return { isValid: false, errors }
  }

  // Si non requis et vide, on skip les autres validations
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return { isValid: true, errors: [], sanitizedValue: undefined }
  }

  // Validation du type
  if (rules.type) {
    const typeResult = validateType(value, rules.type, fieldName)
    if (!typeResult.isValid) {
      errors.push(...typeResult.errors)
      return { isValid: false, errors }
    }
    sanitizedValue = typeResult.sanitizedValue
  }

  // Validation de la longueur pour les strings
  if (rules.type === 'string' && typeof sanitizedValue === 'string') {
    if (rules.min && sanitizedValue.length < rules.min) {
      errors.push(`${fieldName} must be at least ${rules.min} characters long`)
    }
    if (rules.max && sanitizedValue.length > rules.max) {
      errors.push(`${fieldName} must be at most ${rules.max} characters long`)
    }
  }

  // Validation des nombres
  if (rules.type === 'number' && typeof sanitizedValue === 'number') {
    if (rules.min !== undefined && sanitizedValue < rules.min) {
      errors.push(`${fieldName} must be at least ${rules.min}`)
    }
    if (rules.max !== undefined && sanitizedValue > rules.max) {
      errors.push(`${fieldName} must be at most ${rules.max}`)
    }
  }

  // Validation des patterns
  if (rules.pattern && typeof sanitizedValue === 'string') {
    if (!rules.pattern.test(sanitizedValue)) {
      errors.push(`${fieldName} format is invalid`)
    }
  }

  // Validation des enums
  if (rules.enum && !rules.enum.includes(sanitizedValue)) {
    errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`)
  }

  // Validation des objets
  if (rules.type === 'object' && rules.properties) {
    const objectErrors = validateObject(sanitizedValue, rules.properties, fieldName)
    errors.push(...objectErrors)
  }

  // Validation des arrays
  if (rules.type === 'array' && Array.isArray(sanitizedValue)) {
    if (rules.items) {
      for (let i = 0; i < sanitizedValue.length; i++) {
        const itemResult = validateField(sanitizedValue[i], rules.items, `${fieldName}[${i}]`)
        if (!itemResult.isValid) {
          errors.push(...itemResult.errors)
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue
  }
}

// Validation de type avec sanitization
function validateType(value: any, type: string, fieldName: string): { isValid: boolean; errors: string[]; sanitizedValue: any } {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { isValid: false, errors: [`${fieldName} must be a string`], sanitizedValue: value }
      }
      // Sanitization: trim whitespace, remove null bytes
      const sanitized = value.trim().replace(/\0/g, '')
      return { isValid: true, errors: [], sanitizedValue: sanitized }

    case 'number':
      const num = Number(value)
      if (isNaN(num) || !isFinite(num)) {
        return { isValid: false, errors: [`${fieldName} must be a valid number`], sanitizedValue: value }
      }
      return { isValid: true, errors: [], sanitizedValue: num }

    case 'boolean':
      if (typeof value !== 'boolean') {
        // Tentative de conversion
        if (value === 'true' || value === '1' || value === 1) {
          return { isValid: true, errors: [], sanitizedValue: true }
        } else if (value === 'false' || value === '0' || value === 0) {
          return { isValid: true, errors: [], sanitizedValue: false }
        }
        return { isValid: false, errors: [`${fieldName} must be a boolean`], sanitizedValue: value }
      }
      return { isValid: true, errors: [], sanitizedValue: value }

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        return { isValid: false, errors: [`${fieldName} must be an object`], sanitizedValue: value }
      }
      return { isValid: true, errors: [], sanitizedValue: value }

    case 'array':
      if (!Array.isArray(value)) {
        return { isValid: false, errors: [`${fieldName} must be an array`], sanitizedValue: value }
      }
      return { isValid: true, errors: [], sanitizedValue: value }

    case 'email':
      if (typeof value !== 'string') {
        return { isValid: false, errors: [`${fieldName} must be a string`], sanitizedValue: value }
      }
      const email = value.trim().toLowerCase()
      if (!validateEmail(email)) {
        return { isValid: false, errors: [`${fieldName} must be a valid email`], sanitizedValue: value }
      }
      return { isValid: true, errors: [], sanitizedValue: email }

    case 'any':
      return { isValid: true, errors: [], sanitizedValue: value }

    default:
      return { isValid: false, errors: [`Unknown type: ${type}`], sanitizedValue: value }
  }
}

// Validation d'objet récursive
function validateObject(obj: any, properties: Record<string, any>, parentFieldName: string): string[] {
  const errors: string[] = []

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    errors.push(`${parentFieldName} must be an object`)
    return errors
  }

  for (const [propName, propRules] of Object.entries(properties)) {
    const propValue = obj[propName]
    const fieldResult = validateField(propValue, propRules, `${parentFieldName}.${propName}`)

    if (!fieldResult.isValid) {
      errors.push(...fieldResult.errors)
    }
  }

  return errors
}

// Middleware Express pour la validation
export function validationMiddleware(schemaName: keyof typeof validationSchemas) {
  return (req: any, res: any, next: any) => {
    const result = validate(req.body, schemaName)

    if (!result.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.errors
      })
    }

    // Remplacer req.body par les données sanitisées
    req.body = result.sanitizedData
    next()
  }
}

// Validation spécifique pour les données sensibles
export function validateGameData(data: any): ValidationResult {
  const errors: string[] = []

  // Validation room code
  if (data.roomCode && !/^[A-Z0-9]{6}$/.test(data.roomCode)) {
    errors.push('Invalid room code format')
  }

  // Validation user ID
  if (data.userId && (typeof data.userId !== 'string' || data.userId.length < 10)) {
    errors.push('Invalid user ID')
  }

  // Validation game settings
  if (data.settings) {
    if (data.settings.maxPlayers && (data.settings.maxPlayers < 2 || data.settings.maxPlayers > 20)) {
      errors.push('Max players must be between 2 and 20')
    }

    if (data.settings.timePerQuestion && (data.settings.timePerQuestion < 5 || data.settings.timePerQuestion > 300)) {
      errors.push('Time per question must be between 5 and 300 seconds')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validation des réponses de questions
export function validateQuestionAnswer(questionType: string, answer: any): ValidationResult {
  const errors: string[] = []

  switch (questionType) {
    case 'MULTIPLE_CHOICE':
      if (typeof answer !== 'number' || answer < 0 || answer > 10) {
        errors.push('Multiple choice answer must be a number between 0 and 10')
      }
      break

    case 'TRUE_FALSE':
      if (typeof answer !== 'boolean') {
        errors.push('True/false answer must be a boolean')
      }
      break

    case 'TEXT_INPUT':
      if (typeof answer !== 'string' || answer.length === 0 || answer.length > 200) {
        errors.push('Text input answer must be a non-empty string with max 200 characters')
      }
      break

    case 'SLIDER':
      if (typeof answer !== 'number' || answer < 0 || answer > 1000000) {
        errors.push('Slider answer must be a number between 0 and 1000000')
      }
      break

    case 'ORDERING':
    case 'MATCHING':
      if (!Array.isArray(answer) || answer.length === 0 || answer.length > 20) {
        errors.push('Array answer must have between 1 and 20 elements')
      }
      break

    default:
      // Pour les nouveaux types de questions non encore gérés
      if (answer === null || answer === undefined) {
        errors.push('Answer cannot be null or undefined')
      }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Nettoyage et sanitization des strings pour éviter les injections
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return ''

  return str
    .trim()
    .replace(/\0/g, '') // Null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Scripts
    .replace(/javascript:/gi, '') // JavaScript protocols
    .replace(/on\w+\s*=/gi, '') // Event handlers
    .substring(0, 1000) // Limite de longueur
}

// Rate limiting par IP pour les validations
const validationAttempts = new Map<string, { count: number; resetTime: number }>()

export function checkValidationRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = validationAttempts.get(ip) || { count: 0, resetTime: now + 60000 }

  if (record.count > 100 && now < record.resetTime) {
    return false
  }

  if (now > record.resetTime) {
    record.count = 1
    record.resetTime = now + 60000
  } else {
    record.count++
  }

  validationAttempts.set(ip, record)
  return true
}

// Nettoyage périodique
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of validationAttempts.entries()) {
    if (now > record.resetTime) {
      validationAttempts.delete(ip)
    }
  }
}, 300000) // 5 minutes