class SudokuGame {
    constructor() {
        this.grid = Array(81).fill(0);
        this.solution = Array(81).fill(0);
        this.initialGrid = Array(81).fill(0);
        this.memos = Array(81).fill(0).map(() => Array(10).fill(false)); // 1-9

        this.selectedIndex = -1;
        this.history = [];
        this.timer = 0;
        this.timerInterval = null;

        this.isMemoMode = false;
        this.difficulty = 'easy'; // easy, medium, hard
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.score = 0;

        this.stats = this.loadStats();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startNewGame();
    }

    loadStats() {
        const saved = localStorage.getItem('sudoku_stats');
        return saved ? JSON.parse(saved) : {
            cleared: 0,
            bestScore: 0,
            perfectGames: 0,
            streak: 0,
            currentStreak: 0
        };
    }

    saveStats() {
        localStorage.setItem('sudoku_stats', JSON.stringify(this.stats));
    }

    updateStatsDisplay() {
        document.getElementById('stats-cleared').innerText = this.stats.cleared;
        document.getElementById('stats-best-score').innerText = this.stats.bestScore;
        document.getElementById('stats-perfect').innerText = this.stats.perfectGames;
        document.getElementById('stats-streak').innerText = this.stats.streak;
    }

    startNewGame() {
        this.grid = Array(81).fill(0);
        this.solution = Array(81).fill(0);
        this.memos = Array(81).fill(0).map(() => Array(10).fill(false));
        this.mistakes = 0;
        this.score = 0;
        document.getElementById('mistakes-display').innerText = `0/${this.maxMistakes}`;
        document.getElementById('score-display').innerText = '0';

        this.generatePuzzle();
        this.renderGrid();
        this.startTimer();
        this.selectCell(-1);
    }

    generatePuzzle() {
        this.solve(this.solution);
        this.grid = [...this.solution];
        this.initialGrid = [...this.solution];

        let removeCount = 30; // easy
        if (this.difficulty === 'medium') removeCount = 45;
        if (this.difficulty === 'hard') removeCount = 55;

        document.getElementById('difficulty-display').innerText =
            this.difficulty === 'easy' ? '初級' : (this.difficulty === 'medium' ? '中級' : '上級');

        let attempts = removeCount;
        while (attempts > 0) {
            let index = Math.floor(Math.random() * 81);
            if (this.grid[index] !== 0) {
                this.grid[index] = 0;
                this.initialGrid[index] = 0;
                attempts--;
            }
        }
    }

    solve(grid) {
        for (let i = 0; i < 81; i++) {
            if (grid[i] === 0) {
                let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                for (let num of nums) {
                    if (this.isValid(grid, i, num)) {
                        grid[i] = num;
                        if (this.solve(grid)) return true;
                        grid[i] = 0;
                    }
                }
                return false;
            }
        }
        return true;
    }

    isValid(grid, index, num) {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        for (let i = 0; i < 9; i++) {
            if (grid[row * 9 + i] === num) return false;
            if (grid[i * 9 + col] === num) return false;
            const bIndex = (boxRow + Math.floor(i / 3)) * 9 + (boxCol + i % 3);
            if (grid[bIndex] === num) return false;
        }
        return true;
    }

    renderGrid() {
        const gridElement = document.getElementById('sudoku-grid');
        gridElement.innerHTML = '';

        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            if (this.initialGrid[i] !== 0) {
                cell.innerText = this.initialGrid[i];
                cell.classList.add('fixed');
            } else if (this.grid[i] !== 0) {
                cell.innerText = this.grid[i];
                cell.classList.add('user-value');
                if (this.grid[i] !== this.solution[i]) cell.classList.add('error');
            } else {
                // Render Memos
                const memoGrid = document.createElement('div');
                memoGrid.classList.add('memo-grid');
                for (let m = 1; m <= 9; m++) {
                    const memoNum = document.createElement('span');
                    memoNum.classList.add('memo-num');
                    memoNum.innerText = m;
                    if (this.memos[i][m]) memoNum.classList.add('visible');
                    memoGrid.appendChild(memoNum);
                }
                cell.appendChild(memoGrid);
            }

            cell.addEventListener('click', () => this.selectCell(i));
            gridElement.appendChild(cell);
        }
    }

    selectCell(index) {
        this.selectedIndex = index;
        const cells = document.querySelectorAll('.cell');
        cells.forEach(c => c.classList.remove('selected', 'highlighted'));

        if (index === -1) return;

        cells[index].classList.add('selected');

        const val = this.grid[index];
        if (val !== 0) {
            cells.forEach((c, i) => {
                if (this.grid[i] === val) c.classList.add('highlighted');
            });
        }
    }

    handleInput(value) {
        if (this.selectedIndex === -1 || this.initialGrid[this.selectedIndex] !== 0) return;

        if (this.isMemoMode) {
            this.memos[this.selectedIndex][value] = !this.memos[this.selectedIndex][value];
            this.renderGrid();
            this.selectCell(this.selectedIndex);
            return;
        }

        if (this.grid[this.selectedIndex] === value) return;

        this.history.push({ grid: [...this.grid], memos: this.memos.map(m => [...m]) });
        this.grid[this.selectedIndex] = value;

        // Check if correct
        if (value !== this.solution[this.selectedIndex]) {
            this.mistakes++;
            document.getElementById('mistakes-display').innerText = `${this.mistakes}/${this.maxMistakes}`;
            if (this.mistakes >= this.maxMistakes) {
                this.gameOver();
            }
        } else {
            this.score += 10;
            document.getElementById('score-display').innerText = this.score;
            this.checkSectionCompletion(this.selectedIndex);
        }

        this.renderGrid();
        this.selectCell(this.selectedIndex);

        if (this.checkWin()) {
            this.handleWin();
        }
    }

    checkWin() {
        for (let i = 0; i < 81; i++) {
            if (this.grid[i] !== this.solution[i]) return false;
        }
        return true;
    }

    handleWin() {
        clearInterval(this.timerInterval);
        this.stats.cleared++;
        this.stats.bestScore = Math.max(this.stats.bestScore, this.score);
        if (this.mistakes === 0) this.stats.perfectGames++;
        this.stats.currentStreak++;
        this.stats.streak = Math.max(this.stats.streak, this.stats.currentStreak);
        this.saveStats();

        // Trigger final completion effect for the whole grid
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, i) => {
            setTimeout(() => cell.classList.add('completed-effect'), i * 10);
        });

        setTimeout(() => {
            document.getElementById('message-title').innerText = "素晴らしい！";
            document.getElementById('message-text').innerText = `スコア: ${this.score} | タイム: ${document.getElementById('timer').innerText}`;
            document.getElementById('message-overlay').classList.remove('hidden');
        }, 1500);
    }

    checkSectionCompletion(index) {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        const cells = document.querySelectorAll('.cell');
        const triggerEffect = (indices) => {
            indices.forEach(idx => {
                cells[idx].classList.remove('completed-effect');
                void cells[idx].offsetWidth; // trigger reflow
                cells[idx].classList.add('completed-effect');
                setTimeout(() => cells[idx].classList.remove('completed-effect'), 1000);
            });
        };

        // Row
        const rowIndices = Array.from({ length: 9 }, (_, i) => row * 9 + i);
        if (rowIndices.every(idx => this.grid[idx] === this.solution[idx])) triggerEffect(rowIndices);

        // Column
        const colIndices = Array.from({ length: 9 }, (_, i) => i * 9 + col);
        if (colIndices.every(idx => this.grid[idx] === this.solution[idx])) triggerEffect(colIndices);

        // Box
        const boxIndices = [];
        for (let i = 0; i < 9; i++) {
            boxIndices.push((boxRow + Math.floor(i / 3)) * 9 + (boxCol + i % 3));
        }
        if (boxIndices.every(idx => this.grid[idx] === this.solution[idx])) triggerEffect(boxIndices);
    }

    gameOver() {
        clearInterval(this.timerInterval);
        this.stats.currentStreak = 0;
        this.saveStats();
        document.getElementById('message-title').innerText = "ゲームオーバー";
        document.getElementById('message-text').innerText = "3回ミスしました。もう一度挑戦しますか？";
        document.getElementById('message-overlay').classList.remove('hidden');
    }

    undo() {
        if (this.history.length > 0) {
            const lastState = this.history.pop();
            this.grid = lastState.grid;
            this.memos = lastState.memos;
            this.renderGrid();
            this.selectCell(-1);
        }
    }

    startTimer() {
        this.timer = 0;
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer++;
            const mins = Math.floor(this.timer / 60).toString().padStart(2, '0');
            const secs = (this.timer % 60).toString().padStart(2, '0');
            document.getElementById('timer').innerText = `${mins}:${secs}`;
        }, 1000);
    }

    setupEventListeners() {
        // Clear previous listeners if re-init (though this doesn't fully clear anonymous ones, it's fine for simple app)

        // Input Numbers
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleInput(parseInt(btn.dataset.value)));
        });

        // Tools
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('erase-btn').addEventListener('click', () => {
            if (this.selectedIndex !== -1 && this.initialGrid[this.selectedIndex] === 0) {
                this.grid[this.selectedIndex] = 0;
                this.memos[this.selectedIndex] = Array(10).fill(false);
                this.renderGrid();
                this.selectCell(this.selectedIndex);
            }
        });
        document.getElementById('memo-btn').addEventListener('click', () => {
            this.isMemoMode = !this.isMemoMode;
            document.getElementById('memo-btn').classList.toggle('active');
            document.getElementById('memo-status').innerText = this.isMemoMode ? 'ON' : 'OFF';
        });
        document.getElementById('hint-btn').addEventListener('click', () => {
            if (this.selectedIndex !== -1 && this.initialGrid[this.selectedIndex] === 0) {
                this.handleInput(this.solution[this.selectedIndex]);
            }
        });

        // New Game / Modals
        document.getElementById('new-game-btn').addEventListener('click', () => {
            document.getElementById('difficulty-modal').classList.remove('hidden');
        });

        document.querySelectorAll('.diff-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.difficulty = btn.dataset.level;
                document.getElementById('difficulty-modal').classList.add('hidden');
                this.startNewGame();
            });
        });

        document.getElementById('stats-open-btn').addEventListener('click', () => {
            this.updateStatsDisplay();
            document.getElementById('stats-modal').classList.remove('hidden');
        });

        document.querySelectorAll('.close-btn, .close-overlay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal, .overlay').classList.add('hidden');
            });
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            alert('設定機能は開発中です。');
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            document.getElementById('message-overlay').classList.add('hidden');
            this.startNewGame();
        });
    }
}

window.onload = () => {
    new SudokuGame();
};
