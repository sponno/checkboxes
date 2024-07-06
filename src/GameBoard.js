import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Checkbox,
  Grid,
  Alert,
} from '@mui/material';

const GameBoard = () => {
  const [gameState, setGameState] = useState({
    checkboxes: [],
    players: [],
    lastWon: null,
    currentLevel: 1,
    gridConfig: { rows: 10, cols: 10 }
  });
  const [playerNumber, setPlayerNumber] = useState(null);
  const [gameStatus, setGameStatus] = useState('Connecting to server...');
  const [ws, setWs] = useState(null);

  const connectWebSocket = useCallback(() => {
    const wsUrl = `wss://${window.location.host}`;
    const newWs = new WebSocket(wsUrl);

    newWs.onopen = () => {
      console.log('WebSocket connected');
      setGameStatus('Connected. Waiting for game state...');
    };

    newWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'gameStateUpdate') {
        setGameState(data.gameState);
        if (data.playerNumber && !playerNumber) {
          setPlayerNumber(data.playerNumber);
        }
        setGameStatus('Game in progress');
      }
    };

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error);
      setGameStatus('Connection error. Please try again later.');
    };

    newWs.onclose = () => {
      console.log('WebSocket disconnected');
      setGameStatus('Disconnected. Trying to reconnect...');
      setTimeout(connectWebSocket, 5000);
    };

    setWs(newWs);
  }, [playerNumber]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket]);

  const handleCheckboxChange = (index) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'toggleCheckbox', index }));
    }
  };

  // ... rest of your component code (rendering, etc.) ...

  return (
    <Card sx={{ maxWidth: 800, margin: 'auto', mt: 4 }}>
      <CardHeader title={`${gameState.gridConfig.rows}x${gameState.gridConfig.cols} Checkboxes`} />
      <CardContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          {gameStatus}
          {playerNumber && ` (You are Player ${playerNumber})`}
        </Alert>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Players online: {gameState.players.length}
        </Typography>
        <Grid container spacing={1}>
          {gameState.checkboxes.map((checked, index) => (
            <Grid item xs={12 / gameState.gridConfig.cols} key={index}>
              <Checkbox
                checked={checked !== null}
                onChange={() => handleCheckboxChange(index)}
                disabled={gameStatus !== 'Game in progress'}
              />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default GameBoard;