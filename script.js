/**
 * ARCANE NATURE - REMASTERED ENGINE
 * Senior Game Dev Architecture (High-Visibility Mobile Edition)
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const fpsDisplay = document.getElementById('fps-display');

ctx.imageSmoothingEnabled = false;

// --- CONFIGURAÇÕES DE ESCALA E MUNDO ---
const TILE_SIZE = 32; // Aumentado para dar mais robustez visual
const MAP_COLS = 28;
const MAP_ROWS = 28;
const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

let screenShakeTimer = 0;
let screenShakeIntensity = 0;

const wind = {
  forceX: 0,
  time: 0,
  update() {
    this.time += 0.025;
    this.forceX = Math.sin(this.time) * 1.2 + Math.cos(this.time * 1.8) * 0.5;
  }
};

const map = [];
const trees = [];
const butterflies = [];
const birds = [];
const ambientParticles = [];

function initWorld() {
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
        row.push(3); // Borda
        trees.push({ x: c * TILE_SIZE, y: r * TILE_SIZE });
      } else if (c >= 12 && c <= 15) {
        row.push(2); // Caminho de pedra/terra central
      } else if (Math.random() < 0.09 && r > 2 && r < MAP_ROWS - 2) {
        row.push(3);
        trees.push({ x: c * TILE_SIZE, y: r * TILE_SIZE });
      } else {
        row.push(Math.random() < 0.2 ? 1 : 0); // 1 = Grama com tufos
      }
    }
    map.push(row);
  }

  // Borboletas grandes e visíveis
  for (let i = 0; i < 12; i++) {
    butterflies.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      vx: 0, vy: 0,
      wingAnim: Math.random() * Math.PI,
      color: Math.random() > 0.5 ? '#f43f5e' : '#38bdf8'
    });
  }

  // Pássaros grandes e visíveis
  for (let i = 0; i < 6; i++) {
    birds.push({
      x: Math.random() * (WORLD_WIDTH - 120) + 60,
      y: Math.random() * (WORLD_HEIGHT - 120) + 60,
      vx: 0, vy: 0,
      isFlying: false,
      wingAnim: 0
    });
  }
}
initWorld();

const player = {
  x: 13.5 * TILE_SIZE,
  y: 13.5 * TILE_SIZE,
  speed: 2.2,
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

    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    const nx = this.x + dx * this.speed;
    const ny = this.y + dy * this.speed;

    if (!checkCollision(nx, this.y)) this.x = nx;
    if (!checkCollision(this.x, ny)) this.y = ny;

    this.isMoving = (dx !== 0 || dy !== 0);
    if (this.isMoving) this.walkTimer += 0.3;

    // Emissão constante de fogo mágico na ponta do cajado
    const wandX = this.x + (this.facing === 'left' ? -6 : 22);
    const wandY = this.y - 2;

    this.wandParticles.push({
      x: wandX + (Math.random() - 0.5) * 4,
      y: wandY + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.8 + wind.forceX * 0.4,
      vy: -Math.random() * 1.2 - 0.5,
      life: 1.0,
      size: Math.random() * 4 + 2,
      color: Math.random() > 0.3 ? '#ff5722' : '#ffeb3b'
    });

    for (let i = this.wandParticles.length - 1; i >= 0; i--) {
      let p = this.wandParticles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.05;
      if (p.life <= 0) this.wandParticles.splice(i, 1);
    }
  }
};

const camera = {
  x: 0, y: 0,
  width: canvas.width,
  height: canvas.height,
  update() {
    const targetX = player.x - this.width / 2;
    const targetY = player.y - this.height / 2;
    this.x += (targetX - this.x) * 0.12;
    this.y += (targetY - this.y) * 0.12;
    this.x = Math.max(0, Math.min(this.x, WORLD_WIDTH - this.width));
    this.y = Math.max(0, Math.min(this.y, WORLD_HEIGHT - this.height));
  }
};

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };

window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key] = keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key] = keys[e.key.toLowerCase()] = false; });

function bindTouch(id, keyName) {
  const btn = document.getElementById(id);
  const on = e => { e.preventDefault(); keys[keyName] = true; };
  const off = e => { e.preventDefault(); keys[keyName] = false; };
  btn.addEventListener('touchstart', on); btn.addEventListener('touchend', off);
  btn.addEventListener('mousedown', on); btn.addEventListener('mouseup', off);
}
bindTouch('btn-up', 'ArrowUp'); bindTouch('btn-down', 'ArrowDown');
bindTouch('btn-left', 'ArrowLeft'); bindTouch('btn-right', 'ArrowRight');

// Ação de Magia: Explosão de partículas e Screen Shake
document.getElementById('btn-action').addEventListener('click', () => {
  screenShakeTimer = 15;
  screenShakeIntensity = 4;
  for (let i = 0; i < 35; i++) {
    ambientParticles.push({
      x: player.x + 12, y: player.y + 12,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
      life: 1.0, color: '#38bdf8', size: 4
    });
  }
});

function checkCollision(nx, ny) {
  const pBox = { x: nx + 6, y: ny + 16, width: 20, height: 14 };
  for (let t of trees) {
    if (pBox.x < t.x + TILE_SIZE && pBox.x + pBox.width > t.x &&
        pBox.y < t.y + TILE_SIZE && pBox.y + pBox.height > t.y) return true;
  }
  return false;
}

function updateWorld() {
  wind.update();

  if (screenShakeTimer > 0) screenShakeTimer--;

  // Borboletas com fuga refinada e visíveis
  butterflies.forEach(b => {
    b.wingAnim += 0.4;
    const dist = Math.hypot(b.x - player.x, b.y - player.y);
    if (dist < 70) {
      const angle = Math.atan2(b.y - player.y, b.x - player.x);
      b.vx = Math.cos(angle) * 4;
      b.vy = Math.sin(angle) * 4;
    } else {
      b.vx += (Math.random() - 0.5) * 0.5 + wind.forceX * 0.2;
      b.vy += (Math.random() - 0.5) * 0.5;
      b.vx *= 0.9; b.vy *= 0.9;
    }
    b.x += b.vx; b.y += b.vy;
  });

  // Pássaros levantando voo
  birds.forEach(bird => {
    const dist = Math.hypot(bird.x - player.x, bird.y - player.y);
    if (dist < 80 && !bird.isFlying) {
      bird.isFlying = true;
      bird.vx = (Math.random() - 0.5) * 3;
      bird.vy = -4;
    }
    if (bird.isFlying) {
      bird.wingAnim += 0.5;
      bird.x += bird.vx;
      bird.y += bird.vy;
    }
  });

  // Queda de folhas realistas das árvores
  if (Math.random() < 0.4) {
    const t = trees[Math.floor(Math.random() * trees.length)];
    ambientParticles.push({
      x: t.x + Math.random() * TILE_SIZE,
      y: t.y + Math.random() * 16,
      vx: wind.forceX * 1.5,
      vy: Math.random() * 0.8 + 0.6,
      life: 1.0,
      color: '#4ade80',
      size: 3
    });
  }

  for (let i = ambientParticles.length - 1; i >= 0; i--) {
    let p = ambientParticles[i];
    p.x += p.vx; p.y += p.vy; p.life -= 0.015;
    if (p.life <= 0) ambientParticles.splice(i, 1);
  }
}

function render() {
  ctx.save();
  if (screenShakeTimer > 0) {
    const shakeX = (Math.random() - 0.5) * screenShakeIntensity;
    const shakeY = (Math.random() - 0.5) * screenShakeIntensity;
    ctx.translate(shakeX, shakeY);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = camera.x;
  const cy = camera.y;

  // 1. Renderizar Chão Detalhado
  const startCol = Math.max(0, Math.floor(cx / TILE_SIZE));
  const endCol = Math.min(MAP_COLS, startCol + Math.ceil(canvas.width / TILE_SIZE) + 1);
  const startRow = Math.max(0, Math.floor(cy / TILE_SIZE));
  const endRow = Math.min(MAP_ROWS, startRow + Math.ceil(canvas.height / TILE_SIZE) + 1);

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      const type = map[r][c];
      const x = c * TILE_SIZE - cx;
      const y = r * TILE_SIZE - cy;

      if (type === 0 || type === 1) {
        ctx.fillStyle = '#1e3a10';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        if (type === 1) {
          // Tufos de grama e florzinhas vistosas
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(x + 6, y + 8, 4, 8);
          ctx.fillRect(x + 18, y + 16, 4, 6);
          ctx.fillStyle = '#fb7185';
          ctx.fillRect(x + 18, y + 12, 4, 4);
        }
      } else if (type === 2) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(x + 4, y + 4, 8, 8);
        ctx.fillRect(x + 20, y + 18, 6, 6);
      } else {
        ctx.fillStyle = '#14280b';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // 2. Renderizar Árvores Robustas com Sombra
  trees.forEach(t => {
    const tx = t.x - cx;
    const ty = t.y - cy;
    const sway = Math.sin(wind.time * 2 + t.x) * wind.forceX * 3;

    // Sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(tx + 16, ty + 26, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tronco
    ctx.fillStyle = '#422006';
    ctx.fillRect(tx + 11, ty + 14, 10, 16);

    // Copa Volumosa
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(tx + 16 + sway, ty + 10, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(tx + 13 + sway, ty + 7, 12, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Renderizar Borboletas Grandes e Vistosas
  butterflies.forEach(b => {
    const bx = b.x - cx;
    const by = b.y - cy;
    const wingSize = Math.abs(Math.sin(b.wingAnim)) * 6 + 2;

    ctx.fillStyle = b.color;
    ctx.fillRect(bx - wingSize, by - 3, wingSize, 6);
    ctx.fillRect(bx, by - 3, wingSize, 6);
  });

  // 4. Renderizar Pássaros
  birds.forEach(bird => {
    const bx = bird.x - cx;
    const by = bird.y - cy;
    ctx.fillStyle = '#f8fafc';
    if (bird.isFlying) {
      const wingOffset = Math.sin(bird.wingAnim) * 5;
      ctx.fillRect(bx - 8, by + wingOffset, 6, 3);
      ctx.fillRect(bx + 2, by + wingOffset, 6, 3);
      ctx.fillRect(bx - 2, by, 4, 4);
    } else {
      ctx.fillRect(bx, by, 8, 6);
    }
  });

  // 5. Renderizar Mago Remasterizado (Maior e com Animação Fluida)
  const px = player.x - cx;
  const py = player.y - cy;

  // Sombra do Mago
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(px + 12, py + 30, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const legOffset = Math.sin(player.walkTimer) * 5;
  const windSway = wind.forceX * 2;

  // Pernas
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(px + 6, py + 20 + (player.isMoving ? legOffset : 0), 5, 10);
  ctx.fillRect(px + 13, py + 20 - (player.isMoving ? legOffset : 0), 5, 10);

  // Túnica e Capa
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(px + 4, py + 10, 16, 14);

  // Capa ao vento
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.moveTo(px + 4, py + 16);
  ctx.lineTo(px - 4 - windSway, py + 26);
  ctx.lineTo(px + 20 - windSway, py + 26);
  ctx.lineTo(px + 20, py + 16);
  ctx.fill();

  // Cabeça / Rosto
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(px + 8, py + 6, 10, 8);

  // Chapéu de Mago com Ponta Dinâmica
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(px + 4, py + 5, 18, 3); // Aba
  ctx.beginPath();
  ctx.moveTo(px + 6, py + 5);
  ctx.lineTo(px + 12 + windSway, py - 8); // Ponta do chapéu balançando
  ctx.lineTo(px + 18, py + 5);
  ctx.fill();

  // Cajado e Partículas de Fogo
  ctx.fillStyle = '#78350f';
  ctx.fillRect(px + 22, py + 4, 3, 24);

  player.wandParticles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x - cx, p.y - cy, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;

  // 6. Partículas do Ambiente (Folhas voando)
  ambientParticles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x - cx, p.y - cy, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;

  // 7. Aura Mágica de Luz ao Redor do Mago (Iluminação Estilo RPG)
  const gradient = ctx.createRadialGradient(px + 14, py + 14, 5, px + 14, py + 14, 90);
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px + 14, py + 14, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function gameLoop() {
  player.update();
  camera.update();
  updateWorld();
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
    
