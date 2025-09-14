import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { powerUpManager } from '@/lib/powerups';

export async function POST(request: NextRequest) {
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

    const { powerUpId, questionId, gameId } = await request.json();

    if (!powerUpId || !questionId || !gameId) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Get the current game and player
    const gamePlayer = await prisma.gamePlayer.findFirst({
      where: {
        userId: payload.userId,
        gameId: gameId
      }
    });

    if (!gamePlayer) {
      return NextResponse.json(
        { error: 'Joueur non trouvé dans cette partie' },
        { status: 404 }
      );
    }

    // Check if user has this power-up
    const userPowerUp = await prisma.userPowerUp.findFirst({
      where: {
        userId: payload.userId,
        powerUpId: powerUpId
      },
      include: { powerUp: true }
    });

    if (!userPowerUp || userPowerUp.quantity <= 0) {
      return NextResponse.json(
        { error: 'Power-up non disponible' },
        { status: 400 }
      );
    }

    // Get the question to check compatibility
    const gameQuestion = await prisma.gameQuestion.findFirst({
      where: { id: questionId },
      include: { question: true }
    });

    if (!gameQuestion) {
      return NextResponse.json(
        { error: 'Question non trouvée' },
        { status: 404 }
      );
    }

    // Check if power-up can be used on this question type
    if (!powerUpManager.canUsePowerUp(userPowerUp.powerUp.type, gameQuestion.question.type)) {
      return NextResponse.json(
        { error: 'Power-up non compatible avec ce type de question' },
        { status: 400 }
      );
    }

    // Check if power-up was already used on this question
    const existingUsage = await prisma.gamePowerUpUsage.findFirst({
      where: {
        gameId,
        playerId: gamePlayer.id,
        questionId,
        powerUpId
      }
    });

    if (existingUsage) {
      return NextResponse.json(
        { error: 'Power-up déjà utilisé sur cette question' },
        { status: 400 }
      );
    }

    // Use the power-up in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Decrease quantity
      await tx.userPowerUp.update({
        where: { id: userPowerUp.id },
        data: { quantity: { decrement: 1 } }
      });

      // Record usage
      await tx.gamePowerUpUsage.create({
        data: {
          gameId,
          playerId: gamePlayer.id,
          powerUpId,
          questionId
        }
      });

      // Apply power-up effect
      const modifiedQuestion = powerUpManager.applyPowerUpEffect(
        gameQuestion.question.data,
        userPowerUp.powerUp.type,
        payload.userId
      );

      return modifiedQuestion;
    });

    return NextResponse.json({
      success: true,
      data: {
        effect: userPowerUp.powerUp.type,
        modifiedQuestion: result
      }
    });

  } catch (error) {
    console.error('Error using power-up:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}