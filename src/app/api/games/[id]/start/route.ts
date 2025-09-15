import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { id: gameId } = await ctx.params

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: { include: { user: { select: { id: true, username: true, avatar: true } } } }
      }
    })
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    if (game.hostId !== payload.userId) {
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 })
    }
    if (game.status !== 'WAITING') {
      return NextResponse.json({ error: 'Game cannot be started' }, { status: 400 })
    }
    if (game.players.length < 1) {
      return NextResponse.json({ error: 'Need at least 1 player to start' }, { status: 400 })
    }

    const gameSettings = game.settings as any
    const categories = gameSettings?.categories || ['all']
    const difficulty = gameSettings?.difficulty || 'all'
    const questionCount = gameSettings?.questionCount || 10

    const where: any = { isPublic: true }
    if (!categories.includes('all') && categories.length > 0) where.category = { in: categories }
    if (difficulty !== 'all') where.difficulty = difficulty

    const allQuestions = await prisma.question.findMany({ where })
    const shuffled = allQuestions.sort(() => Math.random() - 0.5)
    let selected = shuffled.slice(0, questionCount)

    // Fallback if none matched filters
    if (selected.length === 0) {
      const anyQs = await prisma.question.findMany()
      const shuffledAny = anyQs.sort(() => Math.random() - 0.5)
      selected = shuffledAny.slice(0, questionCount)
      if (selected.length === 0) {
        return NextResponse.json(
          { error: 'No questions available in database. Please add questions first.' },
          { status: 400 }
        )
      }
    }

    await Promise.all(
      selected.map((q, i) =>
        prisma.gameQuestion.create({
          data: { gameId: game.id, questionId: q.id, order: i + 1 }
        })
      )
    )

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
      include: {
        players: { include: { user: { select: { id: true, username: true, avatar: true } } } },
        questions: { orderBy: { order: 'asc' }, include: { question: true } }
      }
    })

    const first = updated.questions[0]?.question
    const firstQuestion = first
      ? {
          id: first.id,
          text: first.question,
          type: first.type,
          options: Array.isArray((first as any).data?.answers) ? (first as any).data.answers : undefined,
          timeLimit: first.timeLimit,
          points: first.points,
          category: first.category,
          imageUrl: (first as any).data?.image
        }
      : undefined

    return NextResponse.json({
      game: {
        id: updated.id,
        roomCode: updated.roomCode,
        status: updated.status,
        settings: updated.settings,
        startedAt: updated.startedAt,
        players: updated.players.map(p => ({ id: p.id, score: p.score, user: p.user })),
        questions: updated.questions.map(gq => ({
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
      },
      ...(firstQuestion ? { question: firstQuestion } : {})
    })
  } catch (error) {
    console.error('Game start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}