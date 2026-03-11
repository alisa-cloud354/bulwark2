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
    const { json: materialsRaw, sha } = await getFile(
      "public/locales/materials-be.json",
    );
    const materials = [...materialsRaw].sort((a, b) => {
      const aNum = parseInt(a.id?.replace("material-", "")) || 0;
      const bNum = parseInt(b.id?.replace("material-", "")) || 0;
      return bNum - aNum;
    });

    document.getElementById("materials-list").innerHTML = materials
      .map(
        (item) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border:1px solid #222; margin-bottom:8px; background:#050505;">
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
          const item = materialsRaw.find(
            (n) => String(n.id) === String(editBtn.dataset.id),
          );
          if (item) openMaterialEditor(item, materialsRaw, sha);
        }

        if (deleteBtn) {
          if (!confirm("Выдаліць матэрыял ва ўсіх мовах?")) return;
          const targetId = String(deleteBtn.dataset.id);
          deleteBtn.disabled = true;
          deleteBtn.textContent = "...";
          try {
            for (const lang of langs) {
              const res = await getFile(
                `public/locales/materials-${lang}.json`,
              );
              const updated = res.json.filter((n) => String(n.id) !== targetId);
              await saveFile(
                `public/locales/materials-${lang}.json`,
                updated,
                res.sha,
              );
              await new Promise((r) => setTimeout(r, 1500));
            }
            loadMaterials();
          } catch (err) {
            console.error(err);
            if (err.message.includes("409")) {
              alert(
                "GitHub яшчэ апрацоўвае змены. Пачакайце 30 секунд і анавіце старонку",
              );
            } else {
              alert("Памылка пры выдаленні: " + err.message);
            }
            loadMaterials();
          }
        }
      });

    document
      .getElementById("add-material-btn")
      .addEventListener("click", () => {
        const maxId = Math.max(
          ...materialsRaw.map(
            (n) => parseInt(n.id?.replace("material-", "")) || 0,
          ),
        );
        const newItem = {
          id: `material-${maxId + 1}`,
          category: "",
          title: "",
          short: "",
          content: "",
        };
        openMaterialEditor(newItem, [...materialsRaw, newItem], sha);
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
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Катэгорыя
        <div style="font-size:11px; color:#555; margin-top:4px;">Назва раздзела, напр: Легалізацыя, Псіхалогія</div>
        <input id="f-category" style="display:block; width:100%; margin-top:6px; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px;">
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Загаловак
        <input id="f-title" style="display:block; width:100%; margin-top:6px; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px;">
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Кароткі тэкст
        <div style="font-size:11px; color:#555; margin-top:4px;">Адзін-два сказы для прэв'ю матэрыяла</div>
        <textarea id="f-short" rows="3" style="display:block; width:100%; margin-top:6px; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px; resize:vertical;"></textarea>
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
    const it = data.find((n) => String(n.id) === String(item.id));
    if (!it) return;
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

    const categoryVal = document.getElementById("f-category").value.trim();
    const titleVal = document.getElementById("f-title").value.trim();
    const shortVal = document.getElementById("f-short").value.trim();
    const contentVal = editor.getHTML();

    if (!categoryVal) {
      alert("Запоўніце поле Катэгорыя");
      return;
    }
    if (!titleVal) {
      alert("Запоўніце поле Загаловак");
      return;
    }
    if (!shortVal) {
      alert("Запоўніце поле Кароткі тэкст");
      return;
    }
    if (contentVal === "<p></p>" || contentVal === "") {
      alert("Запоўніце поле Поўны тэкст");
      return;
    }

    btn.textContent = "Захоўваю...";
    btn.disabled = true;

    try {
      for (const lang of langs) {
        if (!langData[lang]) {
          try {
            const res = await getFile(`public/locales/materials-${lang}.json`);
            langData[lang] = { data: res.json, sha: res.sha };
          } catch {
            langData[lang] = { data: [], sha: null };
          }
        }
      }

      for (const lang of langs) {
        if (!langData[lang] || !langData[lang].sha) continue;

        const data = langData[lang].data;
        const isNew = !data.find((n) => String(n.id) === String(item.id));

        let updated;
        if (isNew) {
          const newItem = {
            id: String(item.id),
            category: lang === currentLang ? categoryVal : "",
            title: lang === currentLang ? titleVal : "",
            short: lang === currentLang ? shortVal : "",
            content: lang === currentLang ? contentVal : "",
          };
          updated = [...data, newItem];
        } else {
          updated = data.map((n) =>
            String(n.id) === String(item.id)
              ? {
                  ...n,
                  id: String(item.id),
                  ...(lang === currentLang
                    ? {
                        category: categoryVal,
                        title: titleVal,
                        short: shortVal,
                        content: contentVal,
                      }
                    : {}),
                }
              : n,
          );
        }

        const result = await saveFile(
          `public/locales/materials-${lang}.json`,
          updated,
          langData[lang].sha,
        );
        langData[lang].sha = result.content.sha;
        langData[lang].data = updated;
      }
      btn.textContent = "Захавана ✓";
      setTimeout(() => {
        btn.textContent = "Захаваць";
        btn.disabled = false;
      }, 2000);
    } catch (e) {
      btn.textContent = "Памылка!";
      btn.disabled = false;
      console.error(e);
      alert(e.message);
      setTimeout(() => {
        btn.textContent = "Захаваць";
      }, 3000);
    }
  });
}
