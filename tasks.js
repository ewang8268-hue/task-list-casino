const {
  addTask,
  addRandomTask,
  completeTask,
  deleteTask,
  getState,
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

renderPage();

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
  renderTasks();
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
