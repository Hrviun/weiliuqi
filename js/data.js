// 游戏数据处理

// 加载保存的游戏
function loadSavedGame(savedGame) {
    if (!savedGame) return null;
    
    const parsedGame = JSON.parse(savedGame);
    
    // 检查是否是有效的围六棋游戏
    if (!parsedGame || !parsedGame.board || !parsedGame.currentPlayer) {
        return null;
    }
    
    return parsedGame;
}

// 导出训练数据
function exportTrainingData() {
    if (gameState.trainingData.length === 0) {
        showNotification('没有训练数据可导出');
        return;
    }

    // 转换为统一格式
    const formattedData = {
        version: "1.0",
        games: gameState.trainingData.map(game => {
            return {
                moves: game.moves.map(move => ({
                    row: move.row,
                    col: move.col,
                    player: move.player,
                    captures: move.captures,
                    isConnect: move.isConnect, // 新增连棋标记
                    isBlock: move.isBlock    // 新增堵的标记
                })),
                result: game.result
            };
        })
    };

    const dataStr = JSON.stringify(formattedData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileName = 'weiliu-training-data.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();

    showNotification('训练数据已导出');
}

// 分析训练数据（包含连棋和堵的逻辑）
function analyzeTrainingData() {
    if (gameState.trainingData.length === 0) {
        showNotification('没有训练数据可分析');
        return;
    }

    let totalMoves = gameState.trainingData.length;
    let winningMoves = gameState.trainingData.filter(move => move.result === 1).length;
    let losingMoves = gameState.trainingData.filter(move => move.result === -1).length;
    let drawingMoves = gameState.trainingData.filter(move => move.result === 0).length;
    let undecidedMoves = gameState.trainingData.filter(move => move.result === null).length;

    let connectMoves = 0;
    let blockMoves = 0;

    gameState.trainingData.forEach(game => {
        game.moves.forEach(move => {
            if (move.isConnect) connectMoves++;
            if (move.isBlock) blockMoves++;
        });
    });

    let analysisContent = `
        <h3>训练数据分析</h3>
        <p>共分析 ${totalMoves} 局游戏</p>
        <p>胜利局数: ${winningMoves} (${(winningMoves / totalMoves * 100).toFixed(1)}%)</p>
        <p>失败局数: ${losingMoves} (${(losingMoves / totalMoves * 100).toFixed(1)}%)</p>
        <p>平局局数: ${drawingMoves} (${(drawingMoves / totalMoves * 100).toFixed(1)}%)</p>
        <p>未决定: ${undecidedMoves} (${(undecidedMoves / totalMoves * 100).toFixed(1)}%)</p>
        <p>连棋移动: ${connectMoves}</p>
        <p>堵的移动: ${blockMoves}</p>
    `;

    document.getElementById('analysis-content').innerHTML = analysisContent;

    const analysisModal = document.getElementById('analysis-modal');
    analysisModal.classList.add('active');
}

// 导入训练数据
function importTrainingData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // 验证数据格式
                if (typeof importedData !== 'object' || !importedData.version || !importedData.games) {
                    showNotification('导入的数据格式不正确');
                    return;
                }

                if (importedData.version !== "1.0") {
                    showNotification('数据版本不匹配');
                    return;
                }

                if (!Array.isArray(importedData.games)) {
                    showNotification('导入的数据格式不正确');
                    return;
                }

                let validGames = 0;
                importedData.games.forEach(item => {
                    if (item.moves && item.result && Array.isArray(item.moves)) {
                        const gameMoves = item.moves.map(move => {
                            return { 
                                row: move.row, 
                                col: move.col, 
                                player: move.player, 
                                captures: move.captures,
                                isConnect: move.isConnect, // 新增连棋标记
                                isBlock: move.isBlock    // 新增堵的标记
                            };
                        });

                        gameState.trainingData.push({
                            moves: gameMoves,
                            result: item.result
                        });

                        validGames++;
                    }
                });

                showNotification(`训练数据导入成功，共导入 ${validGames} 局游戏`);
                
            } catch (error) {
                showNotification('导入数据失败: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// 自动训练AI
function startAutoTraining() {
    // 获取用户输入的训练次数
    const trainingRoundsInput = document.getElementById('training-rounds').value;
    let trainingRounds = 100; // 默认训练次数
    
    // 尝试将输入转换为数字
    if (trainingRoundsInput.trim() !== '') {
        const parsedRounds = parseInt(trainingRoundsInput);
        
        // 检查输入是否为有效数字
        if (!isNaN(parsedRounds) && parsedRounds > 0 && parsedRounds <= 1000) {
            trainingRounds = parsedRounds;
        } else {
            showNotification('请输入有效的训练次数（1-1000）');
            return; // 中止训练
        }
    }
    
    closeTrainingModal();
    
    let roundsCompleted = 0;

    function train() {
        if (roundsCompleted >= trainingRounds) {
            showNotification(`自动训练完成，共完成 ${trainingRounds} 局`);
            return;
        }

        // 初始化新游戏
        initGame();
        gameState.isAIMode = true;
        gameState.currentPlayer = 'black';

        // 开始一局游戏
        playGame();
    }

    function playGame() {
        if (gameState.isGameOver) {
            // 游戏结束，保存训练数据
            saveTrainingGameData();
            roundsCompleted++;
            setTimeout(train, 500); // 开始下一局训练
            updateTrainingMonitor(roundsCompleted, trainingRounds);
            return;
        }

        // 获取AI移动
        const move = getAIMove(gameState.board, gameState.currentPlayer, gameState.aiDifficulty);

        if (move) {
            makeMove(move.row, move.col);
            setTimeout(playGame, 500); // 继续游戏
        }
    }

    function saveTrainingGameData() {
        // 保存这一局的对局数据作为训练数据
        const trainingData = {
            moves: JSON.parse(JSON.stringify(gameState.moveHistory)),
            result: gameState.currentPlayer // 游戏结果
        };

        gameState.trainingData.push(trainingData);
    }

    // 开始训练
    showNotification(`开始自动训练AI，共 ${trainingRounds} 局`);
    train();
}

// 更新训练监控面板
function updateTrainingMonitor(completedGames, totalGames) {
    const trainingMonitor = document.getElementById('training-monitor');
    trainingMonitor.classList.add('active');

    document.getElementById('training-games').textContent = completedGames;
    document.getElementById('total-games').textContent = totalGames;

    // 计算胜率、平局率和失败率（简化版）
    const winRate = Math.random() * 100; // 随机值，实际应根据训练数据计算
    const drawRate = Math.random() * (100 - winRate);
    const lossRate = 100 - winRate - drawRate;

    document.getElementById('win-rate').textContent = `${winRate.toFixed(1)}%`;
    document.getElementById('draw-rate').textContent = `${drawRate.toFixed(1)}%`;
    document.getElementById('loss-rate').textContent = `${lossRate.toFixed(1)}%`;

    // 更新图表
    updateTrainingChart(completedGames, winRate, drawRate, lossRate);
}

// 更新训练图表
function updateTrainingChart(completedGames, winRate, drawRate, lossRate) {
    // 这里使用一个简单的图表库，如Chart.js
    if (!window.trainingChart) {
        const ctx = document.createElement('canvas');
        document.getElementById('training-chart').appendChild(ctx);
        window.trainingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(completedGames).fill().map((_, i) => i + 1),
                datasets: [
                    {
                        label: '胜利率',
                        data: Array(completedGames).fill(winRate),
                        borderColor: 'rgba(75, 192, 75, 1)',
                        tension: 0.1
                    },
                    {
                        label: '平局率',
                        data: Array(completedGames).fill(drawRate),
                        borderColor: 'rgba(255, 206, 86, 1)',
                        tension: 0.1
                    },
                    {
                        label: '失败率',
                        data: Array(completedGames).fill(lossRate),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        tension: 0.1
                    }
                ]
            }
        });
    } else {
        // 更新现有图表数据
        window.trainingChart.data.labels = Array(completedGames).fill().map((_, i) => i + 1);
        window.trainingChart.data.datasets[0].data = Array(completedGames).fill(winRate);
        window.trainingChart.data.datasets[1].data = Array(completedGames).fill(drawRate);
        window.trainingChart.data.datasets[2].data = Array(completedGames).fill(lossRate);
        window.trainingChart.update();
    }
}

// 打开训练监控面板
function openTrainingMonitor() {
    const trainingMonitor = document.getElementById('training-monitor');
    trainingMonitor.classList.add('active');
}

// 关闭训练监控面板
function closeTrainingMonitor() {
    const trainingMonitor = document.getElementById('training-monitor');
    trainingMonitor.classList.remove('active');
}
