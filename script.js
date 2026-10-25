/**
 * ULTIMATE RETRO BOXING 360 - LIVE DEMO & FIXED TOUCH ENGINE
 * Senior Game Engine Architect
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 640;
canvas.height = 360;

// --- SINTETIZADOR DE ÁUDIO & MÚSICA 8-BIT ---
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
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.12);
    osc.start(now); osc.stop(now + 0.12);
  } else if (type === 'block') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === 'dodge') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.setValueAtTime(1000, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'ko') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.7);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.7);
    osc.start(now); osc.stop(now + 0.7);
  } else if (type === 'click') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(500, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.start(now); osc.stop(now + 0.05);
  }
}

// Trilha de Fundo Chiptune
let musicInterval = null;
function startBgMusic() {
  if (musicInterval || !settings.sound) return;
  const notes = [220, 261, 293, 329, 220, 293, 349, 392];
  let noteIdx = 0;
  musicInterval = setInterval(() => {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(notes[noteIdx], audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.18);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.18);
    noteIdx = (noteIdx + 1) % notes.length;
  }, 220);
}

// --- CONFIGURAÇÃO DE OPONENTES ---
const opponentsData = [
  { name: 'APOLO', color: '#10b981', primaryColor: '#059669', speed: 2.8, hp: 80, aggression: 0.03 },
  { name: 'BRUTUS', color: '#dc2626', primaryColor: '#b45309', speed: 2.3, hp: 100, aggression: 0.05 },
  { name: 'IRON MIKE', color: '#7c3aed', primaryColor: '#581c87', speed: 2.1, hp: 130, aggression: 0.08 }
];

let selectedOpponentIndex = 1;
let gameDifficulty = 'normal';
let isDemoMode = true; // Luta ao vivo rolando no menu inicial

document.getElementById('btn-start').addEventListener('click', () => {
  playSound('click');
  startBgMusic();
  selectedOpponentIndex = parseInt(document.getElementById('opponent-select').value);
  gameDifficulty = document.getElementById('difficulty-select').value;
  
  const data = opponentsData[selectedOpponentIndex];
  cpu.name = data.name;
  cpu.color = data.color;
  cpu.primaryColor = data.primaryColor;
  cpu.speed = data.speed;
  cpu.maxHp = data.hp;
  cpu.hp = data.hp;

  player.hp = 100;
  player.stamina = 100;
  player.x = 200; player.y = 160;
  cpu.x = 440; cpu.y = 160;

  isDemoMode = false; // Entra no modo de controle do jogador
  gameOver = false;
  knockdownTimer = 0;

  document.getElementById('menu-overlay').classList.add('hidden');
});

document.getElementById('btn-settings').addEventListener('click', () => {
  playSound('click');
  startBgMusic();
  document.getElementById('settings-overlay').classList.remove('hidden');
});

document.getElementById('btn-close-settings').addEventListener('click', () => {
  playSound('click');
  settings.sound = document.getElementById('setting-sound').checked;
  document.getElementById('settings-overlay').classList.add('hidden');
});

// --- SISTEMA DE PARTÍCULAS E EFEITOS ---
const hitParticles = [];
const floatingTexts = [];
let screenFlashAlpha = 0;
let knockdownTimer = 0;
let refereeCount = 0;

function createHitSparks(x, y, color) {
  for (let i = 0; i < 10; i++) {
    hitParticles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      size: Math.random() * 4 + 2,
      life: 1.0,
      color
    });
  }
}

function addFloatingText(text, x, y, color = '#facc15') {
  floatingTexts.push({ text, x, y, vy: -1.5, life: 1.0, color });
}

// --- ENGINE DE COMBATE ---
let gameOver = false;
let screenShake = 0;
let timeScale = 1.0;
let counterWindowTimer = 0;

class Boxer {
  constructor(x, y, color, primaryColor, name, isCPU = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.primaryColor = primaryColor;
    this.name = name;
    this.isCPU = isCPU;

    this.hp = 100;
    this.maxHp = 100;
    this.stamina = 100;
    this.maxStamina = 100;

    this.state = 'IDLE';
    this.animTimer = 0;
    this.speed = 2.4;
    this.knockdownAnim = 0;
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

    // Se for CPU ou se for Modo Demonstrativo do Menu
    if (this.isCPU || isDemoMode) {
      this.updateAI(opponent);
    }
  }

  updateAI(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 55 && this.state === 'IDLE') {
      this.x += (dx / dist) * this.speed * 0.75;
      this.y += (dy / dist) * this.speed * 0.75;
    } else if (dist < 40 && this.state === 'IDLE') {
      this.x -= (dx / dist) * this.speed * 0.5;
      this.y -= (dy / dist) * this.speed * 0.5;
    }

    this.x = Math.max(120, Math.min(520, this.x));
    this.y = Math.max(90, Math.min(230, this.y));

    const currentAggression = isDemoMode ? 0.05 : opponentsData[selectedOpponentIndex].aggression;

    if (dist <= 68 && this.state === 'IDLE' && Math.random() < currentAggression) {
      const rand = Math.random();
      if (rand < 0.4) this.attack(player, 'JAB');
      else if (rand < 0.7) this.attack(player, 'CROSS');
      else if (rand < 0.9) this.attack(player, 'HOOK');
      else this.attack(player, 'UPPERCUT');
    }

    if ((player.state === 'JAB' || player.state === 'CROSS' || player.state === 'HOOK' || player.state === 'UPPERCUT') && this.state === 'IDLE') {
      if (Math.random() < 0.4) this.state = 'BLOCK';
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

    if (dist <= 75) {
      const damages = { JAB: 7, CROSS: 13, HOOK: 17, UPPERCUT: 22 };
      let dmg = damages[type] || 10;

      if (this.isCountering()) dmg *= 1.8;

      opponent.takeDamage(dmg, type);
    }
  }

  isCountering() {
    return !this.isCPU && !isDemoMode && counterWindowTimer > 0;
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
      createHitSparks(this.x, this.y - 20, '#94a3b8');
    } else if (this.state === 'DODGE') {
      return;
    } else {
      this.hp -= amount;
      this.state = 'HIT';
      this.animTimer = 0;
      screenShake = punchType === 'UPPERCUT' || punchType === 'HOOK' ? 12 : 6;
      screenFlashAlpha = 0.3;
      playSound('hit');

      const hitColor = punchType === 'UPPERCUT' ? '#ef4444' : '#facc15';
      createHitSparks(this.x, this.y - 25, hitColor);
      addFloatingText(`-${Math.floor(amount)}`, this.x - 12, this.y - 50, hitColor);

      if (this.hp <= 0) {
        this.hp = 0;
        if (isDemoMode) {
          // No modo demo do menu, reinicia vida automaticamente para a luta continuar rolando ao fundo
          this.hp = 100;
        } else {
          this.state = 'KO';
          this.knockdownAnim = 0;
          playSound('ko');
          triggerKnockdown(this);
        }
      }
    }
  }

  draw(opponent) {
    const bx = this.x;
    const by = this.y;
    const lookingRight = opponent.x > this.x;

    const shadowGrad = ctx.createRadialGradient(bx, by + 35, 2, bx, by + 35, 22);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(bx, by + 35, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();

    if (this.state === 'KO') {
      this.knockdownAnim = Math.min(this.knockdownAnim + 0.1, 1.0);
      ctx.translate(bx, by + 10);
      ctx.rotate(this.knockdownAnim * (this.isCPU ? 1.57 : -1.57));
      ctx.translate(-bx, -(by + 10));
    }

    if (this.state === 'DODGE') ctx.globalAlpha = 0.5;

    // Pernas & Sapatos
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx - 12, by + 20, 8, 14);
    ctx.fillRect(bx + 4, by + 20, 8, 14);

    // Calção
    ctx.fillStyle = this.color;
    ctx.fillRect(bx - 15, by - 2, 30, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(bx - 15, by + 10, 30, 6);

    // Tronco Muscular
    const torsoGrad = ctx.createLinearGradient(bx - 14, by - 22, bx + 14, by - 2);
    torsoGrad.addColorStop(0, this.primaryColor);
    torsoGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = torsoGrad;
    ctx.fillRect(bx - 13, by - 22, 26, 21);

    // Cabeça HD
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(bx - 9, by - 38, 18, 16);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx - 9, by - 38, 18, 5);

    ctx.fillStyle = '#020617';
    const eyeOffsetX = lookingRight ? 3 : -6;
    ctx.fillRect(bx + eyeOffsetX, by - 31, 3, 3);

    // Luvas de Boxe Realistas
    ctx.fillStyle = this.color;
    const faceDir = lookingRight ? 1 : -1;

    if (this.state === 'JAB') {
      ctx.beginPath(); ctx.arc(bx + (faceDir * 24), by - 16, 9, 0, Math.PI * 2); ctx.fill();
    } else if (this.state === 'CROSS') {
      ctx.beginPath(); ctx.arc(bx + (faceDir * 34), by - 14, 11, 0, Math.PI * 2); ctx.fill();
    } else if (this.state === 'HOOK') {
      ctx.beginPath(); ctx.arc(bx + (faceDir * 20), by - 26, 10, 0, Math.PI * 2); ctx.fill();
    } else if (this.state === 'UPPERCUT') {
      ctx.beginPath(); ctx.arc(bx + (faceDir * 12), by - 36, 11, 0, Math.PI * 2); ctx.fill();
    } else if (this.state === 'BLOCK' || this.state === 'DODGE') {
      ctx.beginPath(); ctx.arc(bx - 8, by - 30, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + 8, by - 30, 8, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(bx - 12, by - 20, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + 12, by - 20, 8, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }
}

// Instâncias
const player = new Boxer(200, 160, '#2563eb', '#d97706', 'VOCÊ', false);
const cpu = new Boxer(440, 160, '#dc2626', '#b45309', 'BRUTUS', true);

// Árbitro
const referee = {
  x: 320, y: 70,
  draw() {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(this.x - 7, this.y - 14, 14, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(this.x - 7, this.y - 14, 3, 20);
    ctx.fillRect(this.x - 1, this.y - 14, 3, 20);
    ctx.fillRect(this.x + 5, this.y - 14, 3, 20);
    ctx.fillStyle = '#fed7aa'; ctx.fillRect(this.x - 6, this.y - 26, 12, 12);
  }
};

// BOTÕES VIRTUAIS E SISTEMA TOUCH CORRIGIDO
const moveKeys = { up: false, down: false, left: false, right: false };

const virtualButtons = [
  { id: 'up', x: 50, y: 240, w: 38, h: 38, text: '▲' },
  { id: 'down', x: 50, y: 310, w: 38, h: 38, text: '▼' },
  { id: 'left', x: 8, y: 275, w: 38, h: 38, text: '◄' },
  { id: 'right', x: 92, y: 275, w: 38, h: 38, text: '►' },

  { id: 'jab', x: 410, y: 245, w: 48, h: 34, text: 'JAB', color: '#0891b2' },
  { id: 'cross', x: 464, y: 245, w: 48, h: 34, text: 'DIR', color: '#2563eb' },
  { id: 'hook', x: 518, y: 245, w: 48, h: 34, text: 'CRZ', color: '#d97706' },
  { id: 'uppercut', x: 572, y: 245, w: 58, h: 34, text: 'UPP', color: '#dc2626' },

  { id: 'block', x: 435, y: 292, w: 85, h: 38, text: 'BLOQUEIO', color: '#475569' },
  { id: 'dodge', x: 530, y: 292, w: 95, h: 38, text: 'DESVIAR ⚡', color: '#7c3aed' }
];

function processTouchInput(e) {
  if (isDemoMode || gameOver) return;
  
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

// Binds de Toque Direto no Documento e Canvas
window.addEventListener('touchstart', e => { startBgMusic(); processTouchInput(e); }, { passive: false });
window.addEventListener('touchmove', processTouchInput, { passive: false });
window.addEventListener('touchend', processTouchInput, { passive: false });

// Teclado PC
window.addEventListener('keydown', e => {
  if (isDemoMode || gameOver) return;
  startBgMusic();
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

// --- RENDERIZAÇÃO DA ARENA ---
let lightPhase = 0;

function renderArena() {
  lightPhase += 0.025;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, '#020617');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = 5; x < canvas.width; x += 14) {
    const jump = Math.sin(lightPhase * 4 + x) * 2.5;
    ctx.fillStyle = '#334155';
    ctx.fillRect(x, 32 + jump, 9, 24);
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.arc(x + 4.5, 27 + jump, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  const spotX = 320 + Math.sin(lightPhase) * 60;
  const spotGrad = ctx.createRadialGradient(spotX, 60, 20, spotX, 60, 180);
  spotGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
  spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spotGrad;
  ctx.beginPath(); ctx.arc(spotX, 60, 180, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, 50, 560, 190);

  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5;
  for (let x = 60; x < 600; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, 240); ctx.stroke();
  }

  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3.5;
  ctx.strokeRect(40, 50, 560, 190);
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1;
  ctx.strokeRect(43, 53, 554, 184);
}

function renderHUD() {
  if (isDemoMode) return; // Esconde a HUD no modo demo do menu para visual limpo

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('P1: VOCÊ', 20, 18);

  ctx.fillStyle = '#0f172a'; ctx.fillRect(20, 22, 180, 11);
  ctx.fillStyle = '#ef4444'; ctx.fillRect(20, 22, (player.hp / player.maxHp) * 180, 11);

  ctx.fillStyle = '#0f172a'; ctx.fillRect(20, 36, 180, 5);
  ctx.fillStyle = '#eab308'; ctx.fillRect(20, 36, (player.stamina / player.maxStamina) * 180, 5);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('VS', 310, 26);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`P2: ${cpu.name}`, 440, 18);

  ctx.fillStyle = '#0f172a'; ctx.fillRect(440, 22, 180, 11);
  ctx.fillStyle = '#ef4444'; ctx.fillRect(440, 22, (cpu.hp / cpu.maxHp) * 180, 11);

  ctx.fillStyle = '#0f172a'; ctx.fillRect(440, 36, 180, 5);
  ctx.fillStyle = '#eab308'; ctx.fillRect(440, 36, (cpu.stamina / cpu.maxStamina) * 180, 5);

  if (counterWindowTimer > 0) {
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('⚡ COUNTER WINDOW! ⚡', 240, 46);
  }

  if (knockdownTimer > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CONTAGEM DO JUIZ: ${refereeCount}`, 320, 100);
    ctx.textAlign = 'left';
  }
}

function renderVirtualButtons() {
  if (isDemoMode || gameOver) return;

  virtualButtons.forEach(btn => {
    ctx.fillStyle = btn.color || '#1e293b';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function renderEffects() {
  for (let i = hitParticles.length - 1; i >= 0; i--) {
    let p = hitParticles[i];
    p.x += p.vx; p.y += p.vy; p.life -= 0.07;
                 
