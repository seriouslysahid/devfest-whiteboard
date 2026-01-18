import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GameChat() {
  const { session, guessWord, sendChat, isDrawing } = useGame();
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.chat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (session?.phase === 'drawing' && !isDrawing) {
      guessWord(message);
    } else {
      sendChat(message);
    }
    setMessage('');
  };

  if (!session) return null;

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold">Chat</h3>
      </div>
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-2">
          {session.chat.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'text-sm',
                msg.type === 'system' && 'text-muted-foreground italic',
                msg.type === 'correct-guess' && 'text-green-600 font-medium',
                msg.type === 'close-guess' && 'text-amber-600'
              )}
            >
              {msg.type === 'chat' && (
                <span className="font-medium">{msg.userName}: </span>
              )}
              {msg.message}
            </div>
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="border-t p-2">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              session.phase === 'drawing' && !isDrawing
                ? 'Type your guess...'
                : 'Type a message...'
            }
            disabled={isDrawing && session.phase === 'drawing'}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
