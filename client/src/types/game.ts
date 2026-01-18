export interface GamePlayer {
  id: string;
  name: string;
  score: number;
  isDrawing: boolean;
  hasGuessed: boolean;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'correct-guess' | 'close-guess';
}

export interface RoundResult {
  drawerId: string;
  word: string;
  guessers: Array<{
    userId: string;
    userName: string;
    timeToGuess: number;
    pointsEarned: number;
  }>;
  drawerPoints: number;
}

export interface GameConfig {
  rounds: number;
  drawTime: number;
  wordCount: number;
  customWords: string[];
  useCustomWordsOnly: boolean;
  hints: number;
}

export interface GameSession {
  id: string;
  roomId: string;
  players: GamePlayer[];
  currentRound: number;
  totalRounds: number;
  currentDrawer: string;
  currentWord: string;
  wordHint: string;
  timeRemaining: number;
  phase: 'lobby' | 'choosing' | 'drawing' | 'reveal' | 'ended';
  wordChoices?: string[];
  chat: ChatMessage[];
  roundResults: RoundResult[];
}

export interface WordCategory {
  name: string;
  words: string[];
}

export const DEFAULT_WORDS: string[] = [
  'cat', 'dog', 'elephant', 'giraffe', 'lion', 'penguin', 'butterfly', 'dolphin', 'eagle', 'snake',
  'chair', 'table', 'computer', 'phone', 'book', 'lamp', 'clock', 'umbrella', 'camera', 'guitar',
  'pizza', 'burger', 'ice cream', 'cake', 'banana', 'apple', 'sushi', 'taco', 'donut', 'cookie',
  'beach', 'mountain', 'castle', 'bridge', 'lighthouse', 'volcano', 'waterfall', 'island', 'desert', 'forest',
  'running', 'dancing', 'sleeping', 'swimming', 'flying', 'cooking', 'reading', 'singing', 'painting', 'jumping',
  'rainbow', 'sun', 'moon', 'star', 'cloud', 'lightning', 'snowflake', 'fire', 'heart', 'diamond'
];

export const DEFAULT_GAME_CONFIG: GameConfig = {
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  customWords: [],
  useCustomWordsOnly: false,
  hints: 2
};
