import { loadNews } from "./news.js";
import { loadReports } from "./reports.js";
import { loadMaterials } from "./materials.js";
import { loadGallery } from "./gallery.js";

const loaders = {
  news: loadNews,
  reports: loadReports,
  materials: loadMaterials,
  gallery: loadGallery,
};

function activateSection(section) {
  document
    .querySelectorAll(".nav-link")
    .forEach((l) => l.classList.remove("active"));
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  const link = document.querySelector(`[data-section="${section}"]`);
  link?.classList.add("active");
  document.getElementById(`section-${section}`)?.classList.add("active");
  loaders[section]?.();
  location.hash = section;
  document.querySelector("nav")?.classList.remove("open");
}

function showLoginForm(errorMsg = "") {
  document.getElementById("app").style.display = "none";

  let loginEl = document.getElementById("login-screen");
  if (!loginEl) {
    loginEl = document.createElement("div");
    loginEl.id = "login-screen";
    document.body.appendChild(loginEl);
  }

  loginEl.innerHTML = `
    <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0a0a0a;">
      <div style="width:100%; max-width:360px; padding:40px; background:#050505; border:1px solid #222;">
        <div style="font-size:18px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:32px;">Bulwark Admin</div>
        ${errorMsg ? `<div style="color:#dc2626; font-size:13px; margin-bottom:16px;">${errorMsg}</div>` : ""}
        <div style="display:flex; flex-direction:column; gap:12px;">
          <input id="login-email" type="email" placeholder="Эл. пошта" style="padding:10px; background:#1a1a1a; border:1px solid #333; color:#fff; font-size:14px; outline:none;">
          <div style="position:relative;">
  <input id="login-password" type="password" placeholder="Пароль" style="padding:10px; padding-right:40px; background:#1a1a1a; border:1px solid #333; color:#fff; font-size:14px; outline:none; width:100%;">
  <button id="toggle-password" type="button" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:transparent; border:none; color:#666; cursor:pointer; font-size:16px;">👁</button>
</div>
          <button id="login-btn" style="padding:12px; background:#dc2626; color:#fff; border:none; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer;">Увайсці</button>
          <button id="forgot-btn" style="padding:8px; background:transparent; color:#666; border:none; font-size:12px; cursor:pointer; text-align:left;">Забылі пароль?</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("toggle-password").addEventListener("click", () => {
    const input = document.getElementById("login-password");
    input.type = input.type === "password" ? "text" : "password";
  });
  document.getElementById("login-btn").addEventListener("click", async () => {
    const btn = document.getElementById("login-btn");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      showLoginForm("Запоўніце ўсе палі");
      return;
    }

    btn.textContent = "Уваход...";
    btn.disabled = true;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem("token", data.token);
        loginEl.remove();
        document.getElementById("app").style.display = "";
        initApp();
      } else {
        showLoginForm(data.message || "Памылка ўваходу");
      }
    } catch {
      showLoginForm("Памылка сервера");
    }
  });

  document.getElementById("login-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("login-btn").click();
  });

  document.getElementById("forgot-btn").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value.trim();
    if (!email) {
      showLoginForm("Увядзіце эл. пошту для аднаўлення пароля");
      return;
    }

    try {
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      showLoginForm("Пароль адпраўлены ў Telegram ✓");
    } catch {
      showLoginForm("Памылка сервера");
    }
  });
}

function initApp() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      activateSection(link.dataset.section);
    });
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    showLoginForm();
  });
  const hash = location.hash.replace("#", "");
  activateSection(loaders[hash] ? hash : "news");
  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    document.querySelector("nav").classList.toggle("open");
  });
}

// Старт
const token = sessionStorage.getItem("token");
if (token) {
  initApp();
} else {
  showLoginForm();
}
