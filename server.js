// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path'); // ✅ nécessaire pour servir index.html

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // ✅ sert tout le dossier "public"

// ✅ route par défaut : ouvre index.html quand on va sur /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

let waiting = null;
let games = {};
let profiles = {};
try {
  const data = fs.readFileSync('./profiles.json', 'utf8');
  profiles = JSON.parse(data || '{}');
} catch (e) {
  profiles = {};
}

// REST endpoints
app.post('/saveProfile', (req, res) => {
  const { id, profile } = req.body;
  if (!id) return res.status(400).json({ error: 'missing id' });
  profiles[id] = profile;
  try { fs.writeFileSync('./profiles.json', JSON.stringify(profiles)); } catch(e){}
  res.json({ ok:true });
});

app.get('/profile/:id', (req, res) => {
  const id = req.params.id;
  res.json(profiles[id] || null);
});

app.get('/leaderboard', (req, res) => {
  const list = Object.keys(profiles).map(id => ({
    id,
    xp: profiles[id].xp || 0,
    coins: profiles[id].coins || 0
  }));
  list.sort((a,b)=>b.xp - a.xp);
  res.json(list.slice(0,50));
});

// WebSocket matchmaking
wss.on('connection', (ws) => {
  ws.id = uuidv4();
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch(e) { return; }

    if (msg.type === 'findMatch') {
      if (waiting && waiting.readyState === WebSocket.OPEN && waiting !== ws) {
        const gameId = uuidv4();
        games[gameId] = { players: [waiting, ws], created: Date.now() };
        waiting.gameId = gameId;
        ws.gameId = gameId;
        try {
          waiting.send(JSON.stringify({ type:'matchFound', gameId, color: 'blanc' }));
          ws.send(JSON.stringify({ type:'matchFound', gameId, color: 'noir' }));
        } catch(e){}
        waiting = null;
      } else {
        waiting = ws;
        ws.send(JSON.stringify({ type: 'waiting' }));
      }
    }

    else if (msg.type === 'move') {
      const gameId = msg.gameId;
      if (!gameId || !games[gameId]) {
        ws.send(JSON.stringify({ type:'error', message:'invalid gameId' }));
        return;
      }
      const players = games[gameId].players;
      const other = players.find(p => p !== ws);
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({ type:'opponentMove', move: msg.move }));
      }
    }

    else if (msg.type === 'resign') {
      const gameId = msg.gameId;
      if (games[gameId]) {
        const players = games[gameId].players;
        const other = players.find(p => p !== ws);
        if (other && other.readyState === WebSocket.OPEN) {
          other.send(JSON.stringify({ type:'gameOver', reason:'resign', winner:'opponent' }));
        }
        delete games[gameId];
      }
    }
  });

  ws.on('close', () => {
    if (waiting === ws) waiting = null;
    if (ws.gameId && games[ws.gameId]) {
      const players = games[ws.gameId].players;
      const other = players.find(p => p !== ws);
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({ type:'gameOver', reason:'opponent_disconnected' }));
      }
      delete games[ws.gameId];
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
