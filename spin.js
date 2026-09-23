const {
  REEL_SYMBOLS,
  buildGroupedOutcomeCombos,
  createMiniSymbolNode,
  describeGroupedOutcome,
  getRewardSuggestionText,
  getState,
  randomIndex,
  renderReelSymbol,
  renderSharedStats,
  spendSpinAndPlay,
  wait,
} = window.JackpotApp;

const spinButton = document.getElementById("spinButton");
const spinBankInline = document.getElementById("spinBankInline");
const slotMessage = document.getElementById("slotMessage");
const rewardSuggestion = document.getElementById("rewardSuggestion");
const reels = Array.from(document.querySelectorAll(".reel"));
const allOutcomesList = document.getElementById("allOutcomesList");
const outcomeCount = document.getElementById("outcomeCount");
const outcomeItemTemplate = document.getElementById("outcomeItemTemplate");
const jackpotCelebration = document.getElementById("jackpotCelebration");
const celebrationConfetti = document.getElementById("celebrationConfetti");
const celebrationCopy = document.getElementById("celebrationCopy");
const soundButton = document.getElementById("soundButton");

let spinning = false;
let audioContext = null;
let audioBus = null;
let celebrationTimer = null;

setInitialReels();
renderPage();
renderOutcomes();
maybeAutoplay();

spinButton.addEventListener("click", async () => {
  if (spinning) {
    return;
  }
  await playSpin();
});

soundButton.addEventListener("click", () => {
  getAudioContext();
  startSpinSound();
  playReelTick(0, 0);
  playReelTick(1, 2);
  playReelTick(2, 4);
  playWinSound(180);
  soundButton.textContent = "🔊 Sound Working";
  window.setTimeout(() => { soundButton.textContent = "🔊 Test Sound"; }, 1200);
});

function renderPage() {
  const state = getState();
  renderSharedStats();
  spinBankInline.textContent = `${state.spinBank} spin${state.spinBank === 1 ? "" : "s"} ready`;
  rewardSuggestion.textContent = getRewardSuggestionText();
  spinButton.disabled = state.spinBank < 1 || spinning;
}

async function playSpin() {
  const state = getState();
  if (state.spinBank < 1) {
    return;
  }

  spinning = true;
  startSpinSound();
  renderPage();
  slotMessage.textContent = "Reels spinning... let the chore jackpot hit.";
  reels.forEach((reel) => {
    reel.classList.add("spinning");
    reel.classList.remove("settling");
  });

  const outcome = spendSpinAndPlay();
  if (outcome) {
    await Promise.all(
      reels.map((reel, index) => spinSingleReel(reel, outcome.result[index], index)),
    );
    slotMessage.textContent = `${outcome.result.map((symbol) => symbol.label).join(" • ")}. You won ${outcome.winnings} coins.`;
    playWinSound(outcome.winnings);
    if (outcome.winnings >= 180) {
      showJackpotCelebration(outcome.winnings);
    }
  }

  reels.forEach((reel) => {
    reel.classList.remove("spinning");
    reel.classList.remove("settling");
  });
  spinning = false;
  renderPage();
}

function setInitialReels() {
  [0, 4, 2].forEach((symbolIndex, reelIndex) => {
    renderReelWindow(reels[reelIndex], symbolIndex);
  });
}

function renderOutcomes() {
  const outcomes = buildGroupedOutcomeCombos();
  outcomeCount.textContent = `${outcomes.length} groups`;
  allOutcomesList.innerHTML = "";

  for (const outcome of outcomes) {
    const node = outcomeItemTemplate.content.firstElementChild.cloneNode(true);
    const icons = node.querySelector(".outcome-icons");
    for (const symbol of outcome.symbols) {
      icons.append(createMiniSymbolNode(symbol));
    }
    node.querySelector(".outcome-note").textContent = describeGroupedOutcome(outcome);
    node.querySelector(".outcome-ways").textContent = `${outcome.ways} way${outcome.ways === 1 ? "" : "s"}`;
    node.querySelector(".outcome-coins").textContent = `${outcome.winnings}`;
    allOutcomesList.append(node);
  }
}

async function spinSingleReel(reel, finalSymbol, reelIndex) {
  await wait(reelIndex * 180);

  const steps = 18 + reelIndex * 5;
  for (let step = 0; step < steps; step += 1) {
    renderReelWindow(reel, randomIndex(REEL_SYMBOLS.length));
    playReelTick(reelIndex, step);
    const slowFactor = step / Math.max(steps - 1, 1);
    await wait(42 + Math.round(150 * slowFactor * slowFactor) + reelIndex * 12);
  }

  reel.classList.add("settling");
  renderReelWindow(reel, REEL_SYMBOLS.indexOf(finalSymbol));
  await wait(260);
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  if (!audioBus) {
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    audioBus = audioContext.createGain();
    audioBus.gain.value = 1.35;
    audioBus.connect(compressor).connect(audioContext.destination);
  }
  return audioContext;
}

function playTone(frequency, duration, type = "sine", volume = 0.055, delay = 0) {
  const context = getAudioContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audioBus);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playNoise(duration, volume = 0.08, delay = 0, filterType = "bandpass", frequency = 1200) {
  const context = getAudioContext();
  if (!context) return;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = 1.4;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(audioBus);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function startSpinSound() {
  playNoise(0.5, 0.12, 0, "lowpass", 520);
  playTone(72, 0.55, "sawtooth", 0.065);
  playTone(118, 0.42, "triangle", 0.045, 0.08);
}

function playReelTick(reelIndex, step) {
  if (step % 2 !== 0) return;
  const delay = reelIndex * 0.02;
  playNoise(0.035, 0.055, delay, "bandpass", 1500 + reelIndex * 160);
  playTone(280 + reelIndex * 55, 0.055, "square", 0.04, delay);
}

function playWinSound(winnings) {
  const notes = winnings >= 180 ? [523, 659, 784, 1047, 1319] : winnings >= 45 ? [440, 554, 659] : [330, 392];
  notes.forEach((note, index) => playTone(note, 0.24, "sine", winnings >= 180 ? 0.11 : 0.07, index * 0.11));
  if (winnings >= 180) {
    [0, 0.13, 0.26, 0.39].forEach((delay) => playNoise(0.06, 0.07, delay, "highpass", 2600));
  }
}

function showJackpotCelebration(winnings) {
  window.clearTimeout(celebrationTimer);
  celebrationCopy.textContent = `${winnings} coins are yours.`;
  celebrationConfetti.innerHTML = Array.from({ length: 28 }, (_, index) => `<i style="--i:${index}"></i>`).join("");
  jackpotCelebration.classList.remove("hidden");
  celebrationTimer = window.setTimeout(() => jackpotCelebration.classList.add("hidden"), 3200);
}

function renderReelWindow(reel, centerIndex) {
  const total = REEL_SYMBOLS.length;
  const previous = REEL_SYMBOLS[(centerIndex - 1 + total) % total];
  const current = REEL_SYMBOLS[centerIndex];
  const next = REEL_SYMBOLS[(centerIndex + 1) % total];

  reel.dataset.symbolIndex = `${centerIndex}`;
  reel.innerHTML = `
    <div class="reel-window">
      ${renderReelFace(previous, "reel-previous")}
      ${renderReelFace(current, "reel-current")}
      ${renderReelFace(next, "reel-next")}
    </div>
  `;
}

function renderReelFace(symbol, className) {
  const content = symbol.type === "image"
    ? `<img class="reel-icon" src="${symbol.src}" alt="${symbol.label}" />`
    : `<span class="reel-token ${getTokenClass(symbol.id)}">${getTokenDisplay(symbol.id)}</span>`;
  return `<div class="reel-face ${className}">${content}</div>`;
}

function getTokenClass(symbolId) {
  if (symbolId === "7") return "seven";
  if (symbolId === "BAR") return "bar";
  if (symbolId === "STAR") return "star";
  return "cash";
}

function getTokenDisplay(symbolId) {
  return symbolId === "STAR" ? "★" : symbolId;
}

async function maybeAutoplay() {
  const params = new URLSearchParams(window.location.search);
  const count = Number.parseInt(params.get("autoplay") || "0", 10);
  if (!count || count < 1) {
    return;
  }

  params.delete("autoplay");
  const nextQuery = params.toString();
  window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);

  for (let i = 0; i < count; i += 1) {
    if (getState().spinBank < 1) {
      break;
    }
    await playSpin();
    await wait(260);
  }
}
