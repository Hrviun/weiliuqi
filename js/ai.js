// 获取AI的移动（包含新逻辑）
function getAIMove(board, player, difficulty) {
    switch (difficulty) {
        case 'easy':
            return getEasyAIMove(board, player);
        case 'medium':
            return getMediumAIMoveWithConnectAndBlock(board, player);
        case 'hard':
            return getHardAIMoveWithConnectAndBlock(board, player);
        case 'trained':
            return getTrainedAIMove(board, player);
        default:
            return getRandomAIMove(board);
    }
}

// 简单AI - 随机选择一个有效位置
function getRandomAIMove(board) {
    const emptyPositions = getEmptyPositions(board);
    if (emptyPositions.length === 0) return null;
    
    return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
}

// 简单AI - 寻找可能获胜的移动或阻止对手获胜
function getEasyAIMove(board, player) {
    const opponent = player === 'black' ? 'white' : 'black';
    
    // 首先检查是否有可以获胜的移动
    const winningMove = findWinningMove(board, player);
    if (winningMove) return winningMove;
    
    // 然后检查是否需要阻止对手获胜
    const blockingMove = findWinningMove(board, opponent);
    if (blockingMove) return blockingMove;
    
    // 否则随机选择一个位置
    return getRandomAIMove(board);
}

// 中等AI - 寻找可能获胜的移动、阻止对手获胜或攻击性强的位置，并考虑连棋和堵的逻辑
function getMediumAIMoveWithConnectAndBlock(board, player) {
    const opponent = player === 'black' ? 'white' : 'black';
    
    // 首先检查是否有可以获胜的移动
    const winningMove = findWinningMove(board, player);
    if (winningMove) return winningMove;
    
    // 然后检查是否需要阻止对手获胜
    const blockingMove = findWinningMove(board, opponent);
    if (blockingMove) return blockingMove;
    
    // 寻找可以形成连棋的移动
    const connectMoves = findConnectMoves(board, player);
    if (connectMoves.length > 0) {
        return connectMoves.sort(() => 0.5 - Math.random())[0];
    }

    // 寻找可以阻止对手连棋的移动
    const blockMoves = findBlockMoves(board, opponent);
    if (blockMoves.length > 0) {
        return blockMoves.sort(() => 0.5 - Math.random())[0];
    }
    
    // 否则寻找攻击性强的位置
    const strongMoves = findStrongMoves(board, player);
    if (strongMoves.length > 0) {
        return strongMoves.sort(() => 0.5 - Math.random())[0];
    }
    
    // 否则随机选择一个位置
    return getRandomAIMove(board);
}

// 高级AI - 使用蒙特卡洛树搜索，并考虑连棋和堵的逻辑
function getHardAIMoveWithConnectAndBlock(board, player) {
    // 检查是否有可以获胜的移动
    const winningMove = findWinningMove(board, player);
    if (winningMove) return winningMove;
    
    // 检查是否需要阻止对手获胜
    const opponent = player === 'black' ? 'white' : 'black';
    const blockingMove = findWinningMove(board, opponent);
    if (blockingMove) return blockingMove;
    
    // 寻找连棋和堵的机会
    const connectMoves = findConnectMoves(board, player);
    if (connectMoves.length > 0) {
        return connectMoves.sort(() => 0.5 - Math.random())[0];
    }

    const blockMoves = findBlockMoves(board, opponent);
    if (blockMoves.length > 0) {
        return blockMoves.sort(() => 0.5 - Math.random())[0];
    }
    
    // 执行蒙特卡洛树搜索
    return monteCarloTreeSearch(board, player, 1000);
}

// 训练模式AI - 使用训练数据
function getTrainedAIMove(board, player) {
    if (gameState.trainingData.length === 0) {
        return getRandomAIMove(board); // 如果没有训练数据，使用随机移动
    }

    // 简单实现：使用训练数据中的移动频率来选择移动
    const moveFrequency = {};
    gameState.trainingData.forEach(data => {
        data.moves.forEach(move => {
            if (move.player === player) {
                const key = `${move.row},${move.col}`;
                moveFrequency[key] = (moveFrequency[key] || 0) + 1;
            }
        });
    });

    const emptyPositions = getEmptyPositions(board);
    let bestMove = emptyPositions[0];
    let maxFrequency = 0;

    emptyPositions.forEach(pos => {
        const key = `${pos.row},${pos.col}`;
        const frequency = moveFrequency[key] || 0;
        if (frequency > maxFrequency) {
            maxFrequency = frequency;
            bestMove = pos;
        }
    });

    return bestMove;
}

// 寻找可能获胜的移动
function findWinningMove(board, player) {
    for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
            if (board[row][col] === null) {
                // 模拟放置棋子
                board[row][col] = player;
                
                // 检查是否获胜
                const isWinning = checkWin(row, col, player, board);
                
                // 移除棋子
                board[row][col] = null;
                
                if (isWinning) {
                    return { row, col };
                }
            }
        }
    }
    
    return null;
}

// 寻找可以形成连棋的移动
function findConnectMoves(board, player) {
    const connectMoves = [];

    for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
            if (board[row][col] === null) {
                const connectPotential = calculateConnectPotential(board, row, col, player);
                if (connectPotential >= 3) { // 可根据需要调整阈值
                    connectMoves.push({ row, col });
                }
            }
        }
    }

    return connectMoves;
}

// 寻找可以阻止对手连棋的移动
function findBlockMoves(board, opponent) {
    const blockMoves = [];

    for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
            if (board[row][col] === null) {
                const connectPotential = calculateConnectPotential(board, row, col, opponent);
                if (connectPotential >= 3) { // 可根据需要调整阈值
                    blockMoves.push({ row, col });
                }
            }
        }
    }

    return blockMoves;
}

// 计算某个位置的连棋潜力
function calculateConnectPotential(board, row, col, player) {
    const directions = [
        [0, 1],   // 水平
        [1, 0],   // 垂直
        [1, 1],   // 对角线
        [1, -1]   // 反对角线
    ];

    let connectPotential = 0;

    for (const [dr, dc] of directions) {
        // 正方向检查
        let count = 1;
        for (let i = 1; i <= 5; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;

            if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19) break;

            if (board[newRow][newCol] === player) {
                count++;
            } else if (board[newRow][newCol] === null) {
                // 如果是空位，增加潜在连棋分数
                connectPotential += 1;
            } else {
                break;
            }
        }

        // 反方向检查
        for (let i = 1; i <= 5; i++) {
            const newRow = row - dr * i;
            const newCol = col - dc * i;

            if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19) break;

            if (board[newRow][newCol] === player) {
                count++;
            } else if (board[newRow][newCol] === null) {
                // 如果是空位，增加潜在连棋分数
                connectPotential += 1;
            } else {
                break;
            }
        }
    }

    return connectPotential;
}

// 寻找攻击性强的位置
function findStrongMoves(board, player) {
    const strongMoves = [];
    
    // 检查所有可能的连珠模式
    const directions = [
        [0, 1],   // 水平
        [1, 0],   // 垂直
        [1, 1],   // 对角线
        [1, -1]   // 反对角线
    ];
    
    for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
            if (board[row][col] === null) {
                // 检查每个方向的连珠潜力
                for (const [dr, dc] of directions) {
                    let count = 0;
                    let hasEmptySpace = false;
                    
                    // 正方向检查
                    for (let i = 1; i <= 5; i++) {
                        const newRow = row + dr * i;
                        const newCol = col + dc * i;
                        
                        if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19) break;
                        
                        if (board[newRow][newCol] === player) {
                            count++;
                        } else if (board[newRow][newCol] === null) {
                            hasEmptySpace = true;
                            break;
                        } else {
                            break;
                        }
                    }
                    
                    // 反方向检查
                    for (let i = 1; i <= 5; i++) {
                        const newRow = row - dr * i;
                        const newCol = col - dc * i;
                        
                        if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19) break;
                        
                        if (board[newRow][newCol] === player) {
                            count++;
                        } else if (board[newRow][newCol] === null) {
                            hasEmptySpace = true;
                            break;
                        } else {
                            break;
                        }
                    }
                    
                    if (count >= 3 && hasEmptySpace) {
                        // 如果可以形成至少4子连珠的潜力
                        strongMoves.push({ row, col });
                    }
                }
            }
        }
    }
    
    return strongMoves;
}

// 改进后的蒙特卡洛树搜索
function monteCarloTreeSearch(board, player, iterations) {
    const emptyPositions = getEmptyPositions(board);
    if (emptyPositions.length === 0) return null;
    
    const moveStats = {};
    const moveVisits = {};
    
    for (let i = 0; i < iterations; i++) {
        const move = selectBestMoveWithUCB(board, player, moveStats, moveVisits);
        const result = simulateGame(board, player, move.row, move.col);
        
        if (moveStats[move.row + ',' + move.col]) {
            moveStats[move.row + ',' + move.col] += result;
            moveVisits[move.row + ',' + move.col]++;
        } else {
            moveStats[move.row + ',' + move.col] = result;
            moveVisits[move.row + ',' + move.col] = 1;
        }
    }
    
    let bestMove = null;
    let bestScore = -1;
    
    for (const [key, score] of Object.entries(moveStats)) {
        const visitCount = moveVisits[key];
        const winRate = score / visitCount;
        
        if (winRate > bestScore) {
            const [row, col] = key.split(',').map(Number);
            bestScore = winRate;
            bestMove = { row, col };
        }
    }
    
    return bestMove;
}

// 使用UCB1选择最佳移动
function selectBestMoveWithUCB(board, player, moveStats, moveVisits) {
    const emptyPositions = getEmptyPositions(board);
    const c = Math.sqrt(2);
    
    let bestScore = -Infinity;
    let bestMove = null;
    
    emptyPositions.forEach(pos => {
        const key = `${pos.row},${pos.col}`;
        const totalVisits = Object.values(moveVisits).reduce((sum, count) => sum + count, 0) || 1;
        const visitCount = moveVisits[key] || 0;
        const winRate = moveStats[key] / visitCount || 0;
        
        const ucbScore = winRate + c * Math.sqrt(Math.log(totalVisits) / (visitCount + 1));
        
        if (ucbScore > bestScore) {
            bestScore = ucbScore;
            bestMove = pos;
        }
    });
    
    return bestMove;
}

// 模拟游戏结果
function simulateGame(board, player, row, col) {
    // 创建 deep copy 的棋盘
    const simulatedBoard = JSON.parse(JSON.stringify(board));
    simulatedBoard[row][col] = player;
    
    // 检查是否获胜
    if (checkWin(row, col, player, simulatedBoard)) {
        return 1; // 胜利
    }
    
    // 随机进行游戏
    let currentPlayer = player === 'black' ? 'white' : 'black';
    let movesLeft = 100; // 最大模拟步数
    
    while (movesLeft > 0) {
        // 找到所有空位置
        const emptyPositions = getEmptyPositions(simulatedBoard);
        
        if (emptyPositions.length === 0) break;
        
        // 随机选择一个位置放置棋子
        const move = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
        
        // 检查是否可以放置
        if (!canPlaceStoneOnSimulatedBoard(simulatedBoard, move.row, move.col, currentPlayer)) {
            currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            continue;
        }
        
        // 放置棋子
        simulatedBoard[move.row][move.col] = currentPlayer;
        
        // 检查获胜
        if (checkWin(move.row, move.col, currentPlayer, simulatedBoard)) {
            return currentPlayer === player ? 1 : -1;
        }
        
        // 切换玩家
        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        movesLeft--;
    }
    
    // 检查平局
    if (checkDrawFromBoard(simulatedBoard)) {
        return 0; // 平局
    }
    
    // 如果模拟结束但没有决定结果，返回随机值
    return Math.random() > 0.5 ? 1 : -1;
}

// 从棋盘获取空位置
function getEmptyPositions(board) {
    const positions = [];
    for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
            if (board[row][col] === null) {
                positions.push({ row, col });
            }
        }
    }
    return positions;
}

// 检查是否可以在模拟棋盘上放置棋子
function canPlaceStoneOnSimulatedBoard(board, row, col, player) {
    // 如果放置后会使对方棋子无气，则允许
    const tempBoard = JSON.parse(JSON.stringify(board));
    tempBoard[row][col] = player;
    
    // 检查所有对方棋子是否会被提掉
    const opponent = player === 'black' ? 'white' : 'black';
    for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
            if (tempBoard[r][c] === opponent) {
                if (getLiberties(tempBoard, r, c) === 0) {
                    return true; // 可以下，因为会提子
                }
            }
        }
    }
    
    // 检查自己是否无气
    return getLiberties(tempBoard, row, col) > 0;
}

// 检查模拟棋盘是否平局
function checkDrawFromBoard(board) {
    // 检查棋盘是否已满
    for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
            if (board[row][col] === null) {
                return false;
            }
        }
    }
    
    return true;
}

// 从模拟棋盘上检查是否获胜
function checkWinFromBoard(board, row, col, player) {
    const directions = [
        [0, 1],   // 水平
        [1, 0],   // 垂直
        [1, 1],   // 对角线
        [1, -1]   // 反对角线
    ];
    
    for (const [dr, dc] of directions) {
        let count = 1;
        
        // 正方向检查
        for (let i = 1; i <= 5; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;
            
            if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19 || 
                board[newRow][newCol] !== player) {
                break;
            }
            count++;
        }
        
        // 反方向检查
        for (let i = 1; i <= 5; i++) {
            const newRow = row - dr * i;
            const newCol = col - dc * i;
            
            if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19 || 
                board[newRow][newCol] !== player) {
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

// 使用神经网络评估棋盘状态
function evaluateBoardWithNN(board, player) {
    // 这里需要实现神经网络的加载和预测逻辑
    // 返回各位置的获胜概率
    return {}; // 暂时返回空对象
}

// 在AI移动选择中结合神经网络预测
function getHardAIMoveWithNN(board, player) {
    const emptyPositions = getEmptyPositions(board);
    if (emptyPositions.length === 0) return null;
    
    const winningMove = findWinningMove(board, player);
    if (winningMove) return winningMove;
    
    const prediction = evaluateBoardWithNN(board, player);
    const rankedMoves = emptyPositions.sort((a, b) => {
        return (prediction[a.row] || 0)[a.col] - (prediction[b.row] || 0)[b.col];
    });
    
    for (let i = 0; i < Math.min(5, rankedMoves.length); i++) {
        const move = rankedMoves[i];
        return monteCarloTreeSearch(board, player, 500);
    }
    
    return getRandomAIMove(board);
}
