const { blackcat } = require("../../lib/blackcat");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Use POST" });
  }
  let payload = {};
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    return res.status(400).json({ success: false, message: "JSON inválido" });
  }
  const { status, data } = await blackcat("POST", "/sales/create-sale", payload);
  return res.status(status).json(data);
};
