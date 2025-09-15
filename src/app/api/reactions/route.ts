import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const AVAILABLE_REACTIONS = ['🔥', '😰', '🤔', '💪', '😅', '🎯', '⚡'];
const REACTION_DURATION = 5000; // 5 secondes

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

    const { roomCode, reaction, questionId } = await request.json();

    if (!roomCode || !reaction) {
      return NextResponse.json({ error: 'Room code et réaction requis' }, { status: 400 });
    }

    if (!AVAILABLE_REACTIONS.includes(reaction)) {
      return NextResponse.json({ error: 'Réaction invalide' }, { status: 400 });
    }

    // Récupérer le jeu
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

    // Vérifier que l'utilisateur fait partie du jeu
    const gamePlayer = game.players.find(p => p.userId === payload.userId);
    if (!gamePlayer) {
      return NextResponse.json({ error: 'Vous ne participez pas à ce jeu' }, { status: 403 });
    }

    // Supprimer les anciennes réactions de ce joueur (limite une réaction active par joueur)
    await prisma.playerReaction.deleteMany({
      where: {
        gameId: game.id,
        userId: payload.userId
      }
    });

    // Créer la nouvelle réaction
    const expiresAt = new Date(Date.now() + REACTION_DURATION);
    const newReaction = await prisma.playerReaction.create({
      data: {
        gameId: game.id,
        userId: payload.userId,
        reaction,
        questionId,
        expiresAt
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // Nettoyer les réactions expirées
    await prisma.playerReaction.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return NextResponse.json({
      success: true,
      reaction: {
        id: newReaction.id,
        reaction: newReaction.reaction,
        user: newReaction.user,
        timestamp: newReaction.timestamp
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de réaction:', error);
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

    // Récupérer le jeu
    const game = await prisma.game.findUnique({
      where: { roomCode }
    });

    if (!game) {
      return NextResponse.json({ error: 'Jeu non trouvé' }, { status: 404 });
    }

    // Nettoyer les réactions expirées avant de retourner les actives
    await prisma.playerReaction.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    // Récupérer les réactions actives
    const reactions = await prisma.playerReaction.findMany({
      where: {
        gameId: game.id,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    return NextResponse.json({
      reactions: reactions.map(r => ({
        id: r.id,
        reaction: r.reaction,
        user: r.user,
        timestamp: r.timestamp,
        questionId: r.questionId
      }))
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des réactions:', error);
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}