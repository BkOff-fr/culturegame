import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const CHALLENGE_DURATION = 10000; // 10 secondes pour répondre

const MICRO_CHALLENGES = [
  {
    type: 'poll',
    question: 'Qui va répondre le plus rapidement à la prochaine question ?',
    options: [] // Sera rempli dynamiquement avec les noms des joueurs
  },
  {
    type: 'prediction',
    question: 'Quelle sera la difficulté de la prochaine question ?',
    options: ['Très facile', 'Facile', 'Moyen', 'Difficile', 'Très difficile']
  },
  {
    type: 'poll',
    question: 'Combien de joueurs vont avoir la bonne réponse ?',
    options: ['Aucun', '1 joueur', '2 joueurs', 'Tous les joueurs']
  },
  {
    type: 'quickTrivia',
    question: 'Vrai ou Faux : La France a plus de fuseaux horaires que la Russie',
    correctAnswer: 'Vrai'
  },
  {
    type: 'poll',
    question: 'Quel joueur a le plus de chances de remporter cette partie ?',
    options: [] // Sera rempli dynamiquement
  }
];

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

    const { roomCode, type, response, challengeId } = await request.json();

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code requis' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { roomCode },
      include: {
        players: {
          include: {
            user: true
          }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Jeu non trouvé' }, { status: 404 });
    }

    const gamePlayer = game.players.find(p => p.userId === payload.userId);
    if (!gamePlayer) {
      return NextResponse.json({ error: 'Vous ne participez pas à ce jeu' }, { status: 403 });
    }

    if (type === 'create') {
      // Créer un nouveau micro-défi (uniquement pour l'hôte)
      if (game.hostId !== payload.userId) {
        return NextResponse.json({ error: 'Seul l\'hôte peut créer des défis' }, { status: 403 });
      }

      // Nettoyer les anciens défis expirés
      await prisma.microChallenge.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      // Vérifier qu'il n'y a pas déjà un défi actif
      const activeChallenge = await prisma.microChallenge.findFirst({
        where: {
          gameId: game.id,
          status: 'ACTIVE'
        }
      });

      if (activeChallenge) {
        return NextResponse.json({ error: 'Un défi est déjà actif' }, { status: 400 });
      }

      // Sélectionner un défi aléatoire
      let selectedChallenge = MICRO_CHALLENGES[Math.floor(Math.random() * MICRO_CHALLENGES.length)];

      // Personnaliser les options si nécessaire
      if (selectedChallenge.type === 'poll' && selectedChallenge.options.length === 0) {
        if (selectedChallenge.question.includes('rapidement') || selectedChallenge.question.includes('remporter')) {
          selectedChallenge = {
            ...selectedChallenge,
            options: game.players.map(p => p.user.username)
          };
        } else if (selectedChallenge.question.includes('Combien de joueurs')) {
          const playerCount = game.players.length;
          selectedChallenge = {
            ...selectedChallenge,
            options: Array.from({ length: playerCount + 1 }, (_, i) =>
              i === 0 ? 'Aucun' : i === playerCount ? 'Tous les joueurs' : `${i} joueur${i > 1 ? 's' : ''}`
            )
          };
        }
      }

      const expiresAt = new Date(Date.now() + CHALLENGE_DURATION);
      const challenge = await prisma.microChallenge.create({
        data: {
          gameId: game.id,
          type: selectedChallenge.type,
          question: selectedChallenge.question,
          options: selectedChallenge.options || null,
          correctAnswer: selectedChallenge.correctAnswer,
          expiresAt
        }
      });

      return NextResponse.json({
        success: true,
        challenge: {
          id: challenge.id,
          type: challenge.type,
          question: challenge.question,
          options: challenge.options,
          expiresAt: challenge.expiresAt
        }
      });

    } else if (type === 'respond') {
      // Répondre à un défi
      if (!challengeId || !response) {
        return NextResponse.json({ error: 'Challenge ID et réponse requis' }, { status: 400 });
      }

      const challenge = await prisma.microChallenge.findUnique({
        where: { id: challengeId }
      });

      if (!challenge || challenge.gameId !== game.id) {
        return NextResponse.json({ error: 'Défi non trouvé' }, { status: 404 });
      }

      if (challenge.status !== 'ACTIVE' || challenge.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Défi expiré' }, { status: 400 });
      }

      // Enregistrer la réponse (ou la mettre à jour)
      await prisma.microChallengeResponse.upsert({
        where: {
          challengeId_userId: {
            challengeId: challenge.id,
            userId: payload.userId
          }
        },
        update: {
          response,
          submittedAt: new Date()
        },
        create: {
          challengeId: challenge.id,
          userId: payload.userId,
          response
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Réponse enregistrée'
      });
    }

    return NextResponse.json({ error: 'Type d\'action invalide' }, { status: 400 });

  } catch (error) {
    console.error('Erreur dans micro-challenges:', error);
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('roomCode');

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code requis' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { roomCode }
    });

    if (!game) {
      return NextResponse.json({ error: 'Jeu non trouvé' }, { status: 404 });
    }

    // Nettoyer les défis expirés
    await prisma.microChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    // Récupérer le défi actif avec les réponses
    const activeChallenge = await prisma.microChallenge.findFirst({
      where: {
        gameId: game.id,
        status: 'ACTIVE'
      },
      include: {
        responses: {
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
    });

    if (!activeChallenge) {
      return NextResponse.json({ challenge: null });
    }

    // Marquer comme complété si expiré
    if (activeChallenge.expiresAt < new Date()) {
      await prisma.microChallenge.update({
        where: { id: activeChallenge.id },
        data: { status: 'COMPLETED' }
      });

      return NextResponse.json({ challenge: null });
    }

    return NextResponse.json({
      challenge: {
        id: activeChallenge.id,
        type: activeChallenge.type,
        question: activeChallenge.question,
        options: activeChallenge.options,
        correctAnswer: activeChallenge.correctAnswer,
        expiresAt: activeChallenge.expiresAt,
        responses: activeChallenge.responses.map(r => ({
          user: r.user,
          response: r.response,
          submittedAt: r.submittedAt
        }))
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du micro-défi:', error);
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}