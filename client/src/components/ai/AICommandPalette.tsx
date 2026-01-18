import React, { useState, useEffect, useCallback } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Sparkles, Loader2, Wand2, MessageSquare, Shapes } from 'lucide-react';
import type { DrawOperation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface AICommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOperationsGenerated: (operations: DrawOperation[]) => void;
  serverUrl?: string;
}

const SUGGESTIONS = [
  // Technical Diagrams
  { icon: Shapes, label: 'Flowchart', prompt: 'Create a flowchart for a user login process with start, input credentials, validate, success/failure branches, and end' },
  { icon: MessageSquare, label: 'UML Class Diagram', prompt: 'Create a UML class diagram showing User class with id, name, email attributes and getProfile(), updatePassword() methods, connected to Order class' },
  { icon: Shapes, label: 'System Architecture', prompt: 'Create a system architecture diagram with Frontend, API Gateway, Backend Service, and Database components connected with arrows' },
  { icon: Shapes, label: 'ER Diagram', prompt: 'Create an entity relationship diagram for Users, Products, and Orders tables with relationships' },
  // Organizational
  { icon: Shapes, label: 'Mind Map', prompt: 'Create a mind map with "Project Planning" in center, branching to: Timeline, Budget, Team, Resources, and Risks' },
  { icon: Shapes, label: 'Org Chart', prompt: 'Create an organization chart with CEO at top, 3 VPs below (Engineering, Sales, Marketing), and 2 managers under each VP' },
  // Creative
  { icon: Wand2, label: 'Draw a Cat', prompt: 'Draw a cute cartoon cat with whiskers, pointy ears, and a happy face' },
  { icon: Wand2, label: 'Draw a House', prompt: 'Draw a simple house with a triangular roof, door, windows, and a chimney' },
  { icon: Wand2, label: 'Draw a Tree', prompt: 'Draw a tree with a brown trunk and green leafy canopy' },
  { icon: Wand2, label: 'Draw a Robot', prompt: 'Draw a friendly robot with a rectangular body, circular head, antenna, and mechanical arms' },
  // UI/Wireframes
  { icon: Shapes, label: 'Login Wireframe', prompt: 'Create a wireframe for a login page with logo area, email input, password input, login button, and forgot password link' },
  { icon: Shapes, label: 'Dashboard Layout', prompt: 'Create a dashboard wireframe with header, sidebar navigation, main content area with 4 stat cards, and a chart placeholder' },
];

export function AICommandPalette({
  open,
  onOpenChange,
  onOperationsGenerated,
  serverUrl = 'http://localhost:5000'
}: AICommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setError(null);
    }
  }, [open]);

  const generateDiagram = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('[AI] Requesting diagram for:', prompt);
      const response = await fetch(`${serverUrl}/api/ai/diagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI] Server error:', errorText);
        throw new Error('Failed to generate diagram');
      }

      const data = await response.json();
      console.log('[AI] Received data:', data);
      
      if (data.operations && data.operations.length > 0) {
        // Assign UUIDs to AI operations to ensure Undo/Redo works correctly
        const operationsWithIds = data.operations.map((op: DrawOperation) => ({
          ...op,
          id: op.id || uuidv4(),
          timestamp: Date.now()
        }));
        
        onOperationsGenerated(operationsWithIds);
        onOpenChange(false);
      } else {
        console.warn('[AI] No operations in response');
        setError('No diagram generated. Try a more specific prompt.');
      }
    } catch (err) {
      console.error('[AI] Client error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, onOperationsGenerated, onOpenChange]);

  const handleSelect = useCallback((prompt: string) => {
    generateDiagram(prompt);
  }, [generateDiagram]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim() && !isLoading) {
      e.preventDefault();
      generateDiagram(query);
    }
  }, [query, isLoading, generateDiagram]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center border-b px-3">
        <Sparkles className="mr-2 h-4 w-4 shrink-0 text-violet-500" />
        <CommandInput
          placeholder="Describe what you want to draw..."
          value={query}
          onValueChange={setQuery}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <CommandList>
        {error && (
          <div className="px-4 py-3 text-sm text-red-500">{error}</div>
        )}
        <CommandEmpty>
          {query ? 'Press Enter to generate...' : 'Type a description or select a suggestion'}
        </CommandEmpty>
        <CommandGroup heading="Suggestions">
          {SUGGESTIONS.map((suggestion) => (
            <CommandItem
              key={suggestion.label}
              onSelect={() => handleSelect(suggestion.prompt)}
              disabled={isLoading}
            >
              <suggestion.icon className="mr-2 h-4 w-4" />
              <span>{suggestion.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          <span className="text-xs">⌘</span>K
        </kbd>
        <span className="ml-2">to open</span>
        <span className="mx-2">•</span>
        <span>Powered by Gemini AI</span>
      </div>
    </CommandDialog>
  );
}
