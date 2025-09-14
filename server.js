const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// Configuration sécurisée des variables d'environnement
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Validation de la configuration
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('❌ JWT_SECRET is required in production');
  process.exit(1);
}

// Configuration Next.js avec sécurité
const app = next({
  dev,
  hostname,
  port,
  conf: {
    poweredByHeader: false, // Sécurité: masquer l'en-tête X-Powered-By
  }
});
const handler = app.getRequestHandler();

// Configuration Prisma sécurisée
const prisma = new PrismaClient({
  log: dev ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
});

// État des jeux en cours
const gameRooms = new Map();

// Configuration du nettoyage des rooms
const ROOM_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const INACTIVE_ROOM_THRESHOLD = 60 * 60 * 1000; // 1 heure
const EMPTY_ROOM_THRESHOLD = 5 * 60 * 1000; // 5 minutes

// Fonction de nettoyage automatique des rooms inactives
function cleanupInactiveRooms() {
  const now = Date.now();
  const roomsToDelete = [];

  for (const [gameId, room] of gameRooms.entries()) {
    const isEmpty = room.players.size === 0;
    const isInactive = (now - room.lastActivity) > INACTIVE_ROOM_THRESHOLD;
    const isEmptyTooLong = isEmpty && (now - room.lastActivity) > EMPTY_ROOM_THRESHOLD;

    if (isEmptyTooLong || isInactive) {
      roomsToDelete.push({ gameId, room });
    }
  }

  for (const { gameId, room } of roomsToDelete) {
    console.log(`🧹 Cleaning up inactive room: ${room.roomCode} (${isEmpty ? 'empty' : 'inactive'} for ${Math.round((now - room.lastActivity) / 60000)} minutes)`);
    gameRooms.delete(gameId);
  }

  if (roomsToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${roomsToDelete.length} inactive rooms. Active rooms: ${gameRooms.size}`);
  }
}

// Démarrer le nettoyage automatique
const cleanupInterval = setInterval(cleanupInactiveRooms, ROOM_CLEANUP_INTERVAL);

// Fonction pour mettre à jour l'activité d'une room
function updateRoomActivity(room) {
  if (room) {
    room.lastActivity = Date.now();
  }
}

// Classes utilitaires
class PowerUpManager {
  constructor() {
    this.activePowerUps = new Map();
  }

  applyPowerUpEffect(questionData, powerUpType, playerId) {
    switch (powerUpType) {
      case 'FIFTY_FIFTY':
        return this.applyFiftyFifty(questionData);
      case 'FREEZE_TIME':
        this.addActiveEffect(playerId, { type: 'FREEZE_TIME', duration: 10000 });
        return questionData;
      case 'DOUBLE_POINTS':
        this.addActiveEffect(playerId, { type: 'DOUBLE_POINTS', value: 2 });
        return questionData;
      case 'SKIP_QUESTION':
        return { ...questionData, skipped: true };
      case 'HINT':
        return this.applyHint(questionData);
      default:
        return questionData;
    }
  }

  applyFiftyFifty(questionData) {
    if (!questionData.answers || questionData.answers.length < 4) {
      return questionData;
    }

    const correctAnswerIndex = questionData.correctAnswer;
    const wrongAnswers = questionData.answers
      .map((answer, index) => ({ answer, index }))
      .filter((item) => item.index !== correctAnswerIndex);

    const toRemove = wrongAnswers
      .sort(() => 0.5 - Math.random())
      .slice(0, 2)
      .map(item => item.index);

    return {
      ...questionData,
      answers: questionData.answers.map((answer, index) =>
        toRemove.includes(index) ? null : answer
      ),
      fiftyFiftyUsed: true
    };
  }

  applyHint(questionData) {
    const hints = {
      'MULTIPLE_CHOICE': 'La bonne réponse commence par la première lettre alphabétiquement',
      'TRUE_FALSE': 'Pensez aux faits les plus couramment acceptés',
      'TEXT_INPUT': `La réponse contient ${questionData.correctAnswer?.toString().length || 0} caractères`,
      'ORDERING': 'Commencez par identifier l\'élément le plus évident',
      'SLIDER': 'La valeur se situe dans la première moitié de l\'échelle',
      'MATCHING': 'Associez d\'abord les éléments les plus évidents',
      'SPEED': 'La rapidité compte plus que la précision parfaite'
    };

    return {
      ...questionData,
      hint: hints[questionData.type] || 'Faites confiance à votre instinct',
      hintUsed: true
    };
  }

  addActiveEffect(playerId, effect) {
    const current = this.activePowerUps.get(playerId) || [];
    current.push(effect);
    this.activePowerUps.set(playerId, current);

    if (effect.duration) {
      setTimeout(() => {
        this.removeActiveEffect(playerId, effect.type);
      }, effect.duration);
    }
  }

  removeActiveEffect(playerId, effectType) {
    const current = this.activePowerUps.get(playerId) || [];
    const filtered = current.filter(effect => effect.type !== effectType);
    this.activePowerUps.set(playerId, filtered);
  }

  hasActiveEffect(playerId, effectType) {
    const effects = this.activePowerUps.get(playerId) || [];
    return effects.some(effect => effect.type === effectType);
  }

  applyScoreModifiers(baseScore, playerId, streakMultiplier = 1) {
    let finalScore = baseScore;

    if (this.hasActiveEffect(playerId, 'DOUBLE_POINTS')) {
      finalScore *= 2;
      this.removeActiveEffect(playerId, 'DOUBLE_POINTS');
    }

    return Math.floor(finalScore * streakMultiplier);
  }

  clearAllEffects() {
    this.activePowerUps.clear();
  }
}

const powerUpManager = new PowerUpManager();

// Fonctions utilitaires
function checkAnswer(questionType, userAnswer, questionData) {
  switch (questionType) {
    case 'MULTIPLE_CHOICE':
      return userAnswer === questionData.correctAnswer;
    case 'TRUE_FALSE':
      return userAnswer === questionData.answer;
    case 'TEXT_INPUT':
      return userAnswer?.toLowerCase().trim() === questionData.answer?.toLowerCase().trim();
    case 'ORDERING':
      return JSON.stringify(userAnswer) === JSON.stringify(questionData.correctOrder);
    case 'SLIDER':
      const target = questionData.answer;
      const tolerance = questionData.tolerance || 10;
      return Math.abs(userAnswer - target) <= tolerance;
    case 'MATCHING':
      return JSON.stringify(userAnswer) === JSON.stringify(questionData.correctMatches);
    default:
      return false;
  }
}

async function calculateScores(room) {
  const results = [];

  for (const [playerId, player] of room.players) {
    const playerAnswer = room.answers.get(playerId);
    let isCorrect = false;
    let pointsEarned = 0;

    if (playerAnswer && room.currentQuestion) {
      isCorrect = checkAnswer(
        room.currentQuestion.type,
        playerAnswer.answer,
        room.currentQuestion.data
      );

      if (isCorrect) {
        const timeBonus = Math.max(0,
          (room.currentQuestion.timeLimit * 1000 - playerAnswer.timeSpent) / 1000
        );
        pointsEarned = Math.floor(
          room.currentQuestion.points + (timeBonus * 10)
        );

        pointsEarned = powerUpManager.applyScoreModifiers(
          pointsEarned,
          playerId
        );

        player.score += pointsEarned;
      }
    }

    results.push({
      playerId,
      username: player.username,
      answer: playerAnswer?.answer,
      isCorrect,
      pointsEarned,
      totalScore: player.score,
      timeSpent: playerAnswer?.timeSpent || room.currentQuestion.timeLimit * 1000
    });

    // Sauvegarder en DB (simplified for demo)
    if (playerAnswer && room.currentQuestion) {
      try {
        // Find the game player record
        const gamePlayer = await prisma.gamePlayer.findFirst({
          where: {
            gameId: room.id,
            userId: playerId
          }
        });

        if (gamePlayer) {
          // Find or create game question
          const gameQuestion = await prisma.gameQuestion.findFirst({
            where: {
              gameId: room.id,
              questionId: room.currentQuestion.id
            }
          });

          if (gameQuestion) {
            await prisma.playerAnswer.create({
              data: {
                gamePlayerId: gamePlayer.id,
                gameQuestionId: gameQuestion.id,
                answer: playerAnswer.answer,
                isCorrect,
                pointsEarned,
                timeSpent: Math.floor(playerAnswer.timeSpent / 1000),
              }
            });

            // Update player score
            await prisma.gamePlayer.update({
              where: { id: gamePlayer.id },
              data: { score: player.score }
            });
          }
        }
      } catch (error) {
        console.error('Error saving answer to DB:', error);
      }
    }
  }

  return results;
}

async function startQuestion(room, io) {
  if (room.currentQuestionIndex >= room.questions.length) {
    await endGame(room, io);
    return;
  }

  const question = room.questions[room.currentQuestionIndex];
  room.currentQuestion = question;
  room.questionStartTime = Date.now();
  room.answers.clear();

  // Nettoyer les power-ups de la question précédente
  if (room.usedPowerUps) {
    room.usedPowerUps.clear();
  } else {
    room.usedPowerUps = new Set();
  }

  // Clear any existing timer
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
  }

  console.log(`Starting question ${room.currentQuestionIndex + 1}/${room.questions.length} for game ${room.roomCode}`);

  io.to(room.roomCode).emit('new-question', {
    question: {
      id: question.id,
      type: question.type,
      question: question.question,
      data: question.data,
      timeLimit: question.timeLimit
    },
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length
  });

  // Set a timer for automatic progression
  room.questionTimer = setTimeout(async () => {
    if (room.status === 'IN_PROGRESS' && room.currentQuestion?.id === question.id) {
      console.log(`Timer expired for question ${question.id}, processing answers...`);
      await processAnswersAndNextQuestion(room, io);
    }
  }, (question.timeLimit + 2) * 1000);
}

async function processAnswersAndNextQuestion(room, io) {
  if (!room.currentQuestion) return;

  // Clear the timer to prevent duplicate execution
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  // Prevent multiple executions for the same question
  const currentQuestionId = room.currentQuestion.id;
  if (room.processingQuestion === currentQuestionId) {
    console.log(`Already processing question ${currentQuestionId}, skipping...`);
    return;
  }
  room.processingQuestion = currentQuestionId;

  console.log(`Processing answers for question ${currentQuestionId}. Answers: ${room.answers.size}/${room.players.size}`);

  const results = await calculateScores(room);

  io.to(room.roomCode).emit('question-results', {
    results,
    correctAnswer: room.currentQuestion.data.correctAnswer || room.currentQuestion.data.answer,
    explanation: room.currentQuestion.data.explanation,
    players: Array.from(room.players.values())
  });

  // Clear the current question to prevent further processing
  room.currentQuestion = null;

  setTimeout(async () => {
    if (room.status === 'IN_PROGRESS') {
      room.currentQuestionIndex++;
      room.processingQuestion = null; // Reset processing flag
      await startQuestion(room, io);
    }
  }, 5000);
}

async function endGame(room, io) {
  room.status = 'FINISHED';

  const finalResults = Array.from(room.players.values())
    .sort((a, b) => b.score - a.score);

  // Update positions in DB
  for (let i = 0; i < finalResults.length; i++) {
    await prisma.gamePlayer.updateMany({
      where: {
        gameId: room.id,
        userId: finalResults[i].userId
      },
      data: {
        score: finalResults[i].score,
        position: i + 1
      }
    });
  }

  await prisma.game.update({
    where: { id: room.id },
    data: {
      status: 'FINISHED',
      endedAt: new Date()
    }
  });

  io.to(room.roomCode).emit('game-ended', {
    finalResults,
    winner: finalResults[0]
  });

  powerUpManager.clearAllEffects();
  console.log(`Game ${room.roomCode} ended`);
}

console.log('Preparing Next.js app...');
app.prepare().then(() => {
  console.log('Next.js app prepared successfully!');
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handler(req, res, parsedUrl);
    } catch (error) {
      console.error('Handler error:', error.message);
      // Return a simple error response instead of crashing
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
      }
    }
  });

  // Configuration CORS sécurisée
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002'
      ];

  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? allowedOrigins : allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
      optionsSuccessStatus: 200
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowEIO3: true
  });

  // Middleware d'authentification sécurisé avec rate limiting
  const authAttempts = new Map();

  io.use(async (socket, next) => {
    const clientIP = socket.handshake.address;
    const now = Date.now();

    try {
      // Rate limiting basique par IP
      const attempts = authAttempts.get(clientIP) || { count: 0, resetTime: now + 60000 };

      if (attempts.count > 10 && now < attempts.resetTime) {
        return next(new Error('Too many authentication attempts'));
      }

      if (now > attempts.resetTime) {
        attempts.count = 0;
        attempts.resetTime = now + 60000;
      }

      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== 'string') {
        attempts.count++;
        authAttempts.set(clientIP, attempts);
        return next(new Error('Authentication failed: No valid token'));
      }

      // Verification JWT sécurisée
      const JWT_SECRET = process.env.JWT_SECRET || (dev ? 'dev-secret-not-for-production-use-only' : null);

      if (!JWT_SECRET) {
        console.error('JWT_SECRET not configured');
        return next(new Error('Server configuration error'));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (jwtError) {
        attempts.count++;
        authAttempts.set(clientIP, attempts);

        if (jwtError.name === 'TokenExpiredError') {
          return next(new Error('Token expired'));
        } else if (jwtError.name === 'JsonWebTokenError') {
          return next(new Error('Invalid token'));
        }
        return next(new Error('Authentication failed'));
      }

      if (!decoded || !decoded.userId || typeof decoded.userId !== 'string') {
        attempts.count++;
        authAttempts.set(clientIP, attempts);
        return next(new Error('Authentication failed: Invalid token payload'));
      }

      // Vérification utilisateur en base avec timeout
      const userPromise = prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, avatar: true, createdAt: true }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database timeout')), 5000);
      });

      const user = await Promise.race([userPromise, timeoutPromise]);

      if (!user) {
        attempts.count++;
        authAttempts.set(clientIP, attempts);
        return next(new Error('User not found'));
      }

      // Vérification de sécurité supplémentaire
      if (!user.username || user.username.trim().length === 0) {
        return next(new Error('Invalid user data'));
      }

      // Réinitialiser le compteur en cas de succès
      if (authAttempts.has(clientIP)) {
        authAttempts.delete(clientIP);
      }

      socket.userId = user.id;
      socket.user = {
        id: user.id,
        username: user.username,
        avatar: user.avatar || '🎭',
        joinedAt: user.createdAt
      };

      console.log(`✅ User ${user.username} (${user.id}) authenticated successfully`);
      next();

    } catch (error) {
      attempts.count++;
      authAttempts.set(clientIP, attempts);
      console.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Nettoyage périodique des tentatives d'authentification
  setInterval(() => {
    const now = Date.now();
    for (const [ip, attempts] of authAttempts.entries()) {
      if (now > attempts.resetTime) {
        authAttempts.delete(ip);
      }
    }
  }, 300000); // Nettoyage toutes les 5 minutes

  // Gestion des connexions Socket.io
  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected:`, socket.id);

    // Rejoindre une partie
    socket.on('join-game', async (data) => {
      try {
        const { roomCode } = data;
        const user = socket.user;

        const game = await prisma.game.findUnique({
          where: { roomCode },
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, username: true, avatar: true }
                }
              }
            }
          }
        });

        if (!game) {
          socket.emit('error', { message: 'Partie non trouvée' });
          return;
        }

        if (game.status === 'FINISHED') {
          socket.emit('error', { message: 'Cette partie est terminée' });
          return;
        }

        // Créer ou récupérer la room en mémoire
        let room = gameRooms.get(game.id);
        if (!room) {
          room = {
            id: game.id,
            roomCode: game.roomCode,
            hostId: game.hostId,
            players: new Map(),
            currentQuestion: null,
            currentQuestionIndex: game.currentQuestionIndex || 0,
            questions: [],
            status: game.status,
            settings: game.settings,
            answers: new Map(),
            lastActivity: Date.now() // Horodatage d'activité
          };
          gameRooms.set(game.id, room);

          // Charger les questions
          const gameQuestions = await prisma.gameQuestion.findMany({
            where: { gameId: game.id },
            include: { question: true },
            orderBy: { order: 'asc' }
          });
          room.questions = gameQuestions.map(gq => gq.question);
        }

        const isHost = user.id === game.hostId;
        const playerExists = game.players.some(p => p.userId === user.id);

        if (!playerExists && game.status !== 'WAITING') {
          socket.emit('error', { message: 'Impossible de rejoindre une partie en cours' });
          return;
        }

        const existingPlayer = room.players.get(user.id);

        room.players.set(user.id, {
          id: user.id,
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          score: existingPlayer?.score || game.players.find(p => p.userId === user.id)?.score || 0,
          isHost,
          isReady: existingPlayer?.isReady || false,
          socketId: socket.id,
          isConnected: true
        });

        // Si le joueur était déconnecté, notifier la reconnexion
        if (existingPlayer && !existingPlayer.isConnected) {
          console.log(`${user.username} reconnected to game ${roomCode}`);
          socket.to(roomCode).emit('player-reconnected', {
            playerId: user.id,
            username: user.username
          });
        }

        socket.join(roomCode);

        const playersArray = Array.from(room.players.values());
        io.to(roomCode).emit('game-state', {
          gameId: room.id,
          roomCode: room.roomCode,
          hostId: room.hostId,
          players: playersArray,
          status: room.status,
          settings: room.settings,
          currentQuestionIndex: room.currentQuestionIndex,
          totalQuestions: room.questions.length
        });

        socket.emit('joined-game', {
          gameId: room.id,
          isHost,
          player: room.players.get(user.id)
        });

        console.log(`${user.username} joined game ${roomCode} as ${isHost ? 'HOST' : 'PLAYER'}`);

        // Mettre à jour l'activité de la room
        updateRoomActivity(room);

      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { message: 'Erreur lors de la connexion à la partie' });
      }
    });

    // Quitter une partie
    socket.on('leave-game', (data) => {
      const { roomCode } = data;
      const user = socket.user;

      socket.leave(roomCode);

      const room = Array.from(gameRooms.values()).find(r => r.roomCode === roomCode);
      if (room) {
        room.players.delete(user.id);

        const playersArray = Array.from(room.players.values());
        socket.to(roomCode).emit('player-left', {
          playerId: user.id,
          players: playersArray
        });

        console.log(`${user.username} left game ${roomCode}`);

        // Mettre à jour l'activité de la room
        updateRoomActivity(room);
      }
    });

    // Marquer comme prêt
    socket.on('player-ready', (data) => {
      const { roomCode } = data;
      const user = socket.user;

      const room = Array.from(gameRooms.values()).find(r => r.roomCode === roomCode);
      if (room) {
        const player = room.players.get(user.id);
        if (player) {
          player.isReady = true;

          const playersArray = Array.from(room.players.values());
          io.to(roomCode).emit('game-state', {
            gameId: room.id,
            roomCode: room.roomCode,
            hostId: room.hostId,
            players: playersArray,
            status: room.status,
            settings: room.settings
          });

          // Mettre à jour l'activité de la room
          updateRoomActivity(room);
        }
      }
    });

    // Démarrer la partie (HOST seulement)
    socket.on('start-game', async (data) => {
      try {
        const { roomCode } = data;
        const user = socket.user;

        const room = Array.from(gameRooms.values()).find(r => r.roomCode === roomCode);
        if (!room || room.hostId !== user.id) {
          socket.emit('error', { message: 'Seul l\'hôte peut démarrer la partie' });
          return;
        }

        const playersArray = Array.from(room.players.values());
        const allReady = playersArray.every(p => p.isReady || p.isHost);

        if (!allReady) {
          socket.emit('error', { message: 'Tous les joueurs doivent être prêts' });
          return;
        }

        await prisma.game.update({
          where: { id: room.id },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date()
          }
        });

        room.status = 'IN_PROGRESS';
        room.currentQuestionIndex = 0;

        await startQuestion(room, io);

      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Erreur lors du démarrage de la partie' });
      }
    });

    // Répondre à une question
    socket.on('submit-answer', async (data) => {
      try {
        const { roomCode, questionId, answer, timeSpent } = data;
        const user = socket.user;

        const room = Array.from(gameRooms.values()).find(r => r.roomCode === roomCode);
        if (!room || room.status !== 'IN_PROGRESS') return;

        const player = room.players.get(user.id);
        if (!player) return;

        // Vérifier que c'est bien la question actuelle
        if (!room.currentQuestion || room.currentQuestion.id !== questionId) {
          console.log(`Answer ignored: wrong question. Expected ${room.currentQuestion?.id}, got ${questionId}`);
          return;
        }

        // Protection contre les réponses multiples
        const existingAnswer = room.answers.get(user.id);
        if (existingAnswer) {
          console.log(`Duplicate answer ignored from ${user.username}`);
          return;
        }

        room.answers.set(user.id, {
          questionId,
          answer,
          timeSpent,
          timestamp: Date.now()
        });

        socket.to(roomCode).emit('player-answered', {
          playerId: user.id,
          username: player.username
        });

        console.log(`${user.username} answered question ${questionId}. Answers: ${room.answers.size}/${room.players.size}`);

        // Si tous les joueurs ont répondu, passer à la question suivante
        if (room.answers.size === room.players.size) {
          await processAnswersAndNextQuestion(room, io);
        }

      } catch (error) {
        console.error('Error submitting answer:', error);
      }
    });

    // Utiliser un power-up
    socket.on('use-powerup', async (data) => {
      try {
        const { roomCode, powerUpId, powerUpType } = data;
        const user = socket.user;

        const room = Array.from(gameRooms.values()).find(r => r.roomCode === roomCode);
        if (!room || !room.currentQuestion || room.status !== 'IN_PROGRESS') return;

        // Vérifier que le joueur n'a pas déjà répondu
        if (room.answers.has(user.id)) {
          socket.emit('error', { message: 'Impossible d\'utiliser un power-up après avoir répondu' });
          return;
        }

        // Vérifier que le power-up n'a pas déjà été utilisé pour cette question
        const powerUpKey = `${user.id}-${room.currentQuestion.id}-${powerUpType}`;
        if (room.usedPowerUps && room.usedPowerUps.has(powerUpKey)) {
          socket.emit('error', { message: 'Power-up déjà utilisé pour cette question' });
          return;
        }

        // Initialiser le Set si nécessaire
        if (!room.usedPowerUps) {
          room.usedPowerUps = new Set();
        }
        room.usedPowerUps.add(powerUpKey);

        const modifiedQuestion = powerUpManager.applyPowerUpEffect(
          room.currentQuestion.data,
          powerUpType,
          user.id
        );

        socket.emit('powerup-applied', {
          powerUpType,
          modifiedQuestion,
          currentQuestion: {
            ...room.currentQuestion,
            data: modifiedQuestion
          }
        });

        socket.to(roomCode).emit('player-used-powerup', {
          playerId: user.id,
          username: socket.user.username,
          powerUpType
        });

        console.log(`${user.username} used power-up: ${powerUpType}`);

      } catch (error) {
        console.error('Error using powerup:', error);
      }
    });

    // Chat en jeu
    socket.on('send-message', (data) => {
      const { roomCode, message, type = 'PREDEFINED' } = data;
      const user = socket.user;

      io.to(roomCode).emit('chat-message', {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        message,
        type,
        timestamp: Date.now()
      });
    });

    // Déconnexion
    socket.on('disconnect', (reason) => {
      const user = socket.user;
      console.log(`User ${user?.username} disconnected:`, socket.id, 'Reason:', reason);

      for (const room of gameRooms.values()) {
        const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
        if (player) {
          // Ne supprimer le joueur que si c'est une déconnexion volontaire ou définitive
          if (reason === 'client namespace disconnect' || reason === 'transport close') {
            console.log(`${player.username} left game ${room.roomCode} permanently`);

            room.players.delete(player.userId);

            const playersArray = Array.from(room.players.values());
            socket.to(room.roomCode).emit('player-left', {
              playerId: player.userId,
              players: playersArray
            });

            // Si l'host part et qu'il y a encore des joueurs, transférer l'host
            if (player.userId === room.hostId && playersArray.length > 0) {
              const newHost = playersArray[0];
              room.hostId = newHost.userId;
              newHost.isHost = true;

              console.log(`Host transferred to ${newHost.username} in game ${room.roomCode}`);

              io.to(room.roomCode).emit('host-transferred', {
                newHostId: newHost.userId,
                newHostName: newHost.username
              });

              // Mettre à jour en DB
              prisma.game.update({
                where: { id: room.id },
                data: { hostId: newHost.userId }
              }).catch(err => console.error('Failed to update host in DB:', err));
            }

            // Si plus de joueurs, marquer la partie comme terminée
            if (playersArray.length === 0) {
              room.status = 'FINISHED';
              console.log(`Game ${room.roomCode} ended - no players left`);

              // Nettoyer la room
              if (room.questionTimer) {
                clearTimeout(room.questionTimer);
              }

              // Mettre à jour en DB
              prisma.game.update({
                where: { id: room.id },
                data: {
                  status: 'FINISHED',
                  endedAt: new Date()
                }
              }).catch(err => console.error('Failed to end game in DB:', err));
            }
          } else {
            // Déconnexion temporaire - marquer comme déconnecté mais garder dans la partie
            player.isConnected = false;
            player.socketId = null;

            console.log(`${player.username} temporarily disconnected from game ${room.roomCode}`);

            socket.to(room.roomCode).emit('player-disconnected', {
              playerId: player.userId,
              username: player.username
            });
          }
        }
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.io server initialized');
  });
});

// Nettoyage lors de l'arrêt du serveur
async function gracefulShutdown(signal) {
  console.log(`${signal} received`);

  // Arrêter le nettoyage automatique
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  // Nettoyer toutes les rooms actives
  console.log(`🧹 Cleaning up ${gameRooms.size} active rooms before shutdown...`);
  gameRooms.clear();

  // Fermer la connexion Prisma
  await prisma.$disconnect();

  console.log('✅ Graceful shutdown completed');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);