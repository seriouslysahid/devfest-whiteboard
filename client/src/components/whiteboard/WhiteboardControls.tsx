import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Pencil,
  Eraser,
  Type,
  Trash2,
  Undo2,
  Redo2,
  Square,
  Circle,
  Minus,
  ArrowRight,
  MousePointer2,
  Sparkles,
  Gamepad2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolType } from '@/types';

interface WhiteboardControlsProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  lineWidth: number;
  setLineWidth: (width: number) => void;
  onClear: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onAICommand?: () => void;
  onStartGame?: () => void;
  isGameActive?: boolean;
}

const COLORS = [
  '#000000',
  '#374151',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
];

const TOOLS: Array<{ id: ToolType; icon: React.ElementType; label: string; shortcut: string }> = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'pen', icon: Pencil, label: 'Pen', shortcut: 'P' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'circle', icon: Circle, label: 'Circle', shortcut: 'C' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
];

const WhiteboardControls: React.FC<WhiteboardControlsProps> = ({
  tool,
  setTool,
  color,
  setColor,
  lineWidth,
  setLineWidth,
  onClear,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onAICommand,
  onStartGame,
  isGameActive = false
}) => {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 rounded-2xl border bg-background/95 p-1.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80">

          <div className="flex items-center gap-0.5 rounded-xl bg-muted/50 p-0.5">
            {TOOLS.map(({ id, icon: Icon, label, shortcut }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-9 w-9 rounded-lg',
                      tool === id && 'bg-background shadow-sm'
                    )}
                    onClick={() => setTool(id)}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex items-center gap-2">
                  {label}
                  <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                    {shortcut}
                  </kbd>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Separator orientation="vertical" className="mx-1 h-8" />

          <div className="flex items-center gap-1 px-1">
            {COLORS.map((c) => (
              <Tooltip key={c}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-all hover:scale-110',
                      color === c
                        ? 'border-primary scale-110 ring-2 ring-primary/20'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      setColor(c);
                      if (tool === 'eraser') setTool('pen');
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Color</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Separator orientation="vertical" className="mx-1 h-8" />

          <div className="flex w-24 items-center px-2">
            <Slider
              value={[lineWidth]}
              max={20}
              min={1}
              step={1}
              onValueChange={(val) => setLineWidth(val[0])}
              className="cursor-pointer"
            />
          </div>

          <Separator orientation="vertical" className="mx-1 h-8" />

          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Undo <kbd className="ml-1 text-[10px]">⌘Z</kbd>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Redo <kbd className="ml-1 text-[10px]">⌘⇧Z</kbd>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="mx-1 h-8" />

          {onAICommand && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-violet-500 hover:text-violet-600 hover:bg-violet-50"
                  onClick={onAICommand}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                AI Generate <kbd className="ml-1 text-[10px]">⌘K</kbd>
              </TooltipContent>
            </Tooltip>
          )}

          {onStartGame && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-9 w-9',
                    isGameActive
                      ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                      : 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                  )}
                  onClick={onStartGame}
                >
                  <Gamepad2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isGameActive ? 'Game Active' : 'Start Game'}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onClear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Clear Canvas</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default WhiteboardControls;
