import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, Medal, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GameResultsProps {
  finalScores: Array<{ id: string; name: string; score: number }>;
  onClose: () => void;
}

export function GameResults({ finalScores, onClose }: GameResultsProps) {
  const { myId } = useGame();

  const medals = [
    { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-400/10' },
    { icon: Award, color: 'text-amber-600', bg: 'bg-amber-600/10' }
  ];

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Game Over!</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-6">
          {finalScores.slice(0, 3).map((player, index) => {
            const medal = medals[index];
            const Icon = medal?.icon || Award;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex items-center justify-between rounded-lg px-4 py-3',
                  medal?.bg,
                  player.id === myId && 'ring-2 ring-primary'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('h-6 w-6', medal?.color)} />
                  <div>
                    <p className="font-semibold">
                      {player.name}
                      {player.id === myId && ' (You)'}
                    </p>
                    <p className="text-sm text-muted-foreground">#{index + 1}</p>
                  </div>
                </div>
                <span className="text-xl font-bold">{player.score}</span>
              </motion.div>
            );
          })}

          {finalScores.length > 3 && (
            <div className="pt-2 space-y-2">
              {finalScores.slice(3).map((player, index) => (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center justify-between rounded px-4 py-2 text-sm',
                    player.id === myId && 'bg-primary/10'
                  )}
                >
                  <span>
                    #{index + 4} {player.name}
                    {player.id === myId && ' (You)'}
                  </span>
                  <span className="font-medium">{player.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={onClose} className="w-full">
          Back to Whiteboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}
