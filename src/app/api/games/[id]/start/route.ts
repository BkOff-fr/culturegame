import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const gameId = params.id

    // Vérifier que le jeu existe et que l'utilisateur est l'hôte
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est l'hôte
    if (game.hostId !== payload.userId) {
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 })
    }

    // Vérifier que le jeu est en attente
    if (game.status !== 'WAITING') {
      return NextResponse.json({ error: 'Game cannot be started' }, { status: 400 })
    }

    // Vérifier qu'il y a au moins 1 joueur
    if (game.players.length < 1) {
      return NextResponse.json({ error: 'Need at least 1 player to start' }, { status: 400 })
    }

    // Charger les questions selon la configuration de la partie
    const gameSettings = game.settings as any
    const categories = gameSettings?.categories || ['all']
    const difficulty = gameSettings?.difficulty || 'all'
    const questionCount = gameSettings?.questionCount || 10

    // Construire les filtres pour les questions
    const whereClause: any = { isPublic: true }
    
    if (!categories.includes('all') && categories.length > 0) {
      whereClause.category = { in: categories }
    }
    
    if (difficulty !== 'all') {
      whereClause.difficulty = difficulty
    }

    // Récupérer et mélanger les questions
    const allQuestions = await prisma.question.findMany({ where: whereClause })
    const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5)
    const selectedQuestions = shuffledQuestions.slice(0, questionCount)

    if (selectedQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions found matching criteria' }, { status: 400 })
    }

    // Créer les entrées GameQuestion
    const gameQuestions = await Promise.all(
      selectedQuestions.map((question, index) =>
        prisma.gameQuestion.create({
          data: {
            gameId: game.id,
            questionId: question.id,
            order: index + 1
          }
        })
      )
    )

    // Mettre à jour le statut du jeu
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date()
      },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: true
          }
        }
      }
    })

    return NextResponse.json({
      game: {
        id: updatedGame.id,
        roomCode: updatedGame.roomCode,
        status: updatedGame.status,
        settings: updatedGame.settings,
        startedAt: updatedGame.startedAt,
        players: updatedGame.players.map(p => ({
          id: p.id,
          score: p.score,
          user: p.user
        })),
        questions: updatedGame.questions.map(gq => ({
          id: gq.question.id,
          type: gq.question.type,
          question: gq.question.question,
          data: gq.question.data,
          category: gq.question.category,
          difficulty: gq.question.difficulty,
          points: gq.question.points,
          timeLimit: gq.question.timeLimit,
          order: gq.order
        }))
      }
    })
  } catch (error) {
    console.error('Game start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}