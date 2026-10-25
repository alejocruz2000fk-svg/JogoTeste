/**
 * ARCANE NATURE ENGINE - Top-Down RPG Vector/Pixel Hybrid
 * Developer: Senior Frontend & Game Engine Architect
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const fpsDisplay = document.getElementById('fps-display');
const coordDisplay = document.getElementById('coord-display');

ctx.imageSmoothingEnabled = false;

// --- CONFIGURAÇÕES DE MUNDO E VENTO ---
const TILE_SIZE = 24;
const MAP_COLS = 32;
const MAP_ROWS = 32;
const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

const wind = {
  forceX: 0,
  forceY: 0,
  time: 0,
  update() {
    this.time += 0.02;
    // Oscilação estocástica simulando vento dinâmico
    this.forceX = Math.sin(this.time) * 0.8 + Math.cos(this.time * 2.3) * 0.4 + 0.3;
    this.forceY = Math.sin(this.time * 0.7) * 0.2;
  }
};

// --- MUNDO PROCEDURAL E ENTIDADES ---
const map = [];
const trees = [];
const butterflies = [];
const birds = [];
const ambientParticles = []; // Folhas caindo e faíscas

function initWorld() {
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
        row.push(3); // Borda
        trees.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, width: 24, height: 24 });
      } else if (c >= 14 && c <= 17) {
        row.push(2); // Caminho de terra
      } else if (Math.random() < 0.07 && r > 2 && r < MAP_ROWS - 2) {
        row.push(3);
        trees.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, width: 24, height: 24 });
      } else {
        row.push(Math.random() < 0.12 ? 1 : 0);
      }
    }
    map.push(row);
  }

  // Spawn de Borboletas
  for (let i = 0; i < 15; i++) {
    butterflies.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      vx: 0, vy: 0,
      wingCycle: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? '#f43f5e' : '#38bdf8',
      scared: false
    });
  }

  // Spawn de Pássaros
  for (let i = 0; i < 8; i++) {
    birds.push({
      x: Math.random() * (WORLD_WIDTH - 100) + 50,
      y: Math.random() * (WORLD_HEIGHT - 100) + 50,
      vx: 0, vy: 0,
      isFlying: false,
      wingCycle: 0,
      size: 4 + Math.random() * 2
    });
  }
}
initWorld();

// --- PLAYER (MAGO) COM ANIMAÇÃO PROCEDURAL ---
const player = {
  x: 15 * TILE_SIZE,
  y: 15 * TILE_SIZE,
  vx: 0,
  vy: 0,
  speed: 1.8,
  facing: 'down',
  isMoving: false,
  walkTimer: 0,
  wandParticles: [],
  
  update() {
    let dx = 0;
    let dy = 0;

    if (keys.ArrowUp || keys.w)    { dy -= 1; this.facing = 'up'; }
    if (keys.ArrowDown || keys.s)  { dy += 1; this.facing = 'down'; }
    if (keys.ArrowLeft || keys.a)  { dx -= 1; this.facing = 'left'; }
    if (keys.ArrowRight || keys.d) { dx += 1; this.facing = 'right'; }

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.vx = dx * this.speed;
    this.vy = dy * this.speed;

    // Colisão deslizando nos eixos
    if (!checkCollision(this.x + this.vx, this.y)) this.x += this.vx;
    if (!checkCollision(this.x, this.y + this.vy)) this.y += this.vy;

    this.isMoving = (dx !== 0 || dy !== 0);

    if (this.isMoving) {
      this.walkTimer += 0.25;
    } else {
      this.walkTimer = 0;
    }

    // Emissor de Fogo / Faíscas no Cajado
    this.updateWandParticles();
  },

  updateWandParticles() {
    // Posição da ponta do cajado em relação ao mago
    const wandX = this.x + (this.facing === 'left' ? -2 : 16);
    const wandY = this.y - 6;

    // Adiciona partícula de fogo constantemente
    this.wandParticles.push({
      x: wandX + (Math.random() - 0.5) * 3,
      y: wandY + (Math.random() - 0.5) * 3,
      vx: (Math.random() - 0.5) * 0.5 + wind.forceX * 0.3,
      vy: -Math.random() * 0.8 - 0.3, // Flutua pra cima (fogo)
      life: 1.0,
      size: Math.random() * 3 + 1,
      color: Math.random() > 0.3 ? '#ff4500' : '#ffa500'
    });

    for (let i = this.wandParticles.length - 1; i >= 0; i--) {
      let p = this.wandParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) this.wandParticles.splice(i, 1);
    }
  }
};

// --- CÂMERA SUAVE ---
const camera = {
  x: 0, y: 0,
  width: canvas.width,
  height: canvas.height,
  update() {
    const targetX = player.x - this.width / 2;
    const targetY = player.y - this.height / 2;
    // Interpolação Linear (Lerp) para suavizar a câmera
    this.x += (targetX - this.x) * 0.1;
    this.y += (targetY - this.y) * 0.1;
    this.x = Math.max(0, Math.min(this.x, WORLD_WIDTH - this.width));
    this.y = Math.max(0, Math.min(this.y, WORLD_HEIGHT - this.height));
  }
};

// --- CONTROLES ---
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };

window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key] = keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key] = keys[e.key.toLowerCase()] = false; });

function bindTouch(id, keyName) {
  const btn = document.getElementById(id);
  const on = e => { e.preventDefault(); keys[keyName] = true; };
  const off = e => { e.preventDefault(); keys[keyName] = false; };
  btn.addEventListener('touchstart', on); btn.addEventListener('touchend', off);
  btn.addEventListener('mousedown', on); btn.addEventListener('mouseup', off);
}
bindTouch('btn-up', 'ArrowUp'); bindTouch('btn-down', 'ArrowDown');
bindTouch('btn-left', 'ArrowLeft'); bindTouch('btn-right', 'ArrowRight');

document.getElementById('btn-action').addEventListener('click', () => {
  // Magia de Impacto: Onda de vento
  for (let i = 0; i < 25; i++) {
    ambientParticles.push({
      x: player.x, y: player.y,
      vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
      life: 1.0, color: '#38bdf8', size: 3, type: 'magic'
    });
  }
});

function checkCollision(nx, ny) {
  const pBox = { x: nx + 4, y: ny + 12, width: 16, height: 10 };
  for (let t of trees) {
    if (pBox.x < t.x + t.width && pBox.x + pBox.width > t.x &&
        pBox.y < t.y + t.height && pBox.y + pBox.height > t.y) return true;
  }
  return false;
}

// --- ATUALIZAÇÃO DA FAUNA E PARTICULAS ---
function updateEntities() {
  wind.update();

  // 1. Atualizar Borboletas (Fugindo do Player)
  butterflies.forEach(b => {
    b.wingCycle += 0.3;
    const distToPlayer = Math.hypot(b.x - player.x, b.y - player.y);

    if (distToPlayer < 50) {
      b.scared = true;
      // Vetor de fuga
      const angle = Math.atan2(b.y - player.y, b.x - player.x);
      b.vx = Math.cos(angle) * 3;
      b.vy = Math.sin(angle) * 3;
    } else {
      b.scared = false;
      b.vx += (Math.random() - 0.5) * 0.4 + wind.forceX * 0.1;
      b.vy += (Math.random() - 0.5) * 0.4;
      b.vx *= 0.92; b.vy *= 0.92; // Atrito
    }

    b.x += b.vx; b.y += b.vy;
  });

  // 2. Atualizar Pássaros
  birds.forEach(bird => {
    const dist = Math.hypot(bird.x - player.x, bird.y - player.y);
    if (dist < 65 && !bird.isFlying) {
      bird.isFlying = true;
      bird.vx = (Math.random() - 0.5) * 2 + wind.forceX;
      bird.vy = -3.5; // Decola rápido
    }

    if (bird.isFlying) {
      bird.wingCycle += 0.4;
      bird.x += bird.vx;
      bird.y += bird.vy;
      bird.vy *= 0.98; // Gravidade/Sustentação simulada
    }
  });

  // 3. Emissão de Folhas das Árvores com o Vento
  if (Math.random() < 0.3) {
    const randomTree = trees[Math.floor(Math.random() * trees.length)];
    ambientParticles.push({
      x: randomTree.x + Math.random() * 24,
      y: randomTree.y + Math.random() * 12,
      vx: wind.forceX * 1.2,
      vy: Math.random() * 0.5 + 0.5, // Gravidade suave caindo
      life: 1.0,
      color: '#4ade80',
      size: 2,
      type: 'leaf'
    });
  }

  // Atualizar Partículas do Ambiente
  for (let i = ambientParticles.length - 1; i >= 0; i--) {
    let p = ambientParticles[i];
    p.x += p.vx + Math.sin(p.y * 0.05) * 0.5;
    p.y += p.vy;
    p.life -= 0.01;
    if (p.life <= 0) ambientParticles.splice(i, 1);
  }
}

// --- RENDERIZAÇÃO AVANÇADA ---
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = camera.x;
  const cy = camera.y;

  // 1. Desenhar Terreno
  const startCol = Math.max(0, Math.floor(cx / TILE_SIZE));
  const endCol = Math.min(MAP_COLS, startCol + Math.ceil(camera.width / TILE_SIZE) + 1);
  const startRow = Math.max(0, Math.floor(cy / TILE_SIZE));
  const endRow = Math.min(MAP_ROWS, startRow + Math.ceil(camera.height / TILE_SIZE) + 1);

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      const type = map[r][c];
      const x = c * TILE_SIZE - cx;
      const y = r * TILE_SIZE - cy;

      if (type === 0 || type === 1) { // Grama
        ctx.fillStyle = '#224411';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        if (type === 1) {
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(x + 8, y + 8, 3, 3);
        }
      } else if (type === 2) { // Terra
        ctx.fillStyle = '#855123';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = '#1c360d';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // 2. Desenhar Árvores com Splay do Vento
  trees.forEach(t => {
    const tx = t.x - cx;
    const ty = t.y - cy;
    const sway = Math.sin(wind.time * 2 + t.x) * wind.forceX * 2;

    // Sombra da Árvore
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(tx + 12, ty + 20, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tronco
    ctx.fillStyle = '#543310';
    ctx.fillRect(tx + 9, ty + 10, 6, 12);

    // Copa Reativa ao Vento
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(tx + 12 + sway, ty + 6, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(tx + 10 + sway, ty + 4, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Desenhar Sombra do Mago
  const px = player.x - cx;
  const py = player.y - cy;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(px + 8, py + 20, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Desenhar Mago com Animação Anatômica Procedural
  const legCycle = Math.sin(player.walkTimer) * 4;
  const armCycle = Math.cos(player.walkTimer) * 4;
  const windSway = wind.forceX * 1.5;

  // Pernas (Movimento Senoidal Alternado)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(px + 3, py + 14 + (player.isMoving ? legCycle : 0), 4, 6); // Esquerda
  ctx.fillRect(px + 9, py + 14 - (player.isMoving ? legCycle : 0), 4, 6); // Direita

  // Capa / Corpo (Sobra do vento atrás)
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(px + 2, py + 6, 12, 10);
  // Balanço da Capa pelo vento
  ctx.fillStyle = '#1e40af';
  ctx.beginPath();
  ctx.moveTo(px + 2, py + 12);
  ctx.lineTo(px - 2 - windSway, py + 18);
  ctx.lineTo(px + 14 - windSway, py + 18);
  ctx.lineTo(px + 14, py + 12);
  ctx.fill();

  // Cabeça e Rosto
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(px + 4, py + 4, 8, 6);

  // Chapéu Pontudo com Vento
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(px + 1, py + 3, 14, 2); // Aba
  ctx.beginPath();
  ctx.moveTo(px + 3, py + 3);
  ctx.lineTo(px + 8 + windSway, py - 6); // Ponta dobra com vento
  ctx.lineTo(px + 13, py + 3);
  ctx.fill();

  // Varinha / Cajado com Chama Reativa
  const wandX = px + (player.facing === 'left' ? -2 : 16);
  const wandY = py + 2 + (player.isMoving ? armCycle * 0.5 : 0);

  ctx.fillStyle = '#78350f';
  ctx.fillRect(wandX, wandY, 2, 14); // Madeira

  // Renderizar Partículas de Fogo no Cajado
  player.wandParticles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x - cx, p.y - cy, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;

  // 5. Desenhar Fauna (Borboletas e Pássaros)
  butterflies.forEach(b => {
    const bx = b.x - cx;
    const by = b.y - cy;
    const wingWidth = Math.abs(Math.sin(b.wingCycle)) * 4 + 1;

    ctx.fillStyle = b.color;
    // Asa Esquerda e Direita
    ctx.fillRect(bx - wingWidth, by - 2, wingWidth, 4);
    ctx.fillRect(bx, by - 2, wingWidth, 4);
  });

  birds.forEach(bird => {
    const bx = bird.x - cx;
    const by = bird.y - cy;
    ctx.fillStyle = '#0f172a';

    if (bird.isFlying) {
      const wingY = Math.sin(bird.wingCycle) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - bird.size, by + wingY);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + bird.size, by + wingY);
      ctx.stroke();
    } else {
      ctx.fillRect(bx, by, bird.size, bird.size - 1);
    }
  });

  // 6. Desenhar Partículas do Ambiente (Folhas)
  ambientParticles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x - cx, p.y - cy, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;

  coordDisplay.innerText = `X: ${Math.floor(player.x / TILE_SIZE)} | Y: ${Math.floor(player.y / TILE_SIZE)}`;
}

// --- GAMELOOP DE ALTA PERFORMANCE (60 FPS) ---
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

function gameLoop(now) {
  const dt = now - lastTime;
  lastTime = now;

  // Contador de FPS real
  fpsTimer += dt;
  frameCount++;
  if (fpsTimer >= 1000) {
    fpsDisplay.innerText = `FPS: ${frameCount}`;
    frameCount = 0;
    fpsTimer = 0;
  }

  player.update();
  camera.update();
  updateEntities();
  render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
    
