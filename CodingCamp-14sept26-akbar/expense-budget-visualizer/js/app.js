/**
 * Expense & Budget Visualizer — app.js
 * Vanilla JS, no frameworks. All state in-memory + LocalStorage.
 */

/* ============================================================
   CONSTANTS
   ============================================================ */

const KEYS = {
  TRANSACTIONS: "ebv_transactions",
  SETTINGS: "ebv_settings",
  SORT: "ebv_sort",
};

const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];

/** Colours for categories. Cycles if more categories than colours exist. */
const PALETTE = [
  "#6c63ff", "#ff6584", "#43b89c", "#f59e0b",
  "#06b6d4", "#ec4899", "#8b5cf6", "#10b981",
  "#f97316", "#3b82f6",
];

/* ============================================================
   STATE
   ============================================================ */

const state = {
  transactions: [],       // Transaction[]
  settings: {
    theme: "light",
    spendingLimit: null,   // null | number
    categories: [...DEFAULT_CATEGORIES],
  },
  sort: "date_desc",
};

/* ============================================================
   STORAGE HELPERS
   ============================================================ */

/**
 * Returns true if localStorage is accessible, false otherwise.
 * Uses a probe write/read/delete to catch SecurityError in sandboxed
 * contexts or private-browsing modes where localStorage exists but
 * throws on access.
 */
function isStorageAvailable() {
  try {
    const probe = "__ebv_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** Cached result — checked once at loadState() time. */
let _storageAvailable = true;

/** Shows the dismissible "Storage unavailable" banner. Idempotent. */
function showStorageBanner() {
  const banner = document.getElementById("storage-banner");
  if (banner) banner.classList.remove("hidden");
}

/** Hides the storage banner. */
function hideStorageBanner() {
  const banner = document.getElementById("storage-banner");
  if (banner) banner.classList.add("hidden");
}

function loadState() {
  // Probe availability once; if unavailable keep defaults and bail out.
  _storageAvailable = isStorageAvailable();
  if (!_storageAvailable) {
    // State already holds the correct defaults — nothing to load.
    // Banner will be shown after init() attaches the dismiss listener.
    return;
  }

  // Load transactions
  try {
    const raw = localStorage.getItem(KEYS.TRANSACTIONS);
    if (raw) state.transactions = JSON.parse(raw);
  } catch {
    state.transactions = [];
  }

  // Load settings
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (raw) {
      const saved = JSON.parse(raw);
      state.settings = {
        theme: saved.theme ?? "light",
        spendingLimit: saved.spendingLimit != null && typeof saved.spendingLimit === "number"
          ? saved.spendingLimit
          : null,
        categories: Array.isArray(saved.categories) && saved.categories.length
          ? saved.categories
          : [...DEFAULT_CATEGORIES],
      };
    }
  } catch {
    state.settings = { theme: "light", spendingLimit: null, categories: [...DEFAULT_CATEGORIES] };
  }

  // Load sort preference
  try {
    const raw = localStorage.getItem(KEYS.SORT);
    const validSorts = ["date_desc", "date_asc", "amount_asc", "amount_desc", "category"];
    if (raw && validSorts.includes(raw)) state.sort = raw;
  } catch {
    state.sort = "date_desc";
  }
}

function saveState() {
  if (!_storageAvailable) {
    // Running in memory-only mode — nothing to persist.
    showStorageBanner();
    return;
  }

  try {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(state.settings));
    localStorage.setItem(KEYS.SORT, state.sort);
  } catch (e) {
    // Write failed (e.g. quota exceeded) — mark unavailable, show banner, then
    // re-throw so callers that need rollback semantics (e.g. deleteTransaction)
    // can react to the failure.
    console.warn("LocalStorage write failed:", e);
    _storageAvailable = false;
    showStorageBanner();
    throw e;
  }
}

/* ============================================================
   HELPERS
   ============================================================ */

function generateId() {
  return (
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2)
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getTotal() {
  return state.transactions.reduce((sum, t) => sum + t.amount, 0);
}

function getSortedTransactions() {
  const arr = [...state.transactions];
  switch (state.sort) {
    case "date_asc": return arr.sort((a, b) => a.createdAt - b.createdAt);
    case "amount_asc": return arr.sort((a, b) => a.amount - b.amount);
    case "amount_desc": return arr.sort((a, b) => b.amount - a.amount);
    case "category": return arr.sort((a, b) => a.category.localeCompare(b.category));
    default: return arr.sort((a, b) => b.createdAt - a.createdAt); // date_desc
  }
}

function getCategoryTotals() {
  return state.transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});
}

/** Returns a hex colour for a given category, cycling through PALETTE. */
function colorForCategory(category) {
  const idx = state.settings.categories.indexOf(category);
  return PALETTE[idx >= 0 ? idx % PALETTE.length : 0];
}

/* ============================================================
   CHART
   ============================================================ */

let chartInstance = null;

function renderChart() {
  const canvas = document.getElementById("spending-chart");
  const emptyMsg = document.getElementById("chart-empty");
  const totals = getCategoryTotals();
  const labels = Object.keys(totals);
  const data = Object.values(totals);
  const colors = labels.map(colorForCategory);

  if (labels.length === 0) {
    // Show empty state
    canvas.classList.add("hidden");
    emptyMsg.classList.remove("hidden");
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  canvas.classList.remove("hidden");
  emptyMsg.classList.add("hidden");

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.update("active");
  } else {
    chartInstance = new Chart(canvas, {
      type: "pie",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: "transparent",
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 16,
              font: { size: 13 },
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text").trim() || "#1a1a2e",
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                // Compute total from live dataset so updates always use current data
                const liveTotal = ctx.chart.data.datasets[0].data.reduce((s, v) => s + v, 0);
                const pct = liveTotal > 0 ? ((ctx.parsed / liveTotal) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  // Update legend label colour dynamically for theme switches
  if (chartInstance) {
    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--text").trim() || "#1a1a2e";
    chartInstance.options.plugins.legend.labels.color = textColor;
    chartInstance.update("none");
  }
}

/* ============================================================
   RENDER FUNCTIONS
   ============================================================ */

function renderBalance() {
  const total = getTotal();
  const balanceEl = document.getElementById("balance-amount");
  const statusEl = document.getElementById("limit-status");
  const balanceCard = balanceEl.closest(".balance-card");

  balanceEl.textContent = formatCurrency(total);

  const limit = state.settings.spendingLimit;
  if (limit !== null && total > limit) {
    balanceCard.classList.add("over-limit");
    statusEl.textContent = `⚠ Over limit by ${formatCurrency(total - limit)}`;
    statusEl.classList.remove("hidden");
  } else {
    balanceCard.classList.remove("over-limit");
    statusEl.classList.add("hidden");
  }
}

function renderCategoryOptions() {
  const selects = [
    document.getElementById("item-category"),
  ];
  selects.forEach((sel) => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = "";
    state.settings.categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
    // Restore previous selection if still valid
    if (current && state.settings.categories.includes(current)) {
      sel.value = current;
    }
  });
}

function renderTransactionList() {
  const listEl = document.getElementById("transaction-list");
  const emptyEl = document.getElementById("list-empty");
  const sorted = getSortedTransactions();

  if (sorted.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  listEl.innerHTML = sorted.map((t) => {
    const color = colorForCategory(t.category);
    const isOverCat = false; // per-item highlight optional; kept for future use
    return `
      <li class="transaction-item${isOverCat ? " over-limit-item" : ""}"
          data-id="${t.id}">
        <span class="item-dot" style="background:${color};"></span>
        <div class="item-info">
          <div class="item-name">${escapeHtml(t.name)}</div>
          <div class="item-category">${escapeHtml(t.category)}</div>
        </div>
        <span class="item-amount">${formatCurrency(t.amount)}</span>
        <button
          class="btn btn-danger"
          data-delete="${t.id}"
          aria-label="Delete transaction: ${escapeHtml(t.name)}"
          title="Delete"
        >🗑</button>
      </li>
    `;
  }).join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render() {
  renderBalance();
  renderCategoryOptions();
  renderTransactionList();
  renderChart();
}

/* ============================================================
   ACTION HANDLERS
   ============================================================ */

/* ── Add Transaction ── */
function addTransaction(e) {
  e.preventDefault();

  const nameEl = document.getElementById("item-name");
  const amountEl = document.getElementById("item-amount");
  const categoryEl = document.getElementById("item-category");
  const errorEl = document.getElementById("form-error");

  const name = nameEl.value.trim();
  const amount = parseFloat(amountEl.value);
  const category = categoryEl.value;

  // Clear previous errors
  [nameEl, amountEl, categoryEl].forEach((el) => el.classList.remove("input-error"));
  errorEl.classList.add("hidden");

  const MAX_AMOUNT = 999_999_999.99;

  const errors = [];
  let nameInvalid = false;
  let amountInvalid = false;

  if (!name) {
    errors.push("Item name is required.");
    nameInvalid = true;
  } else if (name.length > 100) {
    errors.push("Item name must be 100 characters or fewer.");
    nameInvalid = true;
  }

  if (isNaN(amount) || amount < 0.01 || amount > MAX_AMOUNT) {
    errors.push("Amount must be a number between 0.01 and 999,999,999.99.");
    amountInvalid = true;
  }

  if (!category) errors.push("Please select a category.");

  if (errors.length) {
    if (nameInvalid) nameEl.classList.add("input-error");
    if (amountInvalid) amountEl.classList.add("input-error");
    errorEl.textContent = errors.join(" ");
    errorEl.classList.remove("hidden");
    return;
  }

  const transaction = {
    id: generateId(),
    name,
    amount,
    category,
    createdAt: Date.now(),
  };

  state.transactions.push(transaction);
  saveState();
  render();

  // Reset form
  nameEl.value = "";
  amountEl.value = "";
  categoryEl.selectedIndex = 0;
  nameEl.focus();
}

/* ── Delete Transaction ── */
function deleteTransaction(id) {
  const errorEl = document.getElementById("delete-error");
  // Clear any previous delete error
  if (errorEl) errorEl.classList.add("hidden");

  // Snapshot the current list so we can roll back on failure
  const previous = state.transactions;
  state.transactions = state.transactions.filter((t) => t.id !== id);

  try {
    saveState();
  } catch (e) {
    // saveState threw (e.g. quota exceeded) — restore the previous state
    state.transactions = previous;
    if (errorEl) {
      errorEl.textContent = "Could not delete transaction — storage error. Please try again.";
      errorEl.classList.remove("hidden");
    }
    // Leave the UI unchanged (do not call render)
    return;
  }

  render();
}

/* ── Add Custom Category ── */
function addCategory() {
  const input = document.getElementById("custom-category");
  const errorEl = document.getElementById("category-error");
  const name = input.value.trim();

  errorEl.classList.add("hidden");
  input.classList.remove("input-error");

  if (!name) {
    errorEl.textContent = "Category name cannot be empty.";
    errorEl.classList.remove("hidden");
    input.classList.add("input-error");
    return;
  }

  const duplicate = state.settings.categories.some(
    (c) => c.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    errorEl.textContent = `"${name}" already exists.`;
    errorEl.classList.remove("hidden");
    input.classList.add("input-error");
    return;
  }

  state.settings.categories.push(name);
  saveState();
  renderCategoryOptions();

  input.value = "";
}

/* ── Save Spending Limit ── */
function saveLimit() {
  const input = document.getElementById("spending-limit");
  const errorEl = document.getElementById("limit-error");
  const raw = input.value.trim();

  errorEl.classList.add("hidden");
  input.classList.remove("input-error");

  if (raw === "" || raw === "0") {
    // Clear limit
    state.settings.spendingLimit = null;
    saveState();
    renderBalance();
    input.value = "";
    return;
  }

  const val = parseFloat(raw);
  if (isNaN(val) || val <= 0) {
    errorEl.textContent = "Please enter a positive number or leave blank to clear.";
    errorEl.classList.remove("hidden");
    input.classList.add("input-error");
    return;
  }

  state.settings.spendingLimit = val;
  saveState();
  renderBalance();
  input.value = "";
}

/* ── Sort ── */
function setSort(value) {
  state.sort = value;
  saveState();
  renderTransactionList();
}

/* ── Theme Toggle ── */
function toggleTheme() {
  const newTheme = state.settings.theme === "light" ? "dark" : "light";
  applyTheme(newTheme);
  state.settings.theme = newTheme;
  saveState();
  // Re-render chart so legend colour updates
  renderChart();
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("theme-icon");
  if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
}

/* ============================================================
   EVENT DELEGATION — Transaction List
   ============================================================ */

function handleListClick(e) {
  const btn = e.target.closest("[data-delete]");
  if (btn) {
    deleteTransaction(btn.dataset.delete);
  }
}

/* ============================================================
   INIT
   ============================================================ */

function init() {
  // Restore state from LocalStorage
  loadState();

  // Apply saved theme immediately to prevent flash
  applyTheme(state.settings.theme);

  // Restore sort selector
  const sortSel = document.getElementById("sort-select");
  if (sortSel) sortSel.value = state.sort;

  // Restore spending limit input placeholder
  const limitInput = document.getElementById("spending-limit");
  if (limitInput && state.settings.spendingLimit !== null) {
    limitInput.placeholder = formatCurrency(state.settings.spendingLimit);
  }

  // Initial full render
  render();

  // ── Bind Events ──

  // Form submit
  const form = document.getElementById("transaction-form");
  if (form) form.addEventListener("submit", addTransaction);

  // Theme toggle
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  // Add custom category
  const addCatBtn = document.getElementById("add-category-btn");
  if (addCatBtn) addCatBtn.addEventListener("click", addCategory);

  // "Enter" in custom category input
  const catInput = document.getElementById("custom-category");
  if (catInput) {
    catInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addCategory(); }
    });
  }

  // Save spending limit
  const saveLimitBtn = document.getElementById("save-limit-btn");
  if (saveLimitBtn) saveLimitBtn.addEventListener("click", saveLimit);

  // "Enter" in spending limit input
  const limitInputEl = document.getElementById("spending-limit");
  if (limitInputEl) {
    limitInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveLimit(); }
    });
  }

  // Sort change
  if (sortSel) {
    sortSel.addEventListener("change", (e) => setSort(e.target.value));
  }

  // Transaction list — delete via event delegation
  const listEl = document.getElementById("transaction-list");
  if (listEl) listEl.addEventListener("click", handleListClick);

  // Storage banner dismiss button
  const dismissBtn = document.getElementById("storage-banner-dismiss");
  if (dismissBtn) dismissBtn.addEventListener("click", hideStorageBanner);

  // Show banner now if storage was unavailable during loadState()
  if (!_storageAvailable) showStorageBanner();
}

/* ── Bootstrap ── */
document.addEventListener("DOMContentLoaded", init);
