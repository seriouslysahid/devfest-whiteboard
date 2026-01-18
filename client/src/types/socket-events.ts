import type { DrawOperation, User } from './whiteboard';
import type { ChatMessage, GameSession, GameConfig, RoundResult } from './game';

export interface ClientToServerEvents {
  'create-room': (data: { userName: string }) => void;
  'join-room': (data: { roomId: string; userName: string }) => void;
  'leave-room': (data: { roomId: string }) => void;
  
  'draw-operation': (data: { roomId: string; operation: DrawOperation }) => void;
  'clear-canvas': (data: { roomId: string }) => void;
  'undo': (data: { roomId: string; operationId: string }) => void;
  'redo': (data: { roomId: string; operation: DrawOperation }) => void;
  
  'cursor-move': (data: { roomId: string; userId: string; userName: string; x: number; y: number }) => void;
  
  'start-game': (data: { roomId: string; config: GameConfig }) => void;
  'select-word': (data: { roomId: string; word: string }) => void;
  'guess-word': (data: { roomId: string; guess: string }) => void;
  'send-chat': (data: { roomId: string; message: string }) => void;
  'end-game': (data: { roomId: string }) => void;
  
  'ai-generate': (data: { roomId: string; prompt: string; type: 'diagram' | 'sketch' | 'complete' }) => void;
}

export interface ServerToClientEvents {
  'room-created': (data: { roomId: string; userId: string; role: 'host' }) => void;
  'room-joined': (data: { roomId: string; userId: string; role: 'host' | 'participant'; operations: DrawOperation[]; users: User[] }) => void;
  'user-joined': (data: User) => void;
  'user-left': (data: { userId: string }) => void;
  'error': (data: { message: string }) => void;
  
  'draw-operation': (operation: DrawOperation) => void;
  'clear-canvas': () => void;
  'operation-undone': (data: { operationId: string }) => void;
  'operation-redone': (data: { operation: DrawOperation }) => void;
  
  'cursor-move': (data: { userId: string; userName: string; x: number; y: number }) => void;
  
  'game-started': (data: { session: GameSession }) => void;
  'word-choices': (data: { words: string[] }) => void;
  'round-started': (data: { drawer: string; wordHint: string; timeRemaining: number }) => void;
  'time-update': (data: { timeRemaining: number }) => void;
  'hint-update': (data: { hint: string }) => void;
  'player-guessed': (data: { userId: string; userName: string }) => void;
  'round-ended': (data: { result: RoundResult }) => void;
  'game-ended': (data: { finalScores: Array<{ id: string; name: string; score: number }> }) => void;
  'chat-message': (data: ChatMessage) => void;
  
  'ai-result': (data: { operations: DrawOperation[]; type: string }) => void;
  'ai-error': (data: { message: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  userName: string;
  roomId?: string;
}
