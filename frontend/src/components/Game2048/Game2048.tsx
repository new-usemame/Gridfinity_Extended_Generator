import { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 4;
const STORAGE_KEY = 'gridfinity_2048_game_state';

interface GameState {
  board: number[][];
  score: number;
  highScore: number;
  gameOver: boolean;
  won: boolean;
  elapsedTime: number;
  startTime: number | null;
  pausedTime: number;
}

interface Game2048Props {
  isVisible: boolean;
  isPlayable: boolean;
  onGameOver?: (score: number, elapsedTime: number) => void;
}

export function Game2048({ isVisible, isPlayable, onGameOver }: Game2048Props) {
  const [board, setBoard] = useState<number[][]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved) as GameState;
        return state.board || initializeBoard();
      } catch {
        return initializeBoard();
      }
    }
    return initializeBoard();
  });

  const [score, setScore] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved) as GameState;
        return state.score || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  });

  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('gridfinity_2048_high_score');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const lastPauseTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved) as GameState;
        if (state.board) setBoard(state.board);
        if (state.score !== undefined) setScore(state.score);
        if (state.gameOver !== undefined) setGameOver(state.gameOver);
        if (state.won !== undefined) setWon(state.won);
        if (state.elapsedTime !== undefined) setElapsedTime(state.elapsedTime);
        if (state.pausedTime !== undefined) pausedTimeRef.current = state.pausedTime;
      } catch {
        // Invalid saved state, use defaults
      }
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (isVisible && isPlayable && !gameOver && !won) {
      // Resume timer
      if (startTimeRef.current === null) {
        // Calculate what the start time should be based on current elapsed and paused time
        const baseTime = Date.now() - elapsedTime - pausedTimeRef.current;
        startTimeRef.current = baseTime;
        lastPauseTimeRef.current = null;
      }
      
      const updateTimer = () => {
        if (startTimeRef.current !== null) {
          const now = Date.now();
          const elapsed = now - startTimeRef.current - pausedTimeRef.current;
          setElapsedTime(Math.max(0, elapsed));
          animationFrameRef.current = requestAnimationFrame(updateTimer);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(updateTimer);
      
      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        // When pausing, update pausedTime
        if (startTimeRef.current !== null && lastPauseTimeRef.current === null) {
          const now = Date.now();
          const sessionTime = now - startTimeRef.current;
          pausedTimeRef.current += sessionTime;
          lastPauseTimeRef.current = now;
          startTimeRef.current = null;
        }
      };
    } else {
      // Pause timer
      if (startTimeRef.current !== null && lastPauseTimeRef.current === null) {
        const now = Date.now();
        const sessionTime = now - startTimeRef.current;
        pausedTimeRef.current += sessionTime;
        lastPauseTimeRef.current = now;
        startTimeRef.current = null;
      }
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isVisible, isPlayable, gameOver, won, elapsedTime]);

  // Save state to localStorage
  useEffect(() => {
    const state: GameState = {
      board,
      score,
      highScore,
      gameOver,
      won,
      elapsedTime,
      startTime: startTimeRef.current,
      pausedTime: pausedTimeRef.current
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [board, score, highScore, gameOver, won, elapsedTime]);

  function initializeBoard(): number[][] {
    const newBoard = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    return newBoard;
  }

  function addRandomTile(board: number[][]): void {
    const emptyCells: [number, number][] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (board[i][j] === 0) {
          emptyCells.push([i, j]);
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      board[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  function moveLeft(board: number[][]): { newBoard: number[][]; scoreIncrease: number } {
    const newBoard = board.map(row => [...row]);
    let scoreIncrease = 0;

    for (let i = 0; i < GRID_SIZE; i++) {
      const row = newBoard[i].filter(val => val !== 0);
      const newRow: number[] = [];
      
      for (let j = 0; j < row.length; j++) {
        if (j < row.length - 1 && row[j] === row[j + 1]) {
          const merged = row[j] * 2;
          newRow.push(merged);
          scoreIncrease += merged;
          j++;
        } else {
          newRow.push(row[j]);
        }
      }
      
      while (newRow.length < GRID_SIZE) {
        newRow.push(0);
      }
      
      newBoard[i] = newRow;
    }

    return { newBoard, scoreIncrease };
  }

  function rotateBoard(board: number[][]): number[][] {
    const rotated = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        rotated[j][GRID_SIZE - 1 - i] = board[i][j];
      }
    }
    return rotated;
  }

  function move(board: number[][], direction: 'left' | 'right' | 'up' | 'down'): { newBoard: number[][]; scoreIncrease: number; moved: boolean } {
    let rotated = board;
    let rotations = 0;

    if (direction === 'right') {
      rotated = rotateBoard(rotateBoard(board));
      rotations = 2;
    } else if (direction === 'up') {
      rotated = rotateBoard(rotateBoard(rotateBoard(board)));
      rotations = 3;
    } else if (direction === 'down') {
      rotated = rotateBoard(board);
      rotations = 1;
    }

    const { newBoard, scoreIncrease } = moveLeft(rotated);
    let finalBoard = newBoard;

    for (let i = 0; i < rotations; i++) {
      finalBoard = rotateBoard(finalBoard);
    }

    const moved = JSON.stringify(board) !== JSON.stringify(finalBoard);
    return { newBoard: finalBoard, scoreIncrease, moved };
  }

  function canMove(board: number[][]): boolean {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (board[i][j] === 0) return true;
        if (i < GRID_SIZE - 1 && board[i][j] === board[i + 1][j]) return true;
        if (j < GRID_SIZE - 1 && board[i][j] === board[i][j + 1]) return true;
      }
    }
    return false;
  }

  const handleMove = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver || won || !isPlayable) return;

    const { newBoard, scoreIncrease, moved } = move(board, direction);
    
    if (moved) {
      addRandomTile(newBoard);
      const newScore = score + scoreIncrease;
      setScore(newScore);
      setBoard(newBoard);

      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('gridfinity_2048_high_score', newScore.toString());
      }

      // Check for win (2048 tile)
      if (!won && newBoard.some(row => row.some(cell => cell === 2048))) {
        setWon(true);
      }

      // Check for game over
      if (!canMove(newBoard)) {
        setGameOver(true);
        // Calculate current elapsed time directly
        let currentElapsed = elapsedTime;
        if (startTimeRef.current !== null) {
          const now = Date.now();
          currentElapsed = now - startTimeRef.current - pausedTimeRef.current;
        }
        if (onGameOver) {
          onGameOver(newScore, Math.max(0, currentElapsed));
        }
      }
    }
  }, [board, score, highScore, gameOver, won, isPlayable, elapsedTime, onGameOver]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPlayable) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        handleMove('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleMove('right');
        break;
      case 'ArrowUp':
        e.preventDefault();
        handleMove('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleMove('down');
        break;
    }
  }, [handleMove, isPlayable]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const newGame = () => {
    const newBoard = initializeBoard();
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setElapsedTime(0);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    lastPauseTimeRef.current = null;
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const getTileColor = (value: number): string => {
    if (value === 0) return 'bg-white/10 dark:bg-white/10';
    const colors: Record<number, string> = {
      2: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100',
      4: 'bg-green-100 dark:bg-green-800/30 text-green-900 dark:text-green-100',
      8: 'bg-green-200 dark:bg-green-700/40 text-green-900 dark:text-green-100',
      16: 'bg-green-300 dark:bg-green-600/50 text-green-900 dark:text-green-100',
      32: 'bg-green-400 dark:bg-green-500/60 text-white',
      64: 'bg-green-500 dark:bg-green-400 text-white',
      128: 'bg-green-600 dark:bg-green-500 text-white',
      256: 'bg-cyan-400 dark:bg-cyan-600 text-white',
      512: 'bg-cyan-500 dark:bg-cyan-500 text-white',
      1024: 'bg-cyan-600 dark:bg-cyan-400 text-white',
      2048: 'bg-gradient-to-br from-green-500 to-cyan-500 dark:from-green-400 dark:to-cyan-400 text-white',
      4096: 'bg-gradient-to-br from-green-600 to-cyan-600 dark:from-green-500 dark:to-cyan-500 text-white',
      8192: 'bg-gradient-to-br from-cyan-500 to-green-500 dark:from-cyan-400 dark:to-green-400 text-white',
    };
    // For values beyond our defined colors, use a gradient based on value
    if (!colors[value]) {
      // Cycle through green-cyan gradients for very high values
      const gradientIndex = Math.floor(Math.log2(value) / 2) % 3;
      const gradients = [
        'bg-gradient-to-br from-green-500 to-cyan-500 dark:from-green-400 dark:to-cyan-400',
        'bg-gradient-to-br from-cyan-500 to-green-500 dark:from-cyan-400 dark:to-green-400',
        'bg-gradient-to-br from-green-600 to-cyan-600 dark:from-green-500 dark:to-cyan-500',
      ];
      return `${gradients[gradientIndex]} text-white`;
    }
    return colors[value];
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Score and Timer Bar */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Score</div>
            <div className="text-slate-900 dark:text-white font-semibold text-sm sm:text-base">{score}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Best</div>
            <div className="text-slate-900 dark:text-white font-semibold text-sm sm:text-base">{highScore}</div>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Time</div>
          <div className="text-slate-600 dark:text-slate-400 font-mono text-xs sm:text-sm">{formatTime(elapsedTime)}</div>
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-transparent rounded-xl p-2 sm:p-4 relative">
        <div className="grid grid-cols-4 gap-2">
          {board.map((row, i) =>
            row.map((cell, j) => (
              <div
                key={`${i}-${j}`}
                className={`aspect-square flex items-center justify-center rounded-lg font-bold text-sm sm:text-base transition-colors ${
                  getTileColor(cell)
                }`}
              >
                {cell !== 0 && cell}
              </div>
            ))
          )}
        </div>

        {/* Game Over Overlay */}
        {(gameOver || won) && (
          <div className="absolute inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center rounded-xl">
            <div className="bg-black/80 dark:bg-black/90 border border-slate-300/50 dark:border-slate-600/50 rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-white mb-2">
                {won ? 'You Win!' : 'Game Over'}
              </div>
              <div className="text-sm text-white/80 dark:text-white/80 mb-4">
                Score: {score} | Time: {formatTime(elapsedTime)}
              </div>
              <button
                onClick={newGame}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 text-white rounded-xl font-semibold text-sm hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 transition-all"
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
