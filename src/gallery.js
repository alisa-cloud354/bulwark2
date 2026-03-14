import { getFile, saveFile, uploadFile } from "./github.js";
export async function loadGallery() {
  document.getElementById("section-gallery").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <h1 style="font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">Галерэя</h1>
      <button id="add-gallery-btn" style="background:#dc2626; color:#fff; border:none; padding:10px 20px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer;">
        + Дадаць фота
      </button>
    </div>
    <div id="gallery-list">Загрузка...</div>
  `;

  try {
    const { json: galleryRaw, sha } = await getFile("public/data/gallery.json");
    const gallery = [...galleryRaw].reverse();

    document.getElementById("gallery-list").innerHTML = gallery
      .map(
        (item, idx) => `
  <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border:1px solid #222; margin-bottom:8px; background:#050505;">
    <div style="font-size:14px; color:#fff;">${item.src}</div>
    <div style="font-size:12px; color:#666; flex:1; padding:0 16px;">${item.alt}</div>
    <div style="display:flex; gap:8px;">
      <button data-idx="${idx}" class="edit-gallery-btn" style="background:transparent; border:1px solid #333; color:#999; padding:6px 14px; font-size:11px; cursor:pointer;">Рэд.</button>
      <button data-idx="${idx}" class="delete-gallery-btn" style="background:transparent; border:1px solid #333; color:#666; padding:6px 14px; font-size:11px; cursor:pointer;">Выд.</button>
    </div>
  </div>
`,
      )
      .join("");

    document
      .getElementById("gallery-list")
      .addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".edit-gallery-btn");
        const deleteBtn = e.target.closest(".delete-gallery-btn");

        if (editBtn) {
          const idx = parseInt(editBtn.dataset.idx);
          openGalleryEditor(
            gallery[idx],
            galleryRaw,
            sha,
            galleryRaw.indexOf(
              galleryRaw.find((g) => g.src === gallery[idx].src),
            ),
          );
        }

        if (deleteBtn) {
          if (!confirm("Выдаліць фота?")) return;
          const idx = parseInt(deleteBtn.dataset.idx);
          const srcToDelete = gallery[idx].src;
          const updated = galleryRaw.filter((g) => g.src !== srcToDelete);
          try {
            const fresh = await getFile("public/data/gallery.json");
            await saveFile("public/data/gallery.json", updated, fresh.sha);
            loadGallery();
          } catch (e) {
            console.error(e);
          }
        }
      });

    document.getElementById("add-gallery-btn").addEventListener("click", () => {
      openGalleryEditor(
        { src: "", alt: "", width: 1000, height: 1000 },
        galleryRaw,
        sha,
        -1,
      );
    });
  } catch (e) {
    document.getElementById("gallery-list").innerHTML =
      `<p style="color:#dc2626;">Памылка загрузкі: ${e.message}</p>`;
  }
}

function openGalleryEditor(item, gallery, sha, idx) {
  document.getElementById("section-gallery").innerHTML = `
    <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
      <button id="back-btn" style="background:transparent; border:1px solid #333; color:#999; padding:8px 16px; font-size:12px; cursor:pointer;">← Назад</button>
      <h1 style="font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">${idx === -1 ? "Дадаць фота" : "Рэдагаваць фота"}</h1>
    </div>
    <div style="display:flex; flex-direction:column; gap:16px; max-width:800px;">
      <label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Фота
  <div style="margin-top:6px;">
    <input id="f-file" type="file" accept="image/*" style="display:block; width:100%; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px;">
    <div id="f-preview" style="margin-top:8px; font-size:12px; color:#666;">${item.src ? `Бягучы файл: ${item.src}` : "Файл не выбраны"}</div>
  </div>
</label>
<label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Або ўвядзіце назву файла ўручную
  <div style="display:flex; align-items:center; margin-top:6px;">
    <span style="padding:10px; background:#1a1a1a; border:1px solid #333; border-right:none; color:#666; font-size:13px; white-space:nowrap;">/img/gallery/</span>
    <input id="f-src" value="${item.src}" style="flex:1; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px;">
  </div>
</label>
<label style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.1em;">Апісанне (alt)
  <input id="f-alt" value="${item.alt}" style="display:block; width:100%; margin-top:6px; padding:10px; background:#050505; border:1px solid #333; color:#fff; font-size:14px;">
</label>
      <button id="save-btn" style="background:#dc2626; color:#fff; border:none; padding:12px 24px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; width:fit-content;">Захаваць</button>
    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", loadGallery);

  document.getElementById("save-btn").addEventListener("click", async () => {
    const btn = document.getElementById("save-btn");
    const fileInput = document.getElementById("f-file");
    const altInput = document.getElementById("f-alt");

    btn.disabled = true;

    try {
      let src = document.getElementById("f-src").value;

      // 1. ВАЛІДАЦЫЯ ФАЙЛА
      if (fileInput.files[0]) {
        const file = fileInput.files[0];
        console.log(file.type);
        // Праверка фармату (толькі WebP)
        if (file.type !== "image/webp") {
          alert(
            "Памылка: Дазволены толькі фармат .webp. Калі ласка, канвертуйце фота перад загрузкай.",
          );
          btn.disabled = false;
          return;
        }

        // Праверка вагі (максімум 100 Кб)
        const maxSize = 100 * 1024; // 100 KB
        if (file.size > maxSize) {
          alert(
            `Файл занадта цяжкі (${Math.round(file.size / 1024)} Кб). Максімум — 100 Кб. Паменшыце памер або якасць.`,
          );
          btn.disabled = false;
          return;
        }

        // Праверка памераў (700x700) праз Image object
        const dimensions = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.width, h: img.height });
          img.src = URL.createObjectURL(file);
        });

        if (dimensions.w > 800 || dimensions.h > 800) {
          if (
            !confirm(
              `Памеры фота (${dimensions.w}x${dimensions.h}) большыя за рэкамендаваныя (700x700). Упэўнены, што хочаце працягнуць?`,
            )
          ) {
            btn.disabled = false;
            return;
          }
        }

        btn.textContent = "Загружаю ў GitHub...";

        // ГЕНЕРАЦЫЯ НАЗВЫ: gallery-N.webp
        // 1. Збіраем усе існуючыя нумары з назваў файлаў у масіве gallery
        const existingIndices = gallery.map((item) => {
          // Шукаем лічбу пасля "gallery-" і перад ".webp"
          const match = item.src.match(/gallery-(\d+)\.webp/);
          return match ? parseInt(match[1], 10) : 0;
        });

        // 2. Знаходзім самы вялікі нумар (напрыклад, 32)
        const maxIndex =
          existingIndices.length > 0 ? Math.max(...existingIndices) : 0;

        // 3. Новы нумар заўсёды будзе на 1 больш за максімальны (напрыклад, 33)
        const nextIndex = maxIndex + 1;

        const newFileName = `gallery-${nextIndex}.webp`;
        const finalPath = `public/img/gallery/${newFileName}`;

        await uploadFile(finalPath, file);
        src = newFileName;
      }

      if (!src) {
        alert("Памылка: Выберыце файл!");
        btn.disabled = false;
        return;
      }

      if (!altInput.value.trim()) {
        alert("Памылка: Запоўніце поле апісання (Alt) для SEO.");
        btn.disabled = false;
        return;
      }

      // 2. ЗАХАВАННЕ Ў JSON
      const updatedItem = {
        src: src,
        alt: altInput.value,
        width: 700,
        height: 700,
      };

      const updated =
        idx === -1
          ? [...gallery, updatedItem]
          : gallery.map((g, i) => (i === idx ? updatedItem : g));

      btn.textContent = "Абнаўляю спіс...";
      const fresh = await getFile("public/data/gallery.json");
      await saveFile("public/data/gallery.json", updated, fresh.sha);

      btn.textContent = "Захавана ✓";
      setTimeout(() => loadGallery(), 1500);
    } catch (e) {
      btn.textContent = "Памылка!";
      btn.disabled = false;
      console.error(e);
      alert("Памылка пры захаванні: " + e.message);
    }
  });
}
