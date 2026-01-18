import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Play, Users } from 'lucide-react';

interface GameLobbyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerCount: number;
}

export function GameLobby({ open, onOpenChange, playerCount }: GameLobbyProps) {
  const { isHost, startGame, config, updateConfig } = useGame();

  const canStart = playerCount >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Start Drawing Game
          </DialogTitle>
          <DialogDescription>
            Play a Skribbl-style drawing game with other players in the room.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{playerCount} player{playerCount !== 1 && 's'} in room</span>
          </div>

          {isHost && (
            <>
              <div className="space-y-3">
                <Label>Rounds: {config.rounds}</Label>
                <Slider
                  value={[config.rounds]}
                  onValueChange={([v]) => updateConfig({ rounds: v })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <Label>Draw Time: {config.drawTime}s</Label>
                <Slider
                  value={[config.drawTime]}
                  onValueChange={([v]) => updateConfig({ drawTime: v })}
                  min={30}
                  max={180}
                  step={10}
                />
              </div>

              <div className="space-y-3">
                <Label>Custom Words (optional)</Label>
                <Input
                  placeholder="word1, word2, word3..."
                  onChange={(e) =>
                    updateConfig({
                      customWords: e.target.value.split(',').map((w) => w.trim()).filter(Boolean)
                    })
                  }
                />
              </div>
            </>
          )}

          {!canStart && (
            <p className="text-sm text-muted-foreground">
              Need at least 2 players to start the game.
            </p>
          )}
        </div>

        {isHost && (
          <Button
            onClick={() => {
              startGame();
              onOpenChange(false);
            }}
            disabled={!canStart}
            className="w-full"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Game
          </Button>
        )}

        {!isHost && (
          <p className="text-center text-sm text-muted-foreground">
            Waiting for host to start the game...
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
