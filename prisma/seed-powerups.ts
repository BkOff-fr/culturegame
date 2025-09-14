import { PrismaClient, PowerUpType } from '@prisma/client';
import { POWER_UP_DEFINITIONS } from '../src/lib/powerups';

const prisma = new PrismaClient();

async function seedPowerUps() {
  console.log('Seeding power-ups...');

  // Create power-ups
  for (const [type, definition] of Object.entries(POWER_UP_DEFINITIONS)) {
    try {
      // Try to find existing power-up
      const existing = await prisma.powerUp.findUnique({
        where: { type: type as PowerUpType }
      });

      if (existing) {
        // Update existing
        await prisma.powerUp.update({
          where: { id: existing.id },
          data: {
            name: definition.name,
            description: definition.description,
            icon: definition.icon,
            cost: definition.cost
          }
        });
      } else {
        // Create new
        await prisma.powerUp.create({
          data: {
            name: definition.name,
            description: definition.description,
            icon: definition.icon,
            cost: definition.cost,
            type: type as PowerUpType
          }
        });
      }
    } catch (error) {
      console.error(`Error seeding power-up ${type}:`, error);
    }
  }

  console.log('Power-ups seeded successfully!');

  // Give all existing users default power-up inventory
  const users = await prisma.user.findMany();
  const powerUps = await prisma.powerUp.findMany();

  for (const user of users) {
    // Create user profile if doesn't exist
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        avatar: {
          shape: 'circle',
          color: 'blue',
          accessories: [],
          background: 'none'
        },
        coins: 1000,
        experience: 0,
        level: 1,
        eloRating: 1200
      }
    });

    // Give default power-ups
    for (const powerUp of powerUps) {
      await prisma.userPowerUp.upsert({
        where: {
          userId_powerUpId: {
            userId: user.id,
            powerUpId: powerUp.id
          }
        },
        update: {},
        create: {
          userId: user.id,
          powerUpId: powerUp.id,
          quantity: 1
        }
      });
    }
  }

  console.log('User power-ups initialized!');
}

async function main() {
  try {
    await seedPowerUps();
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});