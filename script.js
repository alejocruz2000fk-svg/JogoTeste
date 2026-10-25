// --- CONFIGURAÇÃO INICIAL E CANVAS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const coordDisplay = document.getElementById('coord-display');

// Desativa suavização para manter o aspecto Retro / Pixel Art
ctx.imageSmoothingEnabled = false;

// --- CONFIGURAÇÕES DO MUNDO ---
const TILE_SIZE = 16;
const MAP_COLS = 32;
const MAP_ROWS = 32;
const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

// --- GERADORES DE TILEMAP (MUNDO ABAIXO) ---
// 0: Grama Limpa, 1: Grama com Flor, 2: Terra, 3: Árvore (Colisão)
const map = [];
const treeColliders = [];

function generateMap() {
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      // Bordas do mapa cobertas de árvores densas
      if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
        row.push(3);
        treeColliders.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
      } 
      // Caminho central de terra
      else if (c >= 14 && c <= 17) {
        row.push(2);
      } 
      // Árvores espalhadas aleatoriamente no mapa
      else if (Math.random() < 0.08 && r > 2 && r < MAP_ROWS - 2) {
        row.push(3);
        treeColliders.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
      } 
      // Variações de grama
      else {
        row.push(Math.random() < 0.15 ? 1 : 0);
      }
    }
    map.push(row);
  }
}
generateMap();

// --- OBJETO JOGADOR (MAGO) ---
const player = {
  x: 15 * TILE_SIZE,
  y: 15 * TILE_SIZE,
  width: 14,
  height: 14,
  speed: 1.5,
  direction: 'down', // 'up', 'down', 'left', 'right'
  isMoving: false,
  animFrame: 0,
  animTimer: 0
};

// --- CÂMERA ---
const camera = {
  x: 0,
  y: 0,
  width: canvas.width,
  height: canvas.height,
  update() {
    // Centraliza a câmera no mago mantendo dentro dos limites do mapa
    this.x = Math.max(0, Math.min(player.x - this.width / 2, WORLD_WIDTH - this.width));
    this.y = Math.max(0, Math.min(player.y - this.height / 2, WORLD_HEIGHT - this.height));
  }
};

// --- SISTEMA DE CONTROLES E INPUTS ---
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false, s: false, a: false, d: false
};

// Listeners de Teclado
window.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
    keys[e.key] = true;
    keys[e.key.toLowerCase()] = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
  }
});

// Touch / D-Pad Virtual no Celular
function setupTouchButton(id, keyName) {
  const btn = document.getElementById(id);
  
  const start = (e) => {
    e.preventDefault();
    keys[keyName] = true;
  };
  
  const end = (e) => {
    e.preventDefault();
    keys[keyName] = false;
  };

  btn.addEventListener('touchstart', start);
  btn.addEventListener('touchend', end);
  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', end);
  btn.addEventListener('mouseleave', end);
}

setupTouchButton('btn-up', 'ArrowUp');
setupTouchButton('btn-down', 'ArrowDown');
setupTouchButton('btn-left', 'ArrowLeft');
setupTouchButton('btn-right', 'ArrowRight');

// Botão de Ação A (Poder/Efeito)
document.getElementById('btn-action').addEventListener('click', () => {
  castMagicEffect();
});

// --- DETECÇÃO DE COLISÃO ---
function checkCollision(newX, newY) {
  // Caixa de colisão levemente ajustada nos pés do mago
  const pBox = {
    x: newX + 2,
    y: newY + 6,
    width: player.width - 4,
    height: player.height - 6
  };

  for (let tree of treeColliders) {
    if (
      pBox.x < tree.x + tree.width &&
      pBox.x + pBox.width > tree.x &&
      pBox.y < tree.y + tree.height &&
      pBox.y + pBox.height > tree.y
    ) {
      return true; // Colidiu
    }
  }
  return false;
}

// --- ATUALIZAÇÃO DA LÓGICA DO JOGO ---
function update() {
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp || keys.w)    { dy -= player.speed; player.direction = 'up'; }
  if (keys.ArrowDown || keys.s)  { dy += player.speed; player.direction = 'down'; }
  if (keys.ArrowLeft || keys.a)  { dx -= player.speed; player.direction = 'left'; }
  if (keys.ArrowRight || keys.d) { dx += player.speed; player.direction = 'right'; }

  // Normalizar velocidade diagonal
  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }

  // Teste de movimentação com colisão eixo por eixo (deslizamento suave)
  if (dx !== 0 && !checkCollision(player.x + dx, player.y)) {
    player.x += dx;
  }
  if (dy !== 0 && !checkCollision(player.x, player.y + dy)) {
    player.y += dy;
  }

  player.isMoving = (dx !== 0 || dy !== 0);

  // Animação de caminhada simples
  if (player.isMoving) {
    player.animTimer++;
    if (player.animTimer % 12 === 0) {
      player.animFrame = (player.animFrame + 1) % 2;
    }
  } else {
    player.animFrame = 0;
  }

  camera.update();

  // Atualiza coordenadas na interface UI
  coordDisplay.innerText = `X: ${Math.floor(player.x / TILE_SIZE)} | Y: ${Math.floor(player.y / TILE_SIZE)}`;
}

// --- DESENHO / RENDERIZAÇÃO RETRO (8-BIT CANVAS) ---

// Desenha Tiles do Cenário
function drawTile(type, x, y) {
  if (type === 0) {
    // Grama Padrão
    ctx.fillStyle = '#479417';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#388700';
    ctx.fillRect(x + 2, y + 4, 2, 2);
    ctx.fillRect(x + 10, y + 10, 2, 2);
  } else if (type === 1) {
    // Grama com Florzinha estilo Game Boy
    ctx.fillStyle = '#479417';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#fce700'; // Amarelo
    ctx.fillRect(x + 6, y + 6, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 7, y + 5, 2, 6);
  } else if (type === 2) {
    // Caminho de Terra
    ctx.fillStyle = '#d08a4a';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#b06f34';
    ctx.fillRect(x + 3, y + 3, 3, 2);
    ctx.fillRect(x + 9, y + 11, 2, 3);
  } else if (type === 3) {
    // Base de Grama sob Árvore
    ctx.fillStyle = '#479417';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    // Árvore Pixel Art (Sombra + Tronco + Copa)
    ctx.fillStyle = '#1e4808'; // Sombra
    ctx.fillRect(x + 2, y + 12, 12, 4);
    ctx.fillStyle = '#7a4216'; // Tronco
    ctx.fillRect(x + 6, y + 8, 4, 6);
    ctx.fillStyle = '#2d6a0f'; // Copa Folhas
    ctx.fillRect(x + 1, y + 1, 14, 8);
    ctx.fillStyle = '#3ca010'; // Brilho Folhas
    ctx.fillRect(x + 3, y + 3, 4, 4);
  }
}

// Desenha o Mago Top-Down Pixelado
function drawMage() {
  const px = Math.round(player.x - camera.x);
  const py = Math.round(player.y - camera.y);

  // Deslocamento para simular passos
  const bounce = (player.isMoving && player.animFrame === 1) ? 1 : 0;

  // 1. Capa / Túnica do Mago (Azul Retro)
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(px + 2, py + 4 - bounce, 10, 10);

  // 2. Rosto / Pele
  ctx.fillStyle = '#fca5a5';
  ctx.fillRect(px + 4, py + 4 - bounce, 6, 4);

  // 3. Olhos (De acordo com a direção)
  ctx.fillStyle = '#000000';
  if (player.direction === 'down') {
    ctx.fillRect(px + 5, py + 6 - bounce, 1, 2);
    ctx.fillRect(px + 8, py + 6 - bounce, 1, 2);
  } else if (player.direction === 'left') {
    ctx.fillRect(px + 4, py + 6 - bounce, 1, 2);
  } else if (player.direction === 'right') {
    ctx.fillRect(px + 9, py + 6 - bounce, 1, 2);
  }

  // 4. Chapéu Pontudo de Mago (Azul / Amarelo)
  ctx.fillStyle = '#1e3a8a'; // Azul escuro
  ctx.fillRect(px + 1, py + 2 - bounce, 12, 3); // Aba
  ctx.fillRect(px + 3, py - 1 - bounce, 8, 3);  // Meio
  ctx.fillRect(px + 5, py - 4 - bounce, 4, 3);  // Ponta

  ctx.fillStyle = '#facc15'; // Fita Amarela
  ctx.fillRect(px + 3, py + 2 - bounce, 8, 1);

  // 5. Cajado com Joia Brilhante na Ponta
  ctx.fillStyle = '#854d0e'; // Madeira
  ctx.fillRect(px + 12, py + 2 - bounce, 2, 11);
  ctx.fillStyle = '#06b6d4'; // Cristal Azul Ciano
  ctx.fillRect(px + 11, py - 1 - bounce, 4, 4);
}

// Efeito Mágico acionado pelo Botão A
let magicParticles = [];
function castMagicEffect() {
  for (let i = 0; i < 12; i++) {
    magicParticles.push({
      x: player.x + 8,
      y: player.y + 8,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 20
    });
  }
}

function drawMagicParticles() {
  ctx.fillStyle = '#38bdf8';
  for (let i = magicParticles.length - 1; i >= 0; i--) {
    let p = magicParticles[i];
    ctx.fillRect(p.x - camera.x, p.y - camera.y, 3, 3);
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) magicParticles.splice(i, 1);
  }
}

// RENDER LOOP PRINCIPAL
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Calcular tiles visíveis pela câmera para otimização
  const startCol = Math.floor(camera.x / TILE_SIZE);
  const endCol = startCol + Math.ceil(camera.width / TILE_SIZE) + 1;
  const startRow = Math.floor(camera.y / TILE_SIZE);
  const endRow = startRow + Math.ceil(camera.height / TILE_SIZE) + 1;

  // 2. Desenhar Mapa
  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
        drawTile(map[r][c], Math.round(c * TILE_SIZE - camera.x), Math.round(r * TILE_SIZE - camera.y));
      }
    }
  }

  // 3. Desenhar Mago
  drawMage();

  // 4. Desenhar Efeitos de Magia
  drawMagicParticles();
}

// LOOP DO JOGO (60 FPS)
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Iniciar o Jogo
requestAnimationFrame(gameLoop);
                       
