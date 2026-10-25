/**
 * ARCANE NATURE ENGINE - ELITE RPG EDITION
 * Senior Game Engine & Audio Synth Architecture
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

// MÁQUINA DE ESTADOS E CONFIGURAÇÕES
let gameState = 'CUTSCENE'; // 'CUTSCENE', 'MENU', 'SETTINGS', 'PLAYING'
let currentZone = 'VILLAGE'; // 'VILLAGE', 'FOREST'

const settings = { sound: true, particles: true, shake: true };

// --- SINTETIZADOR DE ÁUDIO WEB AUDIO API (Sons 8-Bit) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playSound(type) {
  if (!settings.sound) return;
  if (!audioCtx) audioCtx = new AudioContext();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'step') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === 'magic') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.18);
    osc.start(now); osc.stop(now + 0.18);
  } else if (type === 'collect') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.16);
    osc.start(now); osc.stop(now + 0.16);
  } else if (type === 'dialogue') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.start(now); osc.stop(now + 0.05);
  }
}

// --- CUTSCENE E NARRATIVA ---
const storyLines = [
  "A Vila Solar vive sob a ameaça dos Slimes Corrompidos que habitam a Floresta Mística...",
  "O portão de saída foi selado para proteger os aldeões de invasões inimigas.",
  "Fale com o Ancião Eldrin na vila para obter os Cristais Mágicos e desbloquear o mundo aberto."
];
let currentLineIndex = 0, currentCharIndex = 0, typewriterTimer = null;
const cutsceneTextElem = document.getElementById('cutscene-text');

function startTypewriter() {
  cutsceneTextElem.innerText = "";
  currentCharIndex = 0;
  const line = storyLines[currentLineIndex];

  clearInterval(typewriterTimer);
  typewriterTimer = setInterval(() => {
    cutsceneTextElem.innerText += line[currentCharIndex];
    playSound('dialogue');
    currentCharIndex++;
    if (currentCharIndex >= line.length) {
      clearInterval(typewriterTimer);
      setTimeout(() => {
        currentLineIndex++;
        if (currentLineIndex < storyLines.length) startTypewriter();
        else goToMenu();
      }, 2500);
    }
  }, 40);
}

function goToMenu() {
  clearInterval(typewriterTimer);
  gameState = 'MENU';
  document.getElementById('cutscene-overlay').classList.add('hidden');
  document.getElementById('menu-overlay').classList.remove('hidden');
}

document.getElementById('btn-skip-cutscene').addEventListener('click', goToMenu);
document.getElementById('btn-start').addEventListener('click', () => {
  gameState = 'PLAYING';
  document.getElementById('menu-overlay').classList.add('hidden');
  document.getElementById('ui-overlay').classList.remove('hidden');
  document.getElementById('touch-controls').classList.remove('hidden');
});
document.getElementById('btn-settings').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.remove('hidden');
});
document.getElementById('btn-close-settings').addEventListener('click', () => {
  settings.sound = document.getElementById('setting-sound').checked;
  settings.particles = document.getElementById('setting-particles').checked;
  settings.shake = document.getElementById('setting-shake').checked;
  document.getElementById('settings-overlay').classList.add('hidden');
});

// --- MUNDO, CICLO DIA/NOITE E MAPA ---
const TILE_SIZE = 32, MAP_COLS = 28, MAP_ROWS = 28;
const WORLD_WIDTH = MAP_COLS * TILE_SIZE, WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

const dayNight = {
  time: 0, cycleDuration: 3600, // 1 minuto por ciclo
  getPhase() {
    const progress = (this.time % this.cycleDuration) / this.cycleDuration;
    if (progress < 0.4) return { name: '🌅 Dia', alpha: 0 };
    if (progress < 0.5) return { name: '🌇 Pôr do Sol', alpha: 0.35, color: '180, 83, 9' };
    if (progress < 0.9) return { name: '🌙 Noite', alpha: 0.72, color: '3, 7, 18' };
    return { name: '🌅 Amanhecer', alpha: 0.3, color: '217, 119, 6' };
  },
  update() { this.time++; }
};

let map = [], trees = [], houses = [], npcs = [], crystals = [], enemies = [], projectiles = [];
let screenShakeTimer = 0;

const player = {
  x: 13.5 * TILE_SIZE, y: 14 * TILE_SIZE,
  hp: 100, maxHp: 100, speed: 2.2, facing: 'down', isMoving: false, walkTimer: 0,
  crystalsCollected: 0, questStep: 0, wandParticles: [],

  update() {
    let dx = 0, dy = 0;
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
    if (this.isMoving) {
      this.walkTimer += 0.3;
      if (Math.floor(this.walkTimer) % 6 === 0) playSound('step');
    }

    // Coleta de Cristais
    crystals.forEach((c, index) => {
      if (!c.collected && Math.hypot(c.x - this.x, c.y - this.y) < 24) {
        c.collected = true;
        this.crystalsCollected++;
        playSound('collect');
        document.getElementById('inventory-display').innerText = `💎 ${this.crystalsCollected}/3`;
      }
    });

    // Transição de Mapa (Portão do Sul da Vila)
    if (currentZone === 'VILLAGE' && this.y > (MAP_ROWS - 2) * TILE_SIZE && this.questStep >= 2) {
      loadForestZone();
    }
  }
};

function loadVillageZone() {
  currentZone = 'VILLAGE';
  map = []; trees = []; houses = []; npcs = []; crystals = []; enemies = [];
  
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
        row.push(3); trees.push({ x: c * TILE_SIZE, y: r * TILE_SIZE });
      } else if (c >= 12 && c <= 15) { row.push(2); }
      else { row.push(Math.random() < 0.15 ? 1 : 0); }
    }
    map.push(row);
  }

  houses.push({ x: 8 * TILE_SIZE, y: 10 * TILE_SIZE, w: 3 * TILE_SIZE, h: 3 * TILE_SIZE });
  npcs.push({ x: 11 * TILE_SIZE, y: 12 * TILE_SIZE, name: "Ancião Eldrin", dialogue: "Mago! Encontre 3 Cristais Mágicos na vila para eu destravar o Portão do Sul." });
  
  // Cristais
  crystals.push({ x: 5 * TILE_SIZE, y: 6 * TILE_SIZE, collected: false });
  crystals.push({ x: 22 * TILE_SIZE, y: 8 * TILE_SIZE, collected: false });
  crystals.push({ x: 6 * TILE_SIZE, y: 22 * TILE_SIZE, collected: false });
}

function loadForestZone() {
  currentZone = 'FOREST';
  player.x = 13.5 * TILE_SIZE; player.y = 2 * TILE_SIZE;
  map = []; trees = []; houses = []; npcs = []; crystals = []; enemies = [];

  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1 || Math.random() < 0.12) {
        row.push(3); trees.push({ x: c * TILE_SIZE, y: r * TILE_SIZE });
      } else { row.push(0); }
    }
    map.push(row);
  }

  // Spawn de Inimigos (Slimes Corrompidos)
  for (let i = 0; i < 8; i++) {
    enemies.push({
      x: Math.random() * (WORLD_WIDTH - 200) + 100,
      y: Math.random() * (WORLD_HEIGHT - 200) + 100,
      hp: 30, maxHp: 30, speed: 0.9, size: 20
    });
  }

  document.getElementById('quest-tracker').innerText = "⚔️ Missão: Derrote os Slimes Corrompidos!";
}

loadVillageZone();

const camera = {
  x: 0, y: 0, width: canvas.width, height: canvas.height,
  update() {
    this.x += (player.x - this.width / 2 - this.x) * 0.12;
    this.y += (player.y - this.height / 2 - this.y) * 0.12;
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

// SISTEMA DE INTERAÇÃO E TIRO MÁGICO
let activeNPC = null;
const dialogueBox = document.getElementById('dialogue-box');

document.getElementById('btn-action').addEventListener('click', () => {
  if (activeNPC) {
    if (player.questStep === 0) {
      player.questStep = 1;
      document.getElementById('quest-tracker').innerText = "📜 Missão: Colete 3 Cristais Mágicos (💎 0/3)";
    } else if (player.questStep === 1 && player.crystalsCollected >= 3) {
      player.questStep = 2;
      activeNPC.dialogue = "Incrível! Os cristais quebraram o selo. O Portão do Sul agora está aberto!";
      document.getElementById('quest-tracker').innerText = "🚪 Portão do Sul Aberto! Siga para o sul.";
    }
    document.getElementById('dialogue-speaker').innerText = activeNPC.name;
    document.getElementById('dialogue-text').innerText = activeNPC.dialogue;
    dialogueBox.classList.remove('hidden');
    playSound('dialogue');
  } else {
    dialogueBox.classList.add('hidden');
    // Atirar Projétil Mágico
    playSound('magic');
    let vx = 0, vy = 0;
    if (player.facing === 'up') vy = -6;
    if (player.facing === 'down') vy = 6;
    if (player.facing === 'left') vx = -6;
    if (player.facing === 'right') vx = 6;

    projectiles.push({ x: player.x + 12, y: player.y + 12, vx, vy, life: 40 });
    if (settings.shake) screenShakeTimer = 6;
  }
});

function checkCollision(nx, ny) {
  const pBox = { x: nx + 6, y: ny + 16, width: 20, height: 14 };
  for (let t of trees) {
    if (pBox.x < t.x + TILE_SIZE && pBox.x + pBox.width > t.x &&
        pBox.y < t.y + TILE_SIZE && pBox.y + pBox.height > t.y) return true;
  }
  for (let h of houses) {
    if (pBox.x < h.x + h.w && pBox.x + pBox.width > h.x &&
        pBox.y < h.y + h.h && pBox.y + pBox.height > h.y) return true;
  }
  return false;
}

function updateWorld() {
  dayNight.update();
  document.getElementById('time-display').innerText = dayNight.getPhase().name;

  if (screenShakeTimer > 0) screenShakeTimer--;

  // Projéteis
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    p.x += p.vx; p.y += p.vy; p.life--;

    // Colisão com Inimigos
    enemies.forEach((enemy, eIdx) => {
      if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < enemy.size) {
        enemy.hp -= 15;
        p.life = 0;
        if (enemy.hp <= 0) enemies.splice(eIdx, 1);
      }
    });

    if (p.life <= 0) projectiles.splice(i, 1);
  }

  // Inimigos Perseguindo o Mago
  enemies.forEach(enemy => {
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (dist < 120) {
      enemy.x += ((player.x - enemy.x) / dist) * enemy.speed;
      enemy.y += ((player.y - enemy.y) / dist) * enemy.speed;
      if (dist < 18) {
        player.hp = Math.max(0, player.hp - 0.5);
        document.getElementById('player-hp').innerText = `❤️ HP: ${Math.floor(player.hp)}/100`;
      }
    }
  });

  // Proximidade com NPCs
  activeNPC = null;
  npcs.forEach(npc => {
    if (Math.hypot(npc.x - player.x, npc.y - player.y) < 40) activeNPC = npc;
  });
}

function render() {
  ctx.save();
  if (screenShakeTimer > 0 && settings.shake) {
    ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = camera.x, cy = camera.y;

  // 1. Chão
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const type = map[r][c];
      const x = c * TILE_SIZE - cx, y = r * TILE_SIZE - cy;
      ctx.fillStyle = (type === 2) ? '#78350f' : ((type === 3) ? '#14280b' : '#1e3a10');
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }

  // 2. Cristais Mágicos
  crystals.forEach(c => {
    if (!c.collected) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(c.x - cx + 12, c.y - cy + 12, 8, 8);
    }
  });

  // 3. Casas e Árvores
  houses.forEach(h => {
    ctx.fillStyle = '#1e293b'; ctx.fillRect(h.x - cx, h.y - cy, h.w, h.h);
    ctx.fillStyle = '#b91c1c'; ctx.fillRect(h.x - cx - 4, h.y - cy - 8, h.w + 8, 12);
  });
  trees.forEach(t => {
    ctx.fillStyle = '#422006'; ctx.fillRect(t.x - cx + 11, t.y - cy + 14, 10, 16);
    ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(t.x - cx + 16, t.y - cy + 10, 18, 0, Math.PI * 2); ctx.fill();
  });

  // 4. Inimigos (Slimes Corrompidos)
  enemies.forEach(e => {
    ctx.fillStyle = '#a855f7';
    ctx.beginPath(); ctx.arc(e.x - cx, e.y - cy, e.size / 2, 0, Math.PI * 2); ctx.fill();
    // Barra de HP do Inimigo
    ctx.fillStyle = '#ef4444'; ctx.fillRect(e.x - cx - 10, e.y - cy - 16, 20, 3);
    ctx.fillStyle = '#22c55e'; ctx.fillRect(e.x - cx - 10, e.y - cy - 16, (e.hp / e.maxHp) * 20, 3);
  });

  // 5. Projéteis Mágicos
  projectiles.forEach(p => {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(p.x - cx, p.y - cy, 5, 0, Math.PI * 2); ctx.fill();
  });

  // 6. Mago Player
  const px = player.x - cx, py = player.y - cy;
  ctx.fillStyle = '#2563eb'; ctx.fillRect(px + 4, py + 10, 16, 14);
  ctx.fillStyle = '#fed7aa'; ctx.fillRect(px + 8, py + 6, 10, 8);
  ctx.fillStyle = '#1e3a8a'; ctx.fillRect(px + 4, py + 5, 18, 3);
  ctx.fillStyle = '#78350f'; ctx.fillRect(px + 22, py + 4, 3, 24);

  // 7. Renderização do Filtro de Dia / Noite & Luz do Mago
  const phase = dayNight.getPhase();
  if (phase.alpha > 0) {
    ctx.fillStyle = `rgba(${phase.color || '0,0,0'}, ${phase.alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Iluminação Radial Mágica em volta do Mago durante a Noite
    const lightGlow = ctx.createRadialGradient(px + 12, py + 12, 10, px + 12, py + 12, 110);
    lightGlow.addColorStop(0, 'rgba(255, 235, 59, 0.35)');
    lightGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = lightGlow;
    ctx.beginPath(); ctx.arc(px + 12, py + 12, 110, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();
}

startTypewriter();

function gameLoop() {
  if (gameState === 'PLAYING') {
    player.update();
    camera.update();
    updateWorld();
    render();
  }
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
