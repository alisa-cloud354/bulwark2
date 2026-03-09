import { getFile, saveFile, uploadFile } from "./github.js";
import {
  createEditor,
  toInputDate,
  fromInputDate,
  createLangTabs,
} from "./editor.js";

const langs = ["be", "uk", "en", "ru"];

export async function loadReports() {
  document.getElementById("section-reports").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <h1 style="font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">Справаздачы</h1>
      <button id="add-report-btn" style="background:#dc2626; color:#fff; border:none; padding:10px 20px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer;">
        + Дадаць справаздачу
      </button>
    </div>
    <div id="reports-list">Загрузка...</div>
  `;

  try {
    const { json: reports, sha } = await getFile(
      "public/locales/reports-be.json",
    );
    const sorted = reports.sort((a, b) => {
      const dateA = new Date(a.date.split(".").reverse().join("-"));
      const dateB = new Date(b.date.split(".").reverse().join("-"));
      return dateB - dateA;
    });

    document.getElementById("reports-list").innerHTML = sorted
      .map(
        (item) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border:1px solid #222; margin-bottom:8px; background:#111;">
        <div>
          <div style="font-size:11px; color:#dc2626; font-weight:700; margin-bottom:4px;">${item.date}</div>
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
      .getElementById("reports-list")
      .addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".edit-btn");
        const deleteBtn = e.target.closest(".delete-btn");

        if (editBtn) {
          const item = reports.find(
            (n) => String(n.id) === String(editBtn.dataset.id),
          );
          if (item) openReportEditor(item, reports, sha);
        }

        if (deleteBtn) {
          if (!confirm("Выдаліць справаздачу ва ўсіх мовах?")) return;
          const targetId = String(deleteBtn.dataset.id);
          deleteBtn.disabled = true;
          deleteBtn.textContent = "...";
          try {
            for (const lang of langs) {
              const res = await getFile(`public/locales/reports-${lang}.json`);
              const updated = res.json.filter((n) => String(n.id) !== targetId);
              await saveFile(
                `public/locales/reports-${lang}.json`,
                updated,
                res.sha,
              );
              await new Promise((r) => setTimeout(r, 1500));
            }
            loadReports();
          } catch (err) {
            console.error(err);
            if (err.message.includes("409")) {
              alert(
                "GitHub яшчэ апрацоўвае змены. Пачакайце 30 секунд і анавіце старонку",
              );
            } else {
              alert("Памылка пры выдаленні: " + err.message);
            }
            loadNews();
          }
        }
      });

    document.getElementById("add-report-btn").addEventListener("click", () => {
      const maxId = Math.max(...reports.map((n) => parseInt(n.id) || 0));
      const newItem = {
        id: maxId + 1,
        date: "",
        title: "",
        excerpt: "",
        image: "",
        content: "",
      };
      openReportEditor(newItem, [newItem, ...reports], sha);
    });
  } catch (e) {
    document.getElementById("reports-list").innerHTML =
      `<p style="color:#dc2626;">Памылка загрузкі: ${e.message}</p>`;
  }
}

function openReportEditor(item, allData, sha) {
  let currentLang = "be";
  let langData = { be: { reports: allData, sha } };

  document.getElementById("section-reports").innerHTML = `
    <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
      <button id="back-btn" style="background:transparent; border:1px solid #333; color:#999; padding:8px 16px; font-size:12px; cursor:pointer;">← Назад</button>
      <h1 style="font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">Рэдагаваць справаздачу</h1>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:24px;">${createLangTabs(langs, "be")}</div>
    <div id="editor-form" style="display:flex; flex-direction:column; gap:16px; max-width:800px;">
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Дата
        <input id="f-date" type="date" style="display:block; width:100%; margin-top:6px; padding:10px; background:#111; border:1px solid #333; color:#fff; font-size:14px;">
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Загаловак
        <input id="f-title" style="display:block; width:100%; margin-top:6px; padding:10px; background:#111; border:1px solid #333; color:#fff; font-size:14px;">
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Кароткі тэкст
        <textarea id="f-excerpt" rows="3" style="display:block; width:100%; margin-top:6px; padding:10px; background:#111; border:1px solid #333; color:#fff; font-size:14px; resize:vertical;"></textarea>
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Фота
  <div style="margin-top:6px; display:flex; flex-direction:column; gap:8px;">
    <input id="f-image-file" type="file" accept="image/webp" style="display:block; width:100%; padding:10px; background:#111; border:1px solid #333; color:#fff; font-size:14px;">
    <div style="font-size:11px; color:#555;">Фармат: .webp, максімум 200 Кб. Пакіньце пустым каб выкарыстаць заглушку.</div>
    ${item.image ? `<div style="font-size:12px; color:#666;">Бягучае фота: ${item.image.replace("/img/reports/", "")}</div>` : ""}
  </div>
</label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Поўны тэкст
        <div id="f-content-editor" style="margin-top:6px; background:#fff; min-height:200px;"></div>
      </label>
      <button id="save-btn" style="background:#dc2626; color:#fff; border:none; padding:12px 24px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; width:fit-content;">Захаваць</button>
    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", loadReports);

  const editor = createEditor("f-content-editor", item.content || "");

  function fillForm(lang) {
    const data = langData[lang]?.reports;
    if (!data) return;
    const it = data.find((n) => String(n.id) === String(item.id)) || {};
    if (!document.getElementById("f-date").value) {
      document.getElementById("f-date").value = toInputDate(
        it.date || item.date || "",
      );
    }
    document.getElementById("f-title").value = it.title || "";
    document.getElementById("f-excerpt").value = it.excerpt || "";
    editor.commands.setContent(it.content || "");
  }

  async function switchLang(lang) {
    if (!langData[lang]) {
      try {
        const res = await getFile(`public/locales/reports-${lang}.json`);
        langData[lang] = { reports: res.json, sha: res.sha };
      } catch {
        langData[lang] = { reports: [], sha: null };
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

    const dateVal = document.getElementById("f-date").value;
    const titleVal = document.getElementById("f-title").value.trim();
    const excerptVal = document.getElementById("f-excerpt").value.trim();

    if (!dateVal) {
      alert("Запоўніце поле Дата");
      return;
    }
    if (!titleVal) {
      alert("Запоўніце поле Загаловак");
      return;
    }
    if (!excerptVal) {
      alert("Запоўніце поле Кароткі тэкст");
      return;
    }

    btn.textContent = "Захоўваю...";
    btn.disabled = true;

    try {
      const imageFile = document.getElementById("f-image-file").files[0];
      const beItem = langData["be"]?.reports?.find(
        (n) => String(n.id) === String(item.id),
      );
      let imageName = beItem?.image
        ? beItem.image.replace("/img/reports/", "")
        : item.image
          ? item.image.replace("/img/reports/", "")
          : "";

      if (imageFile) {
        if (imageFile.size > 200 * 1024)
          throw new Error("Фота больш за 200 Кб");
        const name = `report-${item.id}.webp`;
        await uploadFile(`public/img/reports/${name}`, imageFile);
        imageName = name;
      }

      if (!imageName) imageName = "temp.webp";

      const newDate = fromInputDate(dateVal);
      const imgPath = `/img/reports/${imageName}`;
      // Загружаем усе мовы якіх яшчэ няма
      for (const lang of langs) {
        if (!langData[lang]) {
          try {
            const res = await getFile(`public/locales/reports-${lang}.json`);
            langData[lang] = { reports: res.json, sha: res.sha };
          } catch {
            langData[lang] = { reports: [], sha: null };
          }
        }
      }
      for (const lang of langs) {
        if (!langData[lang] || !langData[lang].sha) continue;

        const data = langData[lang].reports;
        const isNew = !data.find((n) => String(n.id) === String(item.id));

        let updated;
        if (isNew) {
          const newItem = {
            id: item.id,
            date: newDate,
            title: lang === currentLang ? titleVal : "",
            excerpt: lang === currentLang ? excerptVal : "",
            content: lang === currentLang ? editor.getHTML() : "",
            image: imgPath,
          };
          updated = [newItem, ...data];
        } else {
          updated = data.map((n) =>
            String(n.id) === String(item.id)
              ? {
                  ...n,
                  date: newDate,
                  image: imgPath,
                  ...(lang === currentLang
                    ? {
                        title: titleVal,
                        excerpt: excerptVal,
                        content: editor.getHTML(),
                      }
                    : {}),
                }
              : n,
          );
        }

        const result = await saveFile(
          `public/locales/reports-${lang}.json`,
          updated,
          langData[lang].sha,
        );
        langData[lang].sha = result.content.sha;
        langData[lang].reports = updated;
      }
      btn.textContent = "Захавана ✓";
      setTimeout(() => {
        btn.textContent = "Захаваць";
        btn.disabled = false;
      }, 2000);
    } catch (e) {
      btn.textContent = "Памылка!";
      btn.disabled = false;
      alert(e.message);
      console.error(e);
      setTimeout(() => {
        btn.textContent = "Захаваць";
      }, 3000);
    }
  });
}
