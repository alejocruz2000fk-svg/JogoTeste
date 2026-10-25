/**
 * ULTIMATE RETRO BOXING 360 - FULL CANVAS INTEGRATED CONTROLS
 * Developer: Senior Game Engine Architect
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resolução Fixa Interna do Canvas (16:9 HD)
canvas.width = 640;
canvas.height = 360;

ctx.imageSmoothingEnabled = false;

// --- SINTETIZADOR DE ÁUDIO 8-BIT ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
const settings = { sound: true };

function playSound(type) {
  if (!settings.sound) return;
  if (!audioCtx) audioCtx = new AudioContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'hit') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'block') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === 'dodge') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'ko') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.5);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start(now); osc.stop(now + 0.5);
  } else if (type === 'click') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.start(now); osc.stop(now + 0.05);
  }
}

// --- MENUS ---
let gameDifficulty = 'normal';

document.getElementById('btn-start').addEventListener('click', () => {
  playSound('click');
  gameDifficulty = document.getElementById('difficulty-select').value;
  document.getElementById('menu-overlay').classList.add('hidden');
  gameOver = false;
});

document.getElementById('btn-settings').addEventListener('click', () => {
  playSound('click');
  document.getElementById('settings-overlay').classList.remove('hidden');
});

document.getElementById('btn-close-settings').addEventListener('click', () => {
  playSound('click');
  settings.sound = document.getElementById('setting-sound').checked;
  document.getElementById('settings-overlay').classList.add('hidden');
});

// --- ENGINE DE JOGO ---
let gameOver = true;
let screenShake = 0;
let timeScale = 1.0;
let counterWindowTimer = 0;

class Boxer {
  constructor(x, y, color, isCPU = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.isCPU = isCPU;

    this.hp = 100;
    this.maxHp = 100;
    this.stamina = 100;
    this.maxStamina = 100;

    this.state = 'IDLE';
    this.animTimer = 0;
    this.speed = 2.4;
  }

  update(opponent) {
    if (gameOver || this.state === 'KO') return;

    if (this.stamina < this.maxStamina && this.state === 'IDLE') {
      this.stamina = Math.min(this.maxStamina, this.stamina + 0.5);
    }

    if (this.state !== 'IDLE' && this.state !== 'BLOCK') {
      this.animTimer++;
      const limit = this.state === 'DODGE' ? 15 : 12;
      if (this.animTimer > limit) {
        this.state = 'IDLE';
        this.animTimer = 0;
      }
    }

    if (this.isCPU) {
      this.updateAI(opponent);
    }
  }

  updateAI(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    const attackChance = gameDifficulty === 'easy' ? 0.02 : gameDifficulty === 'normal' ? 0.045 : 0.08;
    const aggressionDist = gameDifficulty === 'easy' ? 70 : 55;

    if (dist > aggressionDist && this.state === 'IDLE') {
      this.x += (dx / dist) * this.speed * 0.75;
      this.y += (dy / dist) * this.speed * 0.75;
    } else if (dist < 40 && this.state === 'IDLE') {
      this.x -= (dx / dist) * this.speed * 0.5;
      this.y -= (dy / dist) * this.speed * 0.5;
    }

    this.x = Math.max(120, Math.min(520, this.x));
    this.y = Math.max(80, Math.min(220, this.y));

    if (dist <= 65 && this.state === 'IDLE' && Math.random() < attackChance) {
      const rand = Math.random();
      if (rand < 0.4) this.attack(player, 'JAB');
      else if (rand < 0.7) this.attack(player, 'CROSS');
      else if (rand < 0.9) this.attack(player, 'HOOK');
      else this.attack(player, 'UPPERCUT');
    }

    if ((player.state === 'JAB' || player.state === 'CROSS' || player.state === 'HOOK' || player.state === 'UPPERCUT') && this.state === 'IDLE') {
      const blockChance = gameDifficulty === 'easy' ? 0.2 : gameDifficulty === 'normal' ? 0.4 : 0.65;
      if (Math.random() < blockChance) this.state = 'BLOCK';
    }
  }

  attack(opponent, type) {
    if (gameOver) return;
    const costs = { JAB: 10, CROSS: 18, HOOK: 22, UPPERCUT: 28 };
    const cost = costs[type] || 15;

    if (this.stamina < cost || (this.state !== 'IDLE' && !this.isCountering())) return;

    this.stamina -= cost;
    this.state = type;
    this.animTimer = 0;

    const dist = Math.hypot(this.x - opponent.x, this.y - opponent.y);

    if (opponent.state === 'DODGE') return;

    if (dist <= 70) {
      const damages = { JAB: 7, CROSS: 13, HOOK: 17, UPPERCUT: 22 };
      let dmg = damages[type] || 10;

      if (this.isCountering()) dmg *= 1.8;

      opponent.takeDamage(dmg, type);
    }
  }

  isCountering() {
    return !this.isCPU && counterWindowTimer > 0;
  }

  dodge() {
    if (this.state !== 'IDLE' || this.stamina < 15) return;
    this.stamina -= 15;
    this.state = 'DODGE';
    this.animTimer = 0;
    playSound('dodge');

    const opponent = this.isCPU ? player : cpu;
    if (opponent.state === 'JAB' || opponent.state === 'CROSS' || opponent.state === 'HOOK' || opponent.state === 'UPPERCUT') {
      timeScale = 0.35;
      counterWindowTimer = 90;
    }
  }

  takeDamage(amount, punchType) {
    if (this.state === 'BLOCK') {
      this.hp -= amount * 0.2;
      this.stamina = Math.max(0, this.stamina - 4);
      playSound('block');
    } else if (this.state === 'DODGE') {
      return;
    } else {
      this.hp -= amount;
      this.state = 'HIT';
      this.animTimer = 0;
      screenShake = punchType === 'UPPERCUT' || punchType === 'HOOK' ? 10 : 5;
      playSound('hit');

      if (this.hp <= 0) {
        this.hp = 0;
        this.state = 'KO';
        playSound('ko');
        endGame(this.isCPU ? "VOCÊ VENCEU POR KO!" : "VOCÊ FOI NOCAUTEADO!");
      }
    }
  }

  draw(opponent) {
    const bx = this.x;
    const by = this.y;
    const lookingRight = opponent.x > this.x;

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 32, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === 'DODGE') ctx.globalAlpha = 0.6;

    // Pernas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx - 12, by + 12, 8, 20);
    ctx.fillRect(bx + 4, by + 12, 8, 20);

    // Calção
    ctx.fillStyle = this.color;
    ctx.fillRect(bx - 14, by - 2, 28, 16);

    // Tronco
    ctx.fillStyle = '#d97706';
    ctx.fillRect(bx - 12, by - 18, 24, 18);

    // Cabeça
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(bx - 8, by - 32, 16, 14);

    // Luvas
    ctx.fillStyle = '#dc2626';
    const faceDir = lookingRight ? 1 : -1;

    if (this.state === 'JAB') {
      ctx.fillRect(bx + (faceDir * 18), by - 16, 16, 8);
    } else if (this.state === 'CROSS') {
      ctx.fillRect(bx + (faceDir * 26), by - 14, 20, 10);
    } else if (this.state === 'HOOK') {
      ctx.fillRect(bx + (faceDir * 16), by - 24, 14, 12);
    } else if (this.state === 'UPPERCUT') {
      ctx.fillRect(bx + (faceDir * 10), by - 32, 12, 14);
    } else if (this.state === 'BLOCK' || this.state === 'DODGE') {
      ctx.fillRect(bx - 10, by - 28, 8, 12);
      ctx.fillRect(bx + 2, by - 28, 8, 12);
    } else {
      ctx.fillRect(bx - 12, by - 18, 8, 12);
      ctx.fillRect(bx + 4, by - 18, 8, 12);
    }

    ctx.globalAlpha = 1.0;
  }
}

const player = new Boxer(200, 160, '#2563eb', false);
const cpu = new Boxer(440, 160, '#dc2626', true);

// CONTROLES VIRTUAIS NO CANVAS & TOUCH
const moveKeys = { up: false, down: false, left: false, right: false };

// Mapeamento das regiões de toque dos botões na tela
const virtualButtons = [
  // D-Pad
  { id: 'up', x: 50, y: 240, w: 35, h: 35, text: '▲' },
  { id: 'down', x: 50, y: 310, w: 35, h: 35, text: '▼' },
  { id: 'left', x: 10, y: 275, w: 35, h: 35, text: '◄' },
  { id: 'right', x: 90, y: 275, w: 35, h: 35, text: '►' },

  // Socos
  { id: 'jab', x: 420, y: 245, w: 45, h: 32, text: 'JAB', color: '#0891b2' },
  { id: 'cross', x: 470, y: 245, w: 45, h: 32, text: 'DIR', color: '#2563eb' },
  { id: 'hook', x: 520, y: 245, w: 45, h: 32, text: 'CRZ', color: '#d97706' },
  { id: 'uppercut', x: 570, y: 245, w: 45, h: 32, text: 'UPP', color: '#dc2626' },

  // Defesa
  { id: 'block', x: 440, y: 290, w: 80, h: 35, text: 'BLOQUEIO', color: '#4b5563' },
  { id: 'dodge', x: 530, y: 290, w: 80, h: 35, text: 'DESVIAR ⚡', color: '#7c3aed' }
];

function handleTouch(e) {
  if (gameOver) return;
  e.preventDefault();

  // Resetar direções
  moveKeys.up = moveKeys.down = moveKeys.left = moveKeys.right = false;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let isBlocking = false;

  for (let i = 0; i < e.touches.length; i++) {
    const touch = e.touches[i];
    const tx = (touch.clientX - rect.left) * scaleX;
    const ty = (touch.clientY - rect.top) * scaleY;

    virtualButtons.forEach(btn => {
      if (tx >= btn.x && tx <= btn.x + btn.w && ty >= btn.y && ty <= btn.y + btn.h) {
        if (btn.id === 'up') moveKeys.up = true;
        if (btn.id === 'down') moveKeys.down = true;
        if (btn.id === 'left') moveKeys.left = true;
        if (btn.id === 'right') moveKeys.right = true;

        if (btn.id === 'jab') player.attack(cpu, 'JAB');
        if (btn.id === 'cross') player.attack(cpu, 'CROSS');
        if (btn.id === 'hook') player.attack(cpu, 'HOOK');
        if (btn.id === 'uppercut') player.attack(cpu, 'UPPERCUT');
        if (btn.id === 'dodge') player.dodge();
        if (btn.id === 'block') isBlocking = true;
      }
    });
  }

  player.state = isBlocking ? 'BLOCK' : (player.state === 'BLOCK' ? 'IDLE' : player.state);
}

canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('touchmove', handleTouch);
canvas.addEventListener('touchend', handleTouch);

// Suporte para Teclado no PC
window.addEventListener('keydown', e => {
  if (gameOver) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') moveKeys.up = true;
  if (k === 'arrowdown' || k === 's') moveKeys.down = true;
  if (k === 'arrowleft' || k === 'a') moveKeys.left = true;
  if (k === 'arrowright' || k === 'd') moveKeys.right = true;

  if (k === '1') player.attack(cpu, 'JAB');
  if (k === '2') player.attack(cpu, 'CROSS');
  if (k === '3') player.attack(cpu, 'HOOK');
  if (k === '4') player.attack(cpu, 'UPPERCUT');
  if (k === 'h') player.state = 'BLOCK';
  if (k === 'space') player.dodge();
});

window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') moveKeys.up = false;
  if (k === 'arrowdown' || k === 's') moveKeys.down = false;
  if (k === 'arrowleft' || k === 'a') moveKeys.left = false;
  if (k === 'arrowright' || k === 'd') moveKeys.right = false;
  if (k === 'h' && player.state === 'BLOCK') player.state = 'IDLE';
});

// DESENHO INTEGRADO NO CANVAS (RINGUE, HUD, BOTÕES)
function renderRing() {
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, 50, 560, 180);

  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
  for (let x = 60; x < 600; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, 230); ctx.stroke();
  }

  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
  ctx.strokeRect(40, 50, 560, 180);
}

function renderHUD() {
  // P1 HUD (Você)
  ctx.fillStyle = '#f3f4f6';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('P1: VOCÊ', 20, 18);

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(20, 22, 180, 10);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(20, 22, (player.hp / player.maxHp) * 180, 10);

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(20, 34, 180, 5);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(20, 34, (player.stamina / player.maxStamina) * 180, 5);

  // VS Badge
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('VS', 310, 26);

  // P2 HUD (Rival IA)
  ctx.fillStyle = '#f3f4f6';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('P2: RIVAL', 440, 18);

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(440, 22, 180, 10);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(440, 22, (cpu.hp / cpu.maxHp) * 180, 10);

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(440, 34, 180, 5);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(440, 34, (cpu.stamina / cpu.maxStamina) * 180, 5);

  if (counterWindowTimer > 0) {
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('⚡ COUNTER WINDOW! ⚡', 240, 46);
  }
}

function renderVirtualButtons() {
  if (gameOver) return;

  virtualButtons.forEach(btn => {
    ctx.fillStyle = btn.color || '#1e293b';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function endGame(text) {
  gameOver = true;
  document.getElementById('msg-subtitle').innerText = text;
  document.getElementById('msg-overlay').classList.remove('hidden');
}

document.getElementById('btn-restart').addEventListener('click', () => {
  playSound('click');
  player.hp = 100; player.stamina = 100; player.state = 'IDLE'; player.x = 200; player.y = 160;
  cpu.hp = 100; cpu.stamina = 100; cpu.state = 'IDLE'; cpu.x = 440; cpu.y = 160;
  gameOver = false;
  timeScale = 1.0;
  counterWindowTimer = 0;
  document.getElementById('msg-overlay').classList.add('hidden');
});

// GAMELOOP
function gameLoop() {
  ctx.save();

  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    screenShake *= 0.85;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderRing();

  if (!gameOver && player.state !== 'KO') {
    let dx = 0, dy = 0;
    if (moveKeys.up) dy -= 1;
    if (moveKeys.down) dy += 1;
    if (moveKeys.left) dx -= 1;
    if (moveKeys.right) dx += 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    player.x = Math.max(60, Math.min(580, player.x + dx * player.speed));
    player.y = Math.max(70, Math.min(210, player.y + dy * player.speed));
  }

  if (counterWindowTimer > 0) {
    counterWindowTimer--;
    if (counterWindowTimer <= 0) timeScale = 1.0;
  }

  player.update(cpu);
  cpu.update(player);

  if (player.y < cpu.y) {
    player.draw(cpu);
    cpu.draw(player);
  } else {
    cpu.draw(player);
    player.draw(cpu);
  }

  renderHUD();
  renderVirtualButtons();

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
    
