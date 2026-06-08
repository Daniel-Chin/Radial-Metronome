const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const state = {
  tempo: 30,
  ridges: 1,
  playing: false,
  angle: 0,          // radians, 0 = top (12 o'clock)
  lastTime: null,
  lastPassedRidge: -1,
};

// ── sizing ────────────────────────────────────────────────────────────────────
function resize() {
  const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.58);
  canvas.width = size;
  canvas.height = size;
  if (!state.playing) drawFrame();
}
window.addEventListener('resize', resize);
resize();

// ── drawing ───────────────────────────────────────────────────────────────────
function drawFrame() {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const R = w * 0.44; // circle radius

  ctx.clearRect(0, 0, w, h);

  // Conic gradient: jumps from light to dark at the hand position, smooth in between.
  // createConicGradient uses canvas angle convention (0 = 3 o'clock), so subtract π/2.
  const conic = ctx.createConicGradient(state.angle - Math.PI / 2, cx, cy);
  conic.addColorStop(0, '#000');
  conic.addColorStop(1, 'rgb(200, 200, 200)');

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = conic;
  ctx.fill();

  // Ridge lines
  if (state.ridges > 0) {
    for (let i = 0; i < state.ridges; i++) {
      const ridgeAngle = (i / state.ridges) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + Math.cos(ridgeAngle) * R * 0.18;
      const y1 = cy + Math.sin(ridgeAngle) * R * 0.18;
      const x2 = cx + Math.cos(ridgeAngle) * R;
      const y2 = cy + Math.sin(ridgeAngle) * R;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

// ── click detection ───────────────────────────────────────────────────────────
function checkClicks(prevAngle, nextAngle) {
  if (state.ridges === 0) return;

  const TAU = Math.PI * 2;
  const prev = ((prevAngle % TAU) + TAU) % TAU;
  const next = ((nextAngle % TAU) + TAU) % TAU;

  for (let i = 0; i < state.ridges; i++) {
    const ridgeAngle = (i / state.ridges) * TAU;
    let hit = false;
    if (next >= prev) {
      hit = ridgeAngle >= prev && ridgeAngle < next;
    } else {
      // wrapped around
      hit = ridgeAngle >= prev || ridgeAngle < next;
    }
    if (hit) {
      AudioEngine.click(i === 0);
    }
  }
}

// ── animation loop ─────────────────────────────────────────────────────────────
function loop(ts) {
  if (!state.playing) return;

  if (state.lastTime === null) state.lastTime = ts;
  const dt = (ts - state.lastTime) / 1000; // seconds
  state.lastTime = ts;

  const TAU = Math.PI * 2;
  const revolutionsPerSec = state.tempo / 60;
  const delta = revolutionsPerSec * TAU * dt;

  const prevAngle = state.angle;
  state.angle = (state.angle + delta) % TAU;

  checkClicks(prevAngle, state.angle);
  drawFrame();

  requestAnimationFrame(loop);
}

// ── controls ──────────────────────────────────────────────────────────────────
function fmt(v) {
  return (Math.abs(v - Math.round(v)) < 0.005) ? Math.round(v).toString() : v.toFixed(1);
}

function updateDisplays() {
  const spm = 60 / state.tempo;
  document.getElementById('tempo-display').textContent = fmt(state.tempo);
  document.getElementById('spm-display').textContent = fmt(spm);
  document.getElementById('tempo-slider').value = Math.round(Math.max(1, Math.min(300, state.tempo)));
  document.getElementById('spm-slider').value = Math.round(Math.max(1, Math.min(300, spm)));
}

function setTempoFromMpm(v) {
  const snapped = Math.round(Math.max(1, v));
  state.tempo = snapped;
  updateDisplays();
}

function setTempoFromSpm(v) {
  const snapped = Math.round(Math.max(1, v));
  state.tempo = 60 / snapped;
  updateDisplays();
}

function setRidges(v) {
  state.ridges = Math.max(0, Math.min(32, v));
  document.getElementById('ridges-display').textContent = state.ridges;
}

document.getElementById('tempo-inc').addEventListener('click', () => setTempoFromMpm(Math.round(state.tempo) + 1));
document.getElementById('tempo-dec').addEventListener('click', () => setTempoFromMpm(Math.round(state.tempo) - 1));
document.getElementById('tempo-slider').addEventListener('input', (e) => setTempoFromMpm(parseInt(e.target.value, 10)));

document.getElementById('spm-inc').addEventListener('click', () => setTempoFromSpm(Math.round(60 / state.tempo) + 1));
document.getElementById('spm-dec').addEventListener('click', () => setTempoFromSpm(Math.round(60 / state.tempo) - 1));
document.getElementById('spm-slider').addEventListener('input', (e) => setTempoFromSpm(parseInt(e.target.value, 10)));

document.getElementById('ridges-inc').addEventListener('click', () => setRidges(state.ridges + 1));
document.getElementById('ridges-dec').addEventListener('click', () => setRidges(state.ridges - 1));

const playBtn = document.getElementById('play-btn');
playBtn.addEventListener('click', () => {
  AudioEngine.resume();
  state.playing = !state.playing;
  playBtn.textContent = state.playing ? 'Stop' : 'Play';
  if (state.playing) {
    state.lastTime = null;
    requestAnimationFrame(loop);
  }
});

updateDisplays();
drawFrame();
