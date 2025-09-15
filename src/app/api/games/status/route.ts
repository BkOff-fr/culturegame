import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Cache simple en mémoire pour éviter les requêtes répétées
const gameCache = new Map<string, { data: any; timestamp: number; etag: string }>()
const CACHE_TTL = 2000 // 2 secondes de cache

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomCode = searchParams.get('roomCode')?.toUpperCase()
    if (!roomCode) return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })

    // Vérifier le cache
    const now = Date.now()
    const cached = gameCache.get(roomCode)
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'ETag': cached.etag,
          'Cache-Control': 'private, max-age=1'
        }
      })
    }

    // Requête optimisée : une seule requête avec tous les includes nécessaires
    const game = await prisma.game.findUnique({
      where: { roomCode },
      include: {
        players: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
            answers: {
              where: {
                gameQuestion: {
                  order: { gte: 0 } // Pour la question actuelle seulement
                }
              },
              select: { gameQuestionId: true },
              take: 1 // On ne veut que savoir s'il a répondu à la question actuelle
            }
          }
        },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              select: {
                id: true,
                question: true,
                type: true,
                data: true,
                timeLimit: true,
                points: true,
                category: true
              }
            }
          },
          take: 1, // On ne charge que la question actuelle
          skip: 0  // Sera mis à jour selon currentQuestionIndex
        }
      }
    })

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const readyMap = (game.settings as any)?.readyPlayers || {}
    const currentIdx = game.currentQuestionIndex || 0

    // Construire la réponse optimisée
    const response: any = {
      game: {
        id: game.id,
        roomCode: game.roomCode,
        status: game.status,
        settings: game.settings,
        hostId: game.hostId,
        startedAt: game.startedAt,
        currentQuestionIndex: currentIdx,
        players: game.players.map(p => ({
          id: p.id,
          score: p.score,
          streak: p.streak || 0,
          isReady: !!readyMap[p.user.id],
          hasAnswered: p.answers.length > 0, // Plus efficace que la requête séparée
          user: p.user
        }))
      }
    }

    // Charger la question actuelle si en cours
    if (game.status === 'IN_PROGRESS') {
      // Requête optimisée pour la question actuelle seulement
      const currentQuestion = await prisma.gameQuestion.findFirst({
        where: {
          gameId: game.id,
          order: currentIdx
        },
        include: {
          question: {
            select: {
              id: true,
              question: true,
              type: true,
              data: true,
              timeLimit: true,
              points: true,
              category: true
            }
          }
        }
      })

      if (currentQuestion) {
        response.question = {
          id: currentQuestion.question.id,
          text: currentQuestion.question.question,
          type: currentQuestion.question.type,
          options: Array.isArray((currentQuestion.question as any).data?.answers)
            ? (currentQuestion.question as any).data.answers
            : undefined,
          timeLimit: currentQuestion.question.timeLimit,
          points: currentQuestion.question.points,
          category: currentQuestion.question.category,
          imageUrl: (currentQuestion.question as any).data?.image
        }

        // Calculer l'état de synchronisation
        const totalPlayers = game.players.length
        const answeredCount = response.game.players.filter(p => p.hasAnswered).length
        const allPlayersAnswered = answeredCount >= totalPlayers

        response.game.allPlayersAnswered = allPlayersAnswered
        response.game.questionState = allPlayersAnswered ? 'WAITING_RESULTS' : 'ACTIVE'

        // Gestion des résultats en multijoueur
        if (allPlayersAnswered && totalPlayers > 1) {
          const gameSettings = game.settings as any
          const resultsDisplayDuration = gameSettings?.resultsDisplayTime || 5000
          const resultsDisplayUntil = new Date(Date.now() + resultsDisplayDuration)

          response.game.status = 'RESULTS_DISPLAY'
          response.game.questionState = 'SHOWING_RESULTS'
          response.game.resultsDisplayUntil = resultsDisplayUntil
        }
      }
    }

    // Mise en cache avec ETag
    const etag = `"${roomCode}-${game.updatedAt.getTime()}-${currentIdx}"`
    gameCache.set(roomCode, {
      data: response,
      timestamp: now,
      etag
    })

    // Nettoyer le cache ancien
    for (const [key, value] of gameCache.entries()) {
      if (now - value.timestamp > CACHE_TTL * 2) {
        gameCache.delete(key)
      }
    }

    return NextResponse.json(response, {
      headers: {
        'ETag': etag,
        'Cache-Control': 'private, max-age=1'
      }
    })
  } catch (error) {
    console.error('Game status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await ctx.params
  // ...
}