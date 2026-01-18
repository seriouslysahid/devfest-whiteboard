import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SocketProvider, useSocket } from '@/context/SocketContext';
import { GameProvider } from '@/context/GameContext';
import RoomManager from '@/components/RoomManager';
import Whiteboard from '@/components/whiteboard/Whiteboard';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import type { User, DrawOperation } from '@/types';

const STORAGE_KEY = 'synapse_user';

interface StoredSession {
  userId: string;
  userName: string;
  roomId: string;
  isHost?: boolean;
}

interface RoomState {
  roomId: string;
  userId: string;
  userName: string;
  role: 'host' | 'participant';
  users: User[];
  operations: DrawOperation[];
}

function getStoredSession(): StoredSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    return null;
  }
  return null;
}

function saveSession(session: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSessionRoom(): void {
  const session = getStoredSession();
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      ...session, 
      roomId: '', 
      isHost: false 
    }));
  }
}

function LobbyRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinRoomId = searchParams.get('join');

  const handleRoomJoined = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  return (
    <RoomManager 
      onRoomJoined={handleRoomJoined} 
      initialJoinRoomId={joinRoomId || undefined}
    />
  );
}

function GameRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();

  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [needsName, setNeedsName] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);

  const handleRoomCreated = useCallback((data: { roomId: string; userId: string; role: 'host' }) => {
    const session = getStoredSession();
    const name = session?.userName || userName;
    
    setCurrentRoom({
      roomId: data.roomId,
      userId: data.userId,
      userName: name,
      role: data.role,
      users: [{ id: data.userId, name, role: 'host' }],
      operations: []
    });
    
    saveSession({ userId: data.userId, userName: name, roomId: data.roomId, isHost: true });
    setIsJoining(false);
    setHasAttemptedJoin(true);
    
    toast({
      title: 'Room Created!',
      description: `Room ID: ${data.roomId}`,
    });
  }, [userName, toast]);

  const handleRoomJoined = useCallback((data: {
    roomId: string;
    userId: string;
    role: 'host' | 'participant';
    operations: DrawOperation[];
    users: User[];
  }) => {
    const session = getStoredSession();
    const name = session?.userName || userName;
    
    setCurrentRoom({
      roomId: data.roomId,
      userId: data.userId,
      userName: name,
      role: data.role,
      users: data.users || [],
      operations: data.operations || []
    });
    
    saveSession({ 
      userId: data.userId, 
      userName: name, 
      roomId: data.roomId,
      isHost: data.role === 'host'
    });
    setIsJoining(false);
    setHasAttemptedJoin(true);
    setNeedsPassword(false);
    setNeedsName(false); // Fix: Explicitly clear needsName state
    
    toast({
      title: 'Joined Room!',
      description: 'Successfully connected to the session.',
    });
  }, [userName, toast]);

  const handleUserJoined = useCallback((user: User) => {
    setCurrentRoom(prev => {
      if (!prev) return null;
      if (prev.users.some(u => u.id === user.id)) return prev;

      toast({
        title: 'User Joined',
        description: `${user.name} has joined the room.`,
      });

      return {
        ...prev,
        users: [...prev.users, user]
      };
    });
  }, [toast]);

  const handleUserLeft = useCallback(({ userId }: { userId: string }) => {
    setCurrentRoom(prev => {
      if (!prev) return null;
      const user = prev.users.find(u => u.id === userId);
      if (user) {
        toast({
          title: 'User Left',
          description: `${user.name} has left the room.`,
        });
      }
      return {
        ...prev,
        users: prev.users.filter(u => u.id !== userId)
      };
    });
  }, [toast]);

  const handleError = useCallback((data: { message: string; code?: string }) => {
    setIsJoining(false);
    
    if (data.code === 'ROOM_NOT_FOUND') {
      toast({
        title: 'Room Not Found',
        description: data.message,
        variant: 'destructive'
      });
      clearSessionRoom();
      navigate('/');
      return;
    }
    
    if (data.code === 'INVALID_PASSWORD') {
      setNeedsPassword(true);
      toast({
        title: 'Password Required',
        description: 'This room requires a password.',
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: 'Error',
      description: data.message,
      variant: 'destructive'
    });
  }, [navigate, toast]);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('error', handleError);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('error', handleError);
    };
  }, [socket, handleRoomCreated, handleRoomJoined, handleUserJoined, handleUserLeft, handleError]);

  useEffect(() => {
    if (!socket || !isConnected || !roomId || currentRoom || hasAttemptedJoin) return;

    const session = getStoredSession();
    
    // Check if we already have a session for this specific room
    // If session.roomId matches current roomId, we're likely coming from RoomManager (just joined)
    // In that case, wait for room-joined event instead of re-emitting
    if (session?.roomId === roomId.toUpperCase().trim() && session?.userId) {
      // We have a valid session for this room - wait briefly to see if room-joined comes
      // This handles the case where user navigated from RoomManager
      const timeout = setTimeout(() => {
        if (!currentRoom && !hasAttemptedJoin) {
          // No room-joined received, this is a page reload - attempt rejoin
          setUserName(session.userName || '');
          socket.emit('join-room', {
            roomId: roomId.toUpperCase().trim(),
            userName: session.userName,
            userId: session.userId,
            password: null
          });
          setHasAttemptedJoin(true);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
    
    if (session?.userName) {
      // User has a name but different room - attempt to join with their identity
      setUserName(session.userName);
      socket.emit('join-room', {
        roomId: roomId.toUpperCase().trim(),
        userName: session.userName,
        userId: session.userId || null,
        password: null
      });
      setHasAttemptedJoin(true);
    } else {
      // No session - need name
      setIsJoining(false);
      setNeedsName(true);
    }
  }, [socket, isConnected, roomId, currentRoom, hasAttemptedJoin]);

  const handleNameSubmit = () => {
    if (!userName.trim() || !socket || !roomId) return;
    
    const session = getStoredSession();
    setIsJoining(true);
    socket.emit('join-room', {
      roomId: roomId.toUpperCase().trim(),
      userName: userName.trim(),
      userId: session?.userId || null,
      password: password || null
    });
    setHasAttemptedJoin(true);
  };

  if (isJoining) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-slate-600">Joining room {roomId}...</p>
        </div>
      </div>
    );
  }

  if (needsName || needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-xl font-semibold">
            {needsPassword ? 'Enter Password' : 'Enter Your Name'}
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            You're joining room <span className="font-mono font-bold">{roomId}</span>
          </p>
          {needsName && (
            <input
              type="text"
              placeholder="Your name..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !needsPassword && handleNameSubmit()}
              className="mb-4 w-full rounded-lg border px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              autoFocus={!needsPassword}
            />
          )}
          {needsPassword && (
            <input
              type="password"
              placeholder="Room password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              className="mb-4 w-full rounded-lg border px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              autoFocus={needsPassword}
            />
          )}
          <button
            onClick={handleNameSubmit}
            disabled={needsName ? !userName.trim() : !password.trim()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (currentRoom) {
    const handleLeaveRoom = () => {
      clearSessionRoom();
      navigate('/');
    };

    return (
      <GameProvider
        roomId={currentRoom.roomId}
        userId={currentRoom.userId}
        isHost={currentRoom.role === 'host'}
      >
        <Whiteboard
          roomId={currentRoom.roomId}
          userId={currentRoom.userId}
          userName={currentRoom.userName}
          initialOperations={currentRoom.operations}
          users={currentRoom.users}
          currentUserRole={currentRoom.role}
          onLeave={handleLeaveRoom}
        />
      </GameProvider>
    );
  }

  return null;
}

export default function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/" element={<LobbyRoute />} />
        <Route path="/room/:roomId" element={<GameRoute />} />
      </Routes>
      <Toaster />
    </SocketProvider>
  );
}
