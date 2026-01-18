import { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Zap, Users, ArrowRight, Sparkles, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface RoomManagerProps {
  onRoomJoined?: (roomId: string) => void;
  initialJoinRoomId?: string;
}

interface PublicRoom {
  roomId: string;
  userCount: number;
  hasPassword: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'synapse_user';

const RoomManager: React.FC<RoomManagerProps> = ({ onRoomJoined, initialJoinRoomId }) => {
  const { socket, isConnected } = useSocket();
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState(initialJoinRoomId || '');
  const [password, setPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(initialJoinRoomId ? 'join' : 'create');
  
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session?.userName) {
          setUserName(session.userName);
        }
      } catch {
      }
    }
  }, []);

  useEffect(() => {
    if (initialJoinRoomId) {
      setRoomId(initialJoinRoomId);
      setActiveTab('join');
    }
  }, [initialJoinRoomId]);

  const fetchPublicRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      setPublicRooms(data.rooms || []);
    } catch {
      setPublicRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchPublicRooms();
    const interval = setInterval(fetchPublicRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data: { roomId: string }) => {
      saveUserName();
      onRoomJoined?.(data.roomId);
    };

    const handleRoomJoined = (data: { roomId: string }) => {
      saveUserName();
      onRoomJoined?.(data.roomId);
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
    };
  }, [socket, onRoomJoined]);

  const saveUserName = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const session = stored ? JSON.parse(stored) : {};
    session.userName = userName;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  };

  const handleCreateRoom = () => {
    if (!userName.trim() || !socket) return;
    socket.emit('create-room', { 
      userName, 
      password: usePassword ? password : null 
    });
  };

  const handleJoinRoom = () => {
    if (!userName.trim() || !roomId.trim() || !socket) return;
    socket.emit('join-room', { 
      roomId: roomId.toUpperCase().trim(), 
      userName,
      password: joinPassword || null
    });
  };

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomId(e.target.value.toUpperCase());
  };

  const handleSelectRoom = (room: PublicRoom) => {
    setRoomId(room.roomId);
    setActiveTab('join');
    if (room.hasPassword) {
      setShowJoinPassword(true);
    }
  };

  const nonPasswordRooms = publicRooms.filter(r => !r.hasPassword);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-slate-200/50 shadow-2xl backdrop-blur">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg"
            >
              <Zap className="h-8 w-8 text-white" />
            </motion.div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              Synapse<span className="text-indigo-600">.AI</span>
            </CardTitle>
            <CardDescription className="text-base">
              AI-Powered Collaborative Whiteboard
            </CardDescription>
            <div className="mt-2 flex items-center justify-center gap-2">
              {isConnected ? (
                <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  Connecting...
                </span>
              )}
              <span className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                <Sparkles className="h-3 w-3" />
                AI Powered
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6">
              <Label htmlFor="username" className="mb-2 block text-sm font-medium">
                Your Name
              </Label>
              <Input
                id="username"
                placeholder="Enter your name..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="h-11"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Room</TabsTrigger>
                <TabsTrigger value="join">Join Room</TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-4">
                <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Zap className="h-6 w-6 text-indigo-500" />
                  </div>
                  <p className="text-sm text-slate-600">
                    Create a new room and share the Room ID with others to collaborate together.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="use-password" className="text-sm font-medium cursor-pointer">
                      Password protect room
                    </Label>
                  </div>
                  <Switch
                    id="use-password"
                    checked={usePassword}
                    onCheckedChange={setUsePassword}
                  />
                </div>

                {usePassword && (
                  <div className="relative">
                    <Label htmlFor="create-password" className="mb-2 block text-sm font-medium">
                      Room Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="create-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  className="h-11 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                  onClick={handleCreateRoom}
                  disabled={!isConnected || !userName.trim() || (usePassword && !password.trim())}
                >
                  Create New Room
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </TabsContent>

              <TabsContent value="join" className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-600">
                  <p>Enter the Room ID shared by the host to join their session.</p>
                </div>

                <div>
                  <Label htmlFor="room-id" className="mb-2 block text-sm font-medium">
                    Room ID
                  </Label>
                  <Input
                    id="room-id"
                    placeholder="e.g. A1B2C3D4"
                    value={roomId}
                    onChange={handleRoomIdChange}
                    className="h-11 font-mono uppercase tracking-wider"
                    maxLength={8}
                  />
                </div>

                <div className="relative">
                  <Label htmlFor="join-password" className="mb-2 block text-sm font-medium">
                    Password <span className="text-muted-foreground">(if required)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="join-password"
                      type={showJoinPassword ? 'text' : 'password'}
                      placeholder="Enter room password..."
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowJoinPassword(!showJoinPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showJoinPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  className="h-11 w-full"
                  variant="secondary"
                  onClick={handleJoinRoom}
                  disabled={!isConnected || !userName.trim() || !roomId.trim()}
                >
                  Join Room
                  <Users className="ml-2 h-4 w-4" />
                </Button>

                <div className="mt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-700">Active Public Rooms</h3>
                    <button
                      onClick={fetchPublicRooms}
                      disabled={isLoadingRooms}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  
                  {isLoadingRooms && publicRooms.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-500">
                      Loading active rooms...
                    </div>
                  ) : nonPasswordRooms.length > 0 ? (
                    <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                      {nonPasswordRooms.map((room) => (
                        <button
                          key={room.roomId}
                          onClick={() => handleSelectRoom(room)}
                          className="flex items-center justify-between rounded-lg border bg-white p-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                        >
                          <div>
                            <span className="font-mono text-sm font-semibold text-slate-800">
                              {room.roomId}
                            </span>
                            {room.hasPassword && (
                              <Lock className="ml-2 inline h-3 w-3 text-amber-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Users className="h-3 w-3" />
                            {room.userCount}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">
                      No public rooms active right now.
                      <br />
                      Create one to get started!
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          Create a room first, then share the Room ID with others to collaborate
        </p>
      </motion.div>
    </div>
  );
};

export default RoomManager;
