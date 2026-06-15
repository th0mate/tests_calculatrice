(() => {
  "use strict";

  const exprEl = document.getElementById("expr");
  const valueEl = document.getElementById("value");
  const displayEl = document.getElementById("display");
  const statusEl = document.getElementById("status");
  const statusLabel = statusEl.querySelector(".status__label");
  const historyList = document.getElementById("history-list");
  const keypad = document.querySelector(".keypad");

  const OP_SYMBOLS = { add: "+", subtract: "−", multiply: "×", divide: "÷" };

  const state = {
    current: "0",
    operand: null,
    operation: null,
    overwrite: false,
    locked: false,
  };

  function formatNumber(n) {
    if (n === null || n === undefined) return "0";
    if (!isFinite(n)) return n > 0 ? "∞" : "−∞";
    // Affichage français : pas plus de 10 décimales significatives.
    const rounded = Math.round(n * 1e10) / 1e10;
    return rounded.toLocaleString("fr-FR", { maximumFractionDigits: 10 });
  }

  function render() {
    valueEl.textContent = state.current;
    if (state.operand !== null && state.operation) {
      exprEl.textContent = `${formatNumber(state.operand)} ${OP_SYMBOLS[state.operation]}`;
    } else {
      exprEl.innerHTML = "&nbsp;";
    }
    highlightOperator();
  }

  function highlightOperator() {
    document.querySelectorAll(".key--op").forEach((btn) => {
      btn.classList.toggle(
        "is-active",
        state.operation === btn.dataset.op && state.overwrite
      );
    });
  }

  function setStatus(mode, label) {
    statusEl.className = `status status--${mode}`;
    statusLabel.textContent = label;
  }

  function inputDigit(d) {
    if (state.locked) return;
    if (state.overwrite) {
      state.current = d;
      state.overwrite = false;
    } else if (state.current === "0") {
      state.current = d;
    } else {
      if (state.current.replace("-", "").length >= 15) return;
      state.current += d;
    }
    render();
  }

  function inputDecimal() {
    if (state.locked) return;
    if (state.overwrite) {
      state.current = "0,";
      state.overwrite = false;
    } else if (!state.current.includes(",")) {
      state.current += ",";
    }
    render();
  }

  function negate() {
    if (state.locked || state.current === "0") return;
    state.current = state.current.startsWith("-")
      ? state.current.slice(1)
      : "-" + state.current;
    render();
  }

  function backspace() {
    if (state.locked || state.overwrite) return;
    state.current =
      state.current.length > 1 && state.current !== "-0"
        ? state.current.slice(0, -1)
        : "0";
    if (state.current === "-" || state.current === "") state.current = "0";
    render();
  }

  function clearAll() {
    state.current = "0";
    state.operand = null;
    state.operation = null;
    state.overwrite = false;
    displayEl.classList.remove("display--result", "display--error");
    setStatus("idle", "API prête");
    render();
  }

  function toNumber(str) {
    return Number(str.replace(/\s/g, "").replace(",", "."));
  }

  function chooseOperation(op) {
    if (state.locked) return;
    if (state.operation && !state.overwrite) {
      equals(op);
      return;
    }
    state.operand = toNumber(state.current);
    state.operation = op;
    state.overwrite = true;
    displayEl.classList.remove("display--result", "display--error");
    render();
  }

  async function equals(chainOp = null) {
    if (state.locked) return;
    if (state.operation === null || state.operand === null || state.overwrite) {
      return; // rien à calculer
    }

    const a = state.operand;
    const b = toNumber(state.current);
    const operation = state.operation;
    const exprText = `${formatNumber(a)} ${OP_SYMBOLS[operation]} ${formatNumber(b)}`;

    state.locked = true;
    setStatus("busy", "Calcul…");

    try {
      const params = new URLSearchParams({ operation, a, b });
      const res = await fetch(`/calculate?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur serveur");
      }

      state.current = formatNumber(data.result);
      state.operand = chainOp ? data.result : null;
      state.operation = chainOp;
      state.overwrite = true;

      displayEl.classList.remove("display--error");
      displayEl.classList.remove("display--result");
      void displayEl.offsetWidth;
      displayEl.classList.add("display--result");

      setStatus("idle", "API prête");
      addHistory(exprText, state.current);
    } catch (err) {
      state.current = err.message;
      state.operand = null;
      state.operation = null;
      state.overwrite = true;
      displayEl.classList.remove("display--result");
      displayEl.classList.add("display--error");
      setStatus("error", "Erreur API");
    } finally {
      state.locked = false;
      render();
    }
  }

  function addHistory(expr, result) {
    const li = document.createElement("li");
    li.className = "history__item";
    li.innerHTML = `<span class="history__expr"></span><span class="history__res"></span>`;
    li.querySelector(".history__expr").textContent = `${expr} =`;
    li.querySelector(".history__res").textContent = result;
    li.addEventListener("click", () => {
      state.current = result;
      state.operand = null;
      state.operation = null;
      state.overwrite = true;
      render();
    });
    historyList.prepend(li);
    while (historyList.children.length > 30) {
      historyList.lastChild.remove();
    }
  }

  document.getElementById("clear-history").addEventListener("click", () => {
    historyList.innerHTML = "";
  });

  function ripple(btn, x, y) {
    const circle = document.createElement("span");
    const size = Math.max(btn.clientWidth, btn.clientHeight);
    const rect = btn.getBoundingClientRect();
    circle.className = "ripple";
    circle.style.width = circle.style.height = `${size}px`;
    circle.style.left = `${(x ?? rect.left + rect.width / 2) - rect.left - size / 2}px`;
    circle.style.top = `${(y ?? rect.top + rect.height / 2) - rect.top - size / 2}px`;
    btn.appendChild(circle);
    circle.addEventListener("animationend", () => circle.remove());
  }

  function handleKey(btn, x, y) {
    ripple(btn, x, y);
    btn.classList.add("is-pressed");
    setTimeout(() => btn.classList.remove("is-pressed"), 130);

    if (btn.dataset.digit !== undefined) inputDigit(btn.dataset.digit);
    else if (btn.dataset.op) chooseOperation(btn.dataset.op);
    else
      switch (btn.dataset.action) {
        case "clear": clearAll(); break;
        case "negate": negate(); break;
        case "backspace": backspace(); break;
        case "decimal": inputDecimal(); break;
        case "equals": equals(); break;
      }
  }

  keypad.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".key");
    if (btn) handleKey(btn, e.clientX, e.clientY);
  });

  const KEY_MAP = {
    "+": '[data-op="add"]',
    "-": '[data-op="subtract"]',
    "*": '[data-op="multiply"]',
    "/": '[data-op="divide"]',
    "=": '[data-action="equals"]',
    Enter: '[data-action="equals"]',
    Backspace: '[data-action="backspace"]',
    Escape: '[data-action="clear"]',
    c: '[data-action="clear"]',
    ",": '[data-action="decimal"]',
    ".": '[data-action="decimal"]',
  };

  window.addEventListener("keydown", (e) => {
    let selector = null;
    if (/^[0-9]$/.test(e.key)) selector = `[data-digit="${e.key}"]`;
    else if (KEY_MAP[e.key]) selector = KEY_MAP[e.key];
    if (!selector) return;
    e.preventDefault();
    const btn = document.querySelector(`.key${selector}`);
    if (btn) handleKey(btn);
  });

  const root = document.documentElement;
  const storedTheme = localStorage.getItem("aurora-theme");
  if (storedTheme) root.dataset.theme = storedTheme;

  document.getElementById("theme").addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    localStorage.setItem("aurora-theme", next);
  });

  render();
})();
