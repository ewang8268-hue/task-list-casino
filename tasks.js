const {
  addTask,
  addRandomTask,
  checkInBudgetReview,
  completeTask,
  deleteTask,
  getBudgetCheckInStatus,
  getAchievements,
  getState,
  getWeeklyProgress,
  renderSharedStats,
} = window.JackpotApp;

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const taskItemTemplate = document.getElementById("taskItemTemplate");
const randomTaskButton = document.getElementById("randomTaskButton");
const rewardModal = document.getElementById("rewardModal");
const useSpinsNowButton = document.getElementById("useSpinsNowButton");
const collectLaterButton = document.getElementById("collectLaterButton");
const dailyReturnDetail = document.getElementById("dailyReturnDetail");
const dailyStreakCount = document.getElementById("dailyStreakCount");
const dailyMilestoneCopy = document.getElementById("dailyMilestoneCopy");
const dailyMilestoneProgress = document.getElementById("dailyMilestoneProgress");
const milestoneLadder = document.getElementById("milestoneLadder");
const dailyCheckInButton = document.getElementById("dailyCheckInButton");
const achievementList = document.getElementById("achievementList");
const achievementCount = document.getElementById("achievementCount");
const weeklyProgressList = document.getElementById("weeklyProgressList");

renderPage();

dailyCheckInButton.addEventListener("click", () => {
  checkInBudgetReview();
  renderPage();
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    return;
  }

  addTask(title);
  taskInput.value = "";
  renderPage();
});

randomTaskButton.addEventListener("click", () => {
  const taskTitle = addRandomTask();
  taskInput.value = taskTitle;
  renderPage();
});

useSpinsNowButton.addEventListener("click", () => {
  rewardModal.classList.add("hidden");
  window.location.href = "./spin.html?autoplay=3";
});

collectLaterButton.addEventListener("click", () => {
  rewardModal.classList.add("hidden");
});

rewardModal.addEventListener("click", (event) => {
  if (event.target === rewardModal) {
    rewardModal.classList.add("hidden");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    rewardModal.classList.add("hidden");
  }
});

function renderPage() {
  renderSharedStats();
  renderDailyReturnCard();
  renderAchievements();
  renderWeeklyProgress();
  renderTasks();
}

function renderAchievements() {
  const achievements = getAchievements();
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;
  achievementCount.textContent = `${unlocked} / ${achievements.length} unlocked`;
  achievementList.innerHTML = achievements.map((achievement) => {
    const percent = Math.round((achievement.current / achievement.target) * 100);
    return `
      <article class="achievement-item ${achievement.unlocked ? "unlocked" : ""}">
        <div class="achievement-icon" aria-hidden="true">${achievement.unlocked ? "✓" : achievement.icon}</div>
        <div class="achievement-copy">
          <strong>${achievement.title}</strong>
          <span>${achievement.unlocked ? "Unlocked!" : achievement.detail}</span>
          <div class="achievement-progress"><span style="width: ${percent}%"></span></div>
        </div>
      </article>
    `;
  }).join("");
}

function renderDailyReturnCard() {
  const status = getBudgetCheckInStatus();
  dailyStreakCount.textContent = status.currentStreak;
  dailyMilestoneCopy.textContent = status.checkedInToday
    ? `Next: ${status.nextMilestone} days • +${status.nextMilestoneReward} spins`
    : `Next: ${status.nextMilestone} days • +${status.nextMilestoneReward} spins`;
  dailyMilestoneProgress.style.width = `${status.milestoneProgress}%`;
  milestoneLadder.innerHTML = [3, 5, 7, 9, 11, 14, 21].map((milestone) => `
    <span class="milestone-chip ${status.currentStreak >= milestone ? "complete" : ""}">
      ${status.currentStreak >= milestone ? "✓" : ""} ${milestone}d · +${milestoneRewardFor(milestone)}
    </span>
  `).join("");
  dailyCheckInButton.textContent = status.buttonLabel;
  dailyCheckInButton.disabled = status.checkedInToday;
  dailyReturnDetail.textContent = status.checkedInToday
    ? `You’re checked in. Come back ${status.nextCheckInDate} to keep the streak moving.`
    : status.milestoneReached
      ? `Milestone unlocked! You earned ${status.milestoneReward} extra free spins, plus today’s daily spin.`
      : `A quick check-in earns ${status.rewardPreview} free spin. Reach ${status.nextMilestone} days for ${status.nextMilestoneReward} extra spins.`;
}

function milestoneRewardFor(milestone) {
  const rewards = { 3: 2, 5: 2, 7: 3, 9: 3, 11: 4, 14: 5, 21: 7 };
  return rewards[milestone] || 2;
}

function renderWeeklyProgress() {
  weeklyProgressList.innerHTML = getWeeklyProgress().map((goal) => `
    <article class="weekly-goal ${goal.complete ? "complete" : ""}">
      <div class="weekly-goal-header">
        <strong>${goal.label}</strong>
        <span>${goal.complete ? "Complete" : `${goal.current} / ${goal.target}${goal.suffix}`}</span>
      </div>
      <div class="weekly-goal-track"><span style="width: ${goal.percent}%"></span></div>
    </article>
  `).join("");
}

function renderTasks() {
  const state = getState();
  taskList.innerHTML = "";

  if (state.tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "card-item";
    empty.innerHTML = `
      <div class="card-copy">
        <span class="card-title">No tasks on the board.</span>
        <span class="card-subtitle">Add one above and start stacking spins.</span>
      </div>
    `;
    taskList.append(empty);
    return;
  }

  for (const task of state.tasks) {
    const node = taskItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".card-title").textContent = task.title;
    node.querySelector(".cash-button").addEventListener("click", () => {
      completeTask(task.id);
      renderPage();
      rewardModal.classList.remove("hidden");
      useSpinsNowButton.focus();
    });
    node.querySelector(".delete-button").addEventListener("click", () => {
      deleteTask(task.id);
      renderTasks();
      renderSharedStats();
    });
    taskList.append(node);
  }
}
