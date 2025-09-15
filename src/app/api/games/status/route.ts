import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomCode = searchParams.get('roomCode')?.toUpperCase()
    if (!roomCode) return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })

    const game = await prisma.game.findUnique({
      where: { roomCode },
      include: {
        players: { include: { user: { select: { id: true, username: true, avatar: true } } } },
        questions: { orderBy: { order: 'asc' }, include: { question: true } }
      }
    })
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const readyMap = (game.settings as any)?.readyPlayers || {}

    const response: any = {
      game: {
        id: game.id,
        roomCode: game.roomCode,
        status: game.status,
        settings: game.settings,
        hostId: game.hostId,
        startedAt: game.startedAt,
        players: game.players.map(p => ({
          id: p.id,
          score: p.score,
          isReady: !!readyMap[p.user.id],
          user: p.user
        }))
      }
    }

    if (game.status === 'IN_PROGRESS') {
      const currentIdx = game.currentQuestionIndex || 0
      const gq = game.questions[currentIdx]
      if (gq) {
        response.question = {
          id: gq.question.id,
          text: gq.question.question,
          type: gq.question.type,
          options: Array.isArray((gq.question as any).data?.answers) ? (gq.question as any).data.answers : undefined,
          timeLimit: gq.question.timeLimit,
          points: gq.question.points,
          category: gq.question.category,
          imageUrl: (gq.question as any).data?.image
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Game status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await ctx.params
  // ...
}