import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { GameModeManager } from '@/lib/gameMode';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Get or create today's challenge
    const challengeId = await GameModeManager.createDailyChallenge();

    const challenge = await prisma.dailyChallenge.findUnique({
      where: { id: challengeId },
      include: {
        attempts: {
          where: { userId: payload.userId },
          orderBy: { completedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge non trouvé' },
        { status: 404 }
      );
    }

    // Get questions for the challenge
    const questions = await prisma.question.findMany({
      where: {
        id: { in: challenge.questions as string[] }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Get top 10 leaderboard for today
    const leaderboard = await prisma.dailyChallengeAttempt.findMany({
      where: { challengeId },
      orderBy: { score: 'desc' },
      take: 10,
      include: {
        user: {
          select: { username: true, avatar: true }
        }
      }
    });

    const response = {
      id: challenge.id,
      date: challenge.date,
      questions: questions.map(q => ({
        id: q.id,
        type: q.type,
        question: q.question,
        data: q.data,
        category: q.category,
        difficulty: q.difficulty,
        points: q.points,
        timeLimit: q.timeLimit
      })),
      isActive: challenge.isActive,
      userAttempt: challenge.attempts[0] ? {
        score: challenge.attempts[0].score,
        completedAt: challenge.attempts[0].completedAt
      } : null,
      leaderboard: leaderboard.map((attempt, index) => ({
        rank: index + 1,
        username: attempt.user.username,
        score: attempt.score
      }))
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching daily challenge:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}