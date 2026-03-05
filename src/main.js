import { loadNews } from "./news.js";
import { loadReports } from "./reports.js";
import { loadMaterials } from "./materials.js";
const loaders = {
  news: loadNews,
  reports: loadReports,
  materials: loadMaterials,
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
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    activateSection(link.dataset.section);
  });
});

// Загрузка па хэшу або па змаўчанні
const hash = location.hash.replace("#", "");
activateSection(loaders[hash] ? hash : "news");
