const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const REPO = import.meta.env.VITE_GITHUB_REPO;
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH || "main";

export async function getFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  const content = decodeURIComponent(
    atob(data.content.replace(/\n/g, ""))
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
  return { json: JSON.parse(content), sha: data.sha };
}
export async function saveFile(path, content, sha, isRetry = false) {
  let currentSha = sha;

  if (!currentSha) {
    const fresh = await getFile(path);
    currentSha = fresh.sha;
  }

  const encoded = btoa(
    unescape(encodeURIComponent(JSON.stringify(content, null, 2))),
  );

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Дадаем час, каб кожны коміт быў унікальным
        message: `admin: update ${path} at ${new Date().toISOString()}`,
        content: encoded,
        sha: currentSha,
        branch: BRANCH,
      }),
    },
  );

  if (!res.ok) {
    if (res.status === 409 && !isRetry) {
      console.warn("SHA Conflict. Спрабую апошні раз з новым SHA...");
      await new Promise((r) => setTimeout(r, 1000));
      const fresh = await getFile(path);
      return saveFile(path, content, fresh.sha, true);
    }
    throw new Error(`GitHub API error: ${res.status}`);
  }
  return await res.json();
}
export async function uploadFile(path, file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Праверым ці існуе файл
  let existingSha = null;
  try {
    const existing = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (existing.ok) {
      const data = await existing.json();
      existingSha = data.sha;
    }
  } catch {}

  const body = {
    message: "admin: upload image",
    content: base64,
    branch: BRANCH,
  };
  if (existingSha) body.sha = existingSha;

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) throw new Error(`Upload error: ${res.status}`);
  return await res.json();
}
