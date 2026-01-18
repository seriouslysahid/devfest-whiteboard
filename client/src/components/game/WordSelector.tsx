import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export function WordSelector() {
  const { wordChoices, selectWord, session, isDrawing } = useGame();

  if (!session || session.phase !== 'choosing' || !isDrawing || wordChoices.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Choose a word to draw</CardTitle>
          <CardDescription>Select one of the words below</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-center gap-3">
          {wordChoices.map((word) => (
            <Button
              key={word}
              variant="outline"
              size="lg"
              onClick={() => selectWord(word)}
              className="min-w-24"
            >
              {word}
            </Button>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
