import React from 'react';
import GameBoard from './GameBoard';  // Assuming you save the above component as GameBoard.js
import { CssBaseline, Container } from '@mui/material';

function App() {
  return (
    <>
      <CssBaseline />
      <Container>
        <GameBoard />
      </Container>
    </>
  );
}

export default App;