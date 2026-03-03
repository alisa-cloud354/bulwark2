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
export async function saveFile(path, content, sha) {
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
        message: "admin: update news",
        content: encoded,
        sha: sha,
        branch: BRANCH,
      }),
    },
  );

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return await res.json();
}
