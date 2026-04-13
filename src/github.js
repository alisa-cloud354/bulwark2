const BASE_URL = "";

function getHeaders() {
  const token = sessionStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getFile(path) {
  // Мы стукаемся да СЯБЕ ў API, а не ў GitHub напрамую
  const res = await fetch(
    `${BASE_URL}/api/github?path=${encodeURIComponent(path)}`,
    {
      headers: getHeaders(),
    },
  );

  if (!res.ok) throw new Error(`Памылка API: ${res.status}`);
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
  const encoded = btoa(
    unescape(encodeURIComponent(JSON.stringify(content, null, 2))),
  );

  const res = await fetch(
    `${BASE_URL}/api/github?path=${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        message: `admin: update ${path}`,
        content: encoded,
        sha: sha,
      }),
    },
  );

  if (!res.ok) {
    if (res.status === 409 && !isRetry) {
      const fresh = await getFile(path);
      return saveFile(path, content, fresh.sha, true);
    }
    throw new Error(`Памылка захавання: ${res.status}`);
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

  let existingSha = null;
  try {
    const check = await fetch(
      `${BASE_URL}/api/github?path=${encodeURIComponent(path)}`,
      {
        headers: getHeaders(),
      },
    );
    if (check.ok) {
      const data = (await check.ok) ? await check.json() : null;
      if (data) existingSha = data.sha;
    }
  } catch {
    // Ігнаруем памылку: калі файл не знойдзены, existingSha застанецца null, гэта нармальна
  }

  const res = await fetch(
    `${BASE_URL}/api/github?path=${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        message: "admin: upload image",
        content: base64,
        sha: existingSha,
      }),
    },
  );

  if (!res.ok) throw new Error(`Памылка загрузкі: ${res.status}`);
  return await res.json();
}
