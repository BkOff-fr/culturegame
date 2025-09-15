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

    const { roomCode, questionId, answer, timeSpent } = await request.json();

    console.log('Données reçues:', { roomCode, questionId, answer, timeSpent });

    if (!roomCode || !questionId || answer === undefined || timeSpent === undefined) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Récupérer le jeu et vérifier qu'il est en cours
    const game = await prisma.game.findUnique({
      where: { roomCode },
      include: {
        players: {
          include: {
            user: true,
            answers: true
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

    // Vérifier que le joueur fait partie du jeu
    const gamePlayer = game.players.find(p => p.userId === payload.userId);
    if (!gamePlayer) {
      return NextResponse.json({ error: 'Vous ne participez pas à ce jeu' }, { status: 403 });
    }

    // Trouver la question actuelle
    const currentGameQuestion = game.questions[game.currentQuestionIndex];
    if (!currentGameQuestion || currentGameQuestion.questionId !== questionId) {
      return NextResponse.json({ error: 'Question invalide' }, { status: 400 });
    }

    // Vérifier si le joueur a déjà répondu à cette question
    console.log('Vérification de la réponse existante pour:', {
      gamePlayerId: gamePlayer.id,
      gameQuestionId: currentGameQuestion.id
    });

    const existingAnswer = await prisma.playerAnswer.findUnique({
      where: {
        gamePlayerId_gameQuestionId: {
          gamePlayerId: gamePlayer.id,
          gameQuestionId: currentGameQuestion.id
        }
      }
    });

    console.log('Réponse existante trouvée:', existingAnswer);

    if (existingAnswer) {
      return NextResponse.json({ error: 'Vous avez déjà répondu à cette question' }, { status: 400 });
    }

    // Évaluer la réponse
    const question = currentGameQuestion.question;
    const questionData = question.data as Record<string, unknown>;
    let isCorrect = false;
    let pointsEarned = 0;

    // Logique d'évaluation selon le type de question
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        isCorrect = answer === questionData.correctAnswer;
        break;
      case 'TRUE_FALSE':
        isCorrect = answer === questionData.correctAnswer;
        break;
      case 'TEXT_INPUT':
        // Comparer en ignorant la casse et les espaces
        const correctText = String(questionData.correctAnswer || '').toLowerCase().trim();
        const userText = String(answer || '').toLowerCase().trim();
        isCorrect = correctText === userText;
        break;
      default:
        // Pour les autres types, on assume que la comparaison directe fonctionne
        isCorrect = answer === questionData.correctAnswer;
    }

    // Calculer les points avec bonus de temps
    if (isCorrect) {
      const basePoints = question.points;
      const timeBonus = Math.max(0, Math.floor((question.timeLimit - timeSpent) / question.timeLimit * basePoints * 0.5));
      pointsEarned = basePoints + timeBonus;

      // Bonus de streak
      const streakBonus = Math.floor(gamePlayer.streak * 10);
      pointsEarned += streakBonus;
    }

    // Utiliser une transaction pour éviter les race conditions
    const result = await prisma.$transaction(async (tx) => {
      // 1. Enregistrer la réponse
      console.log('Création de la réponse avec:', {
        gamePlayerId: gamePlayer.id,
        gameQuestionId: currentGameQuestion.id,
        answer: answer,
        isCorrect,
        pointsEarned,
        timeSpent
      });

      await tx.playerAnswer.create({
        data: {
          gamePlayerId: gamePlayer.id,
          gameQuestionId: currentGameQuestion.id,
          answer: answer,
          isCorrect,
          pointsEarned,
          timeSpent
        }
      });

      // 2. Mettre à jour le score et le streak du joueur
      const newStreak = isCorrect ? gamePlayer.streak + 1 : 0;
      await tx.gamePlayer.update({
        where: { id: gamePlayer.id },
        data: {
          score: gamePlayer.score + pointsEarned,
          streak: newStreak
        }
      });

      // 3. Compter les réponses APRÈS insertion (atomique)
      const answersForCurrentQuestion = await tx.playerAnswer.count({
        where: {
          gameQuestionId: currentGameQuestion.id
        }
      });

      return { answersForCurrentQuestion };
    });

    // Vérifier si tous les joueurs ont répondu
    const totalPlayers = game.players.length;
    const allPlayersAnswered = result.answersForCurrentQuestion >= totalPlayers;

    // En mode solo, passer directement à la question suivante
    // En mode multijoueur, attendre que tous aient répondu ET laisser du temps pour voir les résultats
    const isSoloMode = totalPlayers === 1;

    if (isSoloMode) {
      // Mode solo : progression immédiate
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
          isCorrect,
          pointsEarned,
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
        // Terminer le jeu solo
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

        return NextResponse.json({
          success: true,
          isCorrect,
          pointsEarned,
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
    } else {
      // Mode multijoueur : gérer l'affichage des résultats
      if (allPlayersAnswered) {
        // Tous les joueurs ont répondu - récupérer les résultats de cette question
        const questionAnswers = await prisma.playerAnswer.findMany({
          where: {
            gameQuestionId: currentGameQuestion.id
          },
          include: {
            gamePlayer: {
              include: {
                user: true
              }
            }
          }
        });

        const results = questionAnswers.map(answer => ({
          playerId: answer.gamePlayer.userId,
          username: answer.gamePlayer.user.username,
          avatar: answer.gamePlayer.user.avatar,
          answer: answer.answer,
          isCorrect: answer.isCorrect,
          pointsEarned: answer.pointsEarned,
          timeSpent: answer.timeSpent
        }));

        // Récupérer le jeu mis à jour avec les nouveaux scores
        const updatedGame = await prisma.game.findUnique({
          where: { id: game.id },
          include: {
            players: {
              include: {
                user: true
              }
            }
          }
        });

        // Marquer le jeu comme étant en mode affichage des résultats
        // Ceci sera géré par l'API status, pas ici pour éviter les race conditions

        return NextResponse.json({
          success: true,
          isCorrect,
          pointsEarned,
          allPlayersAnswered: true,
          questionResults: results,
          game: {
            ...updatedGame,
            allPlayersAnswered: true,
            status: 'RESULTS_DISPLAY' // Suggérer le changement d'état
          },
          message: 'Tous les joueurs ont répondu ! Résultats de cette question :'
        });
      } else {
        // Attendre les autres joueurs
        const updatedGame = await prisma.game.findUnique({
          where: { id: game.id },
          include: {
            players: {
              include: {
                user: true
              }
            }
          }
        });

        return NextResponse.json({
          success: true,
          isCorrect,
          pointsEarned,
          waiting: true,
          game: {
            ...updatedGame,
            allPlayersAnswered: false
          },
          message: 'En attente des autres joueurs...'
        });
      }
    }

  } catch (error) {
    console.error('Erreur lors de la soumission de la réponse:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}