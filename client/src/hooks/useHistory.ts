import { useState, useCallback } from 'react';
import type { DrawOperation } from '@/types';

const MAX_HISTORY_SIZE = 500;

interface UseHistoryReturn {
  operations: DrawOperation[];
  addOperation: (op: DrawOperation) => void;
  undo: () => DrawOperation | null;
  redo: () => DrawOperation | null;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  setOperations: (ops: DrawOperation[]) => void;
  removeOperation: (id: string) => void;
  updateOperation: (id: string, updates: Partial<DrawOperation>) => void;
}

export function useHistory(initialOperations: DrawOperation[] = []): UseHistoryReturn {
  const [operations, setOperationsState] = useState<DrawOperation[]>(initialOperations);
  const [undoStack, setUndoStack] = useState<DrawOperation[]>([]);
  const [redoStack, setRedoStack] = useState<DrawOperation[]>([]);

  const addOperation = useCallback((op: DrawOperation) => {
    setOperationsState(prev => [...prev, op]);
    setUndoStack(prev => [...prev.slice(-MAX_HISTORY_SIZE + 1), op]);
    setRedoStack([]);
  }, []);

  const updateOperation = useCallback((id: string, updates: Partial<DrawOperation>) => {
    setOperationsState(prev => prev.map(op => {
      if (op.id === id) {
        return { ...op, ...updates };
      }
      return op;
    }));
  }, []);

  const undo = useCallback((): DrawOperation | null => {
    let undoneOp: DrawOperation | null = null;
    
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      undoneOp = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    
    if (undoneOp) {
      const opToRedo = undoneOp;
      setRedoStack(prev => [...prev, opToRedo]);
      setOperationsState(prev => prev.filter(op => op.id !== opToRedo.id));
    }
    
    return undoneOp;
  }, []);

  const redo = useCallback((): DrawOperation | null => {
    let redoneOp: DrawOperation | null = null;
    
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      redoneOp = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    
    if (redoneOp) {
      const opToAdd = redoneOp;
      setUndoStack(prev => [...prev, opToAdd]);
      setOperationsState(prev => [...prev, opToAdd]);
    }
    
    return redoneOp;
  }, []);

  const clear = useCallback(() => {
    setOperationsState([]);
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const setOperations = useCallback((ops: DrawOperation[]) => {
    setOperationsState(ops);
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const removeOperation = useCallback((id: string) => {
    setOperationsState(prev => prev.filter(op => op.id !== id));
  }, []);

  return {
    operations,
    addOperation,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    clear,
    setOperations,
    removeOperation,
    updateOperation
  };
}
