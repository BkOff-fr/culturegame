import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { roomCode } = await request.json();

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code requis' }, { status: 400 });
    }

    // Récupérer le jeu
    const game = await prisma.game.findUnique({
      where: { roomCode },
      include: {
        players: {
          include: {
            user: true
          }
        },
        questions: {
          include: {
            question: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Jeu non trouvé' }, { status: 404 });
    }

    if (game.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Le jeu n\'est pas en cours' }, { status: 400 });
    }

    // Vérifier que l'utilisateur est le host
    if (game.hostId !== payload.userId) {
      return NextResponse.json({ error: 'Seul l\'hôte peut passer à la question suivante' }, { status: 403 });
    }

    // Passer à la question suivante
    const nextQuestionIndex = game.currentQuestionIndex + 1;
    const hasMoreQuestions = nextQuestionIndex < game.questions.length;

    if (hasMoreQuestions) {
      // Passer à la question suivante
      const updatedGame = await prisma.game.update({
        where: { id: game.id },
        data: { currentQuestionIndex: nextQuestionIndex },
        include: {
          players: {
            include: {
              user: true
            }
          },
          questions: {
            include: {
              question: true
            },
            orderBy: { order: 'asc' }
          }
        }
      });

      const nextQuestion = updatedGame.questions[nextQuestionIndex];

      return NextResponse.json({
        success: true,
        nextQuestion: {
          id: nextQuestion.questionId,
          type: nextQuestion.question.type,
          question: nextQuestion.question.question,
          data: nextQuestion.question.data,
          timeLimit: nextQuestion.question.timeLimit,
          points: nextQuestion.question.points
        },
        game: updatedGame
      });
    } else {
      // Terminer le jeu
      const finishedGame = await prisma.game.update({
        where: { id: game.id },
        data: {
          status: 'FINISHED',
          endedAt: new Date()
        },
        include: {
          players: {
            include: {
              user: true,
              answers: true
            },
            orderBy: { score: 'desc' }
          }
        }
      });

      // Calculer les positions finales
      for (let i = 0; i < finishedGame.players.length; i++) {
        await prisma.gamePlayer.update({
          where: { id: finishedGame.players[i].id },
          data: { position: i + 1 }
        });
      }

      return NextResponse.json({
        success: true,
        gameFinished: true,
        results: finishedGame.players.map((p, index) => ({
          userId: p.userId,
          username: p.user.username,
          avatar: p.user.avatar,
          score: p.score,
          position: index + 1
        })),
        game: finishedGame
      });
    }

  } catch (error) {
    console.error('Erreur lors du passage à la question suivante:', error);
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}