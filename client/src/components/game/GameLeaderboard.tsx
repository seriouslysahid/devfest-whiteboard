import { useGame } from '@/context/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Crown, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GameLeaderboard() {
  const { session, myId } = useGame();

  if (!session) return null;

  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold">Players</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-sm',
                player.id === myId && 'bg-primary/10',
                player.isDrawing && 'border-l-2 border-primary'
              )}
            >
              <div className="flex items-center gap-2">
                {index === 0 && session.phase !== 'lobby' && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
                <span className={cn(player.id === myId && 'font-medium')}>
                  {player.name}
                  {player.id === myId && ' (You)'}
                </span>
                {player.isDrawing && (
                  <Badge variant="secondary" className="h-5 gap-1 px-1.5">
                    <Pencil className="h-3 w-3" />
                    Drawing
                  </Badge>
                )}
                {player.hasGuessed && !player.isDrawing && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
              <span className="font-mono text-muted-foreground">{player.score}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
