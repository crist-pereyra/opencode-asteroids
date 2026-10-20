'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins de la nave ──────────────────────────────────────────────────────────
const SHIP_SKINS = [
  {
    name: 'CLÁSICA',
    stroke: '#fff',
    fill: 'rgba(255, 255, 255, 0.08)',
    thrust: 'rgba(255, 130, 0, 0.85)',
    points: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    flame: [[-8, -4], [-8, 4]],
  },
  {
    name: 'ALA',
    stroke: '#4df3ff',
    fill: 'rgba(77, 243, 255, 0.12)',
    thrust: 'rgba(77, 243, 255, 0.9)',
    points: [[21, 0], [4, -6], [-2, -15], [-11, -10], [-6, 0], [-11, 10], [-2, 15], [4, 6]],
    flame: [[-6, -4], [-6, 4]],
  },
  {
    name: 'CAZA',
    stroke: '#ff5577',
    fill: 'rgba(255, 85, 119, 0.12)',
    thrust: 'rgba(255, 190, 70, 0.9)',
    points: [[23, 0], [5, -6], [-4, -12], [-12, -6], [-8, 0], [-12, 6], [-4, 12], [5, 6]],
    flame: [[-8, -3], [-8, 3]],
  },
  {
    name: 'DIAMANTE',
    stroke: '#ffd84d',
    fill: 'rgba(255, 216, 77, 0.13)',
    thrust: 'rgba(255, 145, 40, 0.9)',
    points: [[21, 0], [0, -14], [-16, 0], [0, 14]],
    flame: [[-5, -4], [-5, 4]],
  },
  {
    name: 'MORADA',
    stroke: '#c77dff',
    fill: 'rgba(199, 125, 255, 0.14)',
    thrust: 'rgba(199, 125, 255, 0.9)',
    points: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    flame: [[-8, -4], [-8, 4]],
    scale: 2,
    pointsMultiplier: 2,
  },
];

function loadSkinIndex() {
  try {
    const savedIndex = Number.parseInt(localStorage.getItem('asteroids-skin'), 10);
    return Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < SHIP_SKINS.length
      ? savedIndex
      : 0;
  } catch {
    return 0;
  }
}

function saveSkinIndex() {
  try {
    localStorage.setItem('asteroids-skin', String(selectedSkinIndex));
  } catch {
    // El juego sigue funcionando aunque el navegador bloquee el almacenamiento.
  }
}

let selectedSkinIndex = loadSkinIndex();

function cycleSkin() {
  selectedSkinIndex = (selectedSkinIndex + 1) % SHIP_SKINS.length;
  saveSkinIndex();
}

function skinScale() {
  return SHIP_SKINS[selectedSkinIndex].scale ?? 1;
}

function skinPointsMultiplier() {
  return SHIP_SKINS[selectedSkinIndex].pointsMultiplier ?? 1;
}

function drawPolygon(points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++)
    ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 2);
    const angle = rand(0, Math.PI * 2);
    const speed = rand(210, 280);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 14;
    this.ttl = rand(7, 10);
    this.points = 150;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  split() {
    return [];
  }

  draw() {
    const speed = Math.hypot(this.vx, this.vy);
    const directionX = this.vx / speed;
    const directionY = this.vy / speed;
    const alpha = Math.min(1, this.ttl);

    ctx.save();
    ctx.strokeStyle = `rgba(255, 240, 150, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - directionX * 34, this.y - directionY * 34);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Power-up de velocidad ─────────────────────────────────────────────────────
class SpeedPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.ttl = 10;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const pulse = 1 + Math.sin(this.ttl * 6) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#4df3ff';
    ctx.fillStyle = 'rgba(77, 243, 255, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4df3ff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', 0, 1);
    ctx.restore();
  }
}

// ── Power-up de triple disparo ────────────────────────────────────────────────
class TripleShotPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.ttl = 10;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const pulse = 1 + Math.sin(this.ttl * 6) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#ff72e6';
    ctx.fillStyle = 'rgba(255, 114, 230, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff72e6';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('3', 0, 1);
    ctx.restore();
  }
}

// ── Power-up de escudo ────────────────────────────────────────────────────────
class ShieldPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.ttl = 10;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const pulse = 1 + Math.sin(this.ttl * 6) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#b66cff';
    ctx.fillStyle = 'rgba(182, 108, 255, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b66cff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', 0, 1);
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12 * skinScale();
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoostTimer = 0;
    this.tripleShotTimer = 0;
    this.shieldTimer = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    this.radius = 12 * skinScale();
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoostTimer > 0) this.speedBoostTimer -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const speedMultiplier = this.speedBoostTimer > 0 ? 2 : 1;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * speedMultiplier * dt;
      this.vy += Math.sin(this.angle) * THRUST * speedMultiplier * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * speedMultiplier * dt, W);
    this.y = wrap(this.y + this.vy * speedMultiplier * dt, H);
  }

  activateSpeedBoost() {
    this.speedBoostTimer = 5;
  }

  activateTripleShot() {
    this.tripleShotTimer = 5;
  }

  activateShield() {
    this.shieldTimer = 6;
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21 * skinScale();
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShotTimer <= 0) return [new Bullet(ox, oy, this.angle)];

    const spread = 7;
    const perpendicularX = -Math.sin(this.angle);
    const perpendicularY = Math.cos(this.angle);
    return [-spread, 0, spread].map(offset => new Bullet(
      ox + perpendicularX * offset,
      oy + perpendicularY * offset,
      this.angle,
    ));
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const skin = SHIP_SKINS[selectedSkinIndex];
    const scale = skin.scale ?? 1;
    ctx.scale(scale, scale);
    ctx.strokeStyle = skin.stroke;
    ctx.fillStyle    = skin.fill;

    if (this.shieldTimer > 0) {
      const pulse = 1 + Math.sin(this.shieldTimer * 10) * 0.04;
      ctx.save();
      ctx.rotate(-this.angle);
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = 'rgba(182, 108, 255, 0.9)';
      ctx.fillStyle = 'rgba(182, 108, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 29, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    drawPolygon(skin.points);
    ctx.fill();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(skin.flame[0][0], skin.flame[0][1]);
      ctx.lineTo(skin.flame[0][0] - rand(6, 14), 0);
      ctx.lineTo(skin.flame[1][0], skin.flame[1][1]);
      ctx.strokeStyle = skin.thrust;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, speedPowerUp, tripleShotPowerUp, shieldPowerUp;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let speedPowerUpTimer, tripleShotPowerUpTimer, shieldPowerUpTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  const spawnPosition = () => {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    return { x, y };
  };

  for (let i = 0; i < count; i++) {
    const { x, y } = spawnPosition();
    asteroids.push(new Asteroid(x, y, 3));
  }

  const { x, y } = spawnPosition();
  asteroids.push(new ShootingStar(x, y));
}

function spawnSpeedPowerUp() {
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (dist({ x, y }, ship) < 120);
  speedPowerUp = new SpeedPowerUp(x, y);
}

function spawnTripleShotPowerUp() {
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (dist({ x, y }, ship) < 120);
  tripleShotPowerUp = new TripleShotPowerUp(x, y);
}

function spawnShieldPowerUp() {
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (dist({ x, y }, ship) < 120);
  shieldPowerUp = new ShieldPowerUp(x, y);
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  speedPowerUp = null;
  tripleShotPowerUp = null;
  shieldPowerUp = null;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  speedPowerUpTimer = rand(8, 14);
  tripleShotPowerUpTimer = rand(12, 20);
  shieldPowerUpTimer = rand(12, 18);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  speedPowerUp = null;
  tripleShotPowerUp = null;
  speedPowerUpTimer = rand(8, 14);
  tripleShotPowerUpTimer = rand(12, 20);
  shieldPowerUp = null;
  shieldPowerUpTimer = rand(12, 18);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoostTimer = 0;
  ship.tripleShotTimer = 0;
  ship.shieldTimer = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (pressed('KeyC')) cycleSkin();

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (speedPowerUp) {
      speedPowerUp.update(dt);
      if (speedPowerUp.dead) speedPowerUp = null;
    }
    if (tripleShotPowerUp) {
      tripleShotPowerUp.update(dt);
      if (tripleShotPowerUp.dead) tripleShotPowerUp = null;
    }
    if (shieldPowerUp) {
      shieldPowerUp.update(dt);
      if (shieldPowerUp.dead) shieldPowerUp = null;
    }
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  if (speedPowerUp) {
    speedPowerUp.update(dt);
    if (speedPowerUp.dead) speedPowerUp = null;
  } else {
    speedPowerUpTimer -= dt;
    if (speedPowerUpTimer <= 0) {
      spawnSpeedPowerUp();
      speedPowerUpTimer = rand(15, 25);
    }
  }
  if (tripleShotPowerUp) {
    tripleShotPowerUp.update(dt);
    if (tripleShotPowerUp.dead) tripleShotPowerUp = null;
  } else {
    tripleShotPowerUpTimer -= dt;
    if (tripleShotPowerUpTimer <= 0) {
      spawnTripleShotPowerUp();
      tripleShotPowerUpTimer = rand(18, 28);
    }
  }
  if (shieldPowerUp) {
    shieldPowerUp.update(dt);
    if (shieldPowerUp.dead) shieldPowerUp = null;
  } else {
    shieldPowerUpTimer -= dt;
    if (shieldPowerUpTimer <= 0) {
      spawnShieldPowerUp();
      shieldPowerUpTimer = rand(18, 28);
    }
  }

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += (a.points ?? POINTS[a.size]) * skinPointsMultiplier();
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Escudo vs asteroide
  if (ship.shieldTimer > 0) {
    const shieldAsteroids = [];
    for (const a of asteroids) {
      if (dist(ship, a) < 29 + a.radius * 0.82) {
        a.dead = true;
        score += (a.points ?? POINTS[a.size]) * skinPointsMultiplier();
        explode(a.x, a.y, a.size * 5);
        shieldAsteroids.push(...a.split());
      }
    }
    asteroids = asteroids.filter(a => !a.dead).concat(shieldAsteroids);
  }

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nave vs power-up de velocidad
  if (!ship.dead && speedPowerUp && dist(ship, speedPowerUp) < ship.radius + speedPowerUp.radius) {
    ship.activateSpeedBoost();
    speedPowerUp = null;
  }

  // Nave vs power-up de triple disparo
  if (!ship.dead && tripleShotPowerUp && dist(ship, tripleShotPowerUp) < ship.radius + tripleShotPowerUp.radius) {
    ship.activateTripleShot();
    tripleShotPowerUp = null;
  }

  // Nave vs power-up de escudo
  if (!ship.dead && shieldPowerUp && dist(ship, shieldPowerUp) < ship.radius + shieldPowerUp.radius) {
    ship.activateShield();
    shieldPowerUp = null;
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SHIP_SKINS[selectedSkinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.stroke;
  ctx.fillStyle = skin.fill;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  const iconScale = 0.45 / (SHIP_SKINS[selectedSkinIndex].scale ?? 1);
  ctx.scale(iconScale, iconScale);
  drawPolygon(skin.points);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText(`SCORE  ${score}`, 14, 26);
  if (ship.speedBoostTimer > 0)
    ctx.fillStyle = '#4df3ff';
  if (ship.speedBoostTimer > 0)
    ctx.fillText(`VELOCIDAD  ${Math.ceil(ship.speedBoostTimer)}s`, 150, 26);
  if (ship.tripleShotTimer > 0) {
    ctx.fillStyle = '#ff72e6';
    ctx.fillText(`TRIPLE SHOT  ${Math.ceil(ship.tripleShotTimer)}s`, 300, 26);
  }
  if (ship.shieldTimer > 0) {
    ctx.fillStyle = '#b66cff';
    ctx.fillText(`ESCUDO  ${Math.ceil(ship.shieldTimer)}s`, 440, 26);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  ctx.textAlign = 'center';
  ctx.fillStyle = SHIP_SKINS[selectedSkinIndex].stroke;
  ctx.font = '12px monospace';
  ctx.fillText(`NAVE ${SHIP_SKINS[selectedSkinIndex].name} · C PARA CAMBIAR`, W / 2, H - 14);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  if (speedPowerUp) speedPowerUp.draw();
  if (tripleShotPowerUp) tripleShotPowerUp.draw();
  if (shieldPowerUp) shieldPowerUp.draw();
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
