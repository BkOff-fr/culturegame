import { PrismaClient, QuestionType, Difficulty } from '@prisma/client'

const prisma = new PrismaClient()

const defaultQuestions = [
  // =================================
  // GÉOGRAPHIE - 20 questions
  // =================================
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Quelle est la capitale du Japon ?",
    data: { answers: ["Seoul", "Tokyo", "Beijing", "Bangkok"], correct: 1 },
    category: "Géographie", difficulty: Difficulty.EASY, points: 100, timeLimit: 30, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Quel est le plus long fleuve du monde ?",
    data: { answers: ["Amazone", "Nil", "Yangtsé", "Mississippi"], correct: 0 },
    category: "Géographie", difficulty: Difficulty.MEDIUM, points: 150, timeLimit: 30, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Dans quel pays se trouve le Machu Picchu ?",
    data: { answers: ["Bolivie", "Pérou", "Équateur", "Chili"], correct: 1 },
    category: "Géographie", difficulty: Difficulty.MEDIUM, points: 150, timeLimit: 30, isPublic: true
  },
  {
    type: QuestionType.TRUE_FALSE,
    question: "L'Australie est plus grande que le Brésil",
    data: { correct: false },
    category: "Géographie", difficulty: Difficulty.HARD, points: 200, timeLimit: 25, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Combien de continents y a-t-il sur Terre ?",
    data: { answers: ["5", "6", "7", "8"], correct: 2 },
    category: "Géographie", difficulty: Difficulty.EASY, points: 75, timeLimit: 20, isPublic: true
  },
  {
    type: QuestionType.MATCHING,
    question: "Associez chaque pays à sa capitale",
    data: {
      pairs: [
        { left: "France", right: "Paris" },
        { left: "Espagne", right: "Madrid" },
        { left: "Italie", right: "Rome" },
        { left: "Allemagne", right: "Berlin" }
      ]
    },
    category: "Géographie", difficulty: Difficulty.HARD, points: 200, timeLimit: 90, isPublic: true
  },

  // =================================
  // HISTOIRE - 20 questions  
  // =================================
  {
    type: QuestionType.SLIDER,
    question: "En quelle année l'homme a-t-il marché sur la Lune ?",
    data: { min: 1950, max: 1990, correct: 1969, tolerance: 2 },
    category: "Histoire", difficulty: Difficulty.MEDIUM, points: 150, timeLimit: 45, isPublic: true
  },
  {
    type: QuestionType.ORDERING,
    question: "Classez ces inventions de la plus ancienne à la plus récente",
    data: {
      items: ["La roue", "L'imprimerie", "L'ampoule électrique", "Internet"],
      correct: ["La roue", "L'imprimerie", "L'ampoule électrique", "Internet"]
    },
    category: "Histoire", difficulty: Difficulty.HARD, points: 200, timeLimit: 60, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "En quelle année a eu lieu la chute du mur de Berlin ?",
    data: { answers: ["1987", "1989", "1991", "1993"], correct: 1 },
    category: "Histoire", difficulty: Difficulty.MEDIUM, points: 150, timeLimit: 30, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Qui était le premier empereur de Rome ?",
    data: { answers: ["Jules César", "Auguste", "Néron", "Caligula"], correct: 1 },
    category: "Histoire", difficulty: Difficulty.HARD, points: 200, timeLimit: 40, isPublic: true
  },
  {
    type: QuestionType.TRUE_FALSE,
    question: "La Première Guerre mondiale a duré exactement 4 ans",
    data: { correct: true },
    category: "Histoire", difficulty: Difficulty.MEDIUM, points: 125, timeLimit: 25, isPublic: true
  },

  // =================================
  // SCIENCES - 20 questions
  // =================================
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Quelle est la formule chimique de l'eau ?",
    data: { answers: ["H2O", "CO2", "NaCl", "CH4"], correct: 0 },
    category: "Sciences", difficulty: Difficulty.EASY, points: 75, timeLimit: 20, isPublic: true
  },
  {
    type: QuestionType.TRUE_FALSE,
    question: "Le diamant est le matériau naturel le plus dur sur Terre",
    data: { correct: true },
    category: "Sciences", difficulty: Difficulty.EASY, points: 75, timeLimit: 20, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Combien d'os a un adulte humain ?",
    data: { answers: ["156", "206", "256", "306"], correct: 1 },
    category: "Sciences", difficulty: Difficulty.MEDIUM, points: 150, timeLimit: 30, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Quelle planète est la plus proche du Soleil ?",
    data: { answers: ["Vénus", "Mars", "Mercure", "Terre"], correct: 2 },
    category: "Sciences", difficulty: Difficulty.EASY, points: 100, timeLimit: 25, isPublic: true
  },
  {
    type: QuestionType.TRUE_FALSE,
    question: "La vitesse de la lumière est d'environ 300 000 km/s",
    data: { correct: true },
    category: "Sciences", difficulty: Difficulty.MEDIUM, points: 125, timeLimit: 30, isPublic: true
  },

  // =================================
  // LITTÉRATURE - 15 questions
  // =================================
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Qui a écrit 'Les Misérables' ?",
    data: { answers: ["Victor Hugo", "Émile Zola", "Gustave Flaubert", "Marcel Proust"], correct: 0 },
    category: "Littérature", difficulty: Difficulty.MEDIUM, points: 125, timeLimit: 30, isPublic: true
  },
  {
    type: QuestionType.TEXT_INPUT,
    question: "Quel auteur a écrit '1984' ? (nom de famille uniquement)",
    data: { correct: ["orwell"] },
    category: "Littérature", difficulty: Difficulty.MEDIUM, points: 150, timeLimit: 40, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Dans quel livre trouve-t-on le personnage de Sherlock Holmes ?",
    data: { answers: ["Dracula", "Les Aventures de Sherlock Holmes", "Jekyll et Hyde", "Frankenstein"], correct: 1 },
    category: "Littérature", difficulty: Difficulty.EASY, points: 100, timeLimit: 30, isPublic: true
  },

  // =================================
  // ART - 15 questions
  // =================================
  {
    type: QuestionType.TEXT_INPUT,
    question: "Quel artiste a peint 'La Nuit étoilée' ? (nom de famille uniquement)",
    data: { correct: ["van gogh", "vangogh", "van-gogh"] },
    category: "Art", difficulty: Difficulty.MEDIUM, points: 150, timeLimit: 45, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Qui a peint 'La Joconde' ?",
    data: { answers: ["Michel-Ange", "Léonard de Vinci", "Raphaël", "Botticelli"], correct: 1 },
    category: "Art", difficulty: Difficulty.EASY, points: 100, timeLimit: 30, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Dans quel musée se trouve 'La Joconde' ?",
    data: { answers: ["Musée d'Orsay", "Le Louvre", "Musée Picasso", "Centre Pompidou"], correct: 1 },
    category: "Art", difficulty: Difficulty.MEDIUM, points: 125, timeLimit: 30, isPublic: true
  },

  // =================================
  // CINÉMA - 15 questions
  // =================================
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Qui a réalisé le film 'Pulp Fiction' ?",
    data: { answers: ["Martin Scorsese", "Quentin Tarantino", "Steven Spielberg", "Christopher Nolan"], correct: 1 },
    category: "Cinéma", difficulty: Difficulty.MEDIUM, points: 150, timeLimit: 30, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Quel film a remporté l'Oscar du meilleur film en 1994 ?",
    data: { answers: ["Forrest Gump", "Pulp Fiction", "Le Roi Lion", "Speed"], correct: 0 },
    category: "Cinéma", difficulty: Difficulty.HARD, points: 200, timeLimit: 40, isPublic: true
  },

  // =================================
  // MUSIQUE - 15 questions
  // =================================
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Combien de cordes a une guitare classique ?",
    data: { answers: ["4", "5", "6", "7"], correct: 2 },
    category: "Musique", difficulty: Difficulty.EASY, points: 75, timeLimit: 20, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Quel groupe a chanté 'Bohemian Rhapsody' ?",
    data: { answers: ["The Beatles", "Led Zeppelin", "Queen", "Pink Floyd"], correct: 2 },
    category: "Musique", difficulty: Difficulty.EASY, points: 100, timeLimit: 25, isPublic: true
  },

  // =================================
  // SPORT - 15 questions
  // =================================
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Tous les combien d'années ont lieu les Jeux Olympiques d'été ?",
    data: { answers: ["2 ans", "3 ans", "4 ans", "5 ans"], correct: 2 },
    category: "Sport", difficulty: Difficulty.EASY, points: 75, timeLimit: 20, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Quel pays a remporté la Coupe du Monde de football 2018 ?",
    data: { answers: ["Brésil", "Allemagne", "Argentine", "France"], correct: 3 },
    category: "Sport", difficulty: Difficulty.MEDIUM, points: 125, timeLimit: 25, isPublic: true
  },

  // =================================
  // TECHNOLOGIE - 10 questions
  // =================================
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Qui a fondé Microsoft ?",
    data: { answers: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Larry Page"], correct: 1 },
    category: "Technologie", difficulty: Difficulty.EASY, points: 100, timeLimit: 25, isPublic: true
  },
  {
    type: QuestionType.TRUE_FALSE,
    question: "Le premier iPhone est sorti en 2007",
    data: { correct: true },
    category: "Technologie", difficulty: Difficulty.MEDIUM, points: 125, timeLimit: 25, isPublic: true
  },

  // =================================
  // GASTRONOMIE - 10 questions
  // =================================
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Dans quel pays a été inventée la pizza ?",
    data: { answers: ["France", "Espagne", "Italie", "Grèce"], correct: 2 },
    category: "Gastronomie", difficulty: Difficulty.EASY, points: 75, timeLimit: 20, isPublic: true
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: "Quel est l'ingrédient principal du guacamole ?",
    data: { answers: ["Tomate", "Avocat", "Concombre", "Poivron"], correct: 1 },
    category: "Gastronomie", difficulty: Difficulty.EASY, points: 75, timeLimit: 20, isPublic: true
  },

  // =================================
  // QUESTIONS SPÉCIALES - 5 questions
  // =================================
  {
    type: QuestionType.SPEED,
    question: "Cliquez le plus rapidement possible quand vous voyez le signal !",
    data: { signal: "🚨" },
    category: "Rapidité", difficulty: Difficulty.MEDIUM, points: 100, timeLimit: 10, isPublic: true
  },
  {
    type: QuestionType.IMAGE_ZONES,
    question: "Cliquez sur la France sur cette carte",
    data: {
      image: "🗺️",
      zones: [
        { id: 'france', x: 45, y: 35, width: 10, height: 10, label: 'France' },
        { id: 'spain', x: 40, y: 45, width: 12, height: 10, label: 'Espagne' },
        { id: 'italy', x: 50, y: 40, width: 8, height: 12, label: 'Italie' },
        { id: 'germany', x: 48, y: 30, width: 10, height: 10, label: 'Allemagne' }
      ],
      correct: ['france']
    },
    category: "Géographie", difficulty: Difficulty.MEDIUM, points: 150, timeLimit: 30, isPublic: true
  }
]

const achievements = [
  {
    name: "Premier Pas",
    description: "Jouer sa première partie",
    icon: "🎯",
    condition: { gamesPlayed: 1 },
    points: 10
  },
  {
    name: "Marathonien",
    description: "Jouer 10 parties",
    icon: "🏃",
    condition: { gamesPlayed: 10 },
    points: 50
  },
  {
    name: "Expert",
    description: "Obtenir un score parfait dans une partie",
    icon: "🏆",
    condition: { perfectScore: true },
    points: 100
  },
  {
    name: "Série Noire",
    description: "Faire un streak de 10 questions correctes",
    icon: "🔥",
    condition: { maxStreak: 10 },
    points: 75
  },
  {
    name: "Créateur",
    description: "Créer sa première question personnalisée",
    icon: "✏️",
    condition: { questionsCreated: 1 },
    points: 25
  },
  {
    name: "Socialize",
    description: "Ajouter 5 amis",
    icon: "👥",
    condition: { friendsCount: 5 },
    points: 30
  }
]

async function main() {
  console.log('🌱 Seeding database...')
  
  // Supprimer les données existantes
  await prisma.playerAnswer.deleteMany()
  await prisma.gameQuestion.deleteMany()
  await prisma.gamePlayer.deleteMany()
  await prisma.game.deleteMany()
  await prisma.userAchievement.deleteMany()
  await prisma.achievement.deleteMany()
  await prisma.question.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.leaderboard.deleteMany()
  await prisma.user.deleteMany()

  // Créer les questions par défaut
  console.log('📝 Creating default questions...')
  for (const questionData of defaultQuestions) {
    await prisma.question.create({
      data: questionData
    })
  }

  // Créer les achievements
  console.log('🏆 Creating achievements...')
  for (const achievementData of achievements) {
    await prisma.achievement.create({
      data: achievementData
    })
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })