#!/usr/bin/env python3
"""Serve the store and proxy PIX calls to BlackCat. Secret key stays on the server."""
from __future__ import annotations

import json
import os
import posixpath
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATIC = ROOT
ENV_PATH = ROOT / ".env"


def load_env():
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip())


load_env()
API = os.environ.get("BLACKCAT_API", "https://api.blackcatoficial.com/api").rstrip("/")
SECRET = os.environ.get("BLACKCAT_SECRET_KEY", "")


def api_request(method: str, path: str, body=None):
    if not SECRET:
        raise RuntimeError("BLACKCAT_SECRET_KEY ausente no .env")
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "X-API-Key": SECRET,
            "Authorization": "Bearer " + SECRET,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {"message": exc.reason}
        except json.JSONDecodeError:
            parsed = {"message": raw or exc.reason}
        return exc.code, parsed


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            super().log_message(fmt, *args)

    def _json(self, code, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self):
        path = posixpath.normpath(self.path.split("?", 1)[0])
        if path == "/api/pix/status":
            q = {}
            if "?" in self.path:
                for part in self.path.split("?", 1)[1].split("&"):
                    if "=" in part:
                        k, v = part.split("=", 1)
                        q[k] = v
            tx = q.get("id") or ""
            if not tx:
                return self._json(400, {"success": False, "message": "id obrigatório"})
            status, data = api_request("GET", f"/sales/{tx}/status")
            return self._json(status, data)
        return super().do_GET()

    def do_POST(self):
        path = posixpath.normpath(self.path.split("?", 1)[0])
        if path != "/api/pix/create":
            self.send_error(404)
            return
        try:
            payload = self._read_json()
        except Exception:
            return self._json(400, {"success": False, "message": "JSON inválido"})

        status, data = api_request("POST", "/sales/create-sale", payload)
        return self._json(status, data)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Servidor em http://localhost:{port}/distribuidora/")
    httpd.serve_forever()
