const { v4: uuidv4 } = require('uuid');
const { generateGameWords } = require('./gemini');

const DEFAULT_WORDS = [
  'cat', 'dog', 'elephant', 'giraffe', 'lion', 'penguin', 'butterfly', 'dolphin',
  'chair', 'table', 'computer', 'phone', 'book', 'lamp', 'clock', 'umbrella',
  'pizza', 'burger', 'ice cream', 'cake', 'banana', 'apple', 'sushi', 'taco',
  'beach', 'mountain', 'castle', 'bridge', 'lighthouse', 'volcano', 'waterfall',
  'running', 'dancing', 'sleeping', 'swimming', 'flying', 'cooking', 'reading',
  'rainbow', 'sun', 'moon', 'star', 'cloud', 'lightning', 'snowflake', 'fire'
];

const games = new Map();

function createGameSession(roomId, players, config) {
  const session = {
    id: uuidv4(),
    roomId,
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      score: 0,
      isDrawing: false,
      hasGuessed: false
    })),
    currentRound: 0,
    totalRounds: config.rounds || 3,
    currentDrawer: null,
    currentWord: null,
    wordHint: '',
    timeRemaining: config.drawTime || 80,
    phase: 'lobby',
    wordChoices: [],
    chat: [],
    roundResults: [],
    config
  };
  
  games.set(roomId, session);
  return session;
}

function getGameSession(roomId) {
  return games.get(roomId);
}

function deleteGameSession(roomId) {
  games.delete(roomId);
}

async function getWordChoices(count = 3, customWords = []) {
  let words = [...DEFAULT_WORDS];
  
  if (customWords.length > 0) {
    words = [...words, ...customWords];
  }
  
  try {
    const aiWords = await generateGameWords('random', 10);
    if (aiWords.words && aiWords.words.length > 0) {
      words = [...words, ...aiWords.words];
    }
  } catch {
  }
  
  const shuffled = words.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateHint(word, revealCount) {
  const chars = word.split('');
  const hint = chars.map(c => c === ' ' ? ' ' : '_');
  
  if (revealCount > 0) {
    const indices = [];
    chars.forEach((c, i) => {
      if (c !== ' ') indices.push(i);
    });
    
    const shuffledIndices = indices.sort(() => Math.random() - 0.5);
    const toReveal = shuffledIndices.slice(0, Math.min(revealCount, indices.length));
    
    toReveal.forEach(i => {
      hint[i] = chars[i];
    });
  }
  
  return hint.join(' ');
}

function calculatePoints(timeRemaining, totalTime, isDrawer = false) {
  if (isDrawer) {
    return 50;
  }
  
  const timeRatio = timeRemaining / totalTime;
  return Math.floor(100 + timeRatio * 150);
}

function checkGuess(guess, word) {
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedWord = word.toLowerCase().trim();
  
  if (normalizedGuess === normalizedWord) {
    return 'correct';
  }
  
  const distance = levenshteinDistance(normalizedGuess, normalizedWord);
  if (distance <= 2 && normalizedWord.length > 3) {
    return 'close';
  }
  
  return 'wrong';
}

function levenshteinDistance(a, b) {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function nextDrawer(session) {
  const currentIndex = session.players.findIndex(p => p.id === session.currentDrawer);
  const nextIndex = (currentIndex + 1) % session.players.length;
  
  if (nextIndex === 0) {
    session.currentRound++;
  }
  
  session.currentDrawer = session.players[nextIndex].id;
  session.players.forEach(p => {
    p.isDrawing = p.id === session.currentDrawer;
    p.hasGuessed = false;
  });
  
  return session.currentDrawer;
}

module.exports = {
  createGameSession,
  getGameSession,
  deleteGameSession,
  getWordChoices,
  generateHint,
  calculatePoints,
  checkGuess,
  nextDrawer,
  DEFAULT_WORDS
};
