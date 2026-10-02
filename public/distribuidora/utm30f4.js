/* Captura da origem do tráfego (Google Ads, Meta, orgânico).
 *
 * Carregado em todas as páginas públicas. Normaliza o que chega na URL
 * para os campos que o painel e o Supabase já conhecem, guarda em
 * localStorage sob "gs_utm" e dispara o pageview.
 */
(function (w, d) {
  var STORE = "gs_utm";
  var MAX_AGE = 30 * 24 * 60 * 60 * 1000; // janela de conversão do Google Ads

  // Cada campo canônico aceita vários apelidos: o UTM padrão, o nome
  // interno antigo e o ValueTrack cru do Google Ads. Sem isso um
  // "utm_term={keyword}" (o modelo que o próprio Google sugere) era
  // descartado na entrada.
  var FIELDS = {
    utm_source: ["utm_source"],
    utm_medium: ["utm_medium"],
    utm_campaign: ["utm_campaign", "campaignid", "campaign_id"],
    utm_campaign_name: ["utm_campaign_name", "campaign_name", "campaignname"],
    utm_adgroup: ["utm_adgroup", "adgroupid", "adgroup_id", "adgroup", "adset_name"],
    utm_ad: ["utm_ad", "utm_content", "creative", "adid", "ad_id", "ad_name"],
    utm_keyword: ["utm_keyword", "utm_term", "keyword", "search_term"],
    utm_matchtype: ["utm_matchtype", "matchtype"],
    utm_device: ["utm_device", "device"],
    utm_network: ["utm_network", "network"],
    gclid: ["gclid", "gbraid", "wbraid"],
    msclkid: ["msclkid"],
    fbclid: ["fbclid"],
    src: ["src"],
    sck: ["sck"]
  };

  // O ValueTrack manda letra solta; no painel isso não diz nada.
  var MATCHTYPE = { e: "exata", p: "frase", b: "ampla" };
  var DEVICE = { m: "celular", t: "tablet", c: "desktop" };
  var NETWORK = {
    g: "busca",
    s: "parceiro de busca",
    d: "display",
    u: "shopping",
    ytv: "youtube",
    vp: "parceiro de video"
  };
  var BUSCADORES = /(?:^|\.)(google|bing|yahoo|duckduckgo|ecosia|yandex)\./;
  // Parametros que so o Google Ads gera: valem como prova de origem.
  var MARCAS_GOOGLE = ["campaignid", "adgroupid", "matchtype", "network", "creative"];

  function readParams() {
    var raw = String(w.location.search || "").replace(/^\?/, "");
    var hash = String(w.location.hash || "").replace(/^#/, "");
    // Alguns encurtadores e redirecionadores jogam a query depois do "#".
    if (hash.indexOf("=") > -1) raw = raw ? raw + "&" + hash : hash;

    var out = {};
    raw.split("&").forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf("=");
      var k = i < 0 ? pair : pair.slice(0, i);
      var v = i < 0 ? "" : pair.slice(i + 1);
      try {
        k = decodeURIComponent(k.replace(/\+/g, " "));
        v = decodeURIComponent(v.replace(/\+/g, " "));
      } catch (e) {}
      k = k.trim().toLowerCase();
      v = v.trim();
      // Placeholder não substituído ("{keyword}") é lixo, não origem.
      if (!k || !v || /^\{.*\}$/.test(v)) return;
      if (out[k] === undefined) out[k] = v;
    });
    return out;
  }

  function loadCookie() {
    try {
      var parts = ("; " + (d.cookie || "")).split("; " + STORE + "=");
      if (parts.length < 2) return {};
      return JSON.parse(decodeURIComponent(parts.pop().split(";")[0])) || {};
    } catch (e) {
      return {};
    }
  }

  function loadSaved() {
    var saved = {};
    try {
      saved = JSON.parse(w.localStorage.getItem(STORE) || "{}") || {};
    } catch (e) {}
    if (!saved || !Object.keys(saved).length) saved = loadCookie();
    if (saved.ts && Date.now() - Number(saved.ts) > MAX_AGE) {
      return { sid: saved.sid }; // atribuição vencida, visitante continua o mesmo
    }
    return saved;
  }

  function persist(data) {
    var raw = JSON.stringify(data);
    try {
      w.localStorage.setItem(STORE, raw);
    } catch (e) {}
    try {
      d.cookie =
        STORE +
        "=" +
        encodeURIComponent(raw) +
        ";path=/distribuidora;max-age=2592000;samesite=lax";
    } catch (e) {}
  }

  function referrerSource() {
    var host = "";
    try {
      host = new URL(String(d.referrer || "")).hostname.toLowerCase();
    } catch (e) {
      return null;
    }
    if (!host || host === String(w.location.hostname).toLowerCase()) return null;
    // "google.com.br" e "google.com" viram a mesma linha no painel.
    var buscador = host.match(BUSCADORES);
    return buscador
      ? { utm_source: buscador[1], utm_medium: "organico" }
      : { utm_source: host.replace(/^www\./, ""), utm_medium: "referral" };
  }

  function expand(value, table) {
    var k = String(value || "").toLowerCase();
    return table[k] || value;
  }

  var utm = loadSaved();
  var q = readParams();
  var novaOrigem = false;

  Object.keys(FIELDS).forEach(function (canon) {
    var aliases = FIELDS[canon];
    for (var i = 0; i < aliases.length; i++) {
      if (q[aliases[i]]) {
        utm[canon] = q[aliases[i]];
        novaOrigem = true;
        return;
      }
    }
  });

  Object.keys(q).forEach(function (k) {
    if (utm[k]) return;
    if (k.indexOf("utm_") === 0 || /clid$/.test(k)) {
      utm[k] = q[k];
      novaOrigem = true;
    }
  });

  // Com auto-tagging o Google manda só o clique; sem inferir a origem
  // toda venda paga aparecia como "(direto / sem UTM)".
  var marcado = MARCAS_GOOGLE.some(function (k) {
    return !!q[k];
  });
  if (!utm.utm_source) {
    if (utm.gclid || marcado) utm.utm_source = "google";
    else if (utm.msclkid) utm.utm_source = "bing";
    else if (utm.fbclid) utm.utm_source = "facebook";
    if (utm.utm_source) utm.utm_medium = utm.utm_medium || "cpc";
  }
  if (!utm.utm_source) {
    var ref = referrerSource();
    if (ref) {
      utm.utm_source = ref.utm_source;
      utm.utm_medium = utm.utm_medium || ref.utm_medium;
    }
  }

  if (utm.utm_matchtype) utm.utm_matchtype = expand(utm.utm_matchtype, MATCHTYPE);
  if (utm.utm_device) utm.utm_device = expand(utm.utm_device, DEVICE);
  if (utm.utm_network) utm.utm_network = expand(utm.utm_network, NETWORK);

  if (!utm.sid) {
    utm.sid =
      w.crypto && w.crypto.randomUUID
        ? w.crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(16).slice(2);
  }
  if (novaOrigem || !utm.ts) utm.ts = Date.now();

  persist(utm);

  w.GS_UTM = utm;
  w.gsUtm = function () {
    return w.GS_UTM || {};
  };

  try {
    fetch("/distribuidora/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "pageview",
        page: w.location.pathname || "/",
        utm: utm,
        sid: utm.sid
      })
    }).catch(function () {});
  } catch (e) {}
})(window, document);
