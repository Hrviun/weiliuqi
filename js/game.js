document.addEventListener('DOMContentLoaded', () => {
  // 初始化游戏
  initGame();

  // 绑定事件
  document.getElementById('menu-toggle').addEventListener('click', openMenu);
  document.getElementById('close-menu').addEventListener('click', closeMenu);
  document.getElementById('show-rules').addEventListener('click', showRules);
  document.getElementById('close-rules').addEventListener('click', closeRules);
  document.getElementById('undo-move').addEventListener('click', undoMove);
  document.getElementById('restart-game').addEventListener('click', restartGame);
  document.getElementById('ai-mode').addEventListener('click', toggleAIMode);
  document.getElementById('save-game').addEventListener('click', saveGame);
  document.getElementById('load-game').addEventListener('click', loadGame);
  document.getElementById('export-data').addEventListener('click', exportTrainingData);
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('close-analysis').addEventListener('click', closeAnalysis);
  document.getElementById('analyze-data').addEventListener('click', analyzeTrainingData);
  document.getElementById('import-data').addEventListener('click', importTrainingData);
  document.getElementById('auto-train').addEventListener('click', openTrainingModal);
  document.getElementById('close-training-modal').addEventListener('click', closeTrainingModal);
  document.getElementById('start-training').addEventListener('click', startAutoTraining);
  document.getElementById('toggle-trained-mode').addEventListener('click', toggleTrainedMode);
  document.getElementById('toggle-background-music').addEventListener('click', toggleBackgroundMusic);
  document.getElementById('ai-difficulty').addEventListener('click', openAIDifficultyModal);
  document.getElementById('close-ai-difficulty').addEventListener('click', closeAIDifficultyModal);
  document.getElementById('set-difficulty').addEventListener('click', setAIDifficulty);

  // 新增的训练监控面板开关按钮
  document.getElementById('open-training-monitor').addEventListener('click', openTrainingMonitor);
  document.getElementById('close-training-monitor').addEventListener('click', closeTrainingMonitor);

  // AI难度选择
  document.getElementById('difficulty-level').addEventListener('change', (e) => {
    gameState.aiDifficulty = e.target.value;
    showNotification(`AI难度已设置为${getDifficultyText(gameState.aiDifficulty)}`);
  });

  // 响应式调整
  window.addEventListener('resize', adjustBoardSize);

  // 尝试播放背景音乐
  const backgroundMusic = document.getElementById('background-music');
  if (backgroundMusic) {
    backgroundMusic.volume = 0.5; // 设置背景音乐音量
    backgroundMusic.loop = true; // 设置背景音乐循环播放
    backgroundMusic.play().catch(error => {
      console.log('自动播放背景音乐失败，请用户交互后重试：', error);
    });
  }
});

// 游戏状态
const gameState = {
  board: Array(19).fill().map(() => Array(19).fill(null)),
  currentPlayer: 'black',
  moveHistory: [],
  isAIMode: false,
  isGameOver: false,
  aiDifficulty: 'medium',
  trainingData: [],
  capturedPieces: []
};

// 初始化游戏
function initGame() {
  const boardElement = document.getElementById('board');
  boardElement.innerHTML = '';
  gameState.board = Array(19).fill().map(() => Array(19).fill(null));
  gameState.currentPlayer = 'black';
  gameState.moveHistory = [];
  gameState.isGameOver = false;
  gameState.capturedPieces = [];
  updateScoreDisplay();
  updatePlayerTurnDisplay();

  // 创建棋盘网格线
  for (let i = 0; i < 19; i++) {
    // 水平线
    const rowLine = document.createElement('div');
    rowLine.className = 'grid-line row';
    rowLine.style.top = `${i * (100 / 18)}%`;
    boardElement.appendChild(rowLine);

    // 垂直线
    const columnLine = document.createElement('div');
    columnLine.className = 'grid-line column';
    columnLine.style.left = `${i * (100 / 18)}%`;
    boardElement.appendChild(columnLine);
  }

  // 创建交叉点
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      const intersection = document.createElement('div');
      intersection.className = 'intersection';
      intersection.dataset.row = row;
      intersection.dataset.col = col;
      intersection.style.left = `${col * (100 / 18)}%`;
      intersection.style.top = `${row * (100 / 18)}%`;

      intersection.addEventListener('click', () => {
        if (!gameState.isGameOver && (!gameState.isAIMode || gameState.currentPlayer === 'black')) {
          makeMove(row, col);
        }
      });

      // 长按预览功能
      let pressTimer;
      intersection.addEventListener('mousedown',
        () => {
          pressTimer = window.setTimeout(() => {
            showMovePreview(intersection);
          }, 500);
        });
      intersection.addEventListener('touchstart',
        () => {
          pressTimer = window.setTimeout(() => {
            showMovePreview(intersection);
          }, 500);
        });
      intersection.addEventListener('mouseup',
        () => {
          clearTimeout(pressTimer);
        });
      intersection.addEventListener('touchend',
        () => {
          clearTimeout(pressTimer);
        });

      boardElement.appendChild(intersection);
    }
  }

  adjustBoardSize();
}

// 调整棋盘大小以适应屏幕
function adjustBoardSize() {
  const boardElement = document.getElementById('board');
  const boardContainer = document.querySelector('.board-container');
  const width = boardContainer.clientWidth;
  const height = boardContainer.clientHeight;

  // 计算交叉点的大小
  const intersectionSize = Math.min(width,
    height) * 0.05; // 5% of board size
  document.querySelectorAll('.intersection').forEach(el => {
    el.style.width = `${intersectionSize}px`;
    el.style.height = `${intersectionSize}px`;
  });
}

// 下棋
function makeMove(row, col) {
  // 检查该位置是否已有棋子
  if (gameState.board[row][col] !== null) {
    return;
  }

  // 检查是否违反无气规则
  if (!canPlaceStone(row, col, gameState.currentPlayer)) {
    showNotification('该位置违反无气规则，不能下棋');
    return;
  }

  // 记录移动
  gameState.moveHistory.push({
    row, col, player: gameState.currentPlayer
  });

  // 放置棋子
  gameState.board[row][col] = gameState.currentPlayer;

  // 添加动画类
  const intersection = document.querySelector(`.intersection[data-row="${row}"][data-col="${col}"]`);
  if (intersection) {
    intersection.classList.add('animate');
    intersection.classList.add(gameState.currentPlayer === 'black' ? 'black-stone': 'white-stone');
  }

  // 播放落子音效
  const placeSound = document.getElementById('place-sound');
  if (placeSound) {
    placeSound.currentTime = 0;
    placeSound.play();
  }

  // 检查是否有棋子被提掉
  const captured = checkCaptures(row, col, gameState.currentPlayer);
  if (captured.length > 0) {
    gameState.capturedPieces.push(...captured);

    // 播放提子音效
    const captureSound = document.getElementById('capture-sound');
    if (captureSound) {
      captureSound.currentTime = 0;
      captureSound.play();
    }

    // 保存训练数据
    if (gameState.isAIMode && gameState.currentPlayer === 'black') {
      saveTrainingData(row, col, captured);
    }
  }

  // 检查胜负
  if (checkWin(row, col, gameState.currentPlayer)) {
    gameState.isGameOver = true;
    showNotification(`${gameState.currentPlayer === 'black' ? '黑棋': '白棋'} 获胜！`);
    playVictoryMusic(); // 播放胜利音乐
    addVictoryAnimation(row, col);
    return;
  }

  // 检查平局
  if (checkDraw()) {
    gameState.isGameOver = true;
    return;
  }

  // 切换玩家
  gameState.currentPlayer = gameState.currentPlayer === 'black' ? 'white': 'black';
  updatePlayerTurnDisplay();

  // 如果是AI模式且当前是白棋回合，让AI下棋
  if (gameState.isAIMode && gameState.currentPlayer === 'white' && !gameState.isGameOver) {
    setTimeout(() => {
      makeAIMove();
    }, 500);
  }
}

// AI下棋
function makeAIMove() {
  if (gameState.isGameOver) return;

  const move = getAIMove(gameState.board, gameState.currentPlayer, gameState.aiDifficulty);

  if (move) {
    makeMove(move.row, move.col);
  } else {
    // 如果AI没有找到合适的移动，随机选择一个有效位置
    const emptyPositions = getEmptyPositions();
    if (emptyPositions.length > 0) {
      const randomMove = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
      makeMove(randomMove.row, randomMove.col);
    }
  }
}

// 获取空位置
function getEmptyPositions() {
  const positions = [];
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (gameState.board[row][col] === null) {
        positions.push({
          row, col
        });
      }
    }
  }
  return positions;
}

// 检查是否可以放置棋子（无气规则）
function canPlaceStone(row, col, player) {
  const tempBoard = JSON.parse(JSON.stringify(gameState.board));
  tempBoard[row][col] = player;

  // 检查所有对方棋子是否会被提掉
  for (let r = 0; r < 19; r++) {
    for (let c = 0; c < 19; c++) {
      if (tempBoard[r][c] !== player && tempBoard[r][c] !== null) {
        if (getLiberties(tempBoard, r, c) === 0) {
          return true; // 可以下，因为会提子
        }
      }
    }
  }

  // 检查自己是否无气
  return getLiberties(tempBoard, row, col) > 0;
}

// 获取某个棋子的自由点数
function getLiberties(board, row, col) {
  const visited = Array(19).fill().map(() => Array(19).fill(false));
  const stones = getConnectedStones(board, row, col);

  let liberties = 0;

  stones.forEach(stone => {
    const r = stone.row;
    const c = stone.col;

    // 检查上下左右
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    directions.forEach(dir => {
      const newRow = r + dir[0];
      const newCol = c + dir[1];

      if (newRow >= 0 && newRow < 19 && newCol >= 0 && newCol < 19) {
        if (!visited[newRow][newCol] && board[newRow][newCol] === null) {
          liberties++;
          // 标记已检查的自由点
          visited[newRow][newCol] = true;
        }
      }
    });
  });

  return liberties;
}

// 获取连在一起的棋子
function getConnectedStones(board, row, col) {
  const stones = [];
  const visited = Array(19).fill().map(() => Array(19).fill(false));
  const color = board[row][col];

  function dfs(r, c) {
    if (r < 0 || r >= 19 || c < 0 || c >= 19) return;
    if (visited[r][c] || board[r][c] !== color) return;

    visited[r][c] = true;
    stones.push({
      row: r, col: c
    });

    // 四个方向搜索
    dfs(r - 1, c);
    dfs(r + 1, c);
    dfs(r, c - 1);
    dfs(r, c + 1);
  }

  dfs(row, col);
  return stones;
}

// 检查是否有棋子被提掉
function checkCaptures(row, col, player) {
  const captured = [];

  // 检查四个方向的对手棋子
  const directions = [[-1,
    0],
    [1,
      0],
    [0,
      -1],
    [0,
      1]];
  directions.forEach(dir => {
    const newRow = row + dir[0];
    const newCol = col + dir[1];

    if (newRow >= 0 && newRow < 19 && newCol >= 0 && newCol < 19) {
      if (gameState.board[newRow][newCol] !== null && gameState.board[newRow][newCol] !== player) {
        const opponentStones = getConnectedStones(gameState.board, newRow, newCol);

        // 检查这些棋子是否无气
        let hasLiberties = false;
        opponentStones.forEach(stone => {
          const r = stone.row;
          const c = stone.col;

          // 检查上下左右
          const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          directions.forEach(d => {
            const adjacentRow = r + d[0];
            const adjacentCol = c + d[1];

            if (adjacentRow >= 0 && adjacentRow < 19 && adjacentCol >= 0 && adjacentCol < 19) {
              if (gameState.board[adjacentRow][adjacentCol] === null) {
                hasLiberties = true;
              }
            }
          });
        });

        if (!hasLiberties) {
          // 这些棋子被提掉
          captured.push(...opponentStones);
        }
      }
    }
  });

  // 移除被提掉的棋子
  if (captured.length > 0) {
    captured.forEach(stone => {
      gameState.board[stone.row][stone.col] = null;
    });

    // 为被提掉的棋子添加动画
    captured.forEach(stone => {
      const intersection = document.querySelector(`.intersection[data-row="${stone.row}"][data-col="${stone.col}"]`);
      if (intersection) {
        intersection.classList.add('captured');
        setTimeout(() => {
          intersection.classList.remove('captured');
        }, 500);
      }
    });

    updateBoardDisplay();
  }

  return captured;
}

// 检查是否获胜（六子连珠）
function checkWin(row, col, player) {
  const directions = [
    [0, 1], // 水平
    [1, 0], // 垂直
    [1, 1], // 对角线
    [1, -1] // 反对角线
  ];

  for (const [dr, dc] of directions) {
    let count = 1;

    // 正方向检查
    for (let i = 1; i <= 5; i++) {
      const newRow = row + dr * i;
      const newCol = col + dc * i;

      if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19 ||
        gameState.board[newRow][newCol] !== player) {
        break;
      }
      count++;
    }

    // 反方向检查
    for (let i = 1; i <= 5; i++) {
      const newRow = row - dr * i;
      const newCol = col - dc * i;

      if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19 ||
        gameState.board[newRow][newCol] !== player) {
        break;
      }
      count++;
    }

    if (count >= 6) {
      return true;
    }
  }

  return false;
}

// 检查平局
function checkDraw() {
  // 检查棋盘是否已满
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (gameState.board[row][col] === null) {
        return false;
      }
    }
  }

  // 计算双方五子、四子等连珠数量
  const blackScore = calculatePatternScore('black');
  const whiteScore = calculatePatternScore('white');

  if (blackScore > whiteScore) {
    showNotification('黑棋获胜（平局规则）！');
    playVictoryMusic(); // 播放胜利音乐
    return true;
  } else if (whiteScore > blackScore) {
    showNotification('白棋获胜（平局规则）！');
    playVictoryMusic(); // 播放胜利音乐
    return true;
  } else {
    showNotification('平局！');
    playDrawMusic(); // 播放平局音乐
    return true;
  }
}

// 计算连珠模式分数
function calculatePatternScore(player) {
  const patterns = {
    '五子': 5,
    '四子': 4,
    '三子': 3,
    '二子': 2
  };

  let score = 0;

  // 检查所有可能的连珠模式
  const directions = [
    [0,
      1],
    // 水平
    [1,
      0],
    // 垂直
    [1,
      1],
    // 对角线
    [1,
      -1] // 反对角线
  ];

  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (gameState.board[row][col] !== player) continue;

      for (const [dr, dc] of directions) {
        for (const [pattern, value] of Object.entries(patterns)) {
          let count = 1;

          // 正方向检查
          for (let i = 1; i <= value; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;

            if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19 ||
              gameState.board[newRow][newCol] !== player) {
              break;
            }
            count++;
          }

          // 反方向检查
          for (let i = 1; i <= value; i++) {
            const newRow = row - dr * i;
            const newCol = col - dc * i;

            if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19 ||
              gameState.board[newRow][newCol] !== player) {
              break;
            }
            count++;
          }

          if (count >= value + 1) {
            score += value;
          }
        }
      }
    }
  }

  return score;
}

// 更新棋盘显示
function updateBoardDisplay() {
  document.querySelectorAll('.intersection').forEach(el => {
    const row = parseInt(el.dataset.row);
    const col = parseInt(el.dataset.col);

    el.classList.remove('black-stone', 'white-stone', 'captured', 'animate');

    if (gameState.board[row][col] === 'black') {
      el.classList.add('black-stone');
    } else if (gameState.board[row][col] === 'white') {
      el.classList.add('white-stone');
    }
  });
}

// 更新玩家回合显示
function updatePlayerTurnDisplay() {
  const playerTurnElement = document.getElementById('player-turn');
  playerTurnElement.textContent = gameState.currentPlayer === 'black' ? '黑棋': '白棋';
}

// 更新分数显示
function updateScoreDisplay() {
  const blackScoreElement = document.getElementById('black-score');
  const whiteScoreElement = document.getElementById('white-score');

  const blackScore = calculatePatternScore('black');
  const whiteScore = calculatePatternScore('white');

  blackScoreElement.textContent = blackScore;
  whiteScoreElement.textContent = whiteScore;
}

// 悔棋
function undoMove() {
  if (gameState.moveHistory.length === 0) return;

  const lastMove = gameState.moveHistory.pop();
  gameState.board[lastMove.row][lastMove.col] = null;

  // 如果有提子，恢复被提的棋子
  if (gameState.capturedPieces.length > 0) {
    const lastCaptured = gameState.capturedPieces.pop();
    lastCaptured.forEach(stone => {
      gameState.board[stone.row][stone.col] = lastCaptured.player;
    });
  }

  // 切换玩家
  gameState.currentPlayer = gameState.currentPlayer === 'black' ? 'white': 'black';
  updatePlayerTurnDisplay();
  updateBoardDisplay();
  updateScoreDisplay();
}

// 重新开始游戏
function restartGame() {
  const backgroundMusic = document.getElementById('background-music');
  if (backgroundMusic) {
    backgroundMusic.play().catch(error => {
      console.log('重新播放背景音乐失败，请用户交互后重试：', error);
    });
  }

  // 添加重新开始动画
  const boardElement = document.getElementById('board');
  boardElement.style.opacity = '0.5';
  boardElement.style.transition = 'opacity 0.5s ease';

  setTimeout(() => {
    initGame();
    boardElement.style.opacity = '1';
  }, 500);
}

// 切换AI模式
function toggleAIMode() {
  gameState.isAIMode = !gameState.isAIMode;
  updatePlayerTurnDisplay();
  showNotification(gameState.isAIMode ? 'AI模式已开启': 'AI模式已关闭');
}

// 新游戏
function newGame() {
  initGame();
}

// 保存游戏
function saveGame() {
  const savedGame = {
    board: JSON.parse(JSON.stringify(gameState.board)),
    currentPlayer: gameState.currentPlayer,
    moveHistory: JSON.parse(JSON.stringify(gameState.moveHistory)),
    isAIMode: gameState.isAIMode,
    aiDifficulty: gameState.aiDifficulty,
    capturedPieces: JSON.parse(JSON.stringify(gameState.capturedPieces))
  };

  localStorage.setItem('savedWeiliuGame', JSON.stringify(savedGame));
  showNotification('游戏已保存');
}

// 加载游戏
function loadGame() {
  const savedGame = localStorage.getItem('savedWeiliuGame');
  if (!savedGame) {
    showNotification('没有找到保存的游戏');
    return;
  }

  try {
    const parsedGame = JSON.parse(savedGame);

    if (!parsedGame || !parsedGame.board || !parsedGame.currentPlayer) {
      throw new Error('无效的保存数据');
    }

    gameState.board = parsedGame.board;
    gameState.currentPlayer = parsedGame.currentPlayer;
    gameState.moveHistory = parsedGame.moveHistory;
    gameState.isAIMode = parsedGame.isAIMode;
    gameState.aiDifficulty = parsedGame.aiDifficulty;
    gameState.capturedPieces = parsedGame.capturedPieces;

    updateBoardDisplay();
    updatePlayerTurnDisplay();
    updateScoreDisplay();

    showNotification('游戏已加载');
  } catch (error) {
    showNotification('加载游戏失败: ' + error.message);
  }
}

// 显示通知
function showNotification(message) {
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notification-text');

  notificationText.textContent = message;
  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// 打开菜单
function openMenu() {
  document.getElementById('menu-modal').classList.add('active');
}

// 关闭菜单
function closeMenu() {
  document.getElementById('menu-modal').classList.remove('active');
}

// 显示规则
function showRules() {
  document.getElementById('rules-modal').classList.add('active');
}

// 关闭规则
function closeRules() {
  document.getElementById('rules-modal').classList.remove('active');
}

// 关闭分析
function closeAnalysis() {
  document.getElementById('analysis-modal').classList.remove('active');
}

// 打开训练弹窗
function openTrainingModal() {
  document.getElementById('training-modal').classList.add('active');
}

// 关闭训练弹窗
function closeTrainingModal() {
  document.getElementById('training-modal').classList.remove('active');
}

// 切换训练模式
function toggleTrainedMode() {
  gameState.aiDifficulty = gameState.aiDifficulty === 'hard' ? 'trained': 'hard';
  showNotification(gameState.aiDifficulty === 'trained' ? '已启用训练模式': '已禁用训练模式');
}

// 添加胜利动画
function addVictoryAnimation(row, col) {
  gameState.isGameOver = true;
  playVictoryMusic(); // 播放胜利音乐

  const boardElement = document.getElementById('board');
  const victoryAnimation = document.createElement('div');
  victoryAnimation.className = 'victory-animation active';
  boardElement.appendChild(victoryAnimation);

  // 创建闪光效果
  for (let i = 0; i < 20; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.top = `${Math.random() * 100}%`;
    sparkle.style.animationDelay = `${Math.random() * 2}s`;
    victoryAnimation.appendChild(sparkle);
  }

  // 3秒后移除动画
  setTimeout(() => {
    boardElement.removeChild(victoryAnimation);
  }, 3000);
}

// 播放胜利音乐
function playVictoryMusic() {
  const victoryMusic = document.getElementById('victory-music');
  const backgroundMusic = document.getElementById('background-music');
  if (victoryMusic && backgroundMusic) {
    backgroundMusic.pause(); // 暂停背景音乐
    victoryMusic.currentTime = 0;
    victoryMusic.play();
  }
}

// 播放平局音乐
function playDrawMusic() {
  const drawMusic = document.getElementById('draw-music');
  const backgroundMusic = document.getElementById('background-music');
  if (drawMusic && backgroundMusic) {
    backgroundMusic.pause(); // 暂停背景音乐
    drawMusic.currentTime = 0;
    drawMusic.play();
  }
}

// 切换背景音乐
function toggleBackgroundMusic() {
  const backgroundMusic = document.getElementById('background-music');
  if (backgroundMusic) {
    if (backgroundMusic.paused) {
      backgroundMusic.play().catch(error => {
        console.log('播放背景音乐失败：', error);
      });
      showNotification('背景音乐已开启');
    } else {
      backgroundMusic.pause();
      showNotification('背景音乐已关闭');
    }
  }
}

// 打开AI难度设置弹窗
function openAIDifficultyModal() {
  document.getElementById('ai-difficulty-modal').classList.add('active');
}

// 关闭AI难度设置弹窗
function closeAIDifficultyModal() {
  document.getElementById('ai-difficulty-modal').classList.remove('active');
}

// 设置AI难度
function setAIDifficulty() {
  const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked').value;
  gameState.aiDifficulty = selectedDifficulty;
  closeAIDifficultyModal();
  showNotification(`AI难度已设置为${getDifficultyText(gameState.aiDifficulty)}`);
}

// 获取难度文本
function getDifficultyText(difficulty) {
  switch (difficulty) {
    case 'easy': return '简单';
    case 'medium': return '中等';
    case 'hard': return '困难';
    case 'trained': return '训练模式';
    default: return '';
  }
}

// 显示移动预览
function showMovePreview(intersection) {
  const row = parseInt(intersection.dataset.row);
  const col = parseInt(intersection.dataset.col);

  if (gameState.board[row][col] !== null) {
    return;
  }

  intersection.classList.add('preview');
  setTimeout(() => {
    intersection.classList.remove('preview');
}, 1000);
}