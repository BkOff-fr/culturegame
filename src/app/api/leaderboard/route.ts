import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all_time'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Récupérer les meilleurs joueurs
    const topPlayers = await prisma.gamePlayer.groupBy({
      by: ['userId'],
      _sum: {
        score: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          score: 'desc'
        }
      },
      take: limit
    })

    // Enrichir avec les informations utilisateur
    const leaderboard = await Promise.all(
      topPlayers.map(async (player, index) => {
        const user = await prisma.user.findUnique({
          where: { id: player.userId },
          select: {
            id: true,
            username: true,
            avatar: true
          }
        })

        return {
          rank: index + 1,
          user,
          totalScore: player._sum.score || 0,
          gamesPlayed: player._count.id,
          averageScore: Math.round((player._sum.score || 0) / player._count.id)
        }
      })
    )

    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}