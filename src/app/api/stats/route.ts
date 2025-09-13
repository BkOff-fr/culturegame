import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Récupérer les statistiques du joueur
    const userStats = await prisma.gamePlayer.findMany({
      where: { userId: payload.userId },
      include: {
        game: {
          select: {
            status: true,
            endedAt: true
          }
        },
        answers: {
          select: {
            isCorrect: true,
            pointsEarned: true,
            timeSpent: true
          }
        }
      }
    })

    const finishedGames = userStats.filter(game => game.game.status === 'FINISHED')
    const totalGames = finishedGames.length
    const totalScore = finishedGames.reduce((sum, game) => sum + game.score, 0)
    const averageScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0

    // Calculs des statistiques détaillées
    const allAnswers = userStats.flatMap(game => game.answers)
    const correctAnswers = allAnswers.filter(answer => answer.isCorrect).length
    const totalAnswers = allAnswers.length
    const accuracyRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0

    const averageResponseTime = allAnswers.length > 0 
      ? Math.round(allAnswers.reduce((sum, answer) => sum + answer.timeSpent, 0) / allAnswers.length)
      : 0

    const bestScore = Math.max(...finishedGames.map(game => game.score), 0)
    const maxStreak = Math.max(...finishedGames.map(game => game.streak), 0)

    // Calcul du rang
    const betterPlayers = await prisma.gamePlayer.groupBy({
      by: ['userId'],
      _sum: {
        score: true
      },
      having: {
        score: {
          _sum: {
            gt: totalScore
          }
        }
      }
    })

    const rank = betterPlayers.length + 1

    const stats = {
      totalGames,
      totalScore,
      averageScore,
      bestScore,
      accuracyRate,
      correctAnswers,
      totalAnswers,
      averageResponseTime,
      maxStreak,
      rank,
      recentGames: finishedGames.slice(-5).map(game => ({
        score: game.score,
        streak: game.streak,
        endedAt: game.game.endedAt
      }))
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}