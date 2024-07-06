import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Checkbox,
  Grid,
  Alert,
  Button
} from '@mui/material';

// const SOCKET_URL = process.env.NODE_ENV === 'production'
//   ? 'https://seashell-app-zjonr.ondigitalocean.app'
//   : 'http://localhost:5001';

const SOCKET_URL = 'https://seashell-app-zjonr.ondigitalocean.app:443';
const generateClientId = () => 'client_' + Math.random().toString(36).substr(2, 9);

const GameBoard = () => {
  const [socket, setSocket] = useState(null);
  const [clientId] = useState(generateClientId);
  const [checkboxes, setCheckboxes] = useState([]);
  const [lastWon, setLastWon] = useState(null);
  const [playerNumber, setPlayerNumber] = useState(null);
  const [gameStatus, setGameStatus] = useState('Connecting to server...');
  const [gridConfig, setGridConfig] = useState({ rows: 1, cols: 1 });
  const [playerCount, setPlayerCount] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);

  const connectSocket = useCallback(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setGameStatus('Connected. Registering...');
      newSocket.emit('register', clientId);
    });

    newSocket.on('gameStateUpdate', (state) => {
      console.log('Game state updated:', state);
      setCheckboxes(state.checkboxes || []);
      setLastWon(state.lastWon);
      setGridConfig(state.gridConfig);
      setCurrentLevel(state.currentLevel);
      if (state.playerNumber) {
        setPlayerNumber(state.playerNumber);
      }
      setGameStatus('Game in progress');
    });

    newSocket.on('playerCountUpdate', (count) => {
      console.log('Player count updated:', count);
      setPlayerCount(count);
    });

    newSocket.on('gameWon', (winTime) => {
      console.log('Game won at:', winTime);
      setLastWon(winTime);
      setGameStatus('Level complete! Moving to next level...');
      setTimeout(() => setGameStatus('Game in progress'), 3000);
    });

    newSocket.on('seasonEnd', (message) => {
      setGameStatus(message);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      setGameStatus(`Disconnected: ${reason}. Trying to reconnect...`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [clientId]);

  useEffect(() => {
    connectSocket();
  }, [connectSocket]);

  const handleCheckboxChange = useCallback((index) => {
    if (socket) {
      setCheckboxes(prev => {
        const newCheckboxes = [...prev];
        newCheckboxes[index] = newCheckboxes[index] === playerNumber ? null : playerNumber;
        return newCheckboxes;
      });

      socket.emit('toggleCheckbox', { clientId, index }, (acknowledgement) => {
        if (!acknowledgement.success) {
          setCheckboxes(prev => {
            const newCheckboxes = [...prev];
            newCheckboxes[index] = acknowledgement.currentState;
            return newCheckboxes;
          });
        }
      });
    }
  }, [socket, clientId, playerNumber]);

  const getTimeSinceLastWon = () => {
    if (!lastWon) return 'Never';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - lastWon;
    return `${Math.floor(diff / 60)} minutes ago`;
  };

  const getCheckboxColor = (checkboxState) => {
    if (checkboxState === null) return 'default';
    return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292', '#AED581', '#FFD54F', '#7986CB', '#9575CD', '#4DB6AC', '#DCE775'][(checkboxState - 1) % 12];
  };

  return (
    <Card sx={{ maxWidth: 800, margin: 'auto', mt: 4 }}>
      <CardHeader title={`Level ${currentLevel}: ${gridConfig.rows}x${gridConfig.cols} Checkboxes`} />
      <CardContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          {gameStatus}
          {playerNumber && ` (You are Player ${playerNumber})`}
        </Alert>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Players online: {playerCount}
        </Typography>
        <Grid container spacing={1} sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {checkboxes.map((checkboxState, index) => (
            <Grid item xs={12 / gridConfig.cols} key={index}>
              <Checkbox
                checked={checkboxState !== null}
                onChange={() => handleCheckboxChange(index)}
                disabled={gameStatus !== 'Game in progress'}
                sx={{
                  color: getCheckboxColor(checkboxState),
                  '&.Mui-checked': {
                    color: getCheckboxColor(checkboxState),
                  },
                }}
              />
            </Grid>
          ))}
        </Grid>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Last level completed: {getTimeSinceLastWon()}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default GameBoard;