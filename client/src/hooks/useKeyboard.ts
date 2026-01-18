import { useEffect, useCallback, useRef } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;
type KeyBindings = Record<string, KeyHandler>;

interface UseKeyboardOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useKeyboard(
  bindings: KeyBindings,
  options: UseKeyboardOptions = {}
): void {
  const { enabled = true, preventDefault = true } = options;
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    const target = e.target as HTMLElement;
    const active = document.activeElement as HTMLElement;
    
    // DEBUG LOG
    // console.log('[Keyboard]', { key: e.key, target: target.tagName, active: active?.tagName });

    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable ||
      (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable))
    ) {
      return;
    }

    const key = getKeyCombo(e);
    const handler = bindingsRef.current[key];
    
    if (handler) {
      if (preventDefault) e.preventDefault();
      handler(e);
    }
  }, [enabled, preventDefault]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

function getKeyCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  
  const key = e.key.toLowerCase();
  if (!['control', 'meta', 'shift', 'alt'].includes(key)) {
    parts.push(key);
  }
  
  return parts.join('+');
}

export const KEYBOARD_SHORTCUTS = {
  UNDO: 'mod+z',
  REDO: 'mod+shift+z',
  REDO_ALT: 'mod+y',
  CLEAR: 'mod+shift+x',
  PEN: 'p',
  ERASER: 'e',
  TEXT: 't',
  SELECT: 'v',
  RECTANGLE: 'r',
  CIRCLE: 'c',
  LINE: 'l',
  ARROW: 'a',
  ESCAPE: 'escape',
  DELETE: 'delete',
  BACKSPACE: 'backspace',
  AI_COMMAND: 'mod+k'
} as const;
