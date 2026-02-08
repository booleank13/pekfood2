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
    [2,2,2,2,2,2,2,2], // Top logo area
    [2,2,2,2,2,2,2,2],
    [2,2,2,2,2,2,2,2],
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

// --- CLASSES ---

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 4;
        this.color = color;
        this.alpha = 1;
        this.decay = 0.02 + Math.random() * 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class PacMan {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 14;
        this.speed = 3;
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.mouthOpen = 0;
        this.mouthSpeed = 0.15;
        this.angle = 0;
        this.glow = 10;
        this.glowDirection = 1;
    }

    canMove(x, y) {
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
                    if (map[r][c] !== 0) { // Wall
                        return false;
                    }
                } else {
                    return false; // Out of bounds
                }
            }
        }
        return true;
    }

    update() {
        // Try next direction
        if (this.nextDirection.x !== 0 || this.nextDirection.y !== 0) {
            let nextX = this.x + this.nextDirection.x * this.speed;
            let nextY = this.y + this.nextDirection.y * this.speed;
            if (this.canMove(nextX, nextY)) {
                this.direction = { ...this.nextDirection };
                this.nextDirection = { x: 0, y: 0 };
                // Snap to center logic could improve turning but keeping it simple for now
            }
        }

        // Move
        let nextX = this.x + this.direction.x * this.speed;
        let nextY = this.y + this.direction.y * this.speed;

        if (this.canMove(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
        }

        // Boundary checks
        if (this.x - this.radius < 0) this.x = this.radius;
        if (this.x + this.radius > GAME_WIDTH) this.x = GAME_WIDTH - this.radius;
        if (this.y - this.radius < 0) this.y = this.radius;
        if (this.y + this.radius > GAME_HEIGHT) this.y = GAME_HEIGHT - this.radius;

        // Mouth animation
        this.mouthOpen += this.mouthSpeed;
        if (this.mouthOpen > 0.4 || this.mouthOpen < 0) {
            this.mouthSpeed = -this.mouthSpeed;
        }

        // Angle update
        if (this.direction.x === 1) this.angle = 0;
        else if (this.direction.x === -1) this.angle = Math.PI;
        else if (this.direction.y === 1) this.angle = Math.PI / 2;
        else if (this.direction.y === -1) this.angle = -Math.PI / 2;

        // Glow animation
        this.glow += this.glowDirection * 0.5;
        if (this.glow > 20 || this.glow < 10) this.glowDirection *= -1;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        ctx.rotate(this.angle);

        // Glow Effect
        ctx.shadowBlur = this.glow;
        ctx.shadowColor = "#FFD700";

        ctx.beginPath();
        const open = Math.abs(this.mouthOpen);
        ctx.arc(0, 0, this.radius, open, 2 * Math.PI - open);
        ctx.lineTo(0, 0);
        ctx.fillStyle = '#FFD700'; // Pacman Yellow
        ctx.fill();
        ctx.closePath();

        ctx.restore();
    }
}

class Food {
    constructor(x, y, img) {
        this.x = x;
        this.y = y;
        this.baseWidth = 24;
        this.baseHeight = 24;
        this.width = 24;
        this.height = 24;
        this.img = img;
        this.markedForDeletion = false;
        this.pulseAngle = Math.random() * Math.PI * 2;
    }

    update() {
        this.pulseAngle += 0.1;
        const scale = 1 + Math.sin(this.pulseAngle) * 0.1; // +/- 10%
        this.width = this.baseWidth * scale;
        this.height = this.baseHeight * scale;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.drawImage(this.img, -this.width/2, -this.height/2, this.width, this.height);
        ctx.restore();
    }
}

// --- STATE & DOM ---

const pacman = new PacMan(4 * TILE_SIZE + TILE_SIZE / 2, 6 * TILE_SIZE + TILE_SIZE / 2);
let foods = [];
let particles = [];

const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const startBtn = document.getElementById('start-btn');
const visitBtn = document.getElementById('visit-btn');
const timerElement = document.getElementById('timer');
const scoreBar = document.getElementById('score-bar');

let gameDuration = 15000;
let gameTimer = 0;
let currentScore = 0;
const MAX_SCORE = 100;

// --- FUNCTIONS ---

function loadAssets() {
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
                // Avoid Pacman spawn area
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

    let spotsToUse = possibleSpots.slice(0, 6);
    let iconIndices = Array.from({length: assets.food.length}, (_, i) => i);
    // Shuffle icons
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

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.remove('active');
    endScreen.classList.remove('active');

    // Reset Pacman
    pacman.x = 4 * TILE_SIZE + TILE_SIZE / 2;
    pacman.y = 6 * TILE_SIZE + TILE_SIZE / 2;
    pacman.direction = { x: 0, y: 0 };
    pacman.nextDirection = { x: 0, y: 0 };
    pacman.mouthOpen = 0;

    initFoods();
    particles = [];
    currentScore = 0;
    scoreBar.style.width = '0%';
    gameTimer = gameDuration;
}

function endGame() {
    gameState = 'END';
    endScreen.classList.add('active');
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(x, y, color));
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
            spawnParticles(food.x, food.y, '#FFD700'); // Gold particles
            spawnParticles(food.x, food.y, '#FF5252'); // Red accent
        }
    });
    foods = foods.filter(food => !food.markedForDeletion);
}

function drawMap(ctx) {
    ctx.fillStyle = "#111"; // Dark background for map
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Glow for walls
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#1E88E5"; // Neon Blue
    ctx.fillStyle = "#0D47A1"; // Dark Blue Fill

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 1) {
                // Draw rounded rect
                let x = c * TILE_SIZE + 2; // Slight inset
                let y = r * TILE_SIZE + 2;
                let size = TILE_SIZE - 4;

                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, size, size, 8);
                } else {
                    ctx.rect(x, y, size, size);
                }
                ctx.fill();
            }
        }
    }

    // Reset shadow
    ctx.shadowBlur = 0;
}

function update(deltaTime) {
    if (gameState === 'START') {
        // Demo mode
        pacman.x += 2;
        if (pacman.x > GAME_WIDTH + 20) pacman.x = -20;
        pacman.mouthOpen += pacman.mouthSpeed;
        if (pacman.mouthOpen > 0.4 || pacman.mouthOpen < 0) pacman.mouthSpeed = -pacman.mouthSpeed;
        pacman.angle = 0;

        // Pulse foods in demo
        foods.forEach(f => f.update());

    } else if (gameState === 'PLAYING') {
        pacman.update();
        foods.forEach(f => f.update());
        checkCollisions();

        // Particles
        particles.forEach(p => p.update());
        particles = particles.filter(p => p.alpha > 0);

        // UI
        let progress = (currentScore / MAX_SCORE) * 100;
        if (progress > 100) progress = 100;
        scoreBar.style.width = `${progress}%`;

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
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawMap(ctx);

    foods.forEach(food => food.draw(ctx));
    particles.forEach(p => p.draw(ctx));
    pacman.draw(ctx);
}

function gameLoop(timestamp) {
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// --- INPUTS ---

window.addEventListener('keydown', (e) => {
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
        if (Math.abs(diffX) > 10) {
            if (diffX > 0) pacman.nextDirection = {x: 1, y: 0};
            else pacman.nextDirection = {x: -1, y: 0};
            touchStartX = touchEndX;
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

// Event Listeners for UI
startBtn.addEventListener('click', startGame);
visitBtn.addEventListener('click', () => {
    window.location.href = 'https://pekfood.com/';
});

// Init
loadAssets();
setTimeout(() => initFoods(), 100);
requestAnimationFrame(gameLoop);
