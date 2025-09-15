import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { POWER_UP_DEFINITIONS } from '@/lib/powerups';

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

    const { powerUpId, quantity = 1 } = await request.json();

    if (!powerUpId || quantity < 1) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      );
    }

    // Get the power-up details
    const powerUp = await prisma.powerUp.findUnique({
      where: { id: powerUpId }
    });

    if (!powerUp) {
      return NextResponse.json(
        { error: 'Power-up non trouvé' },
        { status: 404 }
      );
    }

    // Get user profile to check coins
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: payload.userId }
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const totalCost = powerUp.cost * quantity;

    if (userProfile.coins < totalCost) {
      return NextResponse.json(
        { error: 'Coins insuffisants' },
        { status: 400 }
      );
    }

    // Purchase in a transaction
    await prisma.$transaction(async (tx) => {
      // Deduct coins
      await tx.userProfile.update({
        where: { userId: payload.userId },
        data: { coins: { decrement: totalCost } }
      });

      // Add power-ups to inventory
      const existingPowerUp = await tx.userPowerUp.findFirst({
        where: {
          userId: payload.userId,
          powerUpId
        }
      });

      if (existingPowerUp) {
        await tx.userPowerUp.update({
          where: { id: existingPowerUp.id },
          data: { quantity: { increment: quantity } }
        });
      } else {
        await tx.userPowerUp.create({
          data: {
            userId: payload.userId,
            powerUpId,
            quantity
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        purchased: quantity,
        totalCost,
        remainingCoins: userProfile.coins - totalCost
      }
    });

  } catch (error) {
    console.error('Error purchasing power-up:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}