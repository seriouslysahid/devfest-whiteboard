import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { getAvatarUrl } from '@/lib/avatars';

interface CursorData {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
  lastUpdate: number;
}

interface CursorsProps {
  cursors: Map<string, CursorData>;
  currentUserId?: string;
}

const CURSOR_TIMEOUT = 5000;

export function Cursors({ cursors, currentUserId }: CursorsProps) {
  const [visibleCursors, setVisibleCursors] = useState<CursorData[]>([]);

  useEffect(() => {
    const now = Date.now();
    const active = Array.from(cursors.values())
      .filter(c => c.userId !== currentUserId && now - c.lastUpdate < CURSOR_TIMEOUT);
    setVisibleCursors(active);
  }, [cursors, currentUserId]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {visibleCursors.map((cursor) => (
          <motion.div
            key={cursor.userId}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1, x: cursor.x, y: cursor.y }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute left-0 top-0"
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          >
            <div className="relative">
              <CursorIcon color={cursor.color} />
              
              <div 
                className="absolute -left-2 -top-6 h-8 w-8 overflow-hidden rounded-full border-2 bg-white shadow-sm"
                style={{ borderColor: cursor.color }}
              >
                <img 
                  src={getAvatarUrl(cursor.userId || cursor.userName)} 
                  alt="" 
                  className="h-full w-full object-cover"
                />
              </div>

              <div
                className="absolute left-4 top-4 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-white shadow-sm"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.userName}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function CursorIcon({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.65 2.38L21.19 10.47C22.27 11.07 22.27 12.93 21.19 13.53L5.65 21.62C4.47 22.28 3 21.4 3 20.07V3.93C3 2.6 4.47 1.72 5.65 2.38Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function useCursors(
  socket: any,
  roomId: string | null,
  userId: string | null,
  userName: string | null
) {
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleCursorMove = (data: { userId: string; userName: string; x: number; y: number; color?: string }) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, {
          ...data,
          color: data.color || getColorForUser(data.userId),
          lastUpdate: Date.now()
        });
        return next;
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on('cursor-move', handleCursorMove);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('cursor-move', handleCursorMove);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, roomId]);

  const emitCursor = (x: number, y: number) => {
    if (socket && roomId && userId && userName) {
      socket.emit('cursor-move', { roomId, userId, userName, x, y });
    }
  };

  return { cursors, emitCursor };
}

function getColorForUser(userId: string): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
