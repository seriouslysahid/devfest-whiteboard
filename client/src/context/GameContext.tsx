import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { GameSession, GameConfig, ChatMessage, RoundResult } from '@/types';
import { useSocket } from '@/context/SocketContext';

interface GameState {
  session: GameSession | null;
  isHost: boolean;
  myId: string | null;
  isDrawing: boolean;
  wordChoices: string[];
  config: GameConfig;
}

type GameAction =
  | { type: 'SET_SESSION'; session: GameSession }
  | { type: 'SET_IS_HOST'; isHost: boolean }
  | { type: 'SET_MY_ID'; myId: string }
  | { type: 'SET_WORD_CHOICES'; words: string[] }
  | { type: 'UPDATE_TIME'; timeRemaining: number }
  | { type: 'UPDATE_HINT'; hint: string }
  | { type: 'PLAYER_GUESSED'; userId: string }
  | { type: 'ADD_CHAT'; message: ChatMessage }
  | { type: 'ROUND_ENDED'; result: RoundResult }
  | { type: 'GAME_ENDED' }
  | { type: 'SET_CONFIG'; config: Partial<GameConfig> }
  | { type: 'RESET' };

const initialState: GameState = {
  session: null,
  isHost: false,
  myId: null,
  isDrawing: false,
  wordChoices: [],
  config: {
    rounds: 3,
    drawTime: 80,
    wordCount: 3,
    customWords: [],
    useCustomWordsOnly: false,
    hints: 2
  }
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        session: action.session,
        isDrawing: action.session?.currentDrawer === state.myId
      };
    case 'SET_IS_HOST':
      return { ...state, isHost: action.isHost };
    case 'SET_MY_ID':
      return { ...state, myId: action.myId };
    case 'SET_WORD_CHOICES':
      return { ...state, wordChoices: action.words };
    case 'UPDATE_TIME':
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, timeRemaining: action.timeRemaining }
      };
    case 'UPDATE_HINT':
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, wordHint: action.hint }
      };
    case 'PLAYER_GUESSED':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          players: state.session.players.map(p =>
            p.id === action.userId ? { ...p, hasGuessed: true } : p
          )
        }
      };
    case 'ADD_CHAT':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          chat: [...state.session.chat, action.message]
        }
      };
    case 'ROUND_ENDED':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          phase: 'reveal',
          roundResults: [...state.session.roundResults, action.result]
        }
      };
    case 'GAME_ENDED':
      return { ...state, session: state.session ? { ...state.session, phase: 'ended' } : null };
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.config } };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface GameContextValue extends GameState {
  startGame: () => void;
  selectWord: (word: string) => void;
  guessWord: (guess: string) => void;
  sendChat: (message: string) => void;
  endGame: () => void;
  updateConfig: (config: Partial<GameConfig>) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: React.ReactNode;
  roomId: string | null;
  userId: string | null;
  isHost: boolean;
}

export function GameProvider({ children, roomId, userId, isHost }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket } = useSocket();

  useEffect(() => {
    if (userId) {
      dispatch({ type: 'SET_MY_ID', myId: userId });
    }
  }, [userId]);

  useEffect(() => {
    dispatch({ type: 'SET_IS_HOST', isHost });
  }, [isHost]);

  useEffect(() => {
    if (!socket) return;

    socket.on('game-started', ({ session }: { session: GameSession }) => {
      dispatch({ type: 'SET_SESSION', session });
    });

    socket.on('word-choices', ({ words }: { words: string[] }) => {
      dispatch({ type: 'SET_WORD_CHOICES', words });
    });

    socket.on('round-started', ({ drawer, wordHint, timeRemaining }: any) => {
      if (state.session) {
        dispatch({
          type: 'SET_SESSION',
          session: { ...state.session, phase: 'drawing', currentDrawer: drawer, wordHint, timeRemaining }
        });
      }
    });

    socket.on('time-update', ({ timeRemaining }: { timeRemaining: number }) => {
      dispatch({ type: 'UPDATE_TIME', timeRemaining });
    });

    socket.on('hint-update', ({ hint }: { hint: string }) => {
      dispatch({ type: 'UPDATE_HINT', hint });
    });

    socket.on('player-guessed', ({ userId }: { userId: string }) => {
      dispatch({ type: 'PLAYER_GUESSED', userId });
    });

    socket.on('round-ended', ({ result }: { result: RoundResult }) => {
      dispatch({ type: 'ROUND_ENDED', result });
    });

    socket.on('game-ended', () => {
      dispatch({ type: 'GAME_ENDED' });
    });

    socket.on('chat-message', (message: ChatMessage) => {
      dispatch({ type: 'ADD_CHAT', message });
    });

    return () => {
      socket.off('game-started');
      socket.off('word-choices');
      socket.off('round-started');
      socket.off('time-update');
      socket.off('hint-update');
      socket.off('player-guessed');
      socket.off('round-ended');
      socket.off('game-ended');
      socket.off('chat-message');
    };
  }, [socket, state.session]);

  const startGame = useCallback(() => {
    if (socket && roomId) {
      socket.emit('start-game', { roomId, config: state.config });
    }
  }, [socket, roomId, state.config]);

  const selectWord = useCallback((word: string) => {
    if (socket && roomId) {
      socket.emit('select-word', { roomId, word });
    }
  }, [socket, roomId]);

  const guessWord = useCallback((guess: string) => {
    if (socket && roomId) {
      socket.emit('guess-word', { roomId, guess });
    }
  }, [socket, roomId]);

  const sendChat = useCallback((message: string) => {
    if (socket && roomId) {
      socket.emit('send-chat', { roomId, message });
    }
  }, [socket, roomId]);

  const endGame = useCallback(() => {
    if (socket && roomId) {
      socket.emit('end-game', { roomId });
      dispatch({ type: 'RESET' });
    }
  }, [socket, roomId]);

  const updateConfig = useCallback((config: Partial<GameConfig>) => {
    dispatch({ type: 'SET_CONFIG', config });
  }, []);

  return (
    <GameContext.Provider
      value={{
        ...state,
        startGame,
        selectWord,
        guessWord,
        sendChat,
        endGame,
        updateConfig
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
