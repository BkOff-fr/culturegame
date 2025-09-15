import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { POWER_UP_DEFINITIONS } from '@/lib/powerups';

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

    // Get user's power-up inventory - optimized query
    const userPowerUps = await prisma.userPowerUp.findMany({
      where: { userId: payload.userId },
      select: {
        powerUpId: true,
        quantity: true,
        powerUp: {
          select: {
            type: true,
            name: true,
            description: true,
            icon: true
          }
        }
      }
    });

    // Transform to expected format
    const inventory = userPowerUps.map(userPowerUp => ({
      powerUpId: userPowerUp.powerUpId,
      type: userPowerUp.powerUp.type,
      name: userPowerUp.powerUp.name,
      description: userPowerUp.powerUp.description,
      icon: userPowerUp.powerUp.icon,
      quantity: userPowerUp.quantity
    }));

    return NextResponse.json({
      success: true,
      data: inventory
    });

  } catch (error) {
    console.error('Error fetching power-up inventory:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}