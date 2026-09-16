const STORAGE_KEY = "jackpot-chores-state";
const REEL_SYMBOLS = [
  { id: "7", label: "Lucky 7", type: "text" },
  { id: "STAR", label: "Star", type: "text" },
  { id: "DIAMOND", label: "Diamond", type: "image", src: "./assets/diamond.svg" },
  { id: "BAR", label: "Bar", type: "text" },
  { id: "CHERRY", label: "Cherries", type: "image", src: "./assets/cherries.svg" },
  { id: "$", label: "Cash", type: "text" },
];

const rewardTiers = [
  { threshold: 400, text: "400 coins: You have enough to plan a bigger real-life reward, like dinner out or a fun weekend activity." },
  { threshold: 260, text: "260 coins: You could cash this in as motivation for takeout, a movie night, or a hobby splurge." },
  { threshold: 160, text: "160 coins: This is a great point for a coffee run, dessert, or a small personal treat." },
  { threshold: 80, text: "80 coins: Mini reward unlocked. Consider a snack, break, or tiny treat you've wanted." },
  { threshold: 0, text: "Hit 80 coins to unlock your first real-life reward suggestion." },
];

const defaultTasks = [
  { id: crypto.randomUUID(), title: "Do the dishes" },
  { id: crypto.randomUUID(), title: "Answer two important emails" },
  { id: crypto.randomUUID(), title: "Take out the trash" },
];

const defaultWishlist = [
  { id: crypto.randomUUID(), title: "Fancy coffee run", value: 80 },
  { id: crypto.randomUUID(), title: "New game", value: 250 },
];

const state = loadState();

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const taskItemTemplate = document.getElementById("taskItemTemplate");
const wishlistForm = document.getElementById("wishlistForm");
const wishlistName = document.getElementById("wishlistName");
const wishlistValue = document.getElementById("wishlistValue");
const wishlistList = document.getElementById("wishlistList");
const wishlistItemTemplate = document.getElementById("wishlistItemTemplate");
const wishlistHighlightTitle = document.getElementById("wishlistHighlightTitle");
const wishlistHighlightCopy = document.getElementById("wishlistHighlightCopy");
const spinBankDisplay = document.getElementById("spinBankDisplay");
const spinBankInline = document.getElementById("spinBankInline");
const coinBalanceDisplay = document.getElementById("coinBalanceDisplay");
const clearedTasksDisplay = document.getElementById("clearedTasksDisplay");
const spinButton = document.getElementById("spinButton");
const slotMessage = document.getElementById("slotMessage");
const rewardSuggestion = document.getElementById("rewardSuggestion");
const rewardModal = document.getElementById("rewardModal");
const useSpinsNowButton = document.getElementById("useSpinsNowButton");
const collectLaterButton = document.getElementById("collectLaterButton");
const claimModal = document.getElementById("claimModal");
const claimTitle = document.getElementById("claimTitle");
const claimCopy = document.getElementById("claimCopy");
const confirmClaimButton = document.getElementById("confirmClaimButton");
const cancelClaimButton = document.getElementById("cancelClaimButton");
const reelRow = document.getElementById("reelRow");
const reels = Array.from(document.querySelectorAll(".reel"));
const allOutcomesList = document.getElementById("allOutcomesList");
const outcomeCount = document.getElementById("outcomeCount");
const outcomeItemTemplate = document.getElementById("outcomeItemTemplate");

let spinning = false;
let pendingClaimId = null;
recoverTaskFromQuery();
setInitialReels();
renderAllOutcomes();
render();

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskInput.value.trim();
  if (!title) {
    return;
  }

  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
  });

  taskInput.value = "";
  persist();
  renderTasks();
});

wishlistForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = wishlistName.value.trim();
  const value = Number.parseInt(wishlistValue.value, 10);

  if (!title || !Number.isFinite(value) || value < 1) {
    return;
  }

  state.wishlist.unshift({
    id: crypto.randomUUID(),
    title,
    value,
  });

  wishlistName.value = "";
  wishlistValue.value = "";
  persist();
  renderWishlist();
  updateDisplays();
});

spinButton.addEventListener("click", async () => {
  if (spinning || state.spinBank < 1) {
    return;
  }

  await spendSpinAndPlay();
});

useSpinsNowButton.addEventListener("click", async () => {
  closeRewardModal();
  document.querySelector(".game-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  pulseSlotMachine();
  await autoplayRewardSpins(3);
});

collectLaterButton.addEventListener("click", () => {
  closeRewardModal();
  slotMessage.textContent = `Nice. ${state.spinBank} spin${state.spinBank === 1 ? "" : "s"} waiting in your bank for later.`;
});

rewardModal.addEventListener("click", (event) => {
  if (event.target === rewardModal) {
    closeRewardModal();
  }
});

claimModal.addEventListener("click", (event) => {
  if (event.target === claimModal) {
    closeClaimModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!rewardModal.classList.contains("hidden")) {
      closeRewardModal();
    }

    if (!claimModal.classList.contains("hidden")) {
      closeClaimModal();
    }
  }
});

confirmClaimButton.addEventListener("click", () => {
  claimWishlistReward();
});

cancelClaimButton.addEventListener("click", () => {
  closeClaimModal();
});

function loadState() {
  const saved = safeStorageGet(STORAGE_KEY);

  if (!saved) {
    return {
      tasks: defaultTasks,
      wishlist: defaultWishlist,
      spinBank: 0,
      coinBalance: 0,
      clearedTasks: 0,
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaultTasks,
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : defaultWishlist,
      spinBank: Number.isFinite(parsed.spinBank) ? parsed.spinBank : 0,
      coinBalance: Number.isFinite(parsed.coinBalance) ? parsed.coinBalance : 0,
      clearedTasks: Number.isFinite(parsed.clearedTasks) ? parsed.clearedTasks : 0,
    };
  } catch {
    return {
      tasks: defaultTasks,
      wishlist: defaultWishlist,
      spinBank: 0,
      coinBalance: 0,
      clearedTasks: 0,
    };
  }
}

function persist() {
  safeStorageSet(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderTasks();
  renderWishlist();
  updateDisplays();
}

function renderTasks() {
  taskList.innerHTML = "";

  if (state.tasks.length === 0) {
    const emptyCard = document.createElement("li");
    emptyCard.className = "task-item";
    emptyCard.innerHTML = `
      <div class="task-copy">
        <span class="task-title">No tasks on the board.</span>
        <span class="task-reward">Add one above and start stacking spins.</span>
      </div>
    `;
    taskList.append(emptyCard);
    return;
  }

  for (const task of state.tasks) {
    const taskNode = taskItemTemplate.content.firstElementChild.cloneNode(true);
    taskNode.querySelector(".task-title").textContent = task.title;

    taskNode.querySelector(".complete-task").addEventListener("click", () => {
      completeTask(task.id);
    });

    taskNode.querySelector(".delete-task").addEventListener("click", () => {
      deleteTask(task.id);
    });

    taskList.append(taskNode);
  }
}

function updateDisplays() {
  spinBankDisplay.textContent = state.spinBank;
  spinBankInline.textContent = `${state.spinBank} spin${state.spinBank === 1 ? "" : "s"} ready`;
  coinBalanceDisplay.textContent = state.coinBalance;
  clearedTasksDisplay.textContent = state.clearedTasks;
  spinButton.disabled = state.spinBank < 1 || spinning;
  rewardSuggestion.textContent = getRewardSuggestionText();
  updateWishlistHighlight();
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  persist();
  renderTasks();
}

function renderWishlist() {
  taskAwareWishlistSort();
  wishlistList.innerHTML = "";

  if (state.wishlist.length === 0) {
    const emptyCard = document.createElement("li");
    emptyCard.className = "wishlist-item";
    emptyCard.innerHTML = `
      <div class="wishlist-copy">
        <span class="wishlist-title">No wishlist prizes yet.</span>
        <span class="wishlist-meta">Add a reward target and give it a coin value.</span>
      </div>
    `;
    wishlistList.append(emptyCard);
    return;
  }

  for (const item of state.wishlist) {
    const itemNode = wishlistItemTemplate.content.firstElementChild.cloneNode(true);
    const remaining = item.value - state.coinBalance;
    const affordable = remaining <= 0;

    itemNode.querySelector(".wishlist-title").textContent = item.title;
    itemNode.querySelector(".wishlist-meta").textContent = `${item.value} coins target`;

    const statusNode = itemNode.querySelector(".wishlist-status");
    statusNode.textContent = affordable ? "Ready to claim" : `${remaining} coins to go`;
    statusNode.classList.toggle("ready", affordable);
    statusNode.disabled = !affordable;

    if (affordable) {
      statusNode.addEventListener("click", () => {
        openClaimModal(item.id);
      });
    }

    itemNode.querySelector(".delete-wishlist").addEventListener("click", () => {
      deleteWishlistItem(item.id);
    });

    wishlistList.append(itemNode);
  }
}

function deleteWishlistItem(itemId) {
  state.wishlist = state.wishlist.filter((item) => item.id !== itemId);
  persist();
  renderWishlist();
  updateDisplays();
}

function completeTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  state.clearedTasks += 1;
  state.spinBank += 3;

  persist();
  render();
  openRewardModal();
}

function openRewardModal() {
  rewardModal.classList.remove("hidden");
  useSpinsNowButton.focus();
}

function closeRewardModal() {
  rewardModal.classList.add("hidden");
}

function openClaimModal(itemId) {
  const item = state.wishlist.find((entry) => entry.id === itemId);
  if (!item || item.value > state.coinBalance) {
    return;
  }

  pendingClaimId = itemId;
  claimTitle.textContent = `Claim ${item.title}?`;
  claimCopy.textContent = `You have ${state.coinBalance} coins, which covers this ${item.value}-coin reward. This app will not buy it for you, but if you grab it in real life, you can spend the coins here to log the claim.`;
  claimModal.classList.remove("hidden");
  confirmClaimButton.focus();
}

function closeClaimModal() {
  claimModal.classList.add("hidden");
  pendingClaimId = null;
}

function pulseSlotMachine() {
  reelRow.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.03)" },
      { transform: "scale(1)" },
    ],
    { duration: 600, easing: "ease-out" },
  );
}

async function spinOnce() {
  spinning = true;
  spinButton.disabled = true;
  slotMessage.textContent = "Reels spinning... let the chore jackpot hit.";
  reels.forEach((reel) => reel.classList.add("spinning"));

  for (let i = 0; i < 14; i += 1) {
    reels.forEach((reel) => {
      renderReelSymbol(reel, REEL_SYMBOLS[randomIndex(REEL_SYMBOLS.length)]);
    });

    await wait(90 + i * 10);
  }

  const result = Array.from({ length: 3 }, () => REEL_SYMBOLS[randomIndex(REEL_SYMBOLS.length)]);
  reels.forEach((reel, index) => {
    renderReelSymbol(reel, result[index]);
    reel.classList.remove("spinning");
  });

  const winnings = calculateWinnings(result);
  state.coinBalance += winnings;
  persist();
  updateDisplays();

  slotMessage.textContent = buildResultMessage(result, winnings);
  spinning = false;
  spinButton.disabled = state.spinBank < 1;
}

async function spendSpinAndPlay() {
  if (spinning || state.spinBank < 1) {
    return;
  }

  state.spinBank -= 1;
  persist();
  updateDisplays();
  await spinOnce();
}

async function autoplayRewardSpins(count) {
  const turns = Math.min(count, state.spinBank);

  for (let i = 0; i < turns; i += 1) {
    await spendSpinAndPlay();
    await wait(260);
  }
}

function calculateWinnings(result) {
  const [a, b, c] = result.map((symbol) => symbol.id);

  if (a === "7" && b === "7" && c === "7") {
    return 180;
  }

  if (a === b && b === c) {
    return 100;
  }

  if (a === b || b === c || a === c) {
    return 45;
  }

  if (result.some((symbol) => symbol.id === "7")) {
    return 25;
  }

  return 12;
}

function buildResultMessage(result, winnings) {
  const icons = result.map((symbol) => symbol.id).join(" | ");
  const nextReward = getNextRewardTier();

  if (winnings >= 100) {
    return `${icons}! Jackpot energy. You won ${winnings} coins.`;
  }

  if (winnings >= 45) {
    return `${icons}! Solid hit. You won ${winnings} coins.`;
  }

  if (nextReward) {
    return `${icons}. You won ${winnings} coins. Keep stacking toward ${nextReward.threshold} coins.`;
  }

  return `${icons}. You won ${winnings} coins and unlocked top-tier reward ideas.`;
}

function getNextRewardTier() {
  const ascendingTiers = [...rewardTiers].reverse().filter((tier) => tier.threshold > 0);
  return ascendingTiers.find((tier) => state.coinBalance < tier.threshold) ?? null;
}

function getRewardSuggestionText() {
  const wishlistReady = [...state.wishlist]
    .sort((a, b) => a.value - b.value)
    .find((item) => item.value <= state.coinBalance);

  if (wishlistReady) {
    return `Wishlist ready: ${wishlistReady.title} is covered by your current balance of ${state.coinBalance} coins.`;
  }

  const nextWishlist = [...state.wishlist]
    .sort((a, b) => a.value - b.value)
    .find((item) => item.value > state.coinBalance);

  if (nextWishlist) {
    return `${nextWishlist.title} is your next wishlist target. You need ${nextWishlist.value - state.coinBalance} more coins.`;
  }

  return rewardTiers.find((tier) => state.coinBalance >= tier.threshold).text;
}

function updateWishlistHighlight() {
  if (state.wishlist.length === 0) {
    wishlistHighlightTitle.textContent = "No wishlist items yet";
    wishlistHighlightCopy.textContent = "Add something you want, give it a coin value, and this app will track when your winnings can cover it.";
    return;
  }

  const sorted = [...state.wishlist].sort((a, b) => a.value - b.value);
  const reachable = sorted.filter((item) => item.value <= state.coinBalance);
  const nextItem = sorted.find((item) => item.value > state.coinBalance) ?? sorted[sorted.length - 1];

  if (reachable.length > 0) {
    const best = reachable[reachable.length - 1];
    wishlistHighlightTitle.textContent = `${best.title} is unlocked`;
    wishlistHighlightCopy.textContent = `Your ${state.coinBalance} coins can cover this ${best.value}-coin reward. Time to treat yourself in real life if you want to.`;
    return;
  }

  wishlistHighlightTitle.textContent = nextItem.title;
  wishlistHighlightCopy.textContent = `This reward costs ${nextItem.value} coins. You are ${nextItem.value - state.coinBalance} coins away.`;
}

function taskAwareWishlistSort() {
  state.wishlist.sort((a, b) => a.value - b.value);
}

function randomIndex(max) {
  return Math.floor(Math.random() * max);
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function setInitialReels() {
  renderReelSymbol(reels[0], REEL_SYMBOLS[0]);
  renderReelSymbol(reels[1], REEL_SYMBOLS[4]);
  renderReelSymbol(reels[2], REEL_SYMBOLS[2]);
}

function renderReelSymbol(reel, symbol) {
  if (symbol.type === "image") {
    reel.innerHTML = `
      <div class="reel-face">
        <img class="reel-icon" src="${symbol.src}" alt="${symbol.label}" />
      </div>
    `;
    return;
  }

  const tokenClass = getTokenClass(symbol.id);
  const display = getTokenDisplay(symbol.id);
  reel.innerHTML = `
    <div class="reel-face">
      <span class="reel-token ${tokenClass}">${display}</span>
    </div>
  `;
}

function getTokenClass(symbolId) {
  if (symbolId === "7") {
    return "seven";
  }

  if (symbolId === "BAR") {
    return "bar";
  }

  if (symbolId === "STAR") {
    return "star";
  }

  return "cash";
}

function getTokenDisplay(symbolId) {
  if (symbolId === "STAR") {
    return "★";
  }

  return symbolId;
}

function renderAllOutcomes() {
  const outcomes = [];

  for (const first of REEL_SYMBOLS) {
    for (const second of REEL_SYMBOLS) {
      for (const third of REEL_SYMBOLS) {
        const symbols = [first, second, third];
        outcomes.push({
          symbols,
          winnings: calculateWinnings(symbols),
        });
      }
    }
  }

  outcomes.sort((a, b) => b.winnings - a.winnings || compareOutcomeIds(a.symbols, b.symbols));
  allOutcomesList.innerHTML = "";
  outcomeCount.textContent = `${outcomes.length} combos`;

  for (const outcome of outcomes) {
    const itemNode = outcomeItemTemplate.content.firstElementChild.cloneNode(true);
    const iconsNode = itemNode.querySelector(".outcome-icons");

    for (const symbol of outcome.symbols) {
      iconsNode.append(createMiniSymbolNode(symbol));
    }

    itemNode.querySelector(".outcome-coins").textContent = `${outcome.winnings}`;
    allOutcomesList.append(itemNode);
  }
}

function createMiniSymbolNode(symbol) {
  if (symbol.type === "image") {
    const image = document.createElement("img");
    image.className = "mini-icon";
    image.src = symbol.src;
    image.alt = symbol.label;
    return image;
  }

  const token = document.createElement("span");
  token.className = `mini-token ${getTokenClass(symbol.id)}`;
  token.textContent = getTokenDisplay(symbol.id);
  return token;
}

function compareOutcomeIds(left, right) {
  const leftId = left.map((symbol) => symbol.id).join("-");
  const rightId = right.map((symbol) => symbol.id).join("-");
  return leftId.localeCompare(rightId);
}

function claimWishlistReward() {
  const item = state.wishlist.find((entry) => entry.id === pendingClaimId);
  if (!item || item.value > state.coinBalance) {
    closeClaimModal();
    return;
  }

  state.coinBalance -= item.value;
  state.wishlist = state.wishlist.filter((entry) => entry.id !== item.id);
  persist();
  renderWishlist();
  updateDisplays();
  slotMessage.textContent = `Reward claimed: ${item.title} for ${item.value} coins. Enjoy the real-life treat.`;
  closeClaimModal();
}

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // File-based previews can block localStorage. The app still works for the session.
  }
}

function recoverTaskFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const taskFromQuery = params.get("task")?.trim();

  if (!taskFromQuery) {
    return;
  }

  state.tasks.unshift({
    id: crypto.randomUUID(),
    title: taskFromQuery,
  });

  persist();
  params.delete("task");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
}
