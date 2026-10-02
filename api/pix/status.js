const { blackcat } = require("../../lib/blackcat");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Use GET" });
  }
  const id = String((req.query && req.query.id) || "").trim();
  if (!id) {
    return res.status(400).json({ success: false, message: "id obrigatório" });
  }
  const { status, data } = await blackcat("GET", "/sales/" + encodeURIComponent(id) + "/status");
  return res.status(status).json(data);
};
