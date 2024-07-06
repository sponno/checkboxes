'use strict';
const express = require('express');
const path = require('path');
const { createServer } = require('http');
const WebSocket = require('ws');
const app = express();

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../build')));

const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Game state (adapt this to your game logic)
let gameState = {
  checkboxes: Array(100).fill(null),
  players: new Set(),
  lastWon: null,
  currentLevel: 1,
  gridConfig: { rows: 10, cols: 10 }
};

wss.on('connection', function (ws) {
  console.log('New client connected');

  // Add player to the game
  const playerId = Date.now().toString();
  gameState.players.add(playerId);

  // Send initial game state
  ws.send(JSON.stringify({
    type: 'gameStateUpdate',
    gameState: gameState,
    playerNumber: gameState.players.size
  }));

  ws.on('message', function(message) {
    const data = JSON.parse(message);
    if (data.type === 'toggleCheckbox') {
      // Handle checkbox toggle (adapt this to your game logic)
      const index = data.index;
      gameState.checkboxes[index] = gameState.checkboxes[index] ? null : playerId;

      // Broadcast updated game state to all clients
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'gameStateUpdate',
            gameState: gameState
          }));
        }
      });
    }
  });

  ws.on('close', function () {
    console.log('Client disconnected');
    gameState.players.delete(playerId);
  });
});

// Catch-all handler for any request that doesn't match the ones above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

server.listen(8080, function () {
  console.log('Listening on http://0.0.0.0:8080');
});