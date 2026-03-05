import { getFile, saveFile } from "./github.js";
import { createEditor, createLangTabs } from "./editor.js";

const langs = ["be", "uk", "en", "ru"];

export async function loadMaterials() {
  document.getElementById("section-materials").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <h1 style="font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">Матэрыялы</h1>
      <button id="add-material-btn" style="background:#dc2626; color:#fff; border:none; padding:10px 20px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer;">
        + Дадаць матэрыял
      </button>
    </div>
    <div id="materials-list">Загрузка...</div>
  `;

  try {
    const { json: materials, sha } = await getFile(
      "public/locales/materials-be.json",
    );

    document.getElementById("materials-list").innerHTML = materials
      .map(
        (item) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border:1px solid #222; margin-bottom:8px; background:#111;">
        <div>
          <div style="font-size:11px; color:#dc2626; font-weight:700; margin-bottom:4px;">${item.category}</div>
          <div style="font-size:14px; font-weight:600;">${item.title}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button data-id="${item.id}" class="edit-btn" style="background:transparent; border:1px solid #333; color:#999; padding:6px 14px; font-size:11px; cursor:pointer;">Рэдагаваць</button>
          <button data-id="${item.id}" class="delete-btn" style="background:transparent; border:1px solid #333; color:#666; padding:6px 14px; font-size:11px; cursor:pointer;">Выдаліць</button>
        </div>
      </div>
    `,
      )
      .join("");

    document
      .getElementById("materials-list")
      .addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".edit-btn");
        const deleteBtn = e.target.closest(".delete-btn");

        if (editBtn) {
          const item = materials.find(
            (n) => String(n.id) === String(editBtn.dataset.id),
          );
          if (item) openMaterialEditor(item, materials, sha);
        }

        if (deleteBtn) {
          if (!confirm("Выдаліць матэрыял?")) return;
          const updated = materials.filter(
            (n) => String(n.id) !== String(deleteBtn.dataset.id),
          );
          try {
            await saveFile("public/locales/materials-be.json", updated, sha);
            loadMaterials();
          } catch (e) {
            console.error(e);
          }
        }
      });

    document
      .getElementById("add-material-btn")
      .addEventListener("click", () => {
        const newItem = {
          id: "",
          category: "",
          title: "",
          short: "",
          content: "",
        };
        openMaterialEditor(newItem, [newItem, ...materials], sha);
      });
  } catch (e) {
    document.getElementById("materials-list").innerHTML =
      `<p style="color:#dc2626;">Памылка загрузкі: ${e.message}</p>`;
  }
}

function openMaterialEditor(item, allData, sha) {
  let currentLang = "be";
  let langData = { be: { data: allData, sha } };

  document.getElementById("section-materials").innerHTML = `
    <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
      <button id="back-btn" style="background:transparent; border:1px solid #333; color:#999; padding:8px 16px; font-size:12px; cursor:pointer;">← Назад</button>
      <h1 style="font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">Рэдагаваць матэрыял</h1>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:24px;">${createLangTabs(langs, "be")}</div>
    <div id="editor-form" style="display:flex; flex-direction:column; gap:16px; max-width:800px;">
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">ID (лацінкай, без прабелаў, напр: legalization)
        <input id="f-id" value="${item.id}" style="display:block; width:100%; margin-top:6px; padding:10px; background:#111; border:1px solid #333; color:#fff; font-size:14px;">
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Катэгорыя
        <input id="f-category" style="display:block; width:100%; margin-top:6px; padding:10px; background:#111; border:1px solid #333; color:#fff; font-size:14px;">
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Загаловак
        <input id="f-title" style="display:block; width:100%; margin-top:6px; padding:10px; background:#111; border:1px solid #333; color:#fff; font-size:14px;">
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Кароткі тэкст
        <textarea id="f-short" rows="3" style="display:block; width:100%; margin-top:6px; padding:10px; background:#111; border:1px solid #333; color:#fff; font-size:14px; resize:vertical;"></textarea>
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Поўны тэкст
        <div id="f-content-editor" style="margin-top:6px; background:#fff; min-height:200px;"></div>
      </label>
      <button id="save-btn" style="background:#dc2626; color:#fff; border:none; padding:12px 24px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; width:fit-content;">Захаваць</button>
    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", loadMaterials);

  const editor = createEditor("f-content-editor", item.content || "");

  function fillForm(lang) {
    const data = langData[lang]?.data;
    if (!data) return;
    const it = data.find((n) => String(n.id) === String(item.id)) || {};
    document.getElementById("f-id").value = it.id || item.id || "";
    document.getElementById("f-category").value = it.category || "";
    document.getElementById("f-title").value = it.title || "";
    document.getElementById("f-short").value = it.short || "";
    editor.commands.setContent(it.content || "");
  }

  async function switchLang(lang) {
    if (!langData[lang]) {
      try {
        const res = await getFile(`public/locales/materials-${lang}.json`);
        langData[lang] = { data: res.json, sha: res.sha };
      } catch {
        langData[lang] = { data: [], sha: null };
      }
    }
    currentLang = lang;
    document.querySelectorAll(".lang-tab").forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.style.border = `1px solid ${active ? "#dc2626" : "#333"}`;
      btn.style.background = active ? "#dc2626" : "transparent";
      btn.style.color = active ? "#fff" : "#666";
    });
    fillForm(lang);
  }

  document.querySelectorAll(".lang-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchLang(btn.dataset.lang));
  });

  fillForm("be");

  document.getElementById("save-btn").addEventListener("click", async () => {
    const btn = document.getElementById("save-btn");
    btn.textContent = "Захоўваю...";
    btn.disabled = true;

    const data = langData[currentLang]?.data || [];
    const sha = langData[currentLang]?.sha;

    const updatedItem = {
      ...item,
      id: document.getElementById("f-id").value,
      category: document.getElementById("f-category").value,
      title: document.getElementById("f-title").value,
      short: document.getElementById("f-short").value,
      content: editor.getHTML(),
    };

    const exists = data.some((n) => String(n.id) === String(item.id));
    const updated = exists
      ? data.map((n) => (String(n.id) === String(item.id) ? updatedItem : n))
      : [updatedItem, ...data];

    try {
      const result = await saveFile(
        `public/locales/materials-${currentLang}.json`,
        updated,
        sha,
      );
      langData[currentLang].sha = result.content.sha;
      btn.textContent = "Захавана ✓";
      setTimeout(() => {
        btn.textContent = "Захаваць";
        btn.disabled = false;
      }, 2000);
    } catch (e) {
      btn.textContent = "Памылка!";
      btn.disabled = false;
      console.error(e);
    }
  });
}
