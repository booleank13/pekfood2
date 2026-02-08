const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;
const TILE_SIZE = 40;
const COLS = 8;
const ROWS = 12;

// Ensure canvas resolution matches display
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

let lastTime = 0;
let gameState = 'START'; // START, PLAYING, END

// Map: 1 = Wall, 0 = Path, 2 = Black Wall (No Move)
const map = [
    [2,2,2,2,2,2,2,2], // Top logo area (no move)
    [2,2,2,2,2,2,2,2], // Top logo area
    [2,2,2,2,2,2,2,2], // Top logo area
    [1,1,1,1,1,1,1,1], // Top wall of play area
    [1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1],
    [1,0,1,0,0,1,0,1],
    [1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1], // Bottom wall of play area
    [2,2,2,2,2,2,2,2]  // Score bar area
];

// Assets
const assets = {
    food: []
};

// Input State
const keys = {};

class PacMan {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15; // Increased for 40px tiles
        this.speed = 3;
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.mouthOpen = 0;
        this.mouthSpeed = 0.1;
        this.angle = 0;
    }

    canMove(x, y) {
        // Check collision with walls
        // Bounding box
        let left = x - this.radius;
        let right = x + this.radius;
        let top = y - this.radius;
        let bottom = y + this.radius;

        let minCol = Math.floor(left / TILE_SIZE);
        let maxCol = Math.floor(right / TILE_SIZE);
        let minRow = Math.floor(top / TILE_SIZE);
        let maxRow = Math.floor(bottom / TILE_SIZE);

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                    if (map[r][c] !== 0) { // 1 or 2 is solid
                        return false;
                    }
                } else {
                    // Out of bounds is considered wall
                }
            }
        }
        return true;
    }

    update() {
        // Try to change to nextDirection if set
        if (this.nextDirection.x !== 0 || this.nextDirection.y !== 0) {
            let nextX = this.x + this.nextDirection.x * this.speed;
            let nextY = this.y + this.nextDirection.y * this.speed;
            if (this.canMove(nextX, nextY)) {
                this.direction = { ...this.nextDirection };
                this.nextDirection = { x: 0, y: 0 };
            }
        }

        // Move in current direction
        let nextX = this.x + this.direction.x * this.speed;
        let nextY = this.y + this.direction.y * this.speed;

        if (this.canMove(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // Hit a wall, stop? Or just slide?
            // Simple stop for now
            // But if we are slightly misaligned, we might want to realign to grid center
            // For now, strict collision
        }

        // Boundary checks (just in case, though walls handle it)
        if (this.x - this.radius < 0) this.x = this.radius;
        if (this.x + this.radius > GAME_WIDTH) this.x = GAME_WIDTH - this.radius;
        if (this.y - this.radius < 0) this.y = this.radius;
        if (this.y + this.radius > GAME_HEIGHT) this.y = GAME_HEIGHT - this.radius;

        // Mouth animation
        this.mouthOpen += this.mouthSpeed;
        if (this.mouthOpen > 0.5 || this.mouthOpen < 0) {
            this.mouthSpeed = -this.mouthSpeed;
        }

        // Update angle
        if (this.direction.x === 1) this.angle = 0;
        if (this.direction.x === -1) this.angle = Math.PI;
        if (this.direction.y === 1) this.angle = Math.PI / 2;
        if (this.direction.y === -1) this.angle = -Math.PI / 2;
    }

    draw(ctx) {
        ctx.save();
        // Round coordinates to avoid sub-pixel blurring/bleeding
        ctx.translate(Math.round(this.x), Math.round(this.y));
        ctx.rotate(this.angle);

        ctx.beginPath();
        // Use linear open/close for classic look
        const open = Math.abs(this.mouthOpen);

        ctx.arc(0, 0, this.radius, open, 2 * Math.PI - open);
        ctx.lineTo(0, 0);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }

    setDirection(x, y) {
        this.direction = { x, y };
    }
}

const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const overlay = document.getElementById('overlay');
const timerElement = document.getElementById('timer');
const scoreFill = document.getElementById('score-fill');

let gameDuration = 15000;
let gameTimer = 0;
let currentScore = 0;
const MAX_SCORE = 100;

function startGame() {
    gameState = 'PLAYING';
    overlay.classList.add('hidden');
    startScreen.classList.add('hidden');

    // Reset - Center of tile at col 4, row 6 (160 + 20, 240 + 20) -> (180, 260)
    // Actually map width is 320. Col 4 is 160-200. Center is 180.
    // Row 6 is 240-280. Center is 260.
    // Wait, array index 4 is 5th column. 0,1,2,3,4.
    // Col 0: 0-40. Col 1: 40-80. Col 2: 80-120. Col 3: 120-160. Col 4: 160-200.
    // Center of Col 4 is 180.
    // Row 6: 240-280. Center is 260.
    // Let's check map[6][4].
    // Row 6: [1,0,0,0,0,0,0,1] -> Index 4 is 0. Safe.
    pacman.x = 4 * TILE_SIZE + TILE_SIZE / 2;
    pacman.y = 6 * TILE_SIZE + TILE_SIZE / 2;
    pacman.direction = { x: 0, y: 0 };
    pacman.nextDirection = { x: 0, y: 0 };

    initFoods();
    currentScore = 0;
    scoreFill.style.width = '0%';
    gameTimer = gameDuration;
}

function endGame() {
    gameState = 'END';
    overlay.classList.remove('hidden');
    endScreen.classList.remove('hidden');
}

overlay.addEventListener('click', () => {
    if (gameState === 'START') {
        startGame();
    } else if (gameState === 'END') {
        window.location.href = 'https://pekfood.com/';
    }
});

const pacman = new PacMan(4 * TILE_SIZE + TILE_SIZE / 2, 6 * TILE_SIZE + TILE_SIZE / 2);

class Food {
    constructor(x, y, img) {
        this.x = x;
        this.y = y;
        this.width = 25; // Increased for 40px tiles
        this.height = 25;
        this.img = img;
        this.markedForDeletion = false;
    }

    draw(ctx) {
        ctx.drawImage(this.img, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
}

let foods = [];

function loadAssets() {
    // Load food images
    for (let i = 0; i <= 6; i++) {
        const img = new Image();
        img.src = `assets/food_${i}.png`;
        assets.food.push(img);
    }
}

function initFoods() {
    foods = [];
    if (assets.food.length === 0) return;

    let possibleSpots = [];

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 0) {
                // Avoid Pacman start pos (approx row 6, col 4 for 8x12 map center)
                // Pacman is at GAME_WIDTH/2, GAME_HEIGHT/2 -> 160, 240
                // 160 / 40 = 4 (Column index 4)
                // 240 / 40 = 6 (Row index 6)
                if (Math.abs(c - 4) < 1 && Math.abs(r - 6) < 1) continue;

                possibleSpots.push({c, r});
            }
        }
    }

    // Shuffle spots
    for (let i = possibleSpots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [possibleSpots[i], possibleSpots[j]] = [possibleSpots[j], possibleSpots[i]];
    }

    // Take first 6
    let spotsToUse = possibleSpots.slice(0, 6);

    // Prepare unique icons
    let iconIndices = Array.from({length: assets.food.length}, (_, i) => i);
    // Shuffle icon indices
    for (let i = iconIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [iconIndices[i], iconIndices[j]] = [iconIndices[j], iconIndices[i]];
    }

    spotsToUse.forEach((spot, index) => {
        let imgIndex = iconIndices[index % iconIndices.length];
        let img = assets.food[imgIndex];
        let x = spot.c * TILE_SIZE + TILE_SIZE / 2;
        let y = spot.r * TILE_SIZE + TILE_SIZE / 2;
        foods.push(new Food(x, y, img));
    });
}

function drawMap(ctx) {
    ctx.fillStyle = "#1919A6"; // Wall color
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 1) {
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
            // map[r][c] === 2 is black/invisible wall, no draw
        }
    }
}

function checkCollisions() {
    foods.forEach(food => {
        let dx = food.x - pacman.x;
        let dy = food.y - pacman.y;
        let distance = Math.hypot(dx, dy);
        if (distance < pacman.radius + food.width/2) {
            food.markedForDeletion = true;
            currentScore += 20;
        }
    });
    foods = foods.filter(food => !food.markedForDeletion);
}

// Controls
window.addEventListener('keydown', (e) => {
    // Prevent default scrolling for arrow keys
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    if (gameState !== 'PLAYING') return;

    switch(e.key) {
        case 'ArrowUp': pacman.nextDirection = {x: 0, y: -1}; break;
        case 'ArrowDown': pacman.nextDirection = {x: 0, y: 1}; break;
        case 'ArrowLeft': pacman.nextDirection = {x: -1, y: 0}; break;
        case 'ArrowRight': pacman.nextDirection = {x: 1, y: 0}; break;
    }
});

// Touch controls
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    if (e.target === canvas) e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (gameState !== 'PLAYING') return;
    if (!touchStartX || !touchStartY) return;

    let touchEndX = e.touches[0].clientX;
    let touchEndY = e.touches[0].clientY;

    let diffX = touchEndX - touchStartX;
    let diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 10) { // Threshold
            if (diffX > 0) pacman.nextDirection = {x: 1, y: 0};
            else pacman.nextDirection = {x: -1, y: 0};
            touchStartX = touchEndX; // Reset for continuous control
            touchStartY = touchEndY;
        }
    } else {
        if (Math.abs(diffY) > 10) {
            if (diffY > 0) pacman.nextDirection = {x: 0, y: 1};
            else pacman.nextDirection = {x: 0, y: -1};
            touchStartX = touchEndX;
            touchStartY = touchEndY;
        }
    }

    if (e.target === canvas) e.preventDefault();
}, { passive: false });


function gameLoop(timestamp) {
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    if (gameState === 'START') {
        // Demo update (Pacman moves automatically)
        // Simple circle movement or bounce?
        // Let's just make it move right and wrap around
        pacman.x += 2;
        if (pacman.x > GAME_WIDTH + 20) pacman.x = -20;
        pacman.mouthOpen += 0.1;
        if (pacman.mouthOpen > 0.5 || pacman.mouthOpen < 0) pacman.mouthSpeed = -pacman.mouthSpeed;
        pacman.angle = 0;

    } else if (gameState === 'PLAYING') {
        pacman.update();
        checkCollisions();

        // Update Score Bar
        let progress = (currentScore / MAX_SCORE) * 100;
        if (progress > 100) progress = 100;
        scoreFill.style.width = `${progress}%`;

        if (currentScore >= MAX_SCORE) {
            endGame();
        }

        gameTimer -= deltaTime;
        if (gameTimer <= 0) {
            gameTimer = 0;
            endGame();
        }
        timerElement.textContent = Math.ceil(gameTimer / 1000);
    }
}

function draw() {
    // Clear screen
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (gameState === 'START') {
        drawMap(ctx);
        foods.forEach(food => food.draw(ctx));
        pacman.draw(ctx);
    } else if (gameState === 'PLAYING') {
        drawMap(ctx);
        foods.forEach(food => food.draw(ctx));
        pacman.draw(ctx);
    }
}

// Initialize
loadAssets();
// Delay initFoods slightly to ensure images are loaded, or just rely on them loading by the time user clicks start
setTimeout(() => initFoods(), 100);
requestAnimationFrame(gameLoop);
