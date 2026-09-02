(function () {
  const STORAGE_KEY = "jackpot-chores-state";
  const REEL_SYMBOLS = [
    { id: "7", label: "Lucky 7", type: "text" },
    { id: "STAR", label: "Star", type: "text" },
    { id: "DIAMOND", label: "Diamond", type: "image", src: "./assets/diamond.svg" },
    { id: "BAR", label: "Bar", type: "text" },
    { id: "CHERRY", label: "Cherries", type: "image", src: "./assets/cherries.svg" },
    { id: "$", label: "Cash", type: "text" },
  ];
  const SYMBOL_ORDER = new Map(REEL_SYMBOLS.map((symbol, index) => [symbol.id, index]));

  const rewardTiers = [
    { threshold: 400, text: "400 coins: You have enough to plan a bigger real-life reward, like dinner out or a fun weekend activity." },
    { threshold: 260, text: "260 coins: You could cash this in as motivation for takeout, a movie night, or a hobby splurge." },
    { threshold: 160, text: "160 coins: This is a great point for a coffee run, dessert, or a small personal treat." },
    { threshold: 80, text: "80 coins: Mini reward unlocked. Consider a snack, break, or tiny treat you've wanted." },
    { threshold: 0, text: "Hit 80 coins to unlock your first real-life reward suggestion." },
  ];
  const RANDOM_TASKS = [
    "Wipe down the kitchen counters",
    "Fold and put away a load of laundry",
    "Take a 10-minute walk",
    "Reply to one overdue message",
    "Refill your water bottle",
    "Clear off your desk",
    "Vacuum one room",
    "Stretch for five minutes",
    "Take out the recycling",
    "Put away five things",
    "Review tomorrow's calendar",
    "Make your bed",
    "Tidy the bathroom sink",
    "Sort one small pile of papers",
    "Prep one healthy snack",
    "Water the plants",
    "Empty the dishwasher",
    "Do a quick budget check",
  ];

  const defaultState = {
    tasks: [
      { id: crypto.randomUUID(), title: "Do the dishes" },
      { id: crypto.randomUUID(), title: "Answer two important emails" },
      { id: crypto.randomUUID(), title: "Take out the trash" },
    ],
    wishlist: [
      { id: crypto.randomUUID(), title: "Fancy coffee run", value: 80 },
      { id: crypto.randomUUID(), title: "New game", value: 250 },
    ],
    spinBank: 0,
    coinBalance: 0,
    clearedTasks: 0,
    budgetCheckIn: {
      lastDate: null,
      streak: 0,
    },
  };

  const state = loadState();

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
      // Ignore storage limits on file previews.
    }
  }

  function loadState() {
    const saved = safeStorageGet(STORAGE_KEY);
    if (!saved) {
      return structuredClone(defaultState);
    }

    try {
      const parsed = JSON.parse(saved);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : structuredClone(defaultState.tasks),
        wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : structuredClone(defaultState.wishlist),
        spinBank: Number.isFinite(parsed.spinBank) ? parsed.spinBank : 0,
        coinBalance: Number.isFinite(parsed.coinBalance) ? parsed.coinBalance : 0,
        clearedTasks: Number.isFinite(parsed.clearedTasks) ? parsed.clearedTasks : 0,
        budgetCheckIn: {
          lastDate: typeof parsed.budgetCheckIn?.lastDate === "string" ? parsed.budgetCheckIn.lastDate : null,
          streak: Number.isFinite(parsed.budgetCheckIn?.streak) ? parsed.budgetCheckIn.streak : 0,
        },
      };
    } catch {
      return structuredClone(defaultState);
    }
  }

  function persist() {
    safeStorageSet(STORAGE_KEY, JSON.stringify(state));
  }

  function getState() {
    return state;
  }

  function addTask(title) {
    state.tasks.unshift({ id: crypto.randomUUID(), title });
    persist();
  }

  function addRandomTask() {
    const existingTitles = new Set(state.tasks.map((task) => task.title.toLowerCase()));
    const availableTasks = RANDOM_TASKS.filter((title) => !existingTitles.has(title.toLowerCase()));
    const taskTitle = availableTasks.length > 0
      ? availableTasks[randomIndex(availableTasks.length)]
      : RANDOM_TASKS[randomIndex(RANDOM_TASKS.length)];

    addTask(taskTitle);
    return taskTitle;
  }

  function deleteTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    persist();
  }

  function completeTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    state.clearedTasks += 1;
    state.spinBank += 3;
    persist();
  }

  function addWishlist(title, value) {
    state.wishlist.unshift({ id: crypto.randomUUID(), title, value });
    sortWishlist();
    persist();
  }

  function deleteWishlist(itemId) {
    state.wishlist = state.wishlist.filter((item) => item.id !== itemId);
    persist();
  }

  function claimWishlist(itemId) {
    const item = state.wishlist.find((entry) => entry.id === itemId);
    if (!item || item.value > state.coinBalance) {
      return null;
    }

    state.coinBalance -= item.value;
    state.wishlist = state.wishlist.filter((entry) => entry.id !== item.id);
    persist();
    return item;
  }

  function checkInBudgetReview() {
    const status = getBudgetCheckInStatus();
    if (status.checkedInToday) {
      return status;
    }

    if (status.daysSinceLastCheckIn === 1) {
      state.budgetCheckIn.streak += 1;
    } else {
      state.budgetCheckIn.streak = 1;
    }

    state.budgetCheckIn.lastDate = getTodayDateKey();
    persist();
    return getBudgetCheckInStatus();
  }

  function spendSpinAndPlay() {
    if (state.spinBank < 1) {
      return null;
    }

    state.spinBank -= 1;
    const result = Array.from({ length: 3 }, () => REEL_SYMBOLS[randomIndex(REEL_SYMBOLS.length)]);
    const winnings = calculateWinnings(result);
    state.coinBalance += winnings;
    persist();
    return { result, winnings };
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

  function getRewardSuggestionText() {
    const ready = [...state.wishlist].sort((a, b) => a.value - b.value).find((item) => item.value <= state.coinBalance);
    if (ready) {
      return `Wishlist ready: ${ready.title} is covered by your current balance of ${state.coinBalance} coins.`;
    }

    const next = [...state.wishlist].sort((a, b) => a.value - b.value).find((item) => item.value > state.coinBalance);
    if (next) {
      return `${next.title} is your next wishlist target. You need ${next.value - state.coinBalance} more coins.`;
    }

    return rewardTiers.find((tier) => state.coinBalance >= tier.threshold).text;
  }

  function getWishlistHighlight() {
    if (state.wishlist.length === 0) {
      return {
        title: "No wishlist items yet",
        copy: "Add something you want, give it a coin value, and this page will track when your winnings can cover it.",
      };
    }

    const sorted = [...state.wishlist].sort((a, b) => a.value - b.value);
    const reachable = sorted.filter((item) => item.value <= state.coinBalance);
    if (reachable.length > 0) {
      const best = reachable[reachable.length - 1];
      return {
        title: `${best.title} is unlocked`,
        copy: `Your ${state.coinBalance} coins can cover this ${best.value}-coin reward. Time to treat yourself in real life if you want to.`,
      };
    }

    const next = sorted[0];
    return {
      title: next.title,
      copy: `This reward costs ${next.value} coins. You are ${next.value - state.coinBalance} coins away.`,
    };
  }

  function getBudgetCheckInStatus() {
    const lastDate = state.budgetCheckIn?.lastDate ?? null;
    const streak = Number.isFinite(state.budgetCheckIn?.streak) ? state.budgetCheckIn.streak : 0;
    const todayKey = getTodayDateKey();
    const daysSinceLastCheckIn = lastDate ? diffDateKeys(lastDate, todayKey) : null;
    const checkedInToday = daysSinceLastCheckIn === 0;
    const streakActive = checkedInToday || daysSinceLastCheckIn === 1;
    const currentStreak = streakActive ? streak : 0;
    const nextCheckInDate = formatDateLabel(addDaysToDateKey(todayKey, 1));

    let headline = "Tap in for today’s budget review";
    let detail = "One tap confirms today’s budget review and keeps your money streak moving.";

    if (checkedInToday) {
      headline = "Today’s budget review is locked in";
      detail = `Your streak is safe. Your next check-in opens ${nextCheckInDate}.`;
    } else if (daysSinceLastCheckIn === 1) {
      headline = "Streak is ready to continue";
      detail = "Hit the button once and today’s review will keep the streak alive.";
    } else if (streak > 0) {
      headline = "Fresh check-in starts a new streak";
      detail = "You missed a day, so today’s tap will restart the streak from 1.";
    }

    return {
      checkedInToday,
      currentStreak,
      nextCheckInDate,
      lastDate,
      daysSinceLastCheckIn,
      headline,
      detail,
      buttonLabel: checkedInToday ? "Checked In Today" : "Confirm Today’s Review",
    };
  }

  function renderSharedStats() {
    const container = document.getElementById("sharedStats");
    if (!container) {
      return;
    }

    container.innerHTML = `
      <article class="stat-card">
        <span class="stat-label">Spin Bank</span>
        <strong>${state.spinBank}</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Coin Balance</span>
        <strong>${state.coinBalance}</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Tasks Cleared</span>
        <strong>${state.clearedTasks}</strong>
      </article>
    `;
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

  function renderReelSymbol(reel, symbol) {
    if (symbol.type === "image") {
      reel.innerHTML = `<div class="reel-face"><img class="reel-icon" src="${symbol.src}" alt="${symbol.label}" /></div>`;
      return;
    }

    reel.innerHTML = `<div class="reel-face"><span class="reel-token ${getTokenClass(symbol.id)}">${getTokenDisplay(symbol.id)}</span></div>`;
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

  function buildOutcomeCombos() {
    const outcomes = [];
    for (const first of REEL_SYMBOLS) {
      for (const second of REEL_SYMBOLS) {
        for (const third of REEL_SYMBOLS) {
          const symbols = [first, second, third];
          outcomes.push({ symbols, winnings: calculateWinnings(symbols) });
        }
      }
    }

    outcomes.sort((a, b) => b.winnings - a.winnings || a.symbols.map((symbol) => symbol.id).join("-").localeCompare(b.symbols.map((symbol) => symbol.id).join("-")));
    return outcomes;
  }

  function buildGroupedOutcomeCombos() {
    const categoryBlueprints = [
      {
        key: "three-kind",
        label: "3 of a kind",
        symbols: ["STAR", "STAR", "STAR"],
      },
      {
        key: "two-kind",
        label: "2 of a kind",
        symbols: ["DIAMOND", "DIAMOND", "BAR"],
      },
      {
        key: "with-seven",
        label: "1 of a kind with 7",
        symbols: ["7", "STAR", "$"],
      },
      {
        key: "without-seven",
        label: "1 of a kind without 7",
        symbols: ["STAR", "BAR", "$"],
      },
    ];

    const groups = new Map(
      categoryBlueprints.map((group) => [
        group.key,
        {
          key: group.key,
          label: group.label,
          symbols: group.symbols.map((symbolId) => REEL_SYMBOLS.find((symbol) => symbol.id === symbolId)),
          ways: 0,
          minWinnings: Number.POSITIVE_INFINITY,
          maxWinnings: Number.NEGATIVE_INFINITY,
        },
      ]),
    );

    for (const outcome of buildOutcomeCombos()) {
      const key = categorizeOutcome(outcome.symbols);
      const group = groups.get(key);
      if (!group) {
        continue;
      }

      group.ways += 1;
      group.minWinnings = Math.min(group.minWinnings, outcome.winnings);
      group.maxWinnings = Math.max(group.maxWinnings, outcome.winnings);
    }

    return categoryBlueprints
      .map((blueprint) => groups.get(blueprint.key))
      .filter((group) => group && group.ways > 0)
      .map((group) => ({
        ...group,
        winnings: group.minWinnings === group.maxWinnings
          ? `${group.maxWinnings}`
          : `${group.minWinnings}-${group.maxWinnings}`,
      }));
  }

  function categorizeOutcome(symbols) {
    const [a, b, c] = symbols.map((symbol) => symbol.id);
    if (a === b && b === c) {
      return "three-kind";
    }
    if (a === b || b === c || a === c) {
      return "two-kind";
    }
    if (symbols.some((symbol) => symbol.id === "7")) {
      return "with-seven";
    }
    return "without-seven";
  }

  function describeGroupedOutcome(group) {
    return group.label;
  }

  function sortWishlist() {
    state.wishlist.sort((a, b) => a.value - b.value);
  }

  function randomIndex(max) {
    return Math.floor(Math.random() * max);
  }

  function getTodayDateKey() {
    return createDateKey(new Date());
  }

  function createDateKey(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map((value) => Number.parseInt(value, 10));
    return new Date(year, month - 1, day);
  }

  function addDaysToDateKey(dateKey, days) {
    const date = parseDateKey(dateKey);
    date.setDate(date.getDate() + days);
    return createDateKey(date);
  }

  function diffDateKeys(fromDateKey, toDateKey) {
    const from = parseDateKey(fromDateKey);
    const to = parseDateKey(toDateKey);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.round((to - from) / millisecondsPerDay);
  }

  function formatDateLabel(dateKey) {
    return parseDateKey(dateKey).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  window.JackpotApp = {
    REEL_SYMBOLS,
    addTask,
    addRandomTask,
    addWishlist,
    buildOutcomeCombos,
    buildGroupedOutcomeCombos,
    checkInBudgetReview,
    claimWishlist,
    completeTask,
    createMiniSymbolNode,
    deleteTask,
    deleteWishlist,
    describeGroupedOutcome,
    getBudgetCheckInStatus,
    getRewardSuggestionText,
    getState,
    getTokenDisplay,
    getTokenClass,
    getWishlistHighlight,
    persist,
    randomIndex,
    renderReelSymbol,
    renderSharedStats,
    spendSpinAndPlay,
    wait,
  };
})();
