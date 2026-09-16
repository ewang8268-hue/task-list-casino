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

let spinning = false;

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
  await wait(reelIndex * 130);

  const steps = 9 + reelIndex * 3;
  for (let step = 0; step < steps; step += 1) {
    renderReelWindow(reel, randomIndex(REEL_SYMBOLS.length));
    const slowFactor = step / Math.max(steps - 1, 1);
    await wait(55 + Math.round(110 * slowFactor * slowFactor) + reelIndex * 8);
  }

  reel.classList.add("settling");
  renderReelWindow(reel, REEL_SYMBOLS.indexOf(finalSymbol));
  await wait(260);
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
