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
  playTone(440, 0.18, "sine", 0.07);
  playTone(660, 0.22, "sine", 0.07, 0.12);
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
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function startSpinSound() {
  playTone(92, 0.45, "sawtooth", 0.045);
  playTone(138, 0.35, "triangle", 0.035, 0.08);
}

function playReelTick(reelIndex, step) {
  if (step % 2 !== 0) return;
  playTone(250 + reelIndex * 45, 0.045, "square", 0.028);
}

function playWinSound(winnings) {
  const notes = winnings >= 180 ? [523, 659, 784, 1047] : winnings >= 45 ? [440, 554, 659] : [330, 392];
  notes.forEach((note, index) => playTone(note, 0.22, "sine", winnings >= 180 ? 0.085 : 0.055, index * 0.11));
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
