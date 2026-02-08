const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;

// Ensure canvas resolution matches display
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

let lastTime = 0;
let gameState = 'START'; // START, PLAYING, END

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
        this.radius = 15;
        this.speed = 3;
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.mouthOpen = 0;
        this.mouthSpeed = 0.1;
        this.angle = 0;
    }

    update() {
        // Move
        this.x += this.direction.x * this.speed;
        this.y += this.direction.y * this.speed;

        // Boundary checks
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
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.beginPath();
        const mouthAngle = 0.2 * Math.PI * (0.5 + 0.5 * Math.sin(this.mouthOpen * Math.PI * 4));
        // Smoother oscillation: 0.2 * PI is max open.
        // Actually simple linear ping-pong is fine.

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

let gameDuration = 15000;
let gameTimer = 0;

function startGame() {
    gameState = 'PLAYING';
    overlay.classList.add('hidden');
    startScreen.classList.add('hidden');

    // Reset
    pacman.x = GAME_WIDTH / 2;
    pacman.y = GAME_HEIGHT / 2;
    pacman.direction = { x: 0, y: 0 };
    pacman.nextDirection = { x: 0, y: 0 };

    foods = [];
    foodTimer = 0;
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

const pacman = new PacMan(GAME_WIDTH / 2, GAME_HEIGHT / 2);

class Food {
    constructor(x, y, img) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.img = img;
        this.markedForDeletion = false;
    }

    draw(ctx) {
        ctx.drawImage(this.img, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
}

let foods = [];
let foodTimer = 0;
let foodInterval = 500;

function loadAssets() {
    // Load food images
    for (let i = 0; i <= 6; i++) {
        const img = new Image();
        img.src = `assets/food_${i}.png`;
        assets.food.push(img);
    }
}

function handleFood(deltaTime) {
    if (foodTimer > foodInterval) {
        foodTimer = 0;
        if (assets.food.length > 0) {
            let img = assets.food[Math.floor(Math.random() * assets.food.length)];
            let x = Math.random() * (GAME_WIDTH - 60) + 30;
            let y = Math.random() * (GAME_HEIGHT - 60) + 30;
            foods.push(new Food(x, y, img));
        }
        foodInterval = Math.random() * 800 + 200;
    } else {
        foodTimer += deltaTime;
    }
}

function checkCollisions() {
    foods.forEach(food => {
        let dx = food.x - pacman.x;
        let dy = food.y - pacman.y;
        let distance = Math.hypot(dx, dy);
        if (distance < pacman.radius + food.width/2) {
            food.markedForDeletion = true;
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
        case 'ArrowUp': pacman.setDirection(0, -1); break;
        case 'ArrowDown': pacman.setDirection(0, 1); break;
        case 'ArrowLeft': pacman.setDirection(-1, 0); break;
        case 'ArrowRight': pacman.setDirection(1, 0); break;
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
            if (diffX > 0) pacman.setDirection(1, 0);
            else pacman.setDirection(-1, 0);
            touchStartX = touchEndX; // Reset for continuous control
            touchStartY = touchEndY;
        }
    } else {
        if (Math.abs(diffY) > 10) {
            if (diffY > 0) pacman.setDirection(0, 1);
            else pacman.setDirection(0, -1);
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
        handleFood(deltaTime);
        checkCollisions();

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
        pacman.draw(ctx);
    } else if (gameState === 'PLAYING') {
        foods.forEach(food => food.draw(ctx));
        pacman.draw(ctx);
    }
}

// Initialize
loadAssets();
requestAnimationFrame(gameLoop);
