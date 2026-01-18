import { useGame } from '@/context/GameContext';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GameTimer() {
  const { session, config } = useGame();

  if (!session || session.phase !== 'drawing') return null;

  const percentage = (session.timeRemaining / config.drawTime) * 100;
  const isLow = session.timeRemaining <= 10;

  return (
    <div className="flex items-center gap-3">
      <Clock className={cn('h-5 w-5', isLow && 'text-red-500 animate-pulse')} />
      <div className="flex-1">
        <Progress
          value={percentage}
          className={cn('h-2', isLow && '[&>div]:bg-red-500')}
        />
      </div>
      <span className={cn('font-mono text-lg font-bold', isLow && 'text-red-500')}>
        {session.timeRemaining}s
      </span>
    </div>
  );
}
