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

interface MoveResult {
  newBoard: number[][];
  scoreIncrease: number;
  moved: boolean;
  tileMovements?: Map<string, { from: [number, number]; to: [number, number] }>;
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [tilePositions, setTilePositions] = useState<Map<string, { from: [number, number]; to: [number, number] }>>(new Map());
  
  const [elapsedTime, setElapsedTime] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved) as GameState;
        return state.elapsedTime || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  });
  const startTimeRef = useRef<number | null>(null);
  const lastPauseTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const savedElapsedTimeRef = useRef<number>(0); // Total elapsed time when last paused

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
        if (state.elapsedTime !== undefined) {
          setElapsedTime(state.elapsedTime);
          savedElapsedTimeRef.current = state.elapsedTime;
        }
      } catch {
        // Invalid saved state, use defaults
      }
    }
  }, []);

  // Timer logic - properly handles pause/resume and saves state
  useEffect(() => {
    if (isVisible && isPlayable && !gameOver && !won) {
      // Resume timer
      if (startTimeRef.current === null) {
        // Start from the saved elapsed time (use current elapsedTime state if available)
        const baseElapsed = savedElapsedTimeRef.current || elapsedTime;
        startTimeRef.current = Date.now() - baseElapsed;
        lastPauseTimeRef.current = null;
      }
      
      const updateTimer = () => {
        if (startTimeRef.current !== null) {
          const now = Date.now();
          const newElapsed = now - startTimeRef.current;
          setElapsedTime(newElapsed);
          savedElapsedTimeRef.current = newElapsed;
          animationFrameRef.current = requestAnimationFrame(updateTimer);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(updateTimer);
      
      return () => {
        // Cleanup: pause and save
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // Save current elapsed time when pausing
        if (startTimeRef.current !== null) {
          const now = Date.now();
          const finalElapsed = now - startTimeRef.current;
          savedElapsedTimeRef.current = finalElapsed;
          setElapsedTime(finalElapsed);
          startTimeRef.current = null;
          lastPauseTimeRef.current = now;
          
          // Immediately save to localStorage
          const state: GameState = {
            board,
            score,
            highScore,
            gameOver,
            won,
            elapsedTime: finalElapsed,
            startTime: null,
            pausedTime: 0
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
      };
    } else {
      // Pause timer and save state
      if (startTimeRef.current !== null) {
        const now = Date.now();
        const finalElapsed = now - startTimeRef.current;
        savedElapsedTimeRef.current = finalElapsed;
        setElapsedTime(finalElapsed);
        startTimeRef.current = null;
        lastPauseTimeRef.current = now;
        
        // Immediately save to localStorage
        const state: GameState = {
          board,
          score,
          highScore,
          gameOver,
          won,
          elapsedTime: finalElapsed,
          startTime: null,
          pausedTime: 0
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isVisible, isPlayable, gameOver, won, board, score, highScore, elapsedTime]);

  // Save state to localStorage - save elapsed time frequently
  useEffect(() => {
    const state: GameState = {
      board,
      score,
      highScore,
      gameOver,
      won,
      elapsedTime: savedElapsedTimeRef.current, // Use saved elapsed time
      startTime: startTimeRef.current,
      pausedTime: 0 // No longer needed with new approach
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [board, score, highScore, gameOver, won, elapsedTime]);
  
  // Also save elapsed time periodically while running
  useEffect(() => {
    if (isVisible && isPlayable && !gameOver && !won && startTimeRef.current !== null) {
      const saveInterval = setInterval(() => {
        if (startTimeRef.current !== null) {
          const now = Date.now();
          const currentElapsed = now - startTimeRef.current;
          savedElapsedTimeRef.current = currentElapsed;
          const state: GameState = {
            board,
            score,
            highScore,
            gameOver,
            won,
            elapsedTime: currentElapsed,
            startTime: startTimeRef.current,
            pausedTime: 0
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
      }, 100); // Save every 100ms for fractional seconds
      
      return () => clearInterval(saveInterval);
    }
  }, [isVisible, isPlayable, gameOver, won, board, score, highScore]);
  
  // Save state on component unmount
  useEffect(() => {
    return () => {
      // Save final state when component unmounts
      const finalElapsed = startTimeRef.current !== null 
        ? Date.now() - startTimeRef.current 
        : savedElapsedTimeRef.current;
      
      const state: GameState = {
        board,
        score,
        highScore,
        gameOver,
        won,
        elapsedTime: finalElapsed,
        startTime: null,
        pausedTime: 0
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    };
  }, [board, score, highScore, gameOver, won]);

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

  // Move tiles in a specific direction following 2048 rules
  function move(board: number[][], direction: 'left' | 'right' | 'up' | 'down'): MoveResult {
    const newBoard = board.map(row => [...row]);
    const movements = new Map<string, { from: [number, number]; to: [number, number] }>();
    let scoreIncrease = 0;

    if (direction === 'left') {
      for (let i = 0; i < GRID_SIZE; i++) {
        const result = slideRowLeft(newBoard[i], i, movements);
        newBoard[i] = result.row;
        scoreIncrease += result.score;
      }
    } else if (direction === 'right') {
      for (let i = 0; i < GRID_SIZE; i++) {
        const result = slideRowRight(newBoard[i], i, movements);
        newBoard[i] = result.row;
        scoreIncrease += result.score;
      }
    } else if (direction === 'up') {
      for (let j = 0; j < GRID_SIZE; j++) {
        const column = newBoard.map(row => row[j]);
        const tempMovements = new Map<string, { from: [number, number]; to: [number, number] }>();
        const result = slideRowLeft(column, 0, tempMovements);
        for (let i = 0; i < GRID_SIZE; i++) {
          newBoard[i][j] = result.row[i];
        }
        // Convert row movements to column movements
        tempMovements.forEach((mov) => {
          const colKey = `${mov.from[0]}-${j}`;
          movements.set(colKey, {
            from: [mov.from[0], j],
            to: [mov.to[0], j]
          });
        });
        scoreIncrease += result.score;
      }
    } else if (direction === 'down') {
      for (let j = 0; j < GRID_SIZE; j++) {
        const column = newBoard.map(row => row[j]);
        const tempMovements = new Map<string, { from: [number, number]; to: [number, number] }>();
        const result = slideRowRight(column, 0, tempMovements);
        for (let i = 0; i < GRID_SIZE; i++) {
          newBoard[i][j] = result.row[i];
        }
        // Convert row movements to column movements
        tempMovements.forEach((mov) => {
          const colKey = `${mov.from[0]}-${j}`;
          movements.set(colKey, {
            from: [mov.from[0], j],
            to: [mov.to[0], j]
          });
        });
        scoreIncrease += result.score;
      }
    }

    const moved = JSON.stringify(board) !== JSON.stringify(newBoard);
    return { newBoard, scoreIncrease, moved, tileMovements: movements };
  }

  // Slide row left (base function)
  function slideRowLeft(
    row: number[],
    rowIndex: number,
    movements: Map<string, { from: [number, number]; to: [number, number] }>
  ): { row: number[]; score: number } {
    // Remove zeros and track original positions
    const tiles: Array<{ value: number; originalPos: number }> = [];
    row.forEach((val, pos) => {
      if (val !== 0) {
        tiles.push({ value: val, originalPos: pos });
      }
    });

    // Merge and slide
    const newRow: number[] = [];
    let score = 0;
    let i = 0;

    while (i < tiles.length) {
      if (i < tiles.length - 1 && tiles[i].value === tiles[i + 1].value) {
        // Merge
        const merged = tiles[i].value * 2;
        newRow.push(merged);
        score += merged;
        
        const targetPos = newRow.length - 1;
        movements.set(`${rowIndex}-${tiles[i].originalPos}`, {
          from: [rowIndex, tiles[i].originalPos],
          to: [rowIndex, targetPos]
        });
        movements.set(`${rowIndex}-${tiles[i + 1].originalPos}`, {
          from: [rowIndex, tiles[i + 1].originalPos],
          to: [rowIndex, targetPos]
        });
        
        i += 2;
      } else {
        // No merge
        newRow.push(tiles[i].value);
        const targetPos = newRow.length - 1;
        if (tiles[i].originalPos !== targetPos) {
          movements.set(`${rowIndex}-${tiles[i].originalPos}`, {
            from: [rowIndex, tiles[i].originalPos],
            to: [rowIndex, targetPos]
          });
        }
        i++;
      }
    }

    // Fill with zeros
    while (newRow.length < GRID_SIZE) {
      newRow.push(0);
    }

    return { row: newRow, score };
  }

  // Slide row right (reverse of left)
  function slideRowRight(
    row: number[],
    rowIndex: number,
    movements: Map<string, { from: [number, number]; to: [number, number] }>
  ): { row: number[]; score: number } {
    // Reverse, slide left, then reverse back
    const reversed = [...row].reverse();
    const result = slideRowLeft(reversed, rowIndex, movements);
    const finalRow = result.row.reverse();
    
    // Adjust movement positions for reversed direction
    movements.forEach((mov, key) => {
      if (key.startsWith(`${rowIndex}-`)) {
        mov.from[1] = GRID_SIZE - 1 - mov.from[1];
        mov.to[1] = GRID_SIZE - 1 - mov.to[1];
      }
    });
    
    return { row: finalRow, score: result.score };
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
    if (gameOver || won || !isPlayable || isAnimating) return;

    const { newBoard, scoreIncrease, moved, tileMovements } = move(board, direction);
    
    if (moved) {
      setIsAnimating(true);
      setTilePositions(tileMovements || new Map());
      
      // Wait for animation to complete
      setTimeout(() => {
        addRandomTile(newBoard);
        const newScore = score + scoreIncrease;
        setScore(newScore);
        setBoard(newBoard);
        setIsAnimating(false);
        setTilePositions(new Map());

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
          let currentElapsed = savedElapsedTimeRef.current || elapsedTime;
          if (startTimeRef.current !== null) {
            const now = Date.now();
            currentElapsed = now - startTimeRef.current;
          }
          if (onGameOver) {
            onGameOver(newScore, Math.max(0, currentElapsed));
          }
        }
      }, 150); // Animation duration
    }
  }, [board, score, highScore, gameOver, won, isPlayable, elapsedTime, onGameOver, isAnimating]);

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
    savedElapsedTimeRef.current = 0;
    startTimeRef.current = null;
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
        <div className="grid grid-cols-4 gap-2 relative">
          {/* Static board cells */}
          {board.map((row, i) =>
            row.map((cell, j) => {
              const movementKey = `${i}-${j}`;
              const isMoving = tilePositions.has(movementKey) && cell !== 0;
              
              return (
                <div
                  key={`cell-${i}-${j}`}
                  className={`aspect-square flex items-center justify-center rounded-lg font-bold text-sm sm:text-base ${
                    isMoving ? 'opacity-0' : getTileColor(cell)
                  } transition-colors`}
                >
                  {!isMoving && cell !== 0 && cell}
                </div>
              );
            })
          )}
          
          {/* Animated moving tiles */}
          {Array.from(tilePositions.entries()).map(([key, movement]) => {
            const [toRow, toCol] = movement.to;
            const [fromRow, fromCol] = movement.from;
            const cellValue = board[toRow]?.[toCol] || 0;
            
            if (cellValue === 0) return null;
            
            // Calculate positions as percentages
            const cellWidth = 25; // 25% per cell
            const gapPercent = 2; // approximate gap as % of container
            const fromLeft = fromCol * (cellWidth + gapPercent);
            const fromTop = fromRow * (cellWidth + gapPercent);
            const toLeft = toCol * (cellWidth + gapPercent);
            const toTop = toRow * (cellWidth + gapPercent);
            
            return (
              <div
                key={`moving-${key}`}
                className="aspect-square flex items-center justify-center rounded-lg font-bold text-sm sm:text-base absolute transition-all duration-150 ease-out z-10"
                style={{
                  left: `${fromLeft}%`,
                  top: `${fromTop}%`,
                  width: 'calc(25% - 6px)',
                  transform: `translate(${toLeft - fromLeft}%, ${toTop - fromTop}%)`,
                }}
              >
                <div className={`w-full h-full flex items-center justify-center rounded-lg ${getTileColor(cellValue)}`}>
                  {cellValue}
                </div>
              </div>
            );
          })}
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
