# Synapse.AI - Real-time Collaborative Whiteboard & Drawing Game

A real-time collaborative whiteboard application with an integrated Skribbl-style drawing game, powered by AI.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## ✨ Features

### 🎨 Collaborative Whiteboard
- **Real-time drawing** with multiple users
- **Drawing tools**: Pen, eraser, text, shapes (rectangle, circle, line, arrow)
- **Live cursors** - See where everyone is drawing
- **Undo/redo** functionality
- **Color picker** and line width controls

### 🎮 Drawing Game (Skribbl-style)
- Turn-based guessing game (2+ players)
- Configurable rounds, draw time, and word count
- Real-time chat with auto-detection of correct guesses
- Points system based on guess timing
- Progressive word hints
- Custom word lists support
- Live leaderboard

### 🤖 AI Features (Powered by Google Gemini)
- AI command palette (`Ctrl+K`)
- Generate diagrams from text prompts
- AI-generated game words
- Drawing analysis

### 🏠 Room Management
- Create/join rooms with unique IDs
- Password-protected rooms
- Public lobby showing active rooms
- Persistent sessions (survive page reloads)
- Shareable room links

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 16+ installed
- Google Gemini API key (optional, for AI features)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd soft

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment

Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=your-api-key-here
```

### 3. Run

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

Visit `http://localhost:5173`

## 🌐 Deploy to Render (Recommended)

Deploy both frontend and backend to Render in minutes:

1. **Push to GitHub**
2. **Click** [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
3. **Set** `GEMINI_API_KEY` environment variable
4. **Done!** Your app is live with HTTPS and WebSocket support

📖 See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Free Tier Notes
- ✅ Free hosting for both frontend & backend
- ⚠️ Services sleep after 15 min inactivity (30-60s cold start)
- ⚠️ Ephemeral storage (room data resets on restart)
- 💡 Upgrade to $7/mo for always-on + persistent storage

## 🛠️ Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS + Radix UI
- Socket.io-client (WebSocket)
- Framer Motion (animations)
- React Router (navigation)

**Backend:**
- Node.js + Express 5
- Socket.io (WebSocket server)
- Google Gemini API (AI features)
- File-based persistence (JSON)

## 📁 Project Structure

```
soft/
├── client/              # Frontend React app
│   ├── src/
│   │   ├── components/  # UI components
│   │   │   ├── whiteboard/  # Canvas, controls, cursors
│   │   │   ├── game/        # Game UI components
│   │   │   ├── ai/          # AI command palette
│   │   │   └── ui/          # Reusable UI (Radix)
│   │   ├── context/     # React Context (Socket, Game)
│   │   ├── hooks/       # Custom hooks
│   │   ├── types/       # TypeScript types
│   │   └── lib/         # Utilities
│   └── package.json
│
├── server/              # Backend Node.js server
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   ├── game.js      # Game mechanics
│   │   ├── gemini.js    # AI integration
│   │   └── persistence.js  # Data storage
│   ├── data/            # Room data storage
│   └── index.js         # Main server file
│
├── render.yaml          # Render deployment config
└── DEPLOYMENT.md        # Deployment guide
```

## 🎯 How to Use

1. **Create/Join Room**: Enter your name and create or join a room
2. **Draw Together**: Use the whiteboard tools to collaborate
3. **Start Game**: Click "Start Game" when 2+ players are ready
4. **Play**: Take turns drawing while others guess
5. **AI Features**: Press `Ctrl+K` to open AI command palette

## 🔑 Environment Variables

### Backend (`server/.env`)
```env
PORT=5000                    # Server port
NODE_ENV=development         # Environment
GEMINI_API_KEY=your-key      # Google Gemini API key (optional)
```

### Frontend (`client/.env`)
```env
VITE_SERVER_URL=http://localhost:5000  # Backend URL
```

## 🐛 Troubleshooting

**WebSocket connection fails:**
- Ensure backend is running on correct port
- Check `VITE_SERVER_URL` matches backend URL
- Verify CORS settings allow your frontend origin

**Room data lost:**
- On free Render tier, storage is ephemeral
- Upgrade to paid plan or implement external database

**AI features not working:**
- Verify `GEMINI_API_KEY` is set correctly
- Check API quota limits

## 📝 API Endpoints

- `GET /api/rooms` - List active rooms
- `GET /api/rooms/:roomId` - Get room details
- `POST /api/ai/diagram` - Generate AI diagram
- `POST /api/ai/words` - Generate game words
- `POST /api/ai/analyze` - Analyze drawing

## 🎮 Keyboard Shortcuts

- `Ctrl+K` - AI Command Palette
- `P` - Pen tool
- `E` - Eraser
- `T` - Text tool
- `S` - Select
- `R` - Rectangle
- `C` - Circle
- `L` - Line
- `A` - Arrow

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Feel free to submit issues and pull requests.
