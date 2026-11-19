import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import tls from "node:tls";
import { spawn } from "node:child_process";
const E = process.env;
const UC = (E.DEPO_UC || "").replace(/\/$/, "");
const HOST = UC.replace(/^https?:\/\//, "");
const KOVA = E.DEPO_KOVA, BOLGE = E.DEPO_BOLGE || "default";
const AG = (E.AG || "mainnet").trim(), TEST = AG === "chipnet", ONEK = TEST ? "bchtest" : "bitcoincash", KAYIT_ONEK = TEST ? "test/" : "";
const ERISIM = E.DEPO_ERISIM, GIZLI = E.DEPO_GIZLI, BILET_SIRRI = (TEST ? E.TEST_BILET_SIRRI : E.GRAMOFON_BILET_SIRRI) || "";
const PORT = Number(E.PORT || 8115);
const KOKENLER = (E.IZINLI_KOKENLER || "https://gramofon.heylogram.com,https://dapp.gramofon.heylogram.com,http://localhost:8802").split(",").map((s) => s.trim()).filter(Boolean);
const ODEME_ADRESI = (E.GRAMOFON_ODEME_ADRESI || "").trim();
const UYELIK_USD = Number(E.UYELIK_USD || 2), UYELIK_GUN = Number(E.UYELIK_GUN || 30);
const YUKLEME_USD = Number(E.YUKLEME_USD || 0.5), YUKLEME_GUN = Number(E.YUKLEME_GUN || 30);
const SES_SINIR = Number(E.SES_SINIR_MB || 200) * 1048576, KAPAK_SINIR = Number(E.KAPAK_SINIR_MB || 15) * 1048576;
const ELECTRUM = (E.ELECTRUM_SUNUCULARI || (TEST ? "chipnet.imaginary.cash:50002,chipnet.bch.ninja:50002,chipnet.c3-soft.com:64002" : "bch.imaginary.cash:50002,bch.loping.net:50002,electrum.imaginary.cash:50002,bch.soul-dev.com:50002")).split(",").map((s) => {
  const [h, p] = s.trim().split(":");
  return { h, p: Number(p) };
});
const VERI = E.VERI_KLASORU || "/veri";
const ADRES_DESENI = new RegExp("^" + ONEK + ":[qp][02-9ac-hj-np-z]{41}$");
if (!UC || !KOVA || !ERISIM || !GIZLI) {
  console.error("depo ayarı eksik");
  process.exit(1);
}
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const hm = (k, v) => crypto.createHmac("sha256", k).update(v).digest();
const BOS = sha("");
function imzali(yontem, yol, ozet = BOS) {
  const t = (new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const gun = t.slice(0, 8);
  const b = { host: HOST, "x-amz-content-sha256": ozet, "x-amz-date": t };
  const adlar = Object.keys(b).sort();
  const kanonik = [yontem, yol, "", adlar.map((k) => `${k}:${b[k]}
`).join(""), adlar.join(";"), ozet].join("\n");
  const kapsam = `${gun}/${BOLGE}/s3/aws4_request`;
  const anahtar = hm(hm(hm(hm("AWS4" + GIZLI, gun), BOLGE), "s3"), "aws4_request");
  const imza = crypto.createHmac("sha256", anahtar).update(["AWS4-HMAC-SHA256", t, kapsam, sha(kanonik)].join("\n")).digest("hex");
  return {
    "x-amz-content-sha256": ozet,
    "x-amz-date": t,
    authorization: `AWS4-HMAC-SHA256 Credential=${ERISIM}/${kapsam}, SignedHeaders=${adlar.join(";")}, Signature=${imza}`
  };
}
function depo(yontem, anahtar, ek = {}) {
  const yol = `/${KOVA}/${anahtar}`;
  return fetch(UC + yol, { method: yontem, headers: { ...imzali(yontem, yol), ...ek } });
}
function depoKoy(anahtar, govde, tur, ozet, boy) {
  const yol = `/${KOVA}/${anahtar}`, u = new URL(UC + yol);
  return new Promise((ok, red) => {
    const r = (u.protocol === "http:" ? http : https).request(u, {
      method: "PUT",
      timeout: 3e5,
      headers: { ...imzali("PUT", yol, ozet), "content-type": tur, "content-length": boy }
    }, (c) => {
      c.resume();
      c.on("end", () => c.statusCode === 200 ? ok() : red(new Error("depo " + c.statusCode)));
    });
    r.on("timeout", () => r.destroy(new Error("depo zaman aşımı")));
    r.on("error", red);
    if (Buffer.isBuffer(govde)) r.end(govde);
    else {
      govde.on("error", (e) => r.destroy(e));
      govde.pipe(r);
    }
  });
}
function imzalaPaket(onek, veri) {
  const yuk = Buffer.from(JSON.stringify(veri)).toString("base64url");
  return yuk + "." + crypto.createHmac("sha256", BILET_SIRRI).update(onek + yuk).digest("base64url");
}
function paketCoz(onek, paket) {
  if (!BILET_SIRRI || typeof paket !== "string" || paket.length > 600) return null;
  const [yuk, imza] = paket.split(".");
  if (!yuk || !imza) return null;
  const beklenen = Buffer.from(crypto.createHmac("sha256", BILET_SIRRI).update(onek + yuk).digest("base64url"));
  const gelen = Buffer.from(imza);
  if (gelen.length !== beklenen.length || !crypto.timingSafeEqual(gelen, beklenen)) return null;
  try {
    return JSON.parse(Buffer.from(yuk, "base64url").toString());
  } catch {
    return null;
  }
}
const biletDogru = (b) => {
  const v = paketCoz("", b);
  return !!v && Number(v.b) * 1e3 > Date.now();
};
let onbellek = { veri: null, zaman: 0 };
async function katalog() {
  if (onbellek.veri && Date.now() - onbellek.zaman < 6e4) return onbellek.veri;
  const c = await depo("GET", "katalog.json");
  let veri = { sarkilar: [] };
  if (c.ok) veri = await c.json();
  else {
    await c.body?.cancel();
    if (c.status !== 404) throw new Error("depo " + c.status);
  }
  onbellek = { veri, zaman: Date.now() };
  return veri;
}
const GUVENLI = ["id", "ad", "sanatci", "sure", "bpm", "ilkVurus", "renk", "tur", "hava", "kazanc", "kapak"];
async function kapak(req, res, id, boy) {
  const s = ((await katalog()).sarkilar || []).find((x) => x.id === id);
  if (!s || !s.kapak) return yanit(req, res, 404, { hata: "kapak yok" });
  const c = await depo("GET", `kapaklar/${id}-${boy}.jpg`);
  if (!c.ok) {
    await c.body?.cancel();
    return yanit(req, res, c.status === 404 ? 404 : 502, { hata: "depo" });
  }
  const h = { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" };
  const uzunluk = c.headers.get("content-length");
  if (uzunluk) h["content-length"] = uzunluk;
  res.writeHead(200, { ...cors(req), ...h });
  if (req.method === "HEAD") {
    await c.body?.cancel();
    return res.end();
  }
  Readable.fromWeb(c.body).on("error", () => res.destroy()).pipe(res);
}
const disari = (s) => Object.fromEntries(GUVENLI.filter((k) => s[k] != null).map((k) => [k, s[k]]));
const SES_KLASORU = path.join(VERI, "onbellek");
const SES_SINIRI = Number(E.SES_ONBELLEK_MB || 2048) * 1048576;
const SES_TURU = { flac: "audio/flac", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", opus: "audio/ogg", wav: "audio/wav" };
const iniyor = new Set();
try {
  fs.mkdirSync(SES_KLASORU, { recursive: true });
  for (const a of fs.readdirSync(SES_KLASORU)) if (a.startsWith(".")) fs.rmSync(path.join(SES_KLASORU, a), { force: true });
} catch {
}
function diskten(req, res, dosya) {
  const yol = path.join(SES_KLASORU, dosya);
  let st;
  try {
    st = fs.statSync(yol);
  } catch {
    return false;
  }
  const boy = st.size;
  let bas = 0, son = boy - 1, kod = 200;
  const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (r && (r[1] !== "" || r[2] !== "")) {
    if (r[1] === "") bas = Math.max(0, boy - Number(r[2]));
    else {
      bas = Number(r[1]);
      if (r[2] !== "") son = Math.min(son, Number(r[2]));
    }
    if (bas >= boy || bas > son) {
      res.writeHead(416, { ...cors(req), "content-range": `bytes */${boy}` });
      res.end();
      return true;
    }
    kod = 206;
  }
  const h = {
    "content-type": SES_TURU[dosya.split(".").pop()] || "application/octet-stream",
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=3600",
    "content-length": String(son - bas + 1),
    "last-modified": st.mtime.toUTCString()
  };
  if (kod === 206) h["content-range"] = `bytes ${bas}-${son}/${boy}`;
  res.writeHead(kod, { ...cors(req), ...h });
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  fs.utimes(yol, new Date(), st.mtime, () => {
  });
  fs.createReadStream(yol, { start: bas, end: son }).on("error", () => res.destroy()).pipe(res);
  return true;
}
async function diskeIndir(dosya) {
  if (iniyor.has(dosya) || iniyor.size >= 3) return;
  iniyor.add(dosya);
  const gecici = path.join(SES_KLASORU, `.${dosya}.${process.pid}`);
  try {
    const d = await fs.promises.statfs(SES_KLASORU);
    if (d.bavail * d.bsize < 10 * 1073741824) return;
    const c = await depo("GET", "sarkilar/" + dosya);
    if (c.status !== 200) {
      await c.body?.cancel();
      return;
    }
    await pipeline(Readable.fromWeb(c.body), fs.createWriteStream(gecici, { mode: 384 }));
    await fs.promises.rename(gecici, path.join(SES_KLASORU, dosya));
    await diskiBuda();
  } catch {
    await fs.promises.rm(gecici, { force: true }).catch(() => {
    });
  } finally {
    iniyor.delete(dosya);
  }
}
async function diskiBuda() {
  const adlar = (await fs.promises.readdir(SES_KLASORU)).filter((a) => !a.startsWith("."));
  const d = await Promise.all(adlar.map(async (a) => {
    const s = await fs.promises.stat(path.join(SES_KLASORU, a));
    return { a, boy: s.size, son: s.atimeMs };
  }));
  let toplam = d.reduce((t, x) => t + x.boy, 0);
  for (const x of d.sort((p, q) => p.son - q.son)) {
    if (toplam <= SES_SINIRI) break;
    await fs.promises.rm(path.join(SES_KLASORU, x.a), { force: true });
    toplam -= x.boy;
  }
}
function cors(req) {
  const o = req.headers.origin;
  return o && KOKENLER.includes(o) ? { "access-control-allow-origin": o, vary: "Origin", "access-control-expose-headers": "content-length, content-range, accept-ranges" } : {};
}
function yanit(req, res, kod, govde, saniye = 0) {
  res.writeHead(kod, {
    ...cors(req),
    "content-type": "application/json; charset=utf-8",
    "cache-control": saniye ? `public, max-age=${saniye}` : "no-store"
  });
  res.end(JSON.stringify(govde));
}
async function dinle(req, res, id, bilet) {
  if (!biletDogru(bilet)) return yanit(req, res, 401, { hata: "bilet gerekli" });
  const s = ((await katalog()).sarkilar || []).find((x) => x.id === id);
  if (!s || !/^[a-z0-9][a-z0-9._-]{0,90}$/.test(s.dosya || "")) return yanit(req, res, 404, { hata: "şarkı yok" });
  if (diskten(req, res, s.dosya)) return;
  if (req.method === "GET") diskeIndir(s.dosya);
  const ek = {};
  if (/^bytes=\d*-\d*$/.test(req.headers.range || "")) ek.range = req.headers.range;
  const c = await depo("GET", "sarkilar/" + s.dosya, ek);
  if (c.status !== 200 && c.status !== 206) {
    await c.body?.cancel();
    return yanit(req, res, c.status === 404 ? 404 : c.status === 416 ? 416 : 502, { hata: "depo" });
  }
  const h = { "content-type": c.headers.get("content-type") || "audio/mpeg", "accept-ranges": "bytes", "cache-control": "private, max-age=3600" };
  for (const k of ["content-length", "content-range", "etag", "last-modified"]) {
    const v = c.headers.get(k);
    if (v) h[k] = v;
  }
  res.writeHead(c.status, { ...cors(req), ...h });
  if (req.method === "HEAD") {
    await c.body?.cancel();
    return res.end();
  }
  Readable.fromWeb(c.body).on("error", () => res.destroy()).pipe(res);
}
function electrum(sunucu2, istekler, sure = 15e3) {
  return new Promise((ok, red) => {
    const sonuc = new Array(istekler.length);
    let kalan = istekler.length, tampon = "";
    const s = tls.connect({ host: sunucu2.h, port: sunucu2.p, servername: sunucu2.h, rejectUnauthorized: false }, () => {
      s.write(istekler.map(([m, p], i) => JSON.stringify({ jsonrpc: "2.0", id: i, method: m, params: p })).join("\n") + "\n");
    });
    const bitir = (hata) => {
      clearTimeout(zaman);
      s.destroy();
      hata ? red(hata) : ok(sonuc);
    };
    const zaman = setTimeout(() => bitir(new Error("electrum zaman aşımı")), sure);
    s.setEncoding("utf8");
    s.on("data", (d) => {
      tampon += d;
      let i;
      while ((i = tampon.indexOf("\n")) >= 0) {
        const satir = tampon.slice(0, i);
        tampon = tampon.slice(i + 1);
        if (!satir.trim()) continue;
        let m;
        try {
          m = JSON.parse(satir);
        } catch (e) {
          return bitir(e);
        }
        if (typeof m.id !== "number" || m.id >= sonuc.length) continue;
        sonuc[m.id] = m.error ? { hata: m.error.message || "hata" } : { sonuc: m.result };
        if (--kalan === 0) return bitir(null);
      }
    });
    s.on("error", bitir);
  });
}
async function electrumBiri(istekler) {
  let son;
  for (const s of [...ELECTRUM].sort(() => Math.random() - 0.5)) {
    try {
      return { sunucu: s.h, cevap: await electrum(s, istekler) };
    } catch (e) {
      son = e;
    }
  }
  throw son || new Error("electrum yok");
}
let kur = { usd: 0, zaman: 0 };
async function bchUsd() {
  if (Date.now() - kur.zaman < 6e4 && kur.usd > 0) return kur.usd;
  const al = (u, f) => fetch(u, { headers: { "user-agent": "gramofon/1.0" }, signal: AbortSignal.timeout(8e3) }).then((r) => r.json()).then(f);
  const [k, c] = await Promise.all([
    al("https://api.kraken.com/0/public/Ticker?pair=BCHUSD", (j) => Number(Object.values(j.result)[0].c[0])),
    al("https://api.exchange.coinbase.com/products/BCH-USD/ticker", (j) => Number(j.price))
  ]);
  if (!(k > 0 && c > 0) || Math.abs(k - c) / Math.min(k, c) > 0.015) throw new Error("kur tutarsız");
  kur = { usd: (k + c) / 2, zaman: Date.now() };
  return kur.usd;
}
const ODEMELER = path.join(VERI, "odemeler.json"), BEKLEYENLER = path.join(VERI, "bekleyenler.json"), PARMAKIZI = path.join(VERI, "parmakizi.json");
let kayitlar = { txid: {}, teklif: {} }, bekleyen = { liste: [] };
let parmakizi = { kayitlar: {} };
const siralar = {}, yedekSaat = {};
function jsonYaz(dosya, veri, yedek) {
  siralar[dosya] = (siralar[dosya] || Promise.resolve()).then(() => {
    const gecici = dosya + ".yeni";
    fs.writeFileSync(gecici, JSON.stringify(veri), { mode: 384 });
    fs.renameSync(gecici, dosya);
  }).catch(() => {
  });
  depoyaYedekle(dosya, yedek);
  return siralar[dosya];
}
function depoyaYedekle(dosya, anahtar) {
  clearTimeout(yedekSaat[anahtar]);
  yedekSaat[anahtar] = setTimeout(async () => {
    try {
      const b = await fs.promises.readFile(dosya);
      await depoKoy(anahtar, b, "application/json", sha(b), b.length);
    } catch {
    }
  }, 5e3);
}
const kayitYaz = () => jsonYaz(ODEMELER, kayitlar, KAYIT_ONEK + "yonetim/odemeler.json");
const bekleyenYaz = () => jsonYaz(BEKLEYENLER, bekleyen, KAYIT_ONEK + "yonetim/bekleyenler.json");
const parmakiziYaz = () => jsonYaz(PARMAKIZI, parmakizi, KAYIT_ONEK + "yonetim/parmakizi.json");
const RADYO = path.join(VERI, "radyo.json"), RADYO_GUNLUK = 5, RADYO_EN_COK = 300;
let radyo = { liste: [] };
const radyoYaz = () => jsonYaz(RADYO, radyo, KAYIT_ONEK + "yonetim/radyo.json");
const radyoDisari = (e) => ({ tohum: e.tohum, zaman: e.zaman });
async function radyoGonder(req, res) {
  const g = await govdeOku(req, 4096);
  const v = paketCoz("", String(req.headers["x-bilet"] || ""));
  if (!v || !(Number(v.b) * 1e3 > Date.now())) return yanit(req, res, 401, { hata: "üyelik gerekli" });
  const tohum = Number(g.tohum);
  if (!Number.isInteger(tohum) || tohum < 1 || tohum > 9999999) return yanit(req, res, 400, { hata: "tohum" });
  const once = radyo.liste.find((x) => x.tohum === tohum);
  if (once) return yanit(req, res, 200, { ok: true, zaten: true, sarki: radyoDisari(once) });
  const kim = sha(Buffer.from("radyo:" + String(v.u || ""))).slice(0, 16), gun = simdiSn() - 86400;
  if (radyo.liste.filter((x) => x.kim === kim && x.zaman > gun).length >= RADYO_GUNLUK) return yanit(req, res, 429, { hata: "günlük sınır", sinir: RADYO_GUNLUK });
  if (radyo.liste.length >= RADYO_EN_COK) return yanit(req, res, 409, { hata: "liste dolu" });
  const e = { tohum, kim, zaman: simdiSn() };
  radyo.liste.push(e);
  await radyoYaz();
  yanit(req, res, 200, { ok: true, sarki: radyoDisari(e) });
}
async function kayitAc(dosya, anahtar, bos) {
  try {
    return JSON.parse(fs.readFileSync(dosya, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const c = await depo("GET", anahtar);
  if (c.status === 404) {
    await c.body?.cancel();
    return bos;
  }
  if (!c.ok) {
    await c.body?.cancel();
    throw new Error("kayıt kopyası okunamadı: depo " + c.status);
  }
  const v = await c.json();
  fs.writeFileSync(dosya, JSON.stringify(v), { mode: 384 });
  return v;
}
async function govdeOku(req, sinir = 16384) {
  let n = 0;
  const parcalar = [];
  for await (const p of req) {
    n += p.length;
    if (n > sinir) throw kodlu(413, "büyük");
    parcalar.push(p);
  }
  let v;
  try {
    v = JSON.parse(Buffer.concat(parcalar).toString("utf8") || "{}");
  } catch {
    throw kodlu(400, "bozuk istek");
  }
  return v && typeof v === "object" ? v : {};
}
async function teklifVer(req, res) {
  if (!ODEME_ADRESI || !BILET_SIRRI) return yanit(req, res, 503, { hata: "ödeme kapalı" });
  const g = await govdeOku(req);
  const yukleme = g.amac === "yukleme";
  const fiyat = yukleme ? YUKLEME_USD : UYELIK_USD;
  const usd = await bchUsd();
  const sat = Math.max(546, Math.ceil(fiyat / usd * 1e8));
  const bitis = Math.floor(Date.now() / 1e3) + 600;
  const teklif = imzalaPaket("teklif:", { s: sat, b: bitis, n: crypto.randomBytes(8).toString("hex"), ...yukleme ? { a: "y" } : {} });
  yanit(req, res, 200, {
    amac: yukleme ? "yukleme" : "uyelik",
    usd: fiyat,
    sat,
    kur: Math.round(usd * 100) / 100,
    adres: ODEME_ADRESI,
    gun: yukleme ? YUKLEME_GUN : UYELIK_GUN,
    gecerli: bitis,
    teklif
  });
}
const hakVer = (txid, k) => imzalaPaket("hak:", { t: txid, b: k.bitis });
async function utxoVer(req, res) {
  const g = await govdeOku(req);
  const adresler = Array.isArray(g.adresler) ? g.adresler.filter((a) => typeof a === "string" && ADRES_DESENI.test(a)).slice(0, 60) : [];
  if (!adresler.length) return yanit(req, res, 400, { hata: "adres yok" });
  const { cevap } = await electrumBiri(adresler.map((a) => ["blockchain.address.listunspent", [a]]));
  const utxolar = [];
  cevap.forEach((c, i) => {
    for (const u of c && c.sonuc || []) {
      if (u.token_data) continue;
      utxolar.push({ adres: adresler[i], txid: u.tx_hash, vout: u.tx_pos, sat: u.value, yukseklik: u.height });
    }
  });
  yanit(req, res, 200, { utxolar });
}
function cashaddrKilit(adres) {
  const ABC = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const [on, govde] = String(adres).toLowerCase().split(":");
  if (!on || !govde) return "";
  const v = [...govde].map((c2) => ABC.indexOf(c2));
  if (v.length < 9 || v.some((x) => x < 0)) return "";
  const UR = [0x98f2bc8e61n, 0x79b76d99e2n, 0xf33e5fb3c4n, 0xae2eabe2a8n, 0x1e4f43e470n];
  let c = 1n;
  for (const x of [...[...on].map((h) => h.charCodeAt(0) & 31), 0, ...v]) {
    const c0 = c >> 35n;
    c = (c & 0x07ffffffffn) << 5n ^ BigInt(x);
    for (let k = 0; k < 5; k++) if (c0 >> BigInt(k) & 1n) c ^= UR[k];
  }
  if ((c ^ 1n) !== 0n) return "";
  let acc = 0, bit = 0;
  const bayt = [];
  for (const x of v.slice(0, -8)) {
    acc = (acc << 5 | x) & 8191;
    bit += 5;
    while (bit >= 8) {
      bit -= 8;
      bayt.push(acc >> bit & 255);
    }
  }
  if (bayt[0] !== 0 || bayt.length < 21) return "";
  return "76a914" + Buffer.from(bayt.slice(1, 21)).toString("hex") + "88ac";
}
const ODEME_KILIDI = ODEME_ADRESI ? cashaddrKilit(ODEME_ADRESI) : "";
if (ODEME_ADRESI && !ODEME_KILIDI) console.error("ödeme adresi çözülemedi");
function hamCoz(hex) {
  try {
    const b = Buffer.from(hex, "hex");
    let i = 0;
    const al = (n) => {
      if (i + n > b.length) throw new Error("kısa");
      const s = b.subarray(i, i + n);
      i += n;
      return s;
    };
    const sayi = () => {
      const f = al(1)[0];
      return f < 253 ? f : f === 253 ? al(2).readUInt16LE(0) : f === 254 ? al(4).readUInt32LE(0) : Number(al(8).readBigUInt64LE(0));
    };
    al(4);
    const giris = sayi();
    if (giris < 1 || giris > 2e3) return null;
    for (let k = 0; k < giris; k++) {
      al(36);
      al(sayi());
      al(4);
    }
    const cikis = sayi();
    if (cikis < 1 || cikis > 2e3) return null;
    const ciktilar = [];
    for (let k = 0; k < cikis; k++) {
      const deger = Number(al(8).readBigUInt64LE(0));
      ciktilar.push({ deger, kilit: al(sayi()).toString("hex") });
    }
    al(4);
    if (i !== b.length) return null;
    const ozet = crypto.createHash("sha256").update(crypto.createHash("sha256").update(b).digest()).digest();
    return { txid: Buffer.from(ozet).reverse().toString("hex"), ciktilar };
  } catch {
    return null;
  }
}
function odemeyiBul(tx) {
  let toplam = 0;
  for (const o of tx && tx.vout || []) {
    const sp = o.scriptPubKey || {};
    const adresler = sp.addresses || (sp.address ? [sp.address] : []);
    if (ODEME_KILIDI && sp.hex === ODEME_KILIDI || adresler.includes(ODEME_ADRESI)) toplam += Math.round(Number(o.value) * 1e8);
  }
  return toplam;
}
async function yayinla(ham) {
  try {
    const { cevap } = await electrumBiri([["blockchain.transaction.broadcast", [ham]]]);
    const c = cevap[0] || {};
    if (c.sonuc) return { ok: true };
    const h = String(c.hata || "bilinmiyor");
    return /already|txn-already-known|in block ?chain/i.test(h) ? { ok: true } : { ok: false, hata: h };
  } catch (e) {
    return { ok: false, gecici: true, hata: String(e && e.message || e) };
  }
}
const isletme = (h) => h.split(".").slice(-2).join(".");
async function tamamla(req, res) {
  if (!ODEME_ADRESI || !BILET_SIRRI) return yanit(req, res, 503, { hata: "ödeme kapalı" });
  const g = await govdeOku(req, 65536);
  const txid = String(g.txid || "").toLowerCase();
  const kim = String(g.kim || "").slice(0, 100);
  const t = paketCoz("teklif:", g.teklif);
  if (!/^[0-9a-f]{64}$/.test(txid) || !t || !ADRES_DESENI.test(kim)) return yanit(req, res, 400, { hata: "eksik" });
  const ham = typeof g.ham === "string" && /^[0-9a-f]{120,60000}$/i.test(g.ham) ? g.ham.toLowerCase() : "";
  if (ham) {
    const coz = hamCoz(ham);
    if (!coz || coz.txid !== txid) return yanit(req, res, 400, { hata: "işlem bozuk" });
    const odenen = coz.ciktilar.filter((c) => c.kilit === ODEME_KILIDI).reduce((s, c) => s + c.deger, 0);
    if (!ODEME_KILIDI || odenen < t.s) return yanit(req, res, 400, { hata: "tutar eksik" });
  }
  if (kayitlar.txid[txid]) {
    const k = kayitlar.txid[txid];
    if (k.kim !== kim) return yanit(req, res, 409, { hata: "bu ödeme kullanıldı" });
    if (k.amac === "y") return yanit(req, res, 200, { hak: hakVer(txid, k), bitis: k.bitis, kullanildi: !!k.sarki });
    return yanit(req, res, 200, { bilet: imzalaPaket("", { u: kim, b: k.bitis }), bitis: k.bitis });
  }
  if (kayitlar.teklif[t.n]) return yanit(req, res, 409, { hata: "teklif kullanıldı" });
  const bagli = kayitlar.bagli || (kayitlar.bagli = {});
  if (bagli[txid] && bagli[txid].kim !== kim) return yanit(req, res, 409, { hata: "bu ödeme kullanıldı" });
  if (ham) {
    if (!bagli[txid]) {
      bagli[txid] = { kim, n: t.n, zaman: Math.floor(Date.now() / 1e3) };
      await kayitYaz();
    }
    const y = await yayinla(ham);
    if (!y.ok && !y.gecici) {
      delete bagli[txid];
      await kayitYaz();
      return yanit(req, res, 400, { hata: "ağ reddetti", detay: String(y.hata).split("\n")[0].slice(0, 160) });
    }
  }
  const gorenler = new Set();
  for (const s of [...ELECTRUM].sort(() => Math.random() - 0.5)) {
    if (gorenler.has(isletme(s.h))) continue;
    try {
      const [c] = await electrum(s, [["blockchain.transaction.get", [txid, true]]]);
      if (c && c.sonuc && odemeyiBul(c.sonuc) >= t.s) gorenler.add(isletme(s.h));
    } catch {
    }
    if (gorenler.size >= 2) break;
  }
  if (gorenler.size < 2) return yanit(req, res, 202, { hata: "ödeme henüz görülmedi", gorenler: gorenler.size });
  const yukleme = t.a === "y";
  const bitis = Math.floor(Date.now() / 1e3) + (yukleme ? YUKLEME_GUN : UYELIK_GUN) * 86400;
  kayitlar.txid[txid] = { kim, sat: t.s, zaman: Math.floor(Date.now() / 1e3), bitis, n: t.n, ...yukleme ? { amac: "y" } : {} };
  kayitlar.teklif[t.n] = txid;
  delete bagli[txid];
  await kayitYaz();
  if (yukleme) return yanit(req, res, 200, { hak: hakVer(txid, kayitlar.txid[txid]), bitis });
  yanit(req, res, 200, { bilet: imzalaPaket("", { u: kim, b: bitis }), bitis });
}
const GELEN = path.join(VERI, "gelen");
try {
  fs.mkdirSync(GELEN, { recursive: true });
  for (const a of fs.readdirSync(GELEN)) fs.rmSync(path.join(GELEN, a), { force: true });
} catch {
}
let yuklenen = 0;
const simdiSn = () => Math.floor(Date.now() / 1e3);
const kodlu = (kod, mesaj) => Object.assign(new Error(mesaj), { kod });
const temiz = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const EPOSTA = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,180}\.[a-z]{2,24}$/i;
function hakCoz(hak) {
  const v = paketCoz("hak:", hak);
  if (!v || Number(v.b) * 1e3 < Date.now()) return null;
  const k = kayitlar.txid[v.t];
  return k && k.amac === "y" ? { txid: v.t, k } : null;
}
function sesTuru(b) {
  const s = b.toString("latin1", 0, 12);
  if (s.startsWith("fLaC")) return ["flac", "audio/flac"];
  if (s.startsWith("RIFF") && s.slice(8, 12) === "WAVE") return ["wav", "audio/wav"];
  if (s.startsWith("FORM") && /^AIF[FC]$/.test(s.slice(8, 12))) return ["aiff", "audio/aiff"];
  if (s.startsWith("OggS")) return ["ogg", "audio/ogg"];
  if (s.slice(4, 8) === "ftyp") return ["m4a", "audio/mp4"];
  if (s.startsWith("ID3") || b[0] === 255 && (b[1] & 224) === 224) return ["mp3", "audio/mpeg"];
  return null;
}
function resimTuru(b) {
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return ["jpg", "image/jpeg"];
  if (b.toString("latin1", 0, 8) === "PNG\r\n\n") return ["png", "image/png"];
  if (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return ["webp", "image/webp"];
  return null;
}
async function dosyaAl(req, sinir) {
  const beyan = Number(req.headers["content-length"]);
  if (!(beyan > 0)) throw kodlu(411, "boy gerekli");
  if (beyan > sinir) throw kodlu(413, "dosya büyük");
  const d = await fs.promises.statfs(GELEN);
  if (d.bavail * d.bsize < beyan + 3 * 1073741824) throw kodlu(507, "yer yok");
  const yol = path.join(GELEN, crypto.randomBytes(8).toString("hex"));
  const ozet = crypto.createHash("sha256");
  let boy = 0, bas = Buffer.alloc(0);
  const say = new Transform({ transform(p, _k, cb) {
    boy += p.length;
    if (boy > beyan) return cb(kodlu(400, "boy tutmuyor"));
    if (bas.length < 16) bas = Buffer.concat([bas, p.subarray(0, 16 - bas.length)]);
    ozet.update(p);
    cb(null, p);
  } });
  try {
    await pipeline(req, say, fs.createWriteStream(yol, { mode: 384 }));
    if (boy !== beyan) throw kodlu(400, "eksik geldi");
  } catch (e) {
    await fs.promises.rm(yol, { force: true }).catch(() => {
    });
    throw e;
  }
  return { yol, boy, ozet: ozet.digest("hex"), bas };
}
async function yuklemeBaslat(req, res) {
  const g = await govdeOku(req);
  const h = hakCoz(g.hak);
  if (!h) return yanit(req, res, 401, { hata: "hak yok" });
  if (h.k.sarki) return yanit(req, res, 409, { hata: "hak kullanıldı", id: h.k.sarki });
  const ad = temiz(g.ad, 80), sanatci = temiz(g.sanatci, 80), haber = g.haber === true, eposta = haber ? temiz(g.eposta, 120) : "";
  if (!ad || !sanatci) return yanit(req, res, 400, { hata: "ad ve sanatçı gerekli" });
  if (haber && !EPOSTA.test(eposta)) return yanit(req, res, 400, { hata: "e-posta" });
  if (g.sahibim !== true) return yanit(req, res, 400, { hata: "hak onayı" });
  let e = h.k.taslak ? bekleyen.liste.find((x) => x.id === h.k.taslak && x.durum === "yukleniyor") : null;
  if (!e) {
    e = { id: crypto.randomBytes(6).toString("hex"), durum: "yukleniyor", olusma: simdiSn(), txid: h.txid, ...h.k.deneme ? { deneme: true } : {} };
    bekleyen.liste.push(e);
    h.k.taslak = e.id;
    await kayitYaz();
  }
  Object.assign(e, { ad, sanatci, haber, eposta, zaman: simdiSn() });
  await bekleyenYaz();
  yanit(req, res, 200, { id: e.id, ses: !!e.ses, kapak: !!e.kapak });
}
async function dosyaKoy(req, res, id, parca) {
  const h = hakCoz(req.headers["x-hak"]);
  const e = h && bekleyen.liste.find((x) => x.id === id);
  if (!e || e.txid !== h.txid) return yanit(req, res, 401, { hata: "hak yok" });
  if (e.durum !== "yukleniyor") return yanit(req, res, 409, { hata: "şarkı gönderildi" });
  if (yuklenen >= 2) return yanit(req, res, 503, { hata: "meşgul" });
  yuklenen++;
  let gelen = null;
  try {
    gelen = await dosyaAl(req, parca === "ses" ? SES_SINIR : KAPAK_SINIR);
    const t = parca === "ses" ? sesTuru(gelen.bas) : resimTuru(gelen.bas);
    if (!t) return yanit(req, res, 415, { hata: parca === "ses" ? "ses dosyası değil" : "resim değil" });
    const anahtar = `${KAYIT_ONEK}bekleyen/${id}/${parca}.${t[0]}`;
    await depoKoy(anahtar, fs.createReadStream(gelen.yol), t[1], gelen.ozet, gelen.boy);
    if (parca === "ses") yolda.set(id, await izVaryantlar(gelen.yol));
    const eski = e[parca];
    let ad = "";
    try {
      ad = temiz(decodeURIComponent(String(req.headers["x-dosya-adi"] || "")), 120);
    } catch {
    }
    e[parca] = { anahtar, uz: t[0], tur: t[1], boy: gelen.boy, ozet: gelen.ozet, ad };
    await bekleyenYaz();
    if (eski && eski.anahtar !== anahtar) {
      const c = await depo("DELETE", eski.anahtar).catch(() => null);
      await c?.body?.cancel();
    }
    yanit(req, res, 200, { ok: true, boy: gelen.boy });
  } finally {
    yuklenen--;
    if (gelen) await fs.promises.rm(gelen.yol, { force: true }).catch(() => {
    });
  }
}
async function yuklemeBitir(req, res, id) {
  const h = hakCoz(req.headers["x-hak"]);
  const e = h && bekleyen.liste.find((x) => x.id === id);
  if (!e || e.txid !== h.txid) return yanit(req, res, 401, { hata: "hak yok" });
  if (!e.ses) return yanit(req, res, 400, { hata: "ses yok" });
  let eslesen = null, yayinli = null;
  if (e.durum === "yukleniyor") {
    let v = yolda.get(id);
    if (!v) v = await izDepodan(e.ses.anahtar).catch(() => null);
    if (v && v[0]) eslesen = await izEsles(id, v);
    if (!eslesen) yayinli = await mbYayinli(e.ad, e.sanatci);
    e.durum = eslesen ? "eslesti" : yayinli ? "kanit" : "inceleniyor";
    e.zaman = simdiSn();
    e.kontrol = eslesen ? { tur: "iz", ad: eslesen.ad, sanatci: eslesen.sanatci, anahtar: eslesen.anahtar, benzerlik: eslesen.benzerlik } : yayinli ? { tur: "yayin", ad: yayinli.ad, sanatci: yayinli.sanatci, tarih: yayinli.tarih, mb: yayinli.id } : { tur: "temiz" };
    h.k.sarki = id;
    delete h.k.taslak;
    if (v && v[0] && !e.deneme) {
      parmakizi.kayitlar["bekleyen:" + id] = {
        ad: e.ad,
        sanatci: e.sanatci,
        durum: e.durum,
        sure: Math.round(v[0].length * 0.1238),
        pi: Buffer.from(v[0].buffer, v[0].byteOffset, v[0].byteLength).toString("base64"),
        zaman: simdiSn()
      };
      izOnbellek.delete("bekleyen:" + id);
      await parmakiziYaz();
    }
    yolda.delete(id);
    await kayitYaz();
    await bekleyenYaz();
  }
  const k = e.kontrol || {};
  yanit(req, res, 200, {
    ok: true,
    id,
    durum: e.durum,
    karar: e.durum,
    eslesen: k.tur === "iz" ? { katalog: String(k.anahtar || "").startsWith("katalog:"), ad: k.ad, sanatci: k.sanatci } : null,
    yayin: k.tur === "yayin" ? { ad: k.ad, sanatci: k.sanatci, tarih: k.tarih || "" } : null
  });
}
const IZ_ESIK = 0.75, IZ_W = Math.round(15 / 0.1238);
const IZ_SUZGEC = [null, "atempo=0.94", "atempo=0.97", "atempo=1.03", "atempo=1.06"].concat(
  [0.94, 0.97, 1.03, 1.06].map((k) => `aresample=44100,asetrate=${Math.round(44100 * k)},aresample=44100`)
);
const PC16 = new Uint8Array(65536);
for (let i = 1; i < 65536; i++) PC16[i] = PC16[i >> 1] + (i & 1);
const yolda = new Map(), izOnbellek = new Map();
function izCikar(dosya, suzgec) {
  return new Promise((ok) => {
    const komut = suzgec ? `ffmpeg -v error -i "$1" -map 0:a:0 -af "${suzgec}" -f wav - | fpcalc -raw -length 0 -` : 'fpcalc -raw -length 0 "$1"';
    const p = spawn("sh", ["-c", komut, "sh", dosya], { stdio: ["ignore", "pipe", "ignore"] });
    let o = "";
    p.stdout.setEncoding("utf8");
    p.stdout.on("data", (d) => {
      o += d;
    });
    const zaman = setTimeout(() => p.kill("SIGKILL"), 18e4);
    p.on("error", () => {
      clearTimeout(zaman);
      ok(null);
    });
    p.on("close", () => {
      clearTimeout(zaman);
      const m = /FINGERPRINT=([-0-9,]+)/.exec(o);
      ok(m ? Uint32Array.from(m[1].split(","), (x) => Number(x) >>> 0) : null);
    });
  });
}
async function izVaryantlar(dosya) {
  const ilk = await izCikar(dosya, null);
  if (!ilk) return [];
  const v = [ilk], kalan = IZ_SUZGEC.slice(1);
  for (let i = 0; i < kalan.length; i += 3) (await Promise.all(kalan.slice(i, i + 3).map((f) => izCikar(dosya, f)))).forEach((x) => {
    if (x) v.push(x);
  });
  return v;
}
async function izDepodan(anahtar) {
  const gecici = path.join(GELEN, "iz-" + crypto.randomBytes(6).toString("hex"));
  try {
    const c = await depo("GET", anahtar);
    if (!c.ok) {
      await c.body?.cancel();
      return null;
    }
    await pipeline(Readable.fromWeb(c.body), fs.createWriteStream(gecici, { mode: 384 }));
    return await izVaryantlar(gecici);
  } finally {
    await fs.promises.rm(gecici, { force: true }).catch(() => {
    });
  }
}
function izBenzer(a, b) {
  const w = IZ_W;
  if (a.length < w || b.length < w) return 0;
  const h = new Uint8Array(Math.min(a.length, b.length));
  let en = 0;
  for (let kay = -(b.length - w); kay <= a.length - w; kay++) {
    const i0 = kay > 0 ? kay : 0, j0 = kay < 0 ? -kay : 0, n = Math.min(a.length - i0, b.length - j0);
    let top = 0, enAz = 1e9;
    for (let k = 0; k < n; k++) {
      const x = a[i0 + k] ^ b[j0 + k], c = PC16[x & 65535] + PC16[x >>> 16];
      h[k] = c;
      top += c;
      if (k >= w) top -= h[k - w];
      if (k >= w - 1 && top < enAz) enAz = top;
    }
    const s = 1 - enAz / (32 * w);
    if (s > en) en = s;
  }
  return en;
}
async function izEsles(id, varyantlar) {
  let en = null;
  for (const [anahtar, d] of Object.entries(parmakizi.kayitlar)) {
    if (anahtar === "bekleyen:" + id || !d.pi) continue;
    let b = izOnbellek.get(anahtar);
    if (!b) {
      const u = new Uint8Array(Buffer.from(d.pi, "base64"));
      b = new Uint32Array(u.buffer, 0, u.length >> 2);
      izOnbellek.set(anahtar, b);
    }
    for (const v of varyantlar) {
      const s = izBenzer(v, b);
      if (s >= IZ_ESIK) {
        if (!en || s > en.benzerlik) en = { anahtar, ad: d.ad, sanatci: d.sanatci, benzerlik: Math.round(s * 1e3) / 1e3 };
        break;
      }
    }
    await new Promise((r) => setImmediate(r));
  }
  return en;
}
const kati = (s) => String(s || "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
async function mbYayinli(ad, sanatci) {
  const q = `recording:"${String(ad).replace(/["\\]/g, " ")}" AND artist:"${String(sanatci).replace(/["\\]/g, " ")}"`;
  for (let kez = 0; kez < 3; kez++) {
    try {
      const r = await fetch(
        "https://musicbrainz.org/ws/2/recording/?" + new URLSearchParams({ query: q, fmt: "json", limit: "10" }),
        { headers: { "user-agent": "Gramofon/1.0 ( https://gramofon.heylogram.com )", accept: "application/json" }, signal: AbortSignal.timeout(15e3) }
      );
      if (r.status === 503) {
        await r.body?.cancel();
        await new Promise((z) => setTimeout(z, 2e3 + 2e3 * kez));
        continue;
      }
      if (!r.ok) {
        await r.body?.cancel();
        return null;
      }
      const j = await r.json();
      const x = (j.recordings || []).find((k) => kati(k.title) === kati(ad) && (k["artist-credit"] || []).some((a) => a && kati(a.name) === kati(sanatci)));
      return x ? { ad: x.title, sanatci: (x["artist-credit"] || []).map((a) => a && a.name).filter(Boolean).join(", "), tarih: x["first-release-date"] || "", id: x.id } : null;
    } catch {
      return null;
    }
  }
  return null;
}
function herkeseBekleyenler() {
  const n = simdiSn();
  return bekleyen.liste.filter((e) => !e.deneme && (e.durum === "inceleniyor" || e.durum === "onay" && n - e.zaman < 14 * 86400 || e.durum === "ret" && n - e.zaman < 7 * 86400)).sort((a, b) => b.zaman - a.zaman).slice(0, 20).map((e) => ({ id: e.id, ad: e.ad, sanatci: e.sanatci, durum: e.durum, zaman: e.zaman }));
}
function icerdenMi(req) {
  const a = req.socket.remoteAddress || "";
  return (a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1") && !req.headers["x-forwarded-for"] && !req.headers["x-real-ip"];
}
async function yonetim(req, res, u) {
  if (!icerdenMi(req)) return yanit(req, res, 404, { hata: "yok" });
  if (req.method === "GET" && u.pathname === "/yonetim/bekleyenler") {
    return yanit(req, res, 200, { ag: AG, liste: bekleyen.liste.map((e2) => {
      const k = kayitlar.txid[e2.txid];
      return k ? { ...e2, odeme: { kim: k.kim, sat: k.sat, deneme: !!k.deneme } } : e2;
    }) });
  }
  if (req.method === "GET" && u.pathname === "/yonetim/parmakizi") return yanit(req, res, 200, parmakizi);
  if (req.method !== "POST") return yanit(req, res, 405, { hata: "yöntem" });
  const g = await govdeOku(req, u.pathname === "/yonetim/parmakizi" ? 262144 : 16384);
  if (u.pathname === "/yonetim/parmakizi") {
    if (!/^(katalog|bekleyen):[a-z0-9-]{1,64}$/.test(String(g.anahtar || ""))) return yanit(req, res, 400, { hata: "anahtar" });
    if (g.sil === true) {
      delete parmakizi.kayitlar[g.anahtar];
      await parmakiziYaz();
      return yanit(req, res, 200, { ok: true });
    }
    const eski = parmakizi.kayitlar[g.anahtar] || {};
    const pi = typeof g.pi === "string" && /^[A-Za-z0-9+/=]{8,200000}$/.test(g.pi) ? g.pi : eski.pi;
    if (!pi) return yanit(req, res, 400, { hata: "iz yok" });
    parmakizi.kayitlar[g.anahtar] = {
      ad: temiz(g.ad ?? eski.ad, 80),
      sanatci: temiz(g.sanatci ?? eski.sanatci, 80),
      durum: temiz(g.durum ?? eski.durum, 20),
      sure: Number(g.sure ?? eski.sure) || 0,
      pi,
      zaman: simdiSn()
    };
    await parmakiziYaz();
    return yanit(req, res, 200, { ok: true, sayi: Object.keys(parmakizi.kayitlar).length });
  }
  if (u.pathname === "/yonetim/hak") {
    const txid = "deneme-" + crypto.randomBytes(8).toString("hex"), zaman = simdiSn();
    kayitlar.txid[txid] = { kim: "deneme", sat: 0, zaman, bitis: zaman + 86400, n: "", amac: "y", deneme: true };
    await kayitYaz();
    return yanit(req, res, 200, { hak: hakVer(txid, kayitlar.txid[txid]) });
  }
  const m = /^\/yonetim\/(bekleyen|sil)\/([a-f0-9]{12})$/.exec(u.pathname);
  const e = m ? bekleyen.liste.find((x) => x.id === m[2]) : null;
  if (!e) return yanit(req, res, 404, { hata: "yok" });
  if (m[1] === "sil") {
    for (const p of ["ses", "kapak"]) if (e[p]) {
      const c = await depo("DELETE", e[p].anahtar);
      await c.body?.cancel();
    }
    bekleyen.liste = bekleyen.liste.filter((x) => x !== e);
    if (kayitlar.txid[e.txid] && kayitlar.txid[e.txid].deneme) delete kayitlar.txid[e.txid];
    await bekleyenYaz();
    await kayitYaz();
    return yanit(req, res, 200, { ok: true });
  }
  if (g.durum != null && !["inceleniyor", "onay", "ret"].includes(g.durum)) return yanit(req, res, 400, { hata: "durum" });
  if (g.durum) {
    e.durum = g.durum;
    e.zaman = simdiSn();
  }
  if (g.not != null) e.not = temiz(g.not, 300);
  if (g.katalog != null) e.katalog = temiz(g.katalog, 64);
  if (g.bildirildi === true) {
    e.bildirildi = simdiSn();
    e.eposta = "";
  }
  if (g.iade === true) {
    const k = kayitlar.txid[e.txid];
    if (!k || k.deneme || !ADRES_DESENI.test(k.kim || "")) return yanit(req, res, 400, { hata: "iade adresi yok" });
    e.iade = { adres: k.kim, sat: k.sat, durum: "bekliyor", zaman: simdiSn() };
  }
  if (typeof g.iadeTxid === "string" && /^[0-9a-f]{64}$/.test(g.iadeTxid) && e.iade) Object.assign(e.iade, { durum: "gonderildi", txid: g.iadeTxid, gonderildi: simdiSn() });
  if (g.dosyaSil === true) {
    for (const p of ["ses", "kapak"]) if (e[p]) {
      const c = await depo("DELETE", e[p].anahtar);
      await c.body?.cancel();
      delete e[p];
    }
  }
  await bekleyenYaz();
  yanit(req, res, 200, { ok: true, kayit: e });
}
kayitlar = await kayitAc(ODEMELER, KAYIT_ONEK + "yonetim/odemeler.json", { txid: {}, teklif: {} });
bekleyen = await kayitAc(BEKLEYENLER, KAYIT_ONEK + "yonetim/bekleyenler.json", { liste: [] });
parmakizi = await kayitAc(PARMAKIZI, KAYIT_ONEK + "yonetim/parmakizi.json", { kayitlar: {} });
radyo = await kayitAc(RADYO, KAYIT_ONEK + "yonetim/radyo.json", { liste: [] });
depoyaYedekle(ODEMELER, KAYIT_ONEK + "yonetim/odemeler.json");
const sunucu = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://yerel");
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...cors(req),
        "access-control-allow-methods": "GET, HEAD, POST, PUT",
        "access-control-allow-headers": "range, content-type, x-hak, x-dosya-adi, x-bilet",
        "access-control-max-age": "600"
      });
      return res.end();
    }
    if (u.pathname.startsWith("/yonetim/")) return await yonetim(req, res, u);
    if (req.method === "PUT") {
      const y = /^\/yukle\/([a-f0-9]{12})\/(ses|kapak)$/.exec(u.pathname);
      if (y) return await dosyaKoy(req, res, y[1], y[2]);
      return yanit(req, res, 404, { hata: "yok" });
    }
    if (req.method === "POST") {
      if (u.pathname === "/odeme/teklif") return await teklifVer(req, res);
      if (u.pathname === "/odeme/utxo") return await utxoVer(req, res);
      if (u.pathname === "/odeme/tamamla") return await tamamla(req, res);
      if (u.pathname === "/yukle/baslat") return await yuklemeBaslat(req, res);
      if (u.pathname === "/radyo/gonder") return await radyoGonder(req, res);
      const yb = /^\/yukle\/([a-f0-9]{12})\/bitir$/.exec(u.pathname);
      if (yb) return await yuklemeBitir(req, res, yb[1]);
      return yanit(req, res, 404, { hata: "yok" });
    }
    if (req.method !== "GET" && req.method !== "HEAD") return yanit(req, res, 405, { hata: "yöntem" });
    if (u.pathname === "/saglik") {
      const c = await depo("HEAD", "katalog.json");
      return yanit(req, res, 200, {
        ok: true,
        depo: c.status === 200 || c.status === 404 ? "ulasiliyor" : "sorun " + c.status,
        bilet: !!BILET_SIRRI,
        odeme: !!ODEME_ADRESI,
        ag: AG
      });
    }
    if (u.pathname === "/odeme/ayar") return yanit(req, res, 200, { ag: AG, aktif: !!ODEME_ADRESI, usd: UYELIK_USD, gun: UYELIK_GUN, yukleme: YUKLEME_USD, adres: ODEME_ADRESI || null });
    if (u.pathname === "/sarkilar") return yanit(req, res, 200, { sarkilar: ((await katalog()).sarkilar || []).map(disari) }, 60);
    if (u.pathname === "/bekleyenler") return yanit(req, res, 200, { liste: herkeseBekleyenler() }, 15);
    if (u.pathname === "/radyo") return yanit(req, res, 200, { liste: radyo.liste.map(radyoDisari), gunluk: RADYO_GUNLUK }, 10);
    const m = /^\/dinle\/([a-z0-9-]{1,64})$/.exec(u.pathname);
    if (m) return await dinle(req, res, m[1], u.searchParams.get("bilet"));
    const kp = /^\/kapak\/([a-z0-9-]{1,64})\/(160|600)$/.exec(u.pathname);
    if (kp) return await kapak(req, res, kp[1], kp[2]);
    yanit(req, res, 404, { hata: "yok" });
  } catch (e) {
    if (!res.headersSent) yanit(req, res, e && e.kod ? e.kod : 502, { hata: e && e.kod ? e.message : "sunucu" });
    else res.destroy();
  }
});
sunucu.requestTimeout = 15 * 6e4;
sunucu.listen(PORT, "0.0.0.0", () => console.log("gramofon dinliyor " + PORT));
