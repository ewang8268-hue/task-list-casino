const {
  addWishlist,
  claimWishlist,
  deleteWishlist,
  getState,
  getWishlistHighlight,
  renderSharedStats,
} = window.JackpotApp;

const wishlistForm = document.getElementById("wishlistForm");
const wishlistName = document.getElementById("wishlistName");
const wishlistValue = document.getElementById("wishlistValue");
const wishlistList = document.getElementById("wishlistList");
const wishlistItemTemplate = document.getElementById("wishlistItemTemplate");
const wishlistHighlightTitle = document.getElementById("wishlistHighlightTitle");
const wishlistHighlightCopy = document.getElementById("wishlistHighlightCopy");
const claimModal = document.getElementById("claimModal");
const claimTitle = document.getElementById("claimTitle");
const claimCopy = document.getElementById("claimCopy");
const confirmClaimButton = document.getElementById("confirmClaimButton");
const cancelClaimButton = document.getElementById("cancelClaimButton");

let pendingClaimId = null;

renderPage();

wishlistForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = wishlistName.value.trim();
  const value = Number.parseInt(wishlistValue.value, 10);
  if (!title || !Number.isFinite(value) || value < 1) {
    return;
  }

  addWishlist(title, value);
  wishlistName.value = "";
  wishlistValue.value = "";
  renderPage();
});

confirmClaimButton.addEventListener("click", () => {
  const item = claimWishlist(pendingClaimId);
  closeClaimModal();
  renderPage();
  if (item) {
    alert(`Reward logged: ${item.title} for ${item.value} coins. Go enjoy it in real life.`);
  }
});

cancelClaimButton.addEventListener("click", closeClaimModal);

claimModal.addEventListener("click", (event) => {
  if (event.target === claimModal) {
    closeClaimModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeClaimModal();
  }
});

function renderPage() {
  renderSharedStats();
  renderHighlight();
  renderWishlist();
}

function renderHighlight() {
  const highlight = getWishlistHighlight();
  wishlistHighlightTitle.textContent = highlight.title;
  wishlistHighlightCopy.textContent = highlight.copy;
}

function renderWishlist() {
  const state = getState();
  wishlistList.innerHTML = "";

  if (state.wishlist.length === 0) {
    const empty = document.createElement("li");
    empty.className = "card-item";
    empty.innerHTML = `
      <div class="card-copy">
        <span class="card-title">No wishlist prizes yet.</span>
        <span class="card-subtitle">Add a reward target and give it a coin value.</span>
      </div>
    `;
    wishlistList.append(empty);
    return;
  }

  for (const item of [...state.wishlist].sort((a, b) => a.value - b.value)) {
    const node = wishlistItemTemplate.content.firstElementChild.cloneNode(true);
    const affordable = item.value <= state.coinBalance;
    const remaining = item.value - state.coinBalance;
    node.querySelector(".card-title").textContent = item.title;
    node.querySelector(".card-subtitle").textContent = `${item.value} coins target`;
    const statusButton = node.querySelector(".wishlist-status");
    statusButton.textContent = affordable ? "Ready to claim" : `${remaining} coins to go`;
    statusButton.classList.toggle("ready", affordable);
    statusButton.disabled = !affordable;
    if (affordable) {
      statusButton.addEventListener("click", () => openClaimModal(item));
    }

    node.querySelector(".delete-wishlist").addEventListener("click", () => {
      deleteWishlist(item.id);
      renderPage();
    });
    wishlistList.append(node);
  }
}

function openClaimModal(item) {
  pendingClaimId = item.id;
  claimTitle.textContent = `Claim ${item.title}?`;
  claimCopy.textContent = `You have ${getState().coinBalance} coins, which covers this ${item.value}-coin reward. This app will not buy it for you, but you can spend the pretend coins here once you treat yourself in real life.`;
  claimModal.classList.remove("hidden");
}

function closeClaimModal() {
  claimModal.classList.add("hidden");
  pendingClaimId = null;
}
