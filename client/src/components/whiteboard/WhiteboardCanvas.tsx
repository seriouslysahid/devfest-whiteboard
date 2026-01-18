import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useSocket } from '@/context/SocketContext';
import { Input } from '@/components/ui/input';
import { useHistory } from '@/hooks/useHistory';
import { useKeyboard, KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboard';
import { drawShape, drawPath, shapeToPoints } from '@/lib/shapes';
import type { ToolType, Point, DrawOperation, ShapeData } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface WhiteboardCanvasHandle {
  undo: () => void;
  redo: () => void;
  addOperation: (op: DrawOperation) => void;
}

interface WhiteboardCanvasProps {
  roomId: string;
  userId: string;
  initialOperations?: DrawOperation[];
  color: string;
  lineWidth: number;
  tool: ToolType;
  onCursorMove?: (x: number, y: number) => void;
  onOperationAdd?: (op: DrawOperation) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

const isPointInOperation = (x: number, y: number, op: DrawOperation): boolean => {
  if (op.type === 'text' && op.x !== undefined && op.y !== undefined && op.text) {
    const fontSize = op.lineWidth * 5 + 10;
    const width = op.text.length * fontSize * 0.6; 
    const height = fontSize;
    // Bbox with textBaseline='top': y to y+height
    return x >= op.x && x <= op.x + width && y >= op.y && y <= op.y + height + 10; // Padding
  }
  return false;
};

const isPointInResizeHandle = (x: number, y: number, op: DrawOperation): boolean => {
  if (op.type === 'text' && op.x !== undefined && op.y !== undefined && op.text) {
    const fontSize = op.lineWidth * 5 + 10;
    const width = op.text.length * fontSize * 0.6;
    // Handle at bottom-right
    const handleX = op.x + width;
    const handleY = op.y + fontSize; 
    return Math.abs(x - handleX) <= 10 && Math.abs(y - handleY) <= 10;
  }
  return false;
};

const WhiteboardCanvas = forwardRef<WhiteboardCanvasHandle, WhiteboardCanvasProps>(({
  roomId,
  userId,
  initialOperations = [],
  color,
  lineWidth,
  tool,
  onCursorMove,
  onOperationAdd,
  onHistoryChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { socket } = useSocket();
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapePreview, setShapePreview] = useState<ShapeData | null>(null);

  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPos = useRef<Point | null>(null);
  const currentStroke = useRef<Point[]>([]);
  const shapeStartRef = useRef<Point | null>(null);
  const shapeEndRef = useRef<Point | null>(null);

  const {
    operations,
    addOperation,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    removeOperation,
    updateOperation
  } = useHistory(initialOperations as DrawOperation[]);

  const isShapeTool = ['rectangle', 'circle', 'line', 'arrow'].includes(tool);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (tool === 'text' && !textInput) {
      // Auto-open text input in center when tool is selected
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setTextInput({
          x: rect.width / 2 - 100, // Centered horizontally (approx width 200)
          y: rect.height / 2 - 20,
          value: ''
        });
      }
    }
  }, [tool]);

  useEffect(() => {
    onHistoryChange?.(canUndo, canRedo);
  }, [canUndo, canRedo, onHistoryChange]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    operations.forEach(op => drawOperation(ctx, op));

    if (shapePreview) {
      drawShape(ctx, shapePreview, true);
    }

    if (selectedId) {
      const op = operations.find(o => o.id === selectedId);
      if (op && op.type === 'text' && op.x !== undefined && op.y !== undefined && op.text) {
        const fontSize = op.lineWidth * 5 + 10;
        const width = op.text.length * fontSize * 0.6;
        const height = fontSize;
        
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        // Fix: box should be from top (y) downwards
        ctx.strokeRect(op.x - 5, op.y - 5, width + 10, height + 10);
        
        // Draw resize handle
        ctx.setLineDash([]);
        ctx.fillStyle = '#3b82f6';
        // Handle at bottom-right (y + height)
        ctx.fillRect(op.x + width - 5, op.y + height - 5, 10, 10);
        ctx.restore();
      }
    }
  }, [operations, shapePreview, selectedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;
    }

    redrawCanvas();

    const handleResize = () => {
      if (!canvas || !ctx) return;
      const newRect = canvas.getBoundingClientRect();
      canvas.width = newRect.width * dpr;
      canvas.height = newRect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      redrawCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (!socket) return;

    const handleRemoteDraw = (operation: DrawOperation) => {
      addOperation(operation);
    };

    const handleClear = () => {
      clear();
    };

    const handleUndone = ({ operationId }: { operationId: string }) => {
      removeOperation(operationId);
    };

    const handleRedone = ({ operation }: { operation: DrawOperation }) => {
      addOperation(operation);
    };

    const handleModified = ({ operation }: { operation: DrawOperation }) => {
      updateOperation(operation.id, operation);
    };

    socket.on('draw-operation', handleRemoteDraw);
    socket.on('clear-canvas', handleClear);
    socket.on('operation-undone', handleUndone);
    socket.on('operation-redone', handleRedone);
    socket.on('operation-modified', handleModified);

    return () => {
      socket.off('draw-operation', handleRemoteDraw);
      socket.off('clear-canvas', handleClear);
      socket.off('operation-undone', handleUndone);
      socket.off('operation-redone', handleRedone);
      socket.off('operation-modified', handleModified);
    };
  }, [socket, addOperation, clear, removeOperation, updateOperation]);

  const handleUndo = useCallback(() => {
    const undoneOp = undo();
    if (undoneOp && socket) {
      socket.emit('undo', { roomId, operationId: undoneOp.id });
    }
  }, [undo, socket, roomId]);

  const handleRedo = useCallback(() => {
    const redoneOp = redo();
    if (redoneOp && socket) {
      socket.emit('redo', { roomId, operation: redoneOp });
    }
  }, [redo, socket, roomId]);

  useImperativeHandle(ref, () => ({
    undo: handleUndo,
    redo: handleRedo,
    addOperation: (op: DrawOperation) => {
      addOperation(op);
      onOperationAdd?.(op);
    }
  }));

  useKeyboard({
    [KEYBOARD_SHORTCUTS.UNDO]: handleUndo,
    [KEYBOARD_SHORTCUTS.REDO]: handleRedo,
    [KEYBOARD_SHORTCUTS.REDO_ALT]: handleRedo,
    [KEYBOARD_SHORTCUTS.ESCAPE]: () => {
      setTextInput(null);
      shapeStartRef.current = null;
      shapeEndRef.current = null;
      setShapeStart(null);
      setShapePreview(null);
    }
  });

  const drawOperation = (ctx: CanvasRenderingContext2D, op: DrawOperation) => {
    const { type, points, color: opColor, lineWidth: opWidth, text, x, y, shapeType, pathData, fill } = op;

    ctx.beginPath();

    if (type === 'path' && pathData) {
      drawPath(ctx, pathData, opColor, opWidth, fill);
    } else if (type === 'draw' || type === 'eraser') {
      ctx.strokeStyle = type === 'eraser' ? '#ffffff' : opColor;
      ctx.lineWidth = opWidth;
      if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
      ctx.stroke();
    } else if (type === 'text' && text && x !== undefined && y !== undefined) {
      ctx.fillStyle = opColor;
      ctx.textBaseline = 'top';
      ctx.font = `${opWidth * 5 + 10}px Inter, system-ui, sans-serif`;
      ctx.fillText(text, x, y);
    } else if (type === 'shape' && shapeType && points.length >= 2) {
      const shapeData: ShapeData = {
        type: shapeType,
        start: points[0],
        end: points[points.length - 1],
        color: opColor,
        lineWidth: opWidth
      };
      drawShape(ctx, shapeData);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);

    if (tool === 'text') {
      if (textInput && textInput.value.trim()) {
        const { x, y, value } = textInput;
        const operation: DrawOperation = {
          id: uuidv4(),
          type: 'text',
          text: value,
          x,
          y,
          color,
          lineWidth,
          points: [],
          timestamp: Date.now(),
          userId
        };
        addOperation(operation);
        socket?.emit('draw-operation', { roomId, operation });
        onOperationAdd?.(operation);
      }
      
      setTextInput({ x: pos.x, y: pos.y, value: '' });
      return;
    }

    if ((tool as string) === 'select') {
      // Check resize handle first if something is selected
      if (selectedId) {
        const selectedOp = operations.find(op => op.id === selectedId);
        if (selectedOp && isPointInResizeHandle(pos.x, pos.y, selectedOp)) {
          setIsResizing(true);
          // Store initial y to calculate scale
          dragOffset.current = { x: pos.x, y: pos.y }; 
          return;
        }
      }

      const hitOp = operations.slice().reverse().find(op => isPointInOperation(pos.x, pos.y, op));
      
      if (hitOp) {
        setSelectedId(hitOp.id);
        setIsDragging(true);
        if (hitOp.type === 'text' && hitOp.x !== undefined && hitOp.y !== undefined) {
          dragOffset.current = { x: pos.x - hitOp.x, y: pos.y - hitOp.y };
        }
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (isShapeTool) {
      console.log('[SHAPE] Start:', pos);
      shapeStartRef.current = pos;
      shapeEndRef.current = pos; // Initialize end with start
      setShapeStart(pos);
      return;
    }

    setIsDrawing(true);
    lastPos.current = pos;
    currentStroke.current = [pos];
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);

    onCursorMove?.(pos.x, pos.y);

    if ((tool as string) === 'select') {
      if (isResizing && selectedId && dragOffset.current) {
        if (canvasRef.current) canvasRef.current.style.cursor = 'nwse-resize';
        const op = operations.find(o => o.id === selectedId);
        if (op && op.type === 'text') {
          // Calculate new font size based on vertical drag
          // Delta Y determines growth
          const dy = pos.y - dragOffset.current.y;
          // Current font size
          const currentFontSize = op.lineWidth * 5 + 10;
          let newFontSize = currentFontSize + dy * 0.5; // Scale factor
          
          if (newFontSize < 10) newFontSize = 10;
          if (newFontSize > 100) newFontSize = 100;
          
          const newLineWidth = (newFontSize - 10) / 5;
          
          updateOperation(selectedId, { lineWidth: newLineWidth });
          dragOffset.current = { x: pos.x, y: pos.y }; // Reset for incremental update
          
          if (socket) {
            socket.emit('modify-operation', { 
              roomId, 
              operation: { ...op, lineWidth: newLineWidth } 
            });
          }
        }
        return;
      }

      const hitOp = operations.slice().reverse().find(op => isPointInOperation(pos.x, pos.y, op));
      
      if (isDragging && selectedId) {
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
        
        const op = operations.find(o => o.id === selectedId);
        if (op && op.type === 'text' && dragOffset.current) {
          const newX = pos.x - dragOffset.current.x;
          const newY = pos.y - dragOffset.current.y;
          
          updateOperation(selectedId, { x: newX, y: newY });
          
          if (socket) {
            socket.emit('modify-operation', { 
              roomId, 
              operation: { ...op, x: newX, y: newY } 
            });
          }
        }
      } else {
        if (canvasRef.current) {
          if (selectedId) {
            const op = operations.find(o => o.id === selectedId);
            if (op && isPointInResizeHandle(pos.x, pos.y, op)) {
              canvasRef.current.style.cursor = 'nwse-resize';
              return;
            }
          }
          canvasRef.current.style.cursor = hitOp && hitOp.type === 'text' ? 'grab' : 'default';
        }
      }
      return;
    }

    const activeShapeStart = shapeStartRef.current || shapeStart;
    if (isShapeTool && activeShapeStart) {
      // console.log('[SHAPE] Move:', { start: activeShapeStart, end: pos });
      shapeEndRef.current = pos;
      setShapePreview({
        type: tool as 'rectangle' | 'circle' | 'line' | 'arrow',
        start: activeShapeStart,
        end: pos,
        color,
        lineWidth
      });
      return;
    }

    if (tool === 'text' || tool === 'select') return;
    if (!isDrawing || !lastPos.current || !ctxRef.current) return;

    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    currentStroke.current.push(pos);
    lastPos.current = pos;
  };

  const stopDrawing = () => {
    if ((tool as string) === 'select') {
      setIsDragging(false);
      setIsResizing(false);
      dragOffset.current = null;
      return;
    }

    const activeShapeStart = shapeStartRef.current;
    const activeShapeEnd = shapeEndRef.current;
    
    if (isShapeTool && activeShapeStart && activeShapeEnd) {
      console.log('[SHAPE] End:', { start: activeShapeStart, end: activeShapeEnd });
      
      // Calculate distance to ensure it's not a micro-shape (accidental click)
      const dx = activeShapeEnd.x - activeShapeStart.x;
      const dy = activeShapeEnd.y - activeShapeStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 5) {
        console.log('[SHAPE] Ignored - too small');
        shapeStartRef.current = null;
        shapeEndRef.current = null;
        setShapeStart(null);
        setShapePreview(null);
        return;
      }

      const finalShape: ShapeData = {
        type: tool as 'rectangle' | 'circle' | 'line' | 'arrow',
        start: activeShapeStart,
        end: activeShapeEnd,
        color,
        lineWidth
      };
      
      const operation: DrawOperation = {
        id: uuidv4(),
        type: 'shape',
        shapeType: tool as 'rectangle' | 'circle' | 'line' | 'arrow',
        points: shapeToPoints(finalShape),
        color,
        lineWidth,
        timestamp: Date.now(),
        userId
      };

      addOperation(operation);
      socket?.emit('draw-operation', { roomId, operation });
      onOperationAdd?.(operation);

      shapeStartRef.current = null;
      shapeEndRef.current = null;
      setShapeStart(null);
      setShapePreview(null);
      return;
    }

    if (isDrawing && currentStroke.current.length > 0) {
      const operation: DrawOperation = {
        id: uuidv4(),
        type: tool === 'eraser' ? 'eraser' : 'draw',
        color,
        lineWidth,
        points: currentStroke.current,
        timestamp: Date.now(),
        userId
      };

      addOperation(operation);
      socket?.emit('draw-operation', { roomId, operation });
      onOperationAdd?.(operation);
    }

    setIsDrawing(false);
    lastPos.current = null;
    currentStroke.current = [];
  };

  const submitText = () => {
    if (textInput && textInput.value.trim()) {
      const { x, y, value } = textInput;

      if (editingOpId) {
        updateOperation(editingOpId, { text: value });
        if (socket) {
          socket.emit('modify-operation', {
            roomId,
            operation: { id: editingOpId, text: value }
          });
        }
      } else {
        const operation: DrawOperation = {
          id: uuidv4(),
          type: 'text',
          text: value,
          x,
          y,
          color,
          lineWidth,
          points: [],
          timestamp: Date.now(),
          userId
        };

        addOperation(operation);
        socket?.emit('draw-operation', { roomId, operation });
        onOperationAdd?.(operation);
      }
    }
    setTextInput(null);
    setEditingOpId(null);
  };

  const handleTextSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitText();
    } else if (e.key === 'Escape') {
      setTextInput(null);
      setEditingOpId(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((tool as string) === 'select') {
      const pos = getPos(e);
      const hitOp = operations.slice().reverse().find(op => isPointInOperation(pos.x, pos.y, op));
      
      if (hitOp && hitOp.type === 'text' && hitOp.x !== undefined && hitOp.y !== undefined && hitOp.text) {
        setEditingOpId(hitOp.id);
        setTextInput({ x: hitOp.x, y: hitOp.y, value: hitOp.text });
        // Select it too if not already
        setSelectedId(hitOp.id);
      }
    }
  };

  const getCursor = () => {
    switch (tool) {
      case 'text':
        return 'text';
      case 'select':
        return 'default';
      case 'eraser':
        return 'cell';
      default:
        return 'crosshair';
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none bg-white dark:bg-slate-900"
        style={{ cursor: getCursor() }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onDoubleClick={handleDoubleClick}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {textInput && (
        <div
          className="absolute"
          style={{ left: textInput.x, top: textInput.y }}
        >
          <Input
            autoFocus
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={handleTextSubmit}
            onBlur={submitText}
            className="h-8 w-48 border-primary bg-background shadow-lg"
            placeholder="Type and press Enter..."
          />
        </div>
      )}
    </div>
  );
});

export default WhiteboardCanvas;
