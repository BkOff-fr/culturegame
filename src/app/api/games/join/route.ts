import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { GameStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { roomCode } = await request.json()

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 })
    }

    // Chercher le jeu
    const game = await prisma.game.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
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

    if (game.status !== GameStatus.WAITING) {
      return NextResponse.json({ error: 'Game is not accepting new players' }, { status: 400 })
    }

    // Vérifier si le joueur est déjà dans le jeu
    const existingPlayer = game.players.find(p => p.userId === payload.userId)
    if (existingPlayer) {
      return NextResponse.json({
        game: {
          id: game.id,
          roomCode: game.roomCode,
          status: game.status,
          settings: game.settings,
          players: game.players.map(p => ({
            id: p.id,
            score: p.score,
            user: p.user
          }))
        }
      })
    }

    // Vérifier la limite de joueurs
    const maxPlayers = (game.settings as any)?.maxPlayers || 4
    if (game.players.length >= maxPlayers) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 })
    }

    // Ajouter le joueur
    await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: payload.userId
      }
    })

    // Récupérer le jeu mis à jour
    const updatedGame = await prisma.game.findUnique({
      where: { id: game.id },
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

    return NextResponse.json({
      game: {
        id: updatedGame!.id,
        roomCode: updatedGame!.roomCode,
        status: updatedGame!.status,
        settings: updatedGame!.settings,
        hostId: updatedGame!.hostId, // Ajout hostId manquant
        currentQuestionIndex: updatedGame!.currentQuestionIndex || 0, // Ajout index courant
        players: updatedGame!.players.map(p => ({
          id: p.id,
          score: p.score,
          user: p.user,
          hasAnswered: false // Nouveau joueur n'a pas encore répondu
        }))
      }
    })
  } catch (error) {
    console.error('Game join error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}