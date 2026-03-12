import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

export function createEditor(elementId, content = "") {
  const editor = new Editor({
    element: document.getElementById(elementId),
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
    ],
    content,
  });
  document.getElementById(elementId).addEventListener("click", () => {
    editor.commands.focus();
  });
  const toolbar = document.createElement("div");
  toolbar.style.cssText =
    "display:flex; gap:4px; padding:8px; background:#f5f5f5; border:1px solid #ccc; border-bottom:none; flex-wrap:wrap;";

  const btns = [
    {
      label: "H2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "H3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "H4",
      action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    },
    { label: "B", action: () => editor.chain().focus().toggleBold().run() },
    { label: "I", action: () => editor.chain().focus().toggleItalic().run() },
    {
      label: "• Спіс",
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "1. Спіс",
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Спасылка",
      action: () => {
        const url = prompt("URL:");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      },
    },
    {
      label: "Тэкст",
      action: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: "Ачысціць фармат",
      action: () => editor.chain().focus().unsetAllMarks().run(),
    },
  ];

  btns.forEach(({ label, action }) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.type = "button";
    btn.style.cssText =
      "padding:4px 10px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid #ccc; background:#fff;";
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      action();
    });
    toolbar.appendChild(btn);
  });

  const editorEl = document.getElementById(elementId);
  editorEl.parentNode.insertBefore(toolbar, editorEl);

  return editor;
}

export function toInputDate(str) {
  if (!str) return "";
  const [d, m, y] = str.split(".");
  return `${y}-${m}-${d}`;
}

export function fromInputDate(str) {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}.${m}.${y}`;
}

export function createLangTabs(langs, activeLang) {
  return langs
    .map(
      (l) => `
    <button data-lang="${l}" class="lang-tab" style="padding:8px 16px; font-size:12px; font-weight:700; text-transform:uppercase; cursor:pointer; border:1px solid ${l === activeLang ? "#dc2626" : "#333"}; background:${l === activeLang ? "#dc2626" : "transparent"}; color:${l === activeLang ? "#fff" : "#666"};">
      ${l.toUpperCase()}
    </button>
  `,
    )
    .join("");
}
