const area = document.querySelector('#gameArea');
const player = document.querySelector('#player');
const startButton = document.querySelector('#startButton');
const playAgainButton = document.querySelector('#playAgainButton');
const leftButton = document.querySelector('#leftButton');
const rightButton = document.querySelector('#rightButton');
const soundButton = document.querySelector('#soundButton');
const instructions = document.querySelector('#instructions');
const modal = document.querySelector('#gameOverModal');
const scoreElement = document.querySelector('#score');
const bestScoreElement = document.querySelector('#bestScore');
const timeElement = document.querySelector('#time');
const finalScoreElement = document.querySelector('#finalScore');
const resultMessage = document.querySelector('#resultMessage');

const GAME_LENGTH = 45;
const playerWidth = 72;
let score = 0;
let timeLeft = GAME_LENGTH;
let playerX = 50;
let running = false;
let muted = false;
let animationId;
let spawnTimer;
let timer;
let lastFrame;
let objects = [];
let audioContext;
let bestScore = Number(localStorage.getItem('hellCatBurgerBest') || 0);

bestScoreElement.textContent = bestScore;

function playTone(frequency, duration = 0.08, type = 'sine') {
  if (muted) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.09, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function setPlayerPosition(percent) {
  const minimum = (playerWidth / 2 / area.clientWidth) * 100;
  playerX = Math.max(minimum, Math.min(100 - minimum, percent));
  player.style.left = `${playerX}%`;
}

function movePlayer(direction) {
  if (!running) return;
  setPlayerPosition(playerX + direction * 7);
}

function spawnObject() {
  if (!running) return;
  const roll = Math.random();
  const type = roll < 0.15 ? 'spike' : roll < 0.33 ? 'double' : 'burger';
  const element = document.createElement('div');
  element.className = `falling ${type}`;
  element.textContent = type === 'spike' ? '▲' : '🍔';
  element.style.left = `${6 + Math.random() * 88}%`;
  area.appendChild(element);
  objects.push({ element, type, x: Number.parseFloat(element.style.left), y: -42, speed: 110 + Math.random() * 85 });
  const delay = Math.max(330, 730 - score * 8 + Math.random() * 300);
  spawnTimer = window.setTimeout(spawnObject, delay);
}

function showPop(x, y, text, bad = false) {
  const pop = document.createElement('div');
  pop.className = 'pop';
  pop.textContent = text;
  pop.style.left = `${x}%`;
  pop.style.top = `${y}px`;
  pop.style.color = bad ? '#ffb4c7' : '#fff0a1';
  area.appendChild(pop);
  window.setTimeout(() => pop.remove(), 650);
}

function updateObjects(delta) {
  const height = area.clientHeight;
  const playerY = height - 68;
  objects = objects.filter((object) => {
    object.y += object.speed * delta;
    object.element.style.transform = `translateY(${object.y}px) rotate(${object.y * 0.14}deg)`;
    const closeX = Math.abs(object.x - playerX) < 9;
    const closeY = object.y > playerY - 31 && object.y < playerY + 30;

    if (closeX && closeY) {
      object.element.remove();
      if (object.type === 'spike') {
        score = Math.max(0, score - 2);
        scoreElement.textContent = score;
        showPop(object.x, playerY - 10, '−2', true);
        playTone(130, 0.16, 'sawtooth');
      } else {
        const points = object.type === 'double' ? 3 : 1;
        score += points;
        scoreElement.textContent = score;
        showPop(object.x, playerY - 10, `+${points}`);
        playTone(object.type === 'double' ? 880 : 620, 0.09, 'triangle');
      }
      return false;
    }
    if (object.y > height + 45) {
      object.element.remove();
      return false;
    }
    return true;
  });
}

function gameLoop(now) {
  if (!running) return;
  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  updateObjects(delta);
  animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
  running = false;
  cancelAnimationFrame(animationId);
  clearTimeout(spawnTimer);
  clearInterval(timer);
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('hellCatBurgerBest', bestScore);
    bestScoreElement.textContent = bestScore;
  }
  finalScoreElement.textContent = score;
  resultMessage.textContent = score >= 35 ? 'Котик победил адский голод!' : score >= 18 ? 'Котик уже почти выбрался из ада.' : 'Ещё немного бургеров — и котик спасётся.';
  modal.classList.remove('hidden');
  playTone(260, 0.25, 'square');
}

function startGame() {
  objects.forEach(({ element }) => element.remove());
  objects = [];
  score = 0;
  timeLeft = GAME_LENGTH;
  scoreElement.textContent = score;
  timeElement.textContent = timeLeft;
  setPlayerPosition(50);
  modal.classList.add('hidden');
  instructions.classList.add('is-hidden');
  startButton.textContent = 'котик в аду';
  running = true;
  area.focus();
  lastFrame = performance.now();
  spawnObject();
  animationId = requestAnimationFrame(gameLoop);
  timer = window.setInterval(() => {
    timeLeft -= 1;
    timeElement.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

document.addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'a', 'A', 'ф', 'Ф'].includes(event.key)) { event.preventDefault(); movePlayer(-1); }
  if (['ArrowRight', 'd', 'D', 'в', 'В'].includes(event.key)) { event.preventDefault(); movePlayer(1); }
});

area.addEventListener('pointerdown', (event) => {
  if (!running) return;
  const rect = area.getBoundingClientRect();
  setPlayerPosition(((event.clientX - rect.left) / rect.width) * 100);
});

for (const [button, direction] of [[leftButton, -1], [rightButton, 1]]) {
  button.addEventListener('click', () => movePlayer(direction));
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); movePlayer(direction); });
}

startButton.addEventListener('click', () => { if (!running) startGame(); });
playAgainButton.addEventListener('click', startGame);
soundButton.addEventListener('click', () => {
  muted = !muted;
  soundButton.textContent = muted ? 'звук: нет' : 'звук: да';
  soundButton.setAttribute('aria-pressed', String(!muted));
});

