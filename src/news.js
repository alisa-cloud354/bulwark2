import { getFile, saveFile, uploadFile } from "./github.js";
import {
  createEditor,
  toInputDate,
  fromInputDate,
  createLangTabs,
} from "./editor.js";

const langs = ["be", "uk", "en", "ru"];

export async function loadNews() {
  document.getElementById("section-news").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <h1 style="font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">Навіны</h1>
      <button id="add-news-btn" style="background:#dc2626; color:#fff; border:none; padding:10px 20px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer;">
        + Дадаць навіну
      </button>
    </div>
    <div id="news-list">Загрузка...</div>
  `;

  try {
    const { json: news, sha } = await getFile("public/locales/news-be.json");

    // Сартуем па даце: ад самых новых да старых
    const sorted = news.sort((a, b) => {
      const dateA = new Date(a.date.split(".").reverse().join("-")); // '05.03.2024' -> '2024-03-05'
      const dateB = new Date(b.date.split(".").reverse().join("-"));
      return dateB - dateA;
    });

    document.getElementById("news-list").innerHTML = sorted
      .map(
        (item) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border:1px solid #222; margin-bottom:8px; background:#050505;">
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
      .getElementById("news-list")
      .addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".edit-btn");
        const deleteBtn = e.target.closest(".delete-btn");

        if (editBtn) {
          const item = news.find(
            (n) => String(n.id) === String(editBtn.dataset.id),
          );
          if (item) openNewsEditor(item, news, sha);
        }

        if (deleteBtn) {
          if (!confirm("Выдаліць навіну ва ўсіх мовах?")) return;
          const targetId = String(deleteBtn.dataset.id);

          deleteBtn.disabled = true;
          deleteBtn.textContent = "...";

          try {
            // Выдаляем па чарзе з кожнага моўнага файла
            for (const lang of langs) {
              const res = await getFile(`public/locales/news-${lang}.json`);
              const updated = res.json.filter((n) => String(n.id) !== targetId);
              await saveFile(
                `public/locales/news-${lang}.json`,
                updated,
                res.sha,
              );
              await new Promise((r) => setTimeout(r, 1500));
            }
            loadNews();
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

    document.getElementById("add-news-btn").addEventListener("click", () => {
      const maxId = Math.max(...news.map((n) => parseInt(n.id) || 0));
      const newItem = {
        id: maxId + 1,
        date: "",
        title: "",
        excerpt: "",
        image: "",
        image_thumb: "",
        content: "",
      };
      openNewsEditor(newItem, [newItem, ...news], sha);
    });
  } catch (e) {
    document.getElementById("news-list").innerHTML =
      `<p style="color:#dc2626;">Памылка загрузкі: ${e.message}</p>`;
  }
}

function openNewsEditor(item, allNewsData, sha) {
  const langs = ["be", "uk", "en", "ru"];
  let currentLang = "be";
  let langData = { be: { news: allNewsData, sha } };

  document.getElementById("section-news").innerHTML = `
    <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
      <button id="back-btn" style="background:transparent; border:1px solid #333; color:#999; padding:8px 16px; font-size:12px; cursor:pointer;">← Назад</button>
      <h1 style="font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">Рэдагаваць навіну</h1>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:24px;">${createLangTabs(langs, "be")}</div>
    <div id="editor-form" style="display:flex; flex-direction:column; gap:16px; max-width:800px;">
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Дата
        <input id="f-date" type="date" style="display:block; width:100%; margin-top:6px; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px;">
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Загаловак
        <input id="f-title" style="display:block; width:100%; margin-top:6px; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px;">
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Кароткі тэкст
        <textarea id="f-excerpt" rows="3" style="display:block; width:100%; margin-top:6px; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px; resize:vertical;"></textarea>
      </label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Галоўнае фота (вялікае)
  <div style="margin-top:6px; display:flex; flex-direction:column; gap:8px;">
    <input id="f-image-file" type="file" accept="image/webp" style="display:block; width:100%; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px;">
    <div style="font-size:11px; color:#555;">Фармат: .webp, максімум 200 Кб. Калі загружана толькі адно фота — выкарыстоўваецца для абодвух варыянтаў.</div>
    ${item.image ? `<div style="font-size:12px; color:#666;">Бягучае: ${item.image.replace("/img/news/", "")}</div>` : ""}
  </div>
</label>
<label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Мініяцюра (малая)
  <div style="margin-top:6px; display:flex; flex-direction:column; gap:8px;">
    <input id="f-thumb-file" type="file" accept="image/webp" style="display:block; width:100%; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px;">
    <div style="font-size:11px; color:#555;">Фармат: .webp, максімум 50 Кб.</div>
    ${item.image_thumb ? `<div style="font-size:12px; color:#666;">Бягучая: ${item.image_thumb.replace("/img/news/", "")}</div>` : ""}
  </div>
</label>
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Поўны тэкст
        <div id="f-content-editor" style="margin-top:6px; background:#fff; min-height:200px;"></div>
      </label>
      <button id="save-btn" style="background:#dc2626; color:#fff; border:none; padding:12px 24px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; width:fit-content;">Захаваць</button>
    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", loadNews);

  const editor = createEditor("f-content-editor", item.content || "");

  function fillForm(lang) {
    const news = langData[lang]?.news;
    if (!news) return;
    const it = news.find((n) => String(n.id) === String(item.id)) || {};
    // Дату запаўняем толькі калі поле пустое
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
        const res = await getFile(`public/locales/news-${lang}.json`);
        langData[lang] = { news: res.json, sha: res.sha };
      } catch {
        langData[lang] = { news: [], sha: null };
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

    btn.textContent = "Загрузка фота...";
    btn.disabled = true;

    try {
      const imageFile = document.getElementById("f-image-file").files[0];
      const thumbFile = document.getElementById("f-thumb-file").files[0];

      // Бярэм існуючыя фота з BE (яны агульныя для ўсіх моў)
      const beItem = langData["be"]?.news?.find(
        (n) => String(n.id) === String(item.id),
      );
      let imageName = beItem?.image
        ? beItem.image.replace("/img/news/", "")
        : item.image
          ? item.image.replace("/img/news/", "")
          : "";
      let thumbName = beItem?.image_thumb
        ? beItem.image_thumb.replace("/img/news/", "")
        : item.image_thumb
          ? item.image_thumb.replace("/img/news/", "")
          : "";

      // Загрузка толькі калі выбраны новы файл
      if (imageFile) {
        if (imageFile.size > 200 * 1024)
          throw new Error("Галоўнае фота больш за 200кб");
        const name = `news-${item.id}-full.webp`;
        await uploadFile(`public/img/news/${name}`, imageFile);
        imageName = name;
      }

      if (thumbFile) {
        if (thumbFile.size > 50 * 1024)
          throw new Error("Мініяцюра больш за 50кб");
        const name = `news-${item.id}-thumb.webp`;
        await uploadFile(`public/img/news/${name}`, thumbFile);
        thumbName = name;
      }
      // Калі загружана толькі адно фота — выкарыстоўваць яго для абодвух
      if (imageName && !thumbName) thumbName = imageName;
      if (thumbName && !imageName) imageName = thumbName;

      // Калі нічога не загружана — temp
      if (!imageName) imageName = "temp.webp";
      if (!thumbName) thumbName = "temp-thumb.webp";

      btn.textContent = "Захаванне тэксту...";

      // Абнаўляем даныя для ЎСІХ моў адначасова (каб дата і фота супадалі)
      const newDate = fromInputDate(document.getElementById("f-date").value);
      const imgPath = imageName ? `/img/news/${imageName}` : "";
      const thumbPath = thumbName ? `/img/news/${thumbName}` : "";

      // Пры захаванні мы ідзем па ўсіх загружаных мовах у langData
      for (const lang of langs) {
        if (!langData[lang] || !langData[lang].sha) continue;

        const news = langData[lang].news;
        const isNew = !news.find((n) => String(n.id) === String(item.id));

        let updated;
        if (isNew) {
          // Калі гэта новая навіна, дадаем яе ў пачатак
          const newItem = {
            id: item.id,
            date: newDate,
            title:
              lang === currentLang
                ? document.getElementById("f-title").value
                : "",
            excerpt:
              lang === currentLang
                ? document.getElementById("f-excerpt").value
                : "",
            content: lang === currentLang ? editor.getHTML() : "",
            image: imgPath,
            image_thumb: thumbPath,
          };
          updated = [newItem, ...news];
        } else {
          // Калі рэдагуем - абнаўляем палі
          updated = news.map((n) =>
            String(n.id) === String(item.id)
              ? {
                  ...n,
                  date: newDate,
                  image: imgPath,
                  image_thumb: thumbPath,
                  // Тэкст абнаўляем толькі для бягучай адкрытай мовы
                  ...(lang === currentLang
                    ? {
                        title: document.getElementById("f-title").value,
                        excerpt: document.getElementById("f-excerpt").value,
                        content: editor.getHTML(),
                      }
                    : {}),
                }
              : n,
          );
        }

        const result = await saveFile(
          `public/locales/news-${lang}.json`,
          updated,
          langData[lang].sha,
        );
        langData[lang].sha = result.content.sha;
        langData[lang].news = updated;
      }

      btn.textContent = "Захавана ✓";
      setTimeout(() => {
        btn.textContent = "Захаваць";
        btn.disabled = false;
      }, 1500);
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
