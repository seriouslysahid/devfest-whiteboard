export type ToolType = 'pen' | 'eraser' | 'text' | 'select' | 'rectangle' | 'circle' | 'line' | 'arrow';

export interface Point {
  x: number;
  y: number;
}

export interface DrawOperation {
  id: string;
  type: 'draw' | 'eraser' | 'text' | 'shape' | 'path';
  points: Point[];
  color: string;
  lineWidth: number;
  text?: string;
  x?: number;
  y?: number;
  shapeType?: 'rectangle' | 'circle' | 'line' | 'arrow';
  pathData?: string;
  fill?: string;
  width?: number;
  height?: number;
  timestamp: number;
  userId: string;
}

export interface User {
  id: string;
  name: string;
  role: 'host' | 'participant';
  color?: string;
  cursor?: Point;
}

export interface Room {
  roomId: string;
  hostId: string;
  users: User[];
  operations: DrawOperation[];
  createdAt: number;
  gameState?: GameState;
}

export interface GameState {
  isActive: boolean;
  mode: 'skribbl' | 'free';
  currentDrawer?: string;
  word?: string;
  roundTime: number;
  timeRemaining: number;
  scores: Record<string, number>;
  roundNumber: number;
  totalRounds: number;
}

export interface HistoryState {
  operations: DrawOperation[];
  undoStack: DrawOperation[][];
  redoStack: DrawOperation[][];
}

export interface CanvasSettings {
  color: string;
  lineWidth: number;
  tool: ToolType;
}

export interface ShapeData {
  type: 'rectangle' | 'circle' | 'line' | 'arrow';
  start: Point;
  end: Point;
  color: string;
  lineWidth: number;
}
