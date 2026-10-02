export function getConfig() {
  const secret = process.env.BLACKCAT_SECRET_KEY || "";
  const publicKey = process.env.BLACKCAT_PUBLIC_KEY || "";
  const api = (process.env.BLACKCAT_API || "https://api.blackcatoficial.com/api").replace(/\/$/, "");
  return { secret, publicKey, api };
}

export async function blackcat(method, path, body) {
  const { secret, api } = getConfig();
  if (!secret) {
    return {
      status: 500,
      data: { success: false, message: "BLACKCAT_SECRET_KEY não configurada no ambiente." },
    };
  }
  const res = await fetch(api + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": secret,
      Authorization: "Bearer " + secret,
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { success: false, message: raw || res.statusText };
  }
  return { status: res.status, data };
}
