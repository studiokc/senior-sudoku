class SudokuGame {
    constructor() {
        this.grid = Array(81).fill(0);
        this.solution = Array(81).fill(0);
        this.initialGrid = Array(81).fill(0);
        this.selectedIndex = -1;
        this.history = [];
        this.timer = 0;
        this.timerInterval = null;

        this.init();
    }

    init() {
        this.generatePuzzle();
        this.renderGrid();
        this.setupEventListeners();
        this.startTimer();
    }

    generatePuzzle() {
        // 1. フル解答を作成（ランダム要素あり）
        this.solve(this.solution);

        // 2. 問題を作成（難易度調整: 初級向けに空欄を少なめに）
        this.grid = [...this.solution];
        this.initialGrid = [...this.solution];

        let attempts = 30; // 消すマスの数（高齢者向けに少なめに設定）
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
            // 行チェック
            if (grid[row * 9 + i] === num) return false;
            // 列チェック
            if (grid[i * 9 + col] === num) return false;
            // 3x3ボックスチェック
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

        // ハイライト（同じ数字のマスを強調）
        const val = this.grid[index];
        if (val !== 0) {
            cells.forEach((c, i) => {
                if (this.grid[i] === val) c.classList.add('highlighted');
            });
        }
    }

    handleInput(value) {
        if (this.selectedIndex === -1 || this.initialGrid[this.selectedIndex] !== 0) return;

        // 履歴を保存
        this.history.push([...this.grid]);
        if (this.history.length > 20) this.history.shift();

        this.grid[this.selectedIndex] = value;
        this.renderGrid();
        this.selectCell(this.selectedIndex);

        if (this.checkWin()) {
            this.showWinMessage();
        }
    }

    undo() {
        if (this.history.length > 0) {
            this.grid = this.history.pop();
            this.renderGrid();
            this.selectCell(-1);
        }
    }

    checkWin() {
        if (this.grid.includes(0)) return false;
        for (let i = 0; i < 81; i++) {
            const temp = this.grid[i];
            this.grid[i] = 0;
            if (!this.isValid(this.grid, i, temp)) {
                this.grid[i] = temp;
                return false;
            }
            this.grid[i] = temp;
        }
        return true;
    }

    showWinMessage() {
        clearInterval(this.timerInterval);
        document.getElementById('message-overlay').classList.remove('hidden');
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
        // 数字ボタン
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleInput(parseInt(btn.dataset.value));
            });
        });

        // 戻るボタン
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());

        // 新規ゲーム
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.grid = Array(81).fill(0);
            this.solution = Array(81).fill(0);
            this.history = [];
            this.init();
        });

        // リスタート（オーバーレイ）
        document.getElementById('restart-btn').addEventListener('click', () => {
            document.getElementById('message-overlay').classList.add('hidden');
            document.getElementById('new-game-btn').click();
        });

        // ヒント
        document.getElementById('hint-btn').addEventListener('click', () => {
            if (this.selectedIndex !== -1 && this.initialGrid[this.selectedIndex] === 0) {
                this.handleInput(this.solution[this.selectedIndex]);
            }
        });
    }
}

window.onload = () => {
    new SudokuGame();
};
