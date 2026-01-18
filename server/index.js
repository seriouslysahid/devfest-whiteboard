require('dotenv').config();
const connectDB = require('./config/db');
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const aiRoutes = require('./routes/ai');
const { saveRoom, deleteRoom, loadRooms } = require('./services/persistence');
const {
  createGameSession,
  getGameSession,
  deleteGameSession,
  getWordChoices,
  generateHint,
  calculatePoints,
  checkGuess,
  nextDrawer
} = require('./services/game');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/ai', aiRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const rooms = new Map();
const gameTimers = new Map();
const roomCleanupTimers = new Map();

const ROOM_CLEANUP_DELAY = 5 * 60 * 1000;

// Load rooms from persistence on startup
(async () => {
  try {
    await connectDB();
    console.log('[STARTUP] Loading rooms from storage...');
    const persistedRooms = await loadRooms();
    for (const [roomId, room] of persistedRooms) {
      // Reset users on server restart as sockets are disconnected
      room.users = new Map(); 
      rooms.set(roomId, room);
    }
    console.log(`[STARTUP] Loaded ${rooms.size} rooms from storage`);
    console.log(`[STARTUP] Active rooms: ${Array.from(rooms.keys()).join(', ')}`);
  } catch (error) {
    console.error('[STARTUP] Failed to load rooms:', error);
  }
})();

app.get('/api/rooms', (req, res) => {
  const roomList = [];
  for (const [roomId, room] of rooms) {
    roomList.push({
      roomId,
      userCount: room.users.size,
      hasPassword: room.hasPassword,
      createdAt: room.createdAt
    });
  }
  res.json({ rooms: roomList, count: roomList.length });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const roomId = req.params.roomId.toUpperCase().trim();
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ 
      error: 'Room not found',
      message: `Room "${roomId}" does not exist. Make sure to CREATE a room first, then share the Room ID.`,
      availableRooms: Array.from(rooms.keys())
    });
  }
  
  res.json({
    roomId,
    userCount: room.users.size,
    hasPassword: room.hasPassword,
    users: Array.from(room.users.values()).map(u => ({ name: u.name, role: u.role }))
  });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', async ({ userName, password }) => {
    const roomId = uuidv4().substring(0, 8).toUpperCase();
    const userId = uuidv4();
    
    const room = {
      roomId,
      hostId: userId,
      password: password || null,
      hasPassword: !!password,
      users: new Map(),
      operations: [],
      createdAt: Date.now()
    };
    
    room.users.set(socket.id, {
      id: userId,
      name: userName,
      role: 'host',
      color: getRandomColor()
    });

    rooms.set(roomId, room);
    
    try {
      await saveRoom(roomId, room);
    } catch (e) {
      console.log('Failed to save room:', e.message);
    }

    socket.join(roomId);
    socket.emit('room-created', { 
      roomId, 
      userId, 
      role: 'host',
      hasPassword: room.hasPassword
    });
    
    console.log(`[CREATE] Room ${roomId} created by "${userName}"${password ? ' (password protected)' : ''}`);
    console.log(`[ROOMS] Active rooms: ${Array.from(rooms.keys()).join(', ') || 'none'}`);
  });

  socket.on('check-room', ({ roomId }) => {
    const normalizedRoomId = (roomId || '').toUpperCase().trim();
    console.log(`[CHECK] Checking room: "${normalizedRoomId}"`);
    console.log(`[ROOMS] Active rooms: ${Array.from(rooms.keys()).join(', ') || 'none'}`);
    
    const room = rooms.get(normalizedRoomId);
    
    if (!room) {
      console.log(`[CHECK] Room "${normalizedRoomId}" NOT FOUND`);
      socket.emit('room-check-result', { 
        exists: false, 
        roomId: normalizedRoomId,
        message: 'Room not found. Make sure someone created the room first.'
      });
      return;
    }
    
    console.log(`[CHECK] Room "${normalizedRoomId}" found with ${room.users.size} users`);
    socket.emit('room-check-result', { 
      exists: true, 
      roomId: normalizedRoomId,
      hasPassword: room.hasPassword,
      userCount: room.users.size
    });
  });

  socket.on('join-room', ({ roomId, userName, password, userId: providedUserId }) => {
    const normalizedRoomId = (roomId || '').toUpperCase().trim();
    console.log(`[JOIN] User "${userName}" (ID: ${providedUserId || 'new'}) trying to join room: "${normalizedRoomId}"`);
    console.log(`[ROOMS] Active rooms: ${Array.from(rooms.keys()).join(', ') || 'none'}`);
    
    const room = rooms.get(normalizedRoomId);

    if (!room) {
      console.log(`[JOIN] FAILED - Room "${normalizedRoomId}" not found`);
      socket.emit('error', { 
        message: `Room "${normalizedRoomId}" not found. Please ask the host to create a room first, then share the Room ID with you.`,
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    if (room.hasPassword && room.password !== password) {
      console.log(`[JOIN] FAILED - Wrong password for room "${normalizedRoomId}"`);
      socket.emit('error', { 
        message: 'Incorrect password. Please try again.',
        code: 'INVALID_PASSWORD'
      });
      return;
    }

    cancelRoomCleanup(normalizedRoomId);

    let userId = providedUserId;
    let role = 'participant';
    let userColor = getRandomColor();

    if (room.users.has(socket.id)) {
      const existingUser = room.users.get(socket.id);
      userId = existingUser.id;
      role = existingUser.role;
      userColor = existingUser.color;
    } else {
      if (!userId) {
        userId = uuidv4();
      }

      if (userId === room.hostId) {
        role = 'host';
      } else if (room.users.size === 0) {
        role = 'host';
        room.hostId = userId;
      }
    }

    room.users.set(socket.id, {
      id: userId,
      name: userName,
      role,
      color: userColor
    });

    socket.join(normalizedRoomId);

    socket.emit('room-joined', {
      roomId: normalizedRoomId,
      userId,
      role,
      operations: room.operations,
      users: Array.from(room.users.values())
    });

    socket.to(normalizedRoomId).emit('user-joined', {
      id: userId,
      name: userName,
      role,
      color: userColor
    });

    console.log(`[JOIN] SUCCESS - "${userName}" joined room "${normalizedRoomId}" as ${role} (${room.users.size} users now)`);
  });

  socket.on('draw-operation', ({ roomId, operation }) => {
    const room = rooms.get(roomId);
    if (room) {
      const op = { ...operation, id: operation.id || uuidv4(), timestamp: Date.now() };
      room.operations.push(op);
      socket.to(roomId).emit('draw-operation', op);
    }
  });

  socket.on('modify-operation', ({ roomId, operation }) => {
    const room = rooms.get(roomId);
    if (room) {
      const index = room.operations.findIndex(op => op.id === operation.id);
      if (index !== -1) {
        // Merge updates
        room.operations[index] = { ...room.operations[index], ...operation };
        socket.to(roomId).emit('operation-modified', { operation });
      }
    }
  });

  socket.on('clear-canvas', async ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.operations = [];
      io.in(roomId).emit('clear-canvas');
      
      try {
        await saveRoom(roomId, room);
      } catch {
      }
    }
  });

  socket.on('undo', ({ roomId, operationId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.operations = room.operations.filter(op => op.id !== operationId);
      socket.to(roomId).emit('operation-undone', { operationId });
    }
  });

  socket.on('redo', ({ roomId, operation }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.operations.push(operation);
      socket.to(roomId).emit('operation-redone', { operation });
    }
  });

  socket.on('cursor-move', ({ roomId, userId, userName, x, y }) => {
    socket.to(roomId).emit('cursor-move', { userId, userName, x, y });
  });

  socket.on('start-game', async ({ roomId, config }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const players = Array.from(room.users.values());
    if (players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start the game' });
      return;
    }

    const session = createGameSession(roomId, players, config);
    session.phase = 'choosing';
    
    const firstDrawer = players[0];
    session.currentDrawer = firstDrawer.id;
    session.currentRound = 1;
    
    const wordChoices = await getWordChoices(config.wordCount || 3, config.customWords || []);
    session.wordChoices = wordChoices;

    io.in(roomId).emit('game-started', { session });
    
    const drawerSocket = findSocketByUserId(roomId, firstDrawer.id);
    if (drawerSocket) {
      io.to(drawerSocket).emit('word-choices', { words: wordChoices });
    }
  });

  socket.on('select-word', ({ roomId, word }) => {
    const session = getGameSession(roomId);
    if (!session) return;

    session.currentWord = word;
    session.wordHint = generateHint(word, 0);
    session.phase = 'drawing';
    session.timeRemaining = session.config.drawTime || 80;

    io.in(roomId).emit('round-started', {
      drawer: session.currentDrawer,
      wordHint: session.wordHint,
      timeRemaining: session.timeRemaining
    });

    startRoundTimer(roomId, session);
  });

  socket.on('guess-word', ({ roomId, guess }) => {
    const session = getGameSession(roomId);
    const room = rooms.get(roomId);
    if (!session || !room || session.phase !== 'drawing') return;

    const user = room.users.get(socket.id);
    if (!user) return;

    const player = session.players.find(p => p.id === user.id);
    if (!player || player.hasGuessed || player.isDrawing) return;

    const result = checkGuess(guess, session.currentWord);

    if (result === 'correct') {
      player.hasGuessed = true;
      const points = calculatePoints(session.timeRemaining, session.config.drawTime);
      player.score += points;

      io.in(roomId).emit('player-guessed', { userId: user.id, userName: user.name });

      const allGuessed = session.players.filter(p => !p.isDrawing).every(p => p.hasGuessed);
      if (allGuessed) {
        endRound(roomId);
      }
    } else if (result === 'close') {
      socket.emit('chat-message', {
        id: uuidv4(),
        userId: 'system',
        userName: 'System',
        message: `"${guess}" is close!`,
        timestamp: Date.now(),
        type: 'close-guess'
      });
    } else {
      io.in(roomId).emit('chat-message', {
        id: uuidv4(),
        userId: user.id,
        userName: user.name,
        message: guess,
        timestamp: Date.now(),
        type: 'chat'
      });
    }
  });

  socket.on('send-chat', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user) return;

    io.in(roomId).emit('chat-message', {
      id: uuidv4(),
      userId: user.id,
      userName: user.name,
      message,
      timestamp: Date.now(),
      type: 'chat'
    });
  });

  socket.on('end-game', ({ roomId }) => {
    endGame(roomId);
  });

  socket.on('disconnect', async () => {
    console.log(`[DISCONNECT] User ${socket.id} disconnected`);
    
    for (const [roomId, room] of rooms) {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        
        console.log(`[LEAVE] "${user.name}" left room "${roomId}" (${room.users.size} users remaining)`);
        
        io.in(roomId).emit('user-left', { userId: user.id });
        
        if (room.users.size === 0) {
          scheduleRoomCleanup(roomId, room);
        }
      }
    }
  });
});

function findSocketByUserId(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  for (const [socketId, user] of room.users) {
    if (user.id === userId) return socketId;
  }
  return null;
}

function startRoundTimer(roomId, session) {
  clearGameTimer(roomId);
  
  let hintsGiven = 0;
  const hintIntervals = [
    Math.floor(session.config.drawTime * 0.6),
    Math.floor(session.config.drawTime * 0.3)
  ];

  const timer = setInterval(() => {
    session.timeRemaining--;
    
    io.in(roomId).emit('time-update', { timeRemaining: session.timeRemaining });

    if (hintIntervals.includes(session.timeRemaining) && hintsGiven < (session.config.hints || 2)) {
      hintsGiven++;
      session.wordHint = generateHint(session.currentWord, hintsGiven);
      io.in(roomId).emit('hint-update', { hint: session.wordHint });
    }

    if (session.timeRemaining <= 0) {
      endRound(roomId);
    }
  }, 1000);

  gameTimers.set(roomId, timer);
}

function clearGameTimer(roomId) {
  const timer = gameTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    gameTimers.delete(roomId);
  }
}

function scheduleRoomCleanup(roomId, room) {
  cancelRoomCleanup(roomId);
  
  console.log(`[CLEANUP] Room "${roomId}" is empty. Scheduling deletion in 5 minutes...`);
  
  const timer = setTimeout(async () => {
    const currentRoom = rooms.get(roomId);
    if (currentRoom && currentRoom.users.size === 0) {
      console.log(`[DELETE] Room "${roomId}" deleted after 5-minute timeout`);
      rooms.delete(roomId);
      deleteGameSession(roomId);
      clearGameTimer(roomId);
      roomCleanupTimers.delete(roomId);
      
      try {
        await deleteRoom(roomId);
      } catch (e) {
        console.log(`[DELETE] Failed to delete room from persistence: ${e.message}`);
      }
    }
  }, ROOM_CLEANUP_DELAY);
  
  roomCleanupTimers.set(roomId, timer);
}

function cancelRoomCleanup(roomId) {
  const timer = roomCleanupTimers.get(roomId);
  if (timer) {
    console.log(`[CLEANUP] Cancelled cleanup timer for room "${roomId}" - user rejoined`);
    clearTimeout(timer);
    roomCleanupTimers.delete(roomId);
  }
}

async function endRound(roomId) {
  clearGameTimer(roomId);
  
  const session = getGameSession(roomId);
  if (!session) return;

  session.phase = 'reveal';

  const drawer = session.players.find(p => p.isDrawing);
  if (drawer) {
    const guessers = session.players.filter(p => p.hasGuessed);
    if (guessers.length > 0) {
      drawer.score += calculatePoints(0, 0, true);
    }
  }

  const result = {
    drawerId: session.currentDrawer,
    word: session.currentWord,
    guessers: session.players
      .filter(p => p.hasGuessed)
      .map(p => ({
        userId: p.id,
        userName: p.name,
        timeToGuess: 0,
        pointsEarned: 0
      })),
    drawerPoints: drawer ? 50 : 0
  };

  session.roundResults.push(result);
  io.in(roomId).emit('round-ended', { result });

  setTimeout(async () => {
    const room = rooms.get(roomId);
    if (room) {
      room.operations = [];
      io.in(roomId).emit('clear-canvas');
    }

    if (session.currentRound >= session.totalRounds && 
        session.players.findIndex(p => p.id === session.currentDrawer) === session.players.length - 1) {
      endGame(roomId);
      return;
    }

    nextDrawer(session);
    session.phase = 'choosing';
    
    const wordChoices = await getWordChoices(session.config.wordCount || 3, session.config.customWords || []);
    session.wordChoices = wordChoices;

    const drawerSocket = findSocketByUserId(roomId, session.currentDrawer);
    if (drawerSocket) {
      io.to(drawerSocket).emit('word-choices', { words: wordChoices });
    }

    io.in(roomId).emit('game-started', { session });
  }, 5000);
}

function endGame(roomId) {
  clearGameTimer(roomId);
  
  const session = getGameSession(roomId);
  if (!session) return;

  session.phase = 'ended';

  const finalScores = session.players
    .map(p => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);

  io.in(roomId).emit('game-ended', { finalScores });
  deleteGameSession(roomId);
}

function getRandomColor() {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET /api/rooms - List all active rooms`);
  console.log(`  GET /api/rooms/:roomId - Check if room exists`);
});
