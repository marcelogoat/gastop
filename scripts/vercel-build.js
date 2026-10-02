const fs = require("fs");

fs.rmSync("public", { recursive: true, force: true });
fs.mkdirSync("public", { recursive: true });
fs.copyFileSync("index.html", "public/index.html");
fs.cpSync("distribuidora", "public/distribuidora", { recursive: true });
