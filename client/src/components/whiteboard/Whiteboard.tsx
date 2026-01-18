import { useState, useCallback, useEffect, useRef } from 'react';
import WhiteboardCanvas from './WhiteboardCanvas';
import type { WhiteboardCanvasHandle } from './WhiteboardCanvas';
import WhiteboardControls from './WhiteboardControls';
import { Cursors, useCursors } from './Cursors';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';
import { useKeyboard, KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboard';
import { AICommandPalette } from '@/components/ai/AICommandPalette';
import { GameChat } from '@/components/game/GameChat';
import { GameLeaderboard } from '@/components/game/GameLeaderboard';
import { GameTimer } from '@/components/game/GameTimer';
import { WordSelector } from '@/components/game/WordSelector';
import { GameLobby } from '@/components/game/GameLobby';
import { GameResults } from '@/components/game/GameResults';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogOut, Copy, Check, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvatarUrl } from '@/lib/avatars';
import type { ToolType, DrawOperation, User } from '@/types';

interface WhiteboardProps {
  roomId: string;
  userId: string;
  userName: string;
  initialOperations: DrawOperation[];
  users: User[];
  currentUserRole: 'host' | 'participant';
}

const Whiteboard: React.FC<WhiteboardProps> = ({ 
  roomId,
  userId,
  userName,
  initialOperations,
  users,
  currentUserRole
}) => {
  const { socket } = useSocket();
  const { session, isDrawing: isGameDrawer } = useGame();

  const [tool, setTool] = useState<ToolType>('pen');
  
  const handleToolChange = (newTool: ToolType) => {
    console.log('[Whiteboard] Tool changed to:', newTool);
    setTool(newTool);
  };

  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [showAICommand, setShowAICommand] = useState(false);
  const [showGameLobby, setShowGameLobby] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [gameResults, setGameResults] = useState<Array<{ id: string; name: string; score: number }> | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const { cursors, emitCursor } = useCursors(socket, roomId, userId, userName);
  const canvasRef = useRef<WhiteboardCanvasHandle>(null);

  const isGameActive = session?.phase === 'drawing' || session?.phase === 'choosing';
  const canDraw = !isGameActive || isGameDrawer;

  useEffect(() => {
    if (!socket) return;

    const handleGameEnded = ({ finalScores }: { finalScores: Array<{ id: string; name: string; score: number }> }) => {
      setGameResults(finalScores);
    };

    socket.on('game-ended', handleGameEnded);
    return () => {
      socket.off('game-ended', handleGameEnded);
    };
  }, [socket]);

  useKeyboard({
    [KEYBOARD_SHORTCUTS.AI_COMMAND]: () => setShowAICommand(true),
    [KEYBOARD_SHORTCUTS.PEN]: () => handleToolChange('pen'),
    [KEYBOARD_SHORTCUTS.ERASER]: () => handleToolChange('eraser'),
    [KEYBOARD_SHORTCUTS.TEXT]: () => handleToolChange('text'),
    [KEYBOARD_SHORTCUTS.SELECT]: () => handleToolChange('select'),
    [KEYBOARD_SHORTCUTS.RECTANGLE]: () => handleToolChange('rectangle'),
    [KEYBOARD_SHORTCUTS.CIRCLE]: () => handleToolChange('circle'),
    [KEYBOARD_SHORTCUTS.LINE]: () => handleToolChange('line'),
    [KEYBOARD_SHORTCUTS.ARROW]: () => handleToolChange('arrow'),
  });

  const handleClear = () => {
    if (isGameActive && !isGameDrawer) return;

    if (currentUserRole !== 'host' && !isGameActive) {
      return;
    }

    socket?.emit('clear-canvas', { roomId });
  };

  const handleLeave = () => {
    setShowLeaveDialog(false);
    window.location.reload();
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/room/${roomId}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCursorMove = useCallback((x: number, y: number) => {
    emitCursor(x, y);
  }, [emitCursor]);

  const handleAIOperations = useCallback((ops: DrawOperation[]) => {
    ops.forEach(op => {
      // Add locally first
      canvasRef.current?.addOperation(op);
      // Then broadcast
      socket?.emit('draw-operation', { roomId, operation: op });
    });
  }, [socket, roomId]);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    canvasRef.current?.redo();
  }, []);

  const handleHistoryChange = useCallback((undoable: boolean, redoable: boolean) => {
    setCanUndo(undoable);
    setCanRedo(redoable);
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={cn('relative h-screen w-screen overflow-hidden bg-white dark:bg-slate-900', isDark && 'dark')}>
      <TooltipProvider delayDuration={100}>
        <div className="absolute left-4 top-4 z-50 flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="font-semibold">{roomId}</span>
            </div>

            <div className="h-4 w-px bg-border" />

            <div className="flex -space-x-2">
              {users.slice(0, 5).map((u) => (
                <Tooltip key={u.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-9 w-9 border-2 border-background transition-transform hover:scale-110 hover:-translate-y-1 cursor-pointer bg-white">
                      <AvatarFallback
                        className="overflow-hidden"
                        style={{ backgroundColor: u.color || '#6366f1' }}
                      >
                        <img 
                          src={getAvatarUrl(u.id || u.name)} 
                          alt={u.name}
                          className="h-full w-full object-cover"
                        />
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 overflow-hidden rounded-full bg-slate-100">
                        <img 
                          src={getAvatarUrl(u.id || u.name)} 
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="font-semibold">{u.name}</span>
                      {u.role === 'host' && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">Host</Badge>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
              {users.length > 5 && (
                <Avatar className="h-9 w-9 border-2 border-background">
                  <AvatarFallback className="bg-muted text-xs font-bold">
                    +{users.length - 5}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>

          {isGameActive && session && (
            <div className="flex items-center gap-3 rounded-xl border bg-background/95 px-4 py-2 shadow-sm backdrop-blur">
              <Badge variant="secondary">
                Round {session.currentRound}/{session.totalRounds}
              </Badge>
              <div className="text-lg font-mono tracking-widest">
                {session.wordHint}
              </div>
              <GameTimer />
            </div>
          )}
        </div>

        <div className="absolute right-4 top-4 z-50 flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={toggleDarkMode}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Dark Mode</TooltipContent>
          </Tooltip>

          <Button variant="outline" size="sm" onClick={handleShare}>
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-green-500" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? 'Copied!' : 'Share'}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowLeaveDialog(true)}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>

        {isGameActive && (
          <div className="absolute right-4 top-20 z-40 flex w-72 flex-col gap-3">
            <GameLeaderboard />
            <GameChat />
          </div>
        )}

        <Cursors cursors={cursors} currentUserId={userId} />

        <div className={cn('h-full w-full', !canDraw && 'pointer-events-none opacity-50')}>
          <WhiteboardCanvas
            ref={canvasRef}
            roomId={roomId}
            userId={userId}
            initialOperations={initialOperations}
            color={color}
            lineWidth={lineWidth}
            tool={tool}
            onCursorMove={handleCursorMove}
            onHistoryChange={handleHistoryChange}
          />
        </div>

        <WhiteboardControls
          tool={tool}
          setTool={handleToolChange}
          color={color}
          setColor={setColor}
          lineWidth={lineWidth}
          setLineWidth={setLineWidth}
          onClear={handleClear}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onAICommand={() => setShowAICommand(true)}
          onStartGame={() => setShowGameLobby(true)}
          isGameActive={isGameActive}
        />

        <AICommandPalette
          open={showAICommand}
          onOpenChange={setShowAICommand}
          onOperationsGenerated={handleAIOperations}
        />

        <GameLobby
          open={showGameLobby}
          onOpenChange={setShowGameLobby}
          playerCount={users.length}
        />

        <WordSelector />

        {gameResults && (
          <GameResults
            finalScores={gameResults}
            onClose={() => setGameResults(null)}
          />
        )}

        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave Room?</DialogTitle>
              <DialogDescription>
                Are you sure you want to leave this room? Your drawings will be preserved for other users.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleLeave}>
                Leave Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
};

export default Whiteboard;
