(function (root) {
  function digits(v) {
    return String(v || "").replace(/\D/g, "");
  }
  function mapsLink(query) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query || "Brasil");
  }
  function ensureCss() {
    if (document.getElementById("entrega-map-css")) return;
    var s = document.createElement("style");
    s.id = "entrega-map-css";
    s.textContent =
      ".entrega-map-wrap{position:relative;display:block;width:100%;min-height:220px;border-radius:14px;overflow:hidden;background:#dce8d8}" +
      ".entrega-map-tiles{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:220px}" +
      ".entrega-map-tiles img{width:100%;height:100%;object-fit:cover;display:block;border:0}" +
      ".entrega-map-pin{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-22px 0 0 -11px;background:#e11d48;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.35);z-index:2;pointer-events:none}" +
      ".entrega-map-open{position:absolute;left:8px;right:8px;bottom:8px;z-index:3;display:block;background:#fff;color:#111;text-align:center;font:800 12px/1.2 sans-serif;padding:8px 10px;border-radius:10px;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.15)}" +
      ".entrega-map-fallback,.entrega-map-loading{display:flex;align-items:center;justify-content:center;min-height:220px;padding:16px;text-align:center;font:800 13px/1.4 sans-serif;color:#374151}";
    document.head.appendChild(s);
  }
  function tileUrl(kind, z, x, y) {
    if (kind === "carto") return "https://a.basemaps.cartocdn.com/rastertiles/voyager/" + z + "/" + x + "/" + y + ".png";
    return "https://tile.openstreetmap.org/" + z + "/" + x + "/" + y + ".png";
  }
  function tileFrac(lat, lon, zoom) {
    var n = Math.pow(2, zoom);
    var x = ((lon + 180) / 360) * n;
    var latRad = (lat * Math.PI) / 180;
    var y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
    return { x: x, y: y };
  }
  function paintTiles(el, query, coords) {
    var href = mapsLink(query);
    var zoom = 16;
    var frac = tileFrac(coords.lat, coords.lon, zoom);
    var cx = Math.floor(frac.x);
    var cy = Math.floor(frac.y);
    var tiles = "";
    var i, j;
    for (j = cy - 1; j <= cy + 1; j++) {
      for (i = cx - 1; i <= cx + 1; i++) {
        tiles +=
          '<img alt="" draggable="false" data-z="' +
          zoom +
          '" data-x="' +
          i +
          '" data-y="' +
          j +
          '" src="' +
          tileUrl("osm", zoom, i, j) +
          '">';
      }
    }
    el.innerHTML =
      '<div class="entrega-map-wrap">' +
      '<div class="entrega-map-tiles">' +
      tiles +
      "</div>" +
      '<div class="entrega-map-pin"></div>' +
      '<a class="entrega-map-open" target="_blank" rel="noopener noreferrer" href="' +
      href +
      '">Abrir local da entrega</a>' +
      "</div>";
    var wrap = el.querySelector(".entrega-map-tiles");
    if (!wrap) return;
    wrap.querySelectorAll("img").forEach(function (img) {
      img.onerror = function () {
        img.onerror = null;
        img.src = tileUrl("carto", img.getAttribute("data-z"), img.getAttribute("data-x"), img.getAttribute("data-y"));
      };
    });
  }
  function paintFallback(el, query) {
    el.innerHTML =
      '<div class="entrega-map-wrap"><a class="entrega-map-fallback" target="_blank" rel="noopener noreferrer" href="' +
      mapsLink(query) +
      '">Ver local da entrega no mapa</a></div>';
  }
  function brasilCoords(cep) {
    var d = digits(cep);
    if (d.length !== 8) return Promise.resolve(null);
    return fetch("https://brasilapi.com.br/api/cep/v2/" + d)
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        var c = j && j.location && j.location.coordinates;
        if (!c) return null;
        var lat = parseFloat(c.latitude);
        var lon = parseFloat(c.longitude);
        return isFinite(lat) && isFinite(lon) ? { lat: lat, lon: lon } : null;
      })
      .catch(function () {
        return null;
      });
  }
  function photonCoords(query) {
    return fetch("https://photon.komoot.io/api/?limit=1&lang=pt&q=" + encodeURIComponent(query || ""))
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        var g = j && j.features && j.features[0] && j.features[0].geometry;
        if (!g || !g.coordinates) return null;
        var lon = parseFloat(g.coordinates[0]);
        var lat = parseFloat(g.coordinates[1]);
        return isFinite(lat) && isFinite(lon) ? { lat: lat, lon: lon } : null;
      })
      .catch(function () {
        return null;
      });
  }
  function renderEntregaMap(el, opts) {
    if (!el) return;
    ensureCss();
    opts = opts || {};
    var query = String(opts.query || "").trim() || "Brasil";
    el.innerHTML = '<div class="entrega-map-loading">Localizando no mapa…</div>';
    brasilCoords(opts.cep)
      .then(function (coords) {
        return coords || photonCoords(query);
      })
      .then(function (coords) {
        if (coords) paintTiles(el, query, coords);
        else paintFallback(el, query);
      });
  }
  function renderPixQr(img, code) {
    if (!img || !code) return;
    img.style.display = "block";
    try {
      if (typeof qrcode === "function") {
        var qr = qrcode(0, "M");
        qr.addData(String(code), "Byte");
        qr.make();
        img.onerror = null;
        img.src = qr.createDataURL(6, 4);
        return;
      }
    } catch (_) {}
    var encoded = encodeURIComponent(code);
    var list = [
      "https://quickchart.io/qr?format=png&size=240&margin=1&text=" + encoded,
      "https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=M&margin=1&data=" + encoded,
    ];
    var n = 0;
    img.onerror = function () {
      n += 1;
      if (n < list.length) img.src = list[n];
    };
    img.src = list[0];
  }
  root.renderEntregaMap = renderEntregaMap;
  root.renderPixQr = renderPixQr;
})(window);
