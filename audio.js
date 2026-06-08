const AudioEngine = (() => {
  let ctx = null;
  let noiseBuffer = null;

  const NOISE_DURATION = 0.12; // seconds

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function buildBuffer(c) {
    const length = Math.ceil(c.sampleRate * NOISE_DURATION);
    const buf = c.createBuffer(1, length, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buf;
  }

  function resume() {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
    if (!noiseBuffer) buildBuffer(c);
  }

  function click(isDownbeat = false) {
    const c = getCtx();
    if (!noiseBuffer) buildBuffer(c);
    const now = c.currentTime;

    const src = c.createBufferSource();
    src.buffer = noiseBuffer;

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isDownbeat ? 1600 : 800;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + NOISE_DURATION);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    src.start(now);
    src.stop(now + NOISE_DURATION);
  }

  return { click, resume };
})();
