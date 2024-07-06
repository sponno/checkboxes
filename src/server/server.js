const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


// Game configuration (can be moved to a separate config file)
const gameConfig = {
  initialCheckboxes: 1,
  maxWidth: 10,
  maxCheckboxes: 1000,
  seasonEndMessage: "Season One - Complete"
};

// Game state
let gameState = {
  checkboxes: Array(gameConfig.initialCheckboxes).fill(null),
  players: new Map(),
  lastWon: null,
  currentLevel: 1,
  gridConfig: { rows: 1, cols: 1 }
};

const getNextGridConfig = (currentTotal) => {
  if (currentTotal <= gameConfig.maxWidth * gameConfig.maxWidth) {
    const side = Math.ceil(Math.sqrt(currentTotal));
    return { rows: side, cols: side };
  } else {
    const cols = gameConfig.maxWidth;
    const rows = Math.ceil(currentTotal / cols);
    return { rows, cols };
  }
};

const resetGame = () => {
  const nextTotal = Math.min(gameState.currentLevel + 1, gameConfig.maxCheckboxes);
  const nextGrid = getNextGridConfig(nextTotal);
  gameState.checkboxes = Array(nextTotal).fill(null);
  gameState.gridConfig = nextGrid;
  gameState.currentLevel = nextTotal;
};

app.get('/test', (req, res) => {
  res.send('Server is working');
});


io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('register', (clientId) => {
    if (!gameState.players.has(clientId)) {
      const playerNumber = gameState.players.size + 1;
      gameState.players.set(clientId, playerNumber);
      console.log(`Player ${playerNumber} joined: ${clientId}`);

      socket.emit('gameStateUpdate', {
        ...gameState,
        players: Array.from(gameState.players.values()),
        playerNumber: playerNumber
      });

      io.emit('playerCountUpdate', gameState.players.size);
    }
  });

  socket.on('toggleCheckbox', (data, callback) => {
    const { clientId, index } = data;
    if (gameState.players.has(clientId)) {
      const playerNumber = gameState.players.get(clientId);
      gameState.checkboxes[index] = gameState.checkboxes[index] === playerNumber ? null : playerNumber;

      callback({ success: true, currentState: gameState.checkboxes[index] });

      io.emit('gameStateUpdate', {
        ...gameState,
        players: Array.from(gameState.players.values())
      });

      if (gameState.checkboxes.every(checkbox => checkbox !== null)) {
        gameState.lastWon = Math.floor(Date.now() / 1000);
        io.emit('gameWon', gameState.lastWon);

        if (gameState.currentLevel < gameConfig.maxCheckboxes) {
          resetGame();
          io.emit('gameStateUpdate', {
            ...gameState,
            players: Array.from(gameState.players.values())
          });
        } else {
          io.emit('seasonEnd', gameConfig.seasonEndMessage);
        }
      }
    } else {
      callback({ success: false, currentState: gameState.checkboxes[index] });
    }
  });

  socket.on('disconnect', () => {
    const clientId = Array.from(gameState.players.entries()).find(([, id]) => id === socket.id)?.[0];
    if (clientId) {
      gameState.players.delete(clientId);
      console.log(`Player disconnected. Total players: ${gameState.players.size}`);
      io.emit('playerCountUpdate', gameState.players.size);
    }
  });
});

const port = process.env.PORT || 8080;
server.listen(port, '0.0.0.0', function () {
  console.log(`Listening on http://0.0.0.0:${port}`);
});