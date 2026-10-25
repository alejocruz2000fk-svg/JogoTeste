/**
 * ULTIMATE RETRO BOXING 360 - 16:9 ENGINE
 * Senior Game Engine Architect
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    osc.frequency.exponentialRampYToValueAtTime ? osc.frequency.exponentialRampToValueAtTime(800, now + 0.1) : osc.frequency.setValueAtTime(800, now + 0.1);
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

// --- CONFIGURAÇÃO DE DIFICULDADE E MENUS ---
let gameDifficulty = 'normal';

document.getElementById('btn-start').addEventListener('click', () => {
  playSound('click');
  gameDifficulty = document.getElementById('difficulty-select').value;
  document.getElementById('menu-overlay').classList.add('hidden');
  document.getElementById('ui-overlay').classList.remove('hidden');
  document.getElementById('touch-controls').classList.remove('hidden');
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

// --- CLASSE DO LUTADOR (MOVIMENTO 360 E MECÂNICAS) ---
let gameOver = true;
let screenShake = 0;
let timeScale = 1.0; // Controla o slow-motion do desvio perfeito
let counterWindowTimer = 0;

class Boxer {
  constructor(x, y, color, isCPU = false) {
    this.x = x;
    this.y = y;
    this.width = 36;
    this.height = 64;
    this.color = color;
    this.isCPU = isCPU;

    this.hp = 100;
    this.maxHp = 100;
    this.stamina = 100;
    this.maxStamina = 100;

    this.state = 'IDLE'; // 'IDLE', 'JAB', 'CROSS', 'HOOK', 'UPPERCUT', 'BLOCK', 'DODGE', 'HIT', 'KO'
    this.animTimer = 0;
    this.speed = 2.4;
  }

  update(opponent) {
    if (gameOver || this.state === 'KO') return;

    // Recuperação de Estamina
    if (this.stamina < this.maxStamina && this.state === 'IDLE') {
      this.stamina = Math.min(this.maxStamina, this.stamina + 0.5);
    }

    // Fim de animações de golpes / esquivas
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

    // Ajuste de Dificuldade da IA
    const attackChance = gameDifficulty === 'easy' ? 0.02 : gameDifficulty === 'normal' ? 0.045 : 0.08;
    const aggressionDist = gameDifficulty === 'easy' ? 70 : 55;

    // Movimentação 360 inteligente da CPU
    if (dist > aggressionDist && this.state === 'IDLE') {
      this.x += (dx / dist) * this.speed * 0.75;
      this.y += (dy / dist) * this.speed * 0.75;
    } else if (dist < 40 && this.state === 'IDLE') {
      this.x -= (dx / dist) * this.speed * 0.5;
      this.y -= (dy / dist) * this.speed * 0.5;
    }

    // Delimitar limites do ringue para a IA
    this.x = Math.max(120, Math.min(600, this.x));
    this.y = Math.max(130, Math.min(290, this.y));

    // Ações de Ataque da CPU
    if (dist <= 65 && this.state === 'IDLE' && Math.random() < attackChance) {
      const rand = Math.random();
      if (rand < 0.4) this.attack(player, 'JAB');
      else if (rand < 0.7) this.attack(player, 'CROSS');
      else if (rand < 0.9) this.attack(player, 'HOOK');
      else this.attack(player, 'UPPERCUT');
    }

    // Defesa reativa da IA baseada na dificuldade
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
    
    // Se o oponente estiver em animação de desvio perfeito (Counter Window ativa para o outro)
    if (opponent.state === 'DODGE') {
      return; // Errou o golpe devido ao desvio
    }

    if (dist <= 70) {
      const damages = { JAB: 7, CROSS: 13, HOOK: 17, UPPERCUT: 22 };
      let dmg = damages[type] || 10;

      // Se for um contra-ataque durante a janela de câmera lenta, dano dobrado e crítico!
      if (this.isCountering()) {
        dmg *= 1.8;
      }

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

    // Checar se o oponente estava atacando no momento exato (Desvio Perfeito / Counter Window)
    const opponent = this.isCPU ? player : cpu;
    if (opponent.state === 'JAB' || opponent.state === 'CROSS' || opponent.state === 'HOOK' || opponent.state === 'UPPERCUT') {
      // Ativa Câmera Lenta e Janela de Contra-Ataque Garantido
      timeScale = 0.35;
      counterWindowTimer = 90; // quadros em câmera lenta
      document.getElementById('counter-prompt').classList.remove('hidden');
    }
  }

  takeDamage(amount, punchType) {
    if (this.state === 'BLOCK') {
      this.hp -= amount * 0.2;
      this.stamina = Math.max(0, this.stamina - 4);
      playSound('block');
    } else if (this.state === 'DODGE') {
      // Imune a dano durante a esquiva
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

    // Calcular ângulo para estarem SEMPRE se olhando de frente com a guarda alta
    const lookingRight = opponent.x > this.x;

    // Sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 32, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Se estiver desviando, aplicar efeito de transparência / desfoque
    if (this.state === 'DODGE') {
      ctx.globalAlpha = 0.6;
    }

    // Pernas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx - 12, by + 12, 8, 20);
    ctx.fillRect(bx + 4, by + 12, 8, 20);

    // Calção
    ctx.fillStyle = this.color;
    ctx.fillRect(bx - 14, by - 2, 28, 16);

    // Tronco / Peitoral
    ctx.fillStyle = '#d97706';
    ctx.fillRect(bx - 12, by - 18, 24, 18);

    // Cabeça
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(bx - 8, by - 32, 16, 14);

    // Luvas e Guarda Alta
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
      // Guarda Alta Fechada na Face
      ctx.fillRect(bx - 10, by - 28, 8, 12);
      ctx.fillRect(bx + 2, by - 28, 8, 12);
    } else {
      // Guarda Padrão Alta
      ctx.fillRect(bx - 12, by - 18, 8, 12);
      ctx.fillRect(bx + 4, by - 18, 8, 12);
    }

    ctx.globalAlpha = 1.0;
  }
}

// Instâncias
const player = new Boxer(220, 220, '#2563eb', false);
const cpu = new Boxer(440, 220, '#dc2626', true);

// CONTROLES DE MOVIMENTO 360 (D-Pad Touch & Teclado)
const moveKeys = { up: false, down: false, left: false, right: false };

window.addEventListener('keydown', e => {
  if (gameOver) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') moveKeys.up = true;
  if (k === 'arrowdown' || k === 's') moveKeys.down = true;
  if (k === 'arrowleft' || k === 'a') moveKeys.left = true;
  if (k === 'arrowright' || k === 'd') moveKeys.right = true;

  if (k === 'u') player.attack(cpu, 'JAB');
  if (k === 'i') player.attack(cpu, 'CROSS');
  if (k === 'o') player.attack(cpu, 'HOOK');
  if (k === 'p') player.attack(cpu, 'UPPERCUT');
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

// Binds Touch para D-Pad e Botões
function bindTouch(id, action, isHold = true) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const start = e => { e.preventDefault(); action(true); };
  const end = e => { e.preventDefault(); action(false); };
  if (isHold) {
    btn.addEventListener('touchstart', start); btn.addEventListener('touchend', end);
    btn.addEventListener('mousedown', start); btn.addEventListener('mouseup', end);
  } else {
    btn.addEventListener('touchstart', e => { e.preventDefault(); action(); });
    btn.addEventListener('click', e => { e.preventDefault(); action(); });
  }
}

bindTouch('btn-up', (p) => moveKeys.up = p);
bindTouch('btn-down', (p) => moveKeys.down = p);
bindTouch('btn-left', (p) => moveKeys.left = p);
bindTouch('btn-right', (p) => moveKeys.right = p);

bindTouch('btn-jab', () => player.attack(cpu, 'JAB'), false);
bindTouch('btn-cross', () => player.attack(cpu, 'CROSS'), false);
bindTouch('btn-hook', () => player.attack(cpu, 'HOOK'), false);
bindTouch('btn-uppercut', () => player.attack(cpu, 'UPPERCUT'), false);
bindTouch('btn-block', (p) => player.state = p ? 'BLOCK' : 'IDLE', true);
bindTouch('btn-dodge', () => player.dodge(), false);

// RENDERIZAÇÃO DO RINGUE 360
function renderRing() {
  // Lona do Ringue Perspectiva Superior/Lateral
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(60, 110, 520, 200);

  // Grade do Piso do Ringue
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
  for (let x = 80; x < 580; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x, 310); ctx.stroke();
  }

  // Cordas do Ringue Retrô
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
  ctx.strokeRect(60, 110, 520, 200);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
  ctx.strokeRect(66, 116, 508, 188);
}

function updateHUD() {
  document.getElementById('player-hp').style.width = `${(player.hp / player.maxHp) * 100}%`;
  document.getElementById('player-stamina').style.width = `${(player.stamina / player.maxStamina) * 100}%`;
  document.getElementById('cpu-hp').style.width = `${(cpu.hp / cpu.maxHp) * 100}%`;
  document.getElementById('cpu-stamina').style.width = `${(cpu.stamina / cpu.maxStamina) * 100}%`;

  if (counterWindowTimer <= 0) {
    document.getElementById('counter-prompt').classList.add('hidden');
  }
}

function endGame(text) {
  gameOver = true;
  document.getElementById('msg-subtitle').innerText = text;
  document.getElementById('msg-overlay').classList.remove('hidden');
  document.getElementById('counter-prompt').classList.add('hidden');
}

document.getElementById('btn-restart').addEventListener('click', () => {
  playSound('click');
  player.hp = 100; player.stamina = 100; player.state = 'IDLE'; player.x = 220; player.y = 220;
  cpu.hp = 100; cpu.stamina = 100; cpu.state = 'IDLE'; cpu.x = 440; cpu.y = 220;
  gameOver = false;
  timeScale = 1.0;
  counterWindowTimer = 0;
  document.getElementById('msg-overlay').classList.add('hidden');
});

// GAMELOOP PRINCIPAL COM SUPORTE A SLOW-MOTION (CÂMERA LENTA)
function gameLoop() {
  ctx.save();

  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    screenShake *= 0.85;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderRing();

  // Processar Controles de Movimento 360 do Jogador
  if (!gameOver && player.state !== 'KO') {
    let dx = 0, dy = 0;
    if (moveKeys.up) dy -= 1;
    if (moveKeys.down) dy += 1;
    if (moveKeys.left) dx -= 1;
    if (moveKeys.right) dx += 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    player.x = Math.max(90, Math.min(550, player.x + dx * player.speed));
    player.y = Math.max(140, Math.min(280, player.y + dy * player.speed));
  }

  // Atualizar contadores de câmera lenta / counter window
  if (counterWindowTimer > 0) {
    counterWindowTimer--;
    if (counterWindowTimer <= 0) {
      timeScale = 1.0; // Retorna à velocidade normal de 60 FPS
    }
  }

  // Atualizar lógica dos lutadores
  player.update(cpu);
  cpu.update(player);

  // Ordenar profundidade (Y axis sorting para efeito 2.5D perfeito)
  if (player.y < cpu.y) {
    player.draw(cpu);
    cpu.draw(player);
  } else {
    cpu.draw(player);
    player.draw(cpu);
  }

  updateHUD();

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
    
