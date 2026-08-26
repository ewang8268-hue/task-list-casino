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
    const groups = new Map();

    for (const outcome of buildOutcomeCombos()) {
      const sortedSymbols = [...outcome.symbols].sort(
        (a, b) => SYMBOL_ORDER.get(a.id) - SYMBOL_ORDER.get(b.id),
      );
      const key = sortedSymbols.map((symbol) => symbol.id).join("-");
      const existing = groups.get(key);

      if (existing) {
        existing.ways += 1;
        continue;
      }

      groups.set(key, {
        key,
        symbols: sortedSymbols,
        winnings: outcome.winnings,
        ways: 1,
      });
    }

    return [...groups.values()].sort(
      (a, b) => b.winnings - a.winnings || b.ways - a.ways || a.key.localeCompare(b.key),
    );
  }

  function describeGroupedOutcome(group) {
    const counts = new Map();
    for (const symbol of group.symbols) {
      counts.set(symbol.id, (counts.get(symbol.id) || 0) + 1);
    }

    const parts = [...counts.entries()]
      .sort((a, b) => SYMBOL_ORDER.get(a[0]) - SYMBOL_ORDER.get(b[0]))
      .map(([symbolId, count]) => {
        const symbol = REEL_SYMBOLS.find((entry) => entry.id === symbolId);
        if (!symbol) {
          return "";
        }
        return count === 1 ? symbol.label : `${count} ${symbol.label}`;
      })
      .filter(Boolean);

    if (parts.length === 1) {
      return `${parts[0]} only`;
    }

    return `${parts.join(" + ")} in any order`;
  }

  function sortWishlist() {
    state.wishlist.sort((a, b) => a.value - b.value);
  }

  function randomIndex(max) {
    return Math.floor(Math.random() * max);
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  window.JackpotApp = {
    REEL_SYMBOLS,
    addTask,
    addWishlist,
    buildOutcomeCombos,
    buildGroupedOutcomeCombos,
    claimWishlist,
    completeTask,
    createMiniSymbolNode,
    deleteTask,
    deleteWishlist,
    describeGroupedOutcome,
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
