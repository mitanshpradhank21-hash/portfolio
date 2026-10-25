console.log("JavaScript connected");

/* ---------- Light / Dark mode ---------- */
const themeButton = document.getElementById("themeToggle");

function applyTheme(isDark) {
  document.body.classList.toggle("dark-mode", isDark);
  themeButton.textContent = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
}

try {
  applyTheme(localStorage.getItem("theme") === "dark");
} catch (e) {
  applyTheme(false);
}

themeButton.addEventListener("click", function () {
  const isDark = !document.body.classList.contains("dark-mode");
  applyTheme(isDark);
  try {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  } catch (e) {
    /* storage unavailable, ignore */
  }
});

/* ---------- Mobile menu ---------- */
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle.addEventListener("click", function () {
  const open = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

mainNav.querySelectorAll("a").forEach(function (link) {
  link.addEventListener("click", function () {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

/* ---------- Project search and filter ---------- */
const searchInput = document.getElementById("projectSearch");
const searchStatus = document.getElementById("searchStatus");
const noResults = document.getElementById("noResults");
const projectCards = document.querySelectorAll(".project-card");

function filterProjects() {
  const term = searchInput.value.trim().toLowerCase();
  let visible = 0;

  projectCards.forEach(function (card) {
    const text = (card.textContent + " " + (card.dataset.search || "")).toLowerCase();
    const match = term === "" || text.includes(term);
    card.hidden = !match;
    if (match) visible++;
  });

  noResults.hidden = visible !== 0;
  searchStatus.textContent = term === ""
    ? ""
    : "Showing " + visible + " of " + projectCards.length + " projects";
}

searchInput.addEventListener("input", filterProjects);

/* ---------- Chatbot interface (API connection comes next) ---------- */
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const question = chatInput.value.trim();
  if (!question) return;

  addMessage(question, "user");
  chatInput.value = "";

  const sendButton = chatForm.querySelector('button[type="submit"]');
  sendButton.disabled = true;
  chatInput.disabled = true;
  sendButton.textContent = "Thinking...";

  const loadingMessage = document.createElement("div");
  loadingMessage.className = "msg bot";
  loadingMessage.textContent = "Thinking...";
  loadingMessage.setAttribute("aria-live", "polite");
  chatMessages.appendChild(loadingMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    const data = await response.json().catch(() => ({}));
    loadingMessage.remove();

    if (!response.ok) {
      throw new Error(data.error || "The chatbot could not answer right now.");
    }

    addMessage(data.answer || "Sorry, I could not create an answer. Please try again.", "bot");
  } catch (error) {
    loadingMessage.remove();
    addMessage(
      error.message || "Unable to connect to the chatbot. Please try again later.",
      "error"
    );
  } finally {
    sendButton.disabled = false;
    chatInput.disabled = false;
    sendButton.textContent = "Send";
    chatInput.focus();
  }
});