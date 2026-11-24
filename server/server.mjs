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
function depo(yontem, anahtar, ek = {}, secenek = {}) {
  const yol = `/${KOVA}/${anahtar}`;
  return fetch(UC + yol, { method: yontem, headers: { ...imzali(yontem, yol), ...ek }, ...secenek });
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
let onbellek = { veri: null, zaman: 0 }, katalogSoru = null;
const KATALOG_KOPYA = path.join(VERI, "katalog-kopya.json");
try {
  onbellek = { veri: JSON.parse(fs.readFileSync(KATALOG_KOPYA, "utf8")), zaman: 0 };
} catch {
}
async function katalogCek() {
  const c = await depo("GET", "katalog.json");
  let veri = { sarkilar: [] };
  if (c.ok) veri = await c.json();
  else {
    await c.body?.cancel();
    if (c.status !== 404) throw new Error("depo " + c.status);
  }
  onbellek = { veri, zaman: Date.now() };
  fs.promises.writeFile(KATALOG_KOPYA + ".yeni", JSON.stringify(veri), { mode: 384 }).then(() => fs.promises.rename(KATALOG_KOPYA + ".yeni", KATALOG_KOPYA)).catch(() => {
  });
  return veri;
}
async function katalog(taze) {
  if (!taze && onbellek.veri && Date.now() - onbellek.zaman < 6e4) return onbellek.veri;
  if (!katalogSoru) katalogSoru = katalogCek().finally(() => {
    katalogSoru = null;
  });
  if (!taze && onbellek.veri) {
    katalogSoru.catch(() => {
    });
    return onbellek.veri;
  }
  return katalogSoru;
}
const GUVENLI = ["id", "ad", "sanatci", "sure", "bpm", "ilkVurus", "renk", "tur", "hava", "kazanc", "kapak"];
const KAPAK_KLASORU = path.join(VERI, "kapak-onbellek");
try {
  fs.mkdirSync(KAPAK_KLASORU, { recursive: true });
} catch {
}
const kapakYolu = (s, boy) => path.join(KAPAK_KLASORU, `${s.id}-${boy}-${String(s.kapak).replace(/[^0-9a-z]/gi, "")}.jpg`);
async function kapakAl(s, boy) {
  const yol = kapakYolu(s, boy);
  try {
    return await fs.promises.readFile(yol);
  } catch {
  }
  const c = await depo("GET", `kapaklar/${s.id}-${boy}.jpg`);
  if (!c.ok) {
    await c.body?.cancel();
    return c.status === 404 ? null : Promise.reject(new Error("depo " + c.status));
  }
  const b = Buffer.from(await c.arrayBuffer());
  try {
    await fs.promises.writeFile(yol + ".yeni", b, { mode: 384 });
    await fs.promises.rename(yol + ".yeni", yol);
  } catch {
  }
  return b;
}
async function kapak(req, res, id, boy) {
  const s = ((await katalog()).sarkilar || []).find((x) => x.id === id);
  if (!s || !s.kapak) return yanit(req, res, 404, { hata: "kapak yok" });
  let b;
  try {
    b = await kapakAl(s, boy);
  } catch {
    return yanit(req, res, 502, { hata: "depo" });
  }
  if (!b) return yanit(req, res, 404, { hata: "kapak yok" });
  res.writeHead(200, { ...cors(req), "content-type": "image/jpeg", "cache-control": "public, max-age=86400", "content-length": String(b.length) });
  res.end(req.method === "HEAD" ? void 0 : b);
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
  let c;
  for (let i = 1; ; i++) {
    try {
      c = await depo("GET", anahtar, {}, { signal: AbortSignal.timeout(2e4) });
      break;
    } catch (e) {
      if (i >= 3) throw e;
    }
  }
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
  const link = g.yol === "link";
  const fiyat = yukleme ? YUKLEME_USD : UYELIK_USD;
  const usd = await bchUsd();
  let sat = Math.max(546, Math.ceil(fiyat / usd * 1e8));
  const bitis = Math.floor(Date.now() / 1e3) + (link ? 900 : 600);
  if (link) sat = linkTutari(sat, bitis);
  const teklif = imzalaPaket("teklif:", { s: sat, b: bitis, n: crypto.randomBytes(8).toString("hex"), ...yukleme ? { a: "y" } : {}, ...link ? { l: 1 } : {} });
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
const linkTutarlar = new Map();
function linkTutari(taban, bitis) {
  const simdi = Math.floor(Date.now() / 1e3);
  for (const [s, b] of linkTutarlar) if (b + 1800 < simdi) linkTutarlar.delete(s);
  for (let i = 0; i < 200; i++) {
    const s = taban + 1 + crypto.randomInt(999);
    if (!linkTutarlar.has(s)) {
      linkTutarlar.set(s, bitis);
      return s;
    }
  }
  throw kodlu(503, "meşgul");
}
let linkTarama = null;
const linkBakilan = new Map();
function adresTara() {
  if (linkTarama && Date.now() - linkTarama.zaman < 3e3) return linkTarama.iz;
  const iz = (async () => {
    const { cevap } = await electrumBiri([["blockchain.address.get_history", [ODEME_ADRESI]]]);
    const gecmis = (cevap[0] && cevap[0].sonuc || []).slice(-40).map((x) => x.tx_hash).filter((t) => /^[0-9a-f]{64}$/.test(t));
    const yeni = gecmis.filter((t) => !linkBakilan.has(t) && !kayitlar.txid[t]);
    if (yeni.length) {
      const { cevap: c } = await electrumBiri(yeni.map((t) => ["blockchain.transaction.get", [t, true]]));
      yeni.forEach((t, i) => {
        if (c[i] && c[i].sonuc) linkBakilan.set(t, { tutar: odemeyiBul(c[i].sonuc), tx: c[i].sonuc });
      });
    }
    const tutarlar = new Map();
    for (const t of gecmis) {
      const b = linkBakilan.get(t);
      if (b && !kayitlar.txid[t] && !tutarlar.has(b.tutar)) tutarlar.set(b.tutar, t);
    }
    return tutarlar;
  })();
  linkTarama = { zaman: Date.now(), iz };
  iz.catch(() => {
    linkTarama = null;
  });
  return iz;
}
async function odeyenAdres(tx) {
  try {
    const g = (tx.vin || [])[0];
    if (!g || !/^[0-9a-f]{64}$/.test(g.txid || "")) return "";
    const { cevap } = await electrumBiri([["blockchain.transaction.get", [g.txid, true]]]);
    const o = (cevap[0] && cevap[0].sonuc && cevap[0].sonuc.vout || [])[g.vout] || {};
    const a = ((o.scriptPubKey || {}).addresses || [])[0] || (o.scriptPubKey || {}).address || "";
    return ADRES_DESENI.test(a) ? a : "";
  } catch {
    return "";
  }
}
async function linkKontrol(req, res) {
  if (!ODEME_ADRESI || !BILET_SIRRI) return yanit(req, res, 503, { hata: "ödeme kapalı" });
  const g = await govdeOku(req);
  const t = paketCoz("teklif:", g.teklif);
  if (!t || t.l !== 1) return yanit(req, res, 400, { hata: "eksik" });
  const verilen = (txid2) => {
    const k = kayitlar.txid[txid2];
    if (k.amac === "y") return yanit(req, res, 200, { hak: hakVer(txid2, k), bitis: k.bitis, txid: txid2, kullanildi: !!k.sarki });
    return yanit(req, res, 200, { bilet: imzalaPaket("", { u: k.kim, b: k.bitis }), bitis: k.bitis, txid: txid2, kim: k.kim });
  };
  if (kayitlar.teklif[t.n] && kayitlar.txid[kayitlar.teklif[t.n]]) return verilen(kayitlar.teklif[t.n]);
  const simdi = Math.floor(Date.now() / 1e3);
  if (simdi > t.b + 1800) return yanit(req, res, 410, { hata: "süre doldu" });
  const txid = (await adresTara()).get(t.s);
  if (!txid) return yanit(req, res, 202, { hata: "ödeme henüz yok" });
  const gorenler = new Set();
  for (const s of [...ELECTRUM].sort(() => Math.random() - 0.5)) {
    if (gorenler.has(isletme(s.h))) continue;
    try {
      const [c] = await electrum(s, [["blockchain.transaction.get", [txid, true]]]);
      if (c && c.sonuc && odemeyiBul(c.sonuc) === t.s) gorenler.add(isletme(s.h));
    } catch {
    }
    if (gorenler.size >= 2) break;
  }
  if (gorenler.size < 2) return yanit(req, res, 202, { hata: "ödeme henüz görülmedi", gorenler: gorenler.size });
  const kim = await odeyenAdres(linkBakilan.get(txid).tx);
  if (kayitlar.teklif[t.n] && kayitlar.txid[kayitlar.teklif[t.n]]) return verilen(kayitlar.teklif[t.n]);
  if (kayitlar.txid[txid]) return yanit(req, res, 409, { hata: "bu ödeme kullanıldı" });
  const yukleme = t.a === "y";
  const bitis = simdi + (yukleme ? YUKLEME_GUN : UYELIK_GUN) * 86400;
  kayitlar.txid[txid] = { kim, sat: t.s, zaman: simdi, bitis, n: t.n, yol: "link", ...yukleme ? { amac: "y" } : {} };
  kayitlar.teklif[t.n] = txid;
  linkTutarlar.delete(t.s);
  await kayitYaz();
  verilen(txid);
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
const SECP_P = 2n ** 256n - 2n ** 32n - 977n;
const HD_SINIR = 100;
function modUs(a, e, m) {
  let r = 1n;
  a %= m;
  while (e > 0n) {
    if (e & 1n) r = r * a % m;
    a = a * a % m;
    e >>= 1n;
  }
  return r;
}
function noktaAc(b) {
  if (!b || b.length !== 33 || b[0] !== 2 && b[0] !== 3) return null;
  const x = BigInt("0x" + b.subarray(1).toString("hex"));
  if (x >= SECP_P) return null;
  const y2 = (x * x % SECP_P * x + 7n) % SECP_P;
  let y = modUs(y2, (SECP_P + 1n) / 4n, SECP_P);
  if (y * y % SECP_P !== y2) return null;
  if ((y & 1n) !== BigInt(b[0] & 1)) y = SECP_P - y;
  return [x, y];
}
function noktaTopla([x1, y1], [x2, y2]) {
  const m = (v) => (v % SECP_P + SECP_P) % SECP_P;
  let l;
  if (x1 === x2) {
    if (m(y1 + y2) === 0n) return null;
    l = m(3n * x1 * x1 * modUs(m(2n * y1), SECP_P - 2n, SECP_P));
  } else l = m(m(y2 - y1) * modUs(m(x2 - x1), SECP_P - 2n, SECP_P));
  const x3 = m(l * l - x1 - x2);
  return [x3, m(l * (x1 - x3) - y1)];
}
const noktaKapa = ([x, y]) => Buffer.concat([Buffer.from([y & 1n ? 3 : 2]), Buffer.from(x.toString(16).padStart(64, "0"), "hex")]);
function base58Coz(s) {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = 0n;
  for (const c of s) {
    const i = A.indexOf(c);
    if (i < 0) return null;
    n = n * 58n + BigInt(i);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const b = Buffer.concat([Buffer.alloc(s.length - s.replace(/^1+/, "").length), Buffer.from(n ? hex : "", "hex")]);
  if (b.length < 5) return null;
  const govde = b.subarray(0, -4), cift = crypto.createHash("sha256").update(crypto.createHash("sha256").update(govde).digest()).digest();
  return cift.subarray(0, 4).equals(b.subarray(-4)) ? govde : null;
}
function xpubCoz(s) {
  if (typeof s !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{100,120}$/.test(s)) return null;
  const b = base58Coz(s);
  if (!b || b.length !== 78 || ![76067358, 70617039].includes(b.readUInt32BE(0))) return null;
  const anahtar = Buffer.from(b.subarray(45, 78)), nokta = noktaAc(anahtar);
  return nokta ? { kod: Buffer.from(b.subarray(13, 45)), anahtar, nokta } : null;
}
function hdCocuk(ust, i) {
  const I = crypto.createHmac("sha512", ust.kod).update(Buffer.concat([ust.anahtar, Buffer.from([i >>> 24 & 255, i >>> 16 & 255, i >>> 8 & 255, i & 255])])).digest();
  let g;
  try {
    const e = crypto.createECDH("secp256k1");
    e.setPrivateKey(I.subarray(0, 32));
    g = noktaAc(e.getPublicKey(null, "compressed"));
  } catch {
    return null;
  }
  const t = g ? noktaTopla(ust.nokta, g) : null;
  return t ? noktaKapa(t) : null;
}
const h160 = (b) => crypto.createHash("ripemd160").update(crypto.createHash("sha256").update(b).digest()).digest();
const girisSayac = new Map();
async function uyelikGiris(req, res) {
  const ip = String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const simdi = simdiSn(), son = (girisSayac.get(ip) || []).filter((z) => z > simdi - 60);
  if (son.length >= 6) return yanit(req, res, 429, { hata: "çok deneme" });
  son.push(simdi);
  girisSayac.set(ip, son);
  if (girisSayac.size > 5e3) girisSayac.clear();
  const g = await govdeOku(req, 4096);
  const xpubler = Array.isArray(g.xpub) ? g.xpub.slice(0, 4).map(xpubCoz) : [];
  if (!xpubler.length || xpubler.some((x) => !x)) return yanit(req, res, 400, { hata: "xpub" });
  const aranan = new Map();
  for (const k of Object.values(kayitlar.txid)) {
    if (k.amac === "y" || !(k.bitis > simdi)) continue;
    const kl = cashaddrKilit(k.kim);
    if (kl && !(aranan.has(kl) && aranan.get(kl).bitis >= k.bitis)) aranan.set(kl, k);
  }
  let bulunan = null;
  if (aranan.size) for (const x of xpubler) for (let i = 0; i < HD_SINIR; i++) {
    const c = hdCocuk(x, i), k = c && aranan.get("76a914" + h160(c).toString("hex") + "88ac");
    if (k && !(bulunan && bulunan.bitis >= k.bitis)) bulunan = k;
  }
  if (!bulunan) return yanit(req, res, 404, { hata: "üyelik yok" });
  return yanit(req, res, 200, { bilet: imzalaPaket("", { u: bulunan.kim, b: bulunan.bitis }), bitis: bulunan.bitis, kim: bulunan.kim });
}
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
function komutCiktisi(komut, args, sure = 3e5) {
  return new Promise((ok) => {
    const p = spawn(komut, args, { stdio: ["ignore", "pipe", "ignore"] });
    let o = "";
    p.stdout.setEncoding("utf8");
    p.stdout.on("data", (d) => {
      o += d;
    });
    const zaman = setTimeout(() => p.kill("SIGKILL"), sure);
    p.on("error", () => {
      clearTimeout(zaman);
      ok({ kod: -1, cikti: "" });
    });
    p.on("close", (kod) => {
      clearTimeout(zaman);
      ok({ kod, cikti: o });
    });
  });
}
const FLACA = /^(pcm_s16le|pcm_s16be|pcm_s24le|pcm_s24be|pcm_u8)$/;
async function flacYap(kaynak) {
  const p = await komutCiktisi("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", kaynak], 3e4);
  if (p.kod !== 0 || !FLACA.test(p.cikti.trim())) return null;
  const yol = kaynak + ".flac";
  const sesOzeti = async (f) => (await komutCiktisi("ffmpeg", ["-v", "error", "-i", f, "-map", "0:a:0", "-c:a", "pcm_s32le", "-f", "md5", "-"])).cikti.trim();
  try {
    const c = await komutCiktisi("ffmpeg", ["-v", "error", "-y", "-i", kaynak, "-map", "0:a:0", "-map_metadata", "-1", "-c:a", "flac", "-compression_level", "8", "-f", "flac", yol]);
    if (c.kod !== 0) throw new Error("flac");
    const [a, b] = await Promise.all([sesOzeti(kaynak), sesOzeti(yol)]);
    if (!/^MD5=[0-9a-f]{32}$/.test(a) || a !== b) throw new Error("flac ses farkı");
    const ozet = crypto.createHash("sha256");
    for await (const parca of fs.createReadStream(yol)) ozet.update(parca);
    return { yol, boy: (await fs.promises.stat(yol)).size, ozet: ozet.digest("hex") };
  } catch {
    await fs.promises.rm(yol, { force: true }).catch(() => {
    });
    return null;
  }
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
  const rapor = haber && g.rapor === true;
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
  Object.assign(e, { ad, sanatci, haber, eposta, rapor, zaman: simdiSn() });
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
  let gelen = null, flac = null;
  try {
    gelen = await dosyaAl(req, parca === "ses" ? SES_SINIR : KAPAK_SINIR);
    let t = parca === "ses" ? sesTuru(gelen.bas) : resimTuru(gelen.bas);
    if (!t) return yanit(req, res, 415, { hata: parca === "ses" ? "ses dosyası değil" : "resim değil" });
    const ilk = t[0];
    if (parca === "ses" && (ilk === "wav" || ilk === "aiff")) flac = await flacYap(gelen.yol);
    if (flac) t = ["flac", "audio/flac"];
    const giden = flac || gelen, anahtar = `${KAYIT_ONEK}bekleyen/${id}/${parca}.${t[0]}`;
    for (let i = 1; ; i++) {
      try {
        await depoKoy(anahtar, fs.createReadStream(giden.yol), t[1], giden.ozet, giden.boy);
        break;
      } catch (h2) {
        if (i >= 3) throw h2;
        await new Promise((ok) => setTimeout(ok, 2e3 * i));
      }
    }
    if (parca === "ses") yolda.set(id, await izVaryantlar(gelen.yol));
    const eski = e[parca];
    let ad = "";
    try {
      ad = temiz(decodeURIComponent(String(req.headers["x-dosya-adi"] || "")), 120);
    } catch {
    }
    e[parca] = { anahtar, uz: t[0], tur: t[1], boy: giden.boy, ozet: giden.ozet, ad, ...flac ? { ilk: { uz: ilk, boy: gelen.boy } } : {} };
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
    if (flac) await fs.promises.rm(flac.yol, { force: true }).catch(() => {
    });
  }
}
const SITE_ADRESI = "https://gramofon.heylogram.com";
function makbuzYaz(e) {
  const test = AG === "chipnet" ? " (test network)" : "";
  const govde = [
    `Hi ${e.sanatci},`,
    "",
    `Your song “${e.ad}” reached the Gramofon recording room${test}. Thank you!`,
    "",
    e.durum === "kanit" ? "A song with this name and artist has already been released, so before it goes on the gramophone we need proof that it’s yours: an email from the artist’s official address, management, label or distributor, or a short code we give you, posted on the artist’s official account. Just reply to this email." : `We listen to every song by hand. We’ll email you again as soon as it’s reviewed, and you can follow it on the hall board at ${SITE_ADRESI}`,
    "",
    "About your fee: if it’s your own song and it isn’t a fit, we send the fee back to the wallet you paid from. Someone else’s song keeps the fee.",
    "",
    `Terms: ${SITE_ADRESI}/terms`,
    `Privacy: ${SITE_ADRESI}/privacy`,
    e.rapor ? "We keep your email address to tell you about this song and, as you asked, to send you a monthly report of plays and earnings while it is on Gramofon. Reply “stop” to end those reports." : "We keep your email address only to tell you about this song, and delete it after the review email.",
    "",
    "Questions? Just reply to this email.",
    "",
    "Gramofon",
    ""
  ].join("\n");
  return { durum: "bekliyor", zaman: simdiSn(), konu: `Gramofon: we got your song “${e.ad}”${test}`, govde };
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
    if (e.haber && e.eposta && (e.durum === "inceleniyor" || e.durum === "kanit")) e.makbuz = makbuzYaz(e);
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
const DINLEMELER = path.join(VERI, "dinlemeler.json"), SANATCILAR = path.join(VERI, "sanatcilar.json"), RAPORLAR = path.join(VERI, "raporlar.json");
const SANATCI_PAYI = 0.5, ODEME_ESIGI_USD = Number(E.ODEME_ESIGI_USD || 1);
const DINLEME_KOD = { 1: "sayildi", 2: "kendi", 3: "hizli", 4: "gunluk", 5: "dongu" };
let dinlemeler = { olay: [] }, sanatcilar = { aylar: {}, odenen: [] }, raporlar = { liste: [] };
const dinlemeYaz = () => jsonYaz(DINLEMELER, dinlemeler, KAYIT_ONEK + "yonetim/dinlemeler.json");
const sanatciYaz = () => jsonYaz(SANATCILAR, sanatcilar, KAYIT_ONEK + "yonetim/sanatcilar.json");
const raporYaz = () => jsonYaz(RAPORLAR, raporlar, KAYIT_ONEK + "yonetim/raporlar.json");
function sarkiSanatcisi(id) {
  const e = bekleyen.liste.find((x) => x.katalog === id && x.durum === "onay");
  const k = e && kayitlar.txid[e.txid];
  return { kim: k && !k.deneme && ADRES_DESENI.test(k.kim || "") ? k.kim : "", eposta: e && e.raporEposta || "", ad: e ? e.sanatci : "" };
}
async function dinlemeSay(req, res) {
  const g = await govdeOku(req, 2048);
  const v = paketCoz("", String(g.bilet || ""));
  if (!v || !(Number(v.b) * 1e3 > Date.now())) return yanit(req, res, 401, { hata: "bilet" });
  const id = String(g.id || "");
  if (!/^[a-z0-9-]{1,64}$/.test(id) || !((await katalog()).sarkilar || []).some((s) => s.id === id)) return yanit(req, res, 404, { hata: "şarkı yok" });
  const u = String(v.u || ""), t = simdiSn();
  if (!ADRES_DESENI.test(u)) return yanit(req, res, 200, { ok: true, sayildi: false, neden: "deneme" });
  const benim = dinlemeler.olay.filter((o) => o[1] === u && o[3] === 1 && o[0] > t - 86400);
  let kod = 1;
  if (sarkiSanatcisi(id).kim === u) kod = 2;
  else if (benim.length && t - benim[benim.length - 1][0] < 25) kod = 3;
  else if (benim.length >= 150) kod = 4;
  else if (benim.filter((o) => o[2] === id).length >= 25) kod = 5;
  dinlemeler.olay.push([t, u, id, kod]);
  if (dinlemeler.olay[0][0] < t - 400 * 86400) dinlemeler.olay = dinlemeler.olay.filter((o) => o[0] >= t - 400 * 86400);
  await dinlemeYaz();
  yanit(req, res, 200, { ok: true, sayildi: kod === 1, neden: DINLEME_KOD[kod] });
}
const ayAraligi = (ay) => {
  const [y, m] = ay.split("-").map(Number);
  return [Date.UTC(y, m - 1, 1) / 1e3, Date.UTC(y, m, 1) / 1e3];
};
function ayHesapla(ay) {
  const [bas, son] = ayAraligi(ay), uyeSat = new Map();
  for (const k of Object.values(kayitlar.txid)) {
    if (k.amac === "y" || k.deneme || !ADRES_DESENI.test(k.kim || "") || !(k.bitis > k.zaman)) continue;
    const ortak = Math.min(son, k.bitis) - Math.max(bas, k.zaman);
    if (ortak > 0) uyeSat.set(k.kim, (uyeSat.get(k.kim) || 0) + k.sat * ortak / (k.bitis - k.zaman));
  }
  const sarki = {}, uyeDinleme = new Map();
  const s0 = (id) => sarki[id] || (sarki[id] = { sayildi: 0, dinleyen: new Set(), kendi: 0, elenen: 0, sat: 0 });
  for (const [t, u, id, kod] of dinlemeler.olay) {
    if (t < bas || t >= son) continue;
    const s = s0(id);
    if (kod === 1) {
      s.sayildi++;
      s.dinleyen.add(u);
      const d = uyeDinleme.get(u) || new Map();
      d.set(id, (d.get(id) || 0) + 1);
      uyeDinleme.set(u, d);
    } else if (kod === 2) s.kendi++;
    else s.elenen++;
  }
  let dagitilan = 0, dinlenmeyen = 0;
  for (const [u, sat] of uyeSat) {
    const pay = sat * SANATCI_PAYI, d = uyeDinleme.get(u);
    if (!d) {
      dinlenmeyen += pay;
      continue;
    }
    const top = [...d.values()].reduce((a, b) => a + b, 0);
    for (const [id, n] of d) {
      s0(id).sat += pay * n / top;
      dagitilan += pay * n / top;
    }
  }
  const paylar = {};
  const sarkilar = Object.entries(sarki).map(([id, s]) => {
    const a = sarkiSanatcisi(id);
    if (a.kim && s.sat > 0) paylar[a.kim] = (paylar[a.kim] || 0) + s.sat;
    return { id, sayildi: s.sayildi, dinleyen: s.dinleyen.size, kendi: s.kendi, elenen: s.elenen, sat: Math.floor(s.sat), cuzdan: a.kim ? "var" : "yok" };
  });
  for (const k of Object.keys(paylar)) paylar[k] = Math.floor(paylar[k]);
  return { ay, bas, son, uye: uyeSat.size, dagitilan: Math.floor(dagitilan), dinlenmeyen: Math.floor(dinlenmeyen), sarkilar, paylar };
}
function bakiye(kim, haric) {
  let b = 0;
  for (const [ay, a] of Object.entries(sanatcilar.aylar)) if (ay !== haric) b += a.paylar && a.paylar[kim] || 0;
  for (const o of sanatcilar.odenen) if (o.kim === kim) b -= o.sat;
  return b;
}
const bchYaz = (sat) => (sat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
const dolarYaz = (sat, usd) => !usd || !(sat > 0) ? "" : sat * usd / 1e8 >= 0.01 ? ` (about $${(sat * usd / 1e8).toFixed(2)})` : " (less than one cent)";
function raporMetni(m, ayAdi, usd) {
  const satirlar = m.sarkilar.map((s) => `- “${s.ad}”: ${s.sayildi} ${s.sayildi === 1 ? "play" : "plays"} from ${s.dinleyen} ${s.dinleyen === 1 ? "listener" : "listeners"}`);
  const esik = m.bakiye * usd / 1e8 >= ODEME_ESIGI_USD;
  const durum = !m.kim ? "We don’t have a wallet for your songs yet. Reply with your Bitcoin Cash address and we’ll pay your balance there." : !usd ? "We couldn’t read the BCH price today, so your balance carries over to next month." : esik ? `We’ll send it to your wallet ${m.kim.slice(0, 18)}…${m.kim.slice(-6)} in the next few days.` : `That is below our $${ODEME_ESIGI_USD} payout minimum, so it carries over to next month.`;
  const govde = [
    `Hi ${m.ad},`,
    "",
    `Here is your ${ayAdi} on Gramofon.`,
    "",
    ...satirlar,
    "",
    `Your share this month: ${bchYaz(m.pay)} BCH${dolarYaz(m.pay, usd)}.`,
    `Your balance: ${bchYaz(m.bakiye)} BCH${dolarYaz(m.bakiye, usd)}.`,
    durum,
    "",
    "How we count: a play counts after a member listens for 30 seconds. Half of every membership goes to the artists that member played, split by plays. Plays from your own wallet and plays that look automated are not counted.",
    "",
    `Terms: ${SITE_ADRESI}/terms`,
    "Questions? Just reply to this email. To stop these monthly emails, reply “stop”.",
    "",
    "Gramofon",
    ""
  ].join("\n");
  return { konu: `Gramofon: your plays in ${ayAdi}`, govde, odenecek: !!(m.kim && esik) };
}
async function ayRaporu(ay, onizle) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ay)) throw kodlu(400, "ay");
  if (!onizle && ayAraligi(ay)[1] > simdiSn()) throw kodlu(400, "ay bitmedi");
  if (!onizle && sanatcilar.aylar[ay]) return { zaten: true, ay, ...sanatcilar.aylar[ay] };
  const h = ayHesapla(ay);
  let usd = 0;
  try {
    usd = await bchUsd();
  } catch {
  }
  const kat = (await katalog()).sarkilar || [], ayAdi = new Date(ayAraligi(ay)[0] * 1e3).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const kisiler = new Map();
  for (const e of bekleyen.liste) {
    if (e.durum !== "onay" || !e.katalog || !e.raporEposta) continue;
    const a = sarkiSanatcisi(e.katalog), s = h.sarkilar.find((x) => x.id === e.katalog) || { sayildi: 0, dinleyen: 0 }, k = kat.find((x) => x.id === e.katalog);
    if (!k) continue;
    const m = kisiler.get(e.raporEposta) || { ad: e.sanatci, kim: a.kim, sarkilar: [] };
    m.sarkilar.push({ ad: k.ad, sayildi: s.sayildi, dinleyen: s.dinleyen });
    kisiler.set(e.raporEposta, m);
  }
  const mailler = [], odenecek = [];
  for (const [eposta, m] of kisiler) {
    m.pay = m.kim ? h.paylar[m.kim] || 0 : 0;
    m.bakiye = m.kim ? Math.floor(bakiye(m.kim, ay) + m.pay) : 0;
    const r = raporMetni(m, ayAdi, usd);
    mailler.push({ eposta, konu: r.konu, govde: r.govde });
  }
  for (const kim of new Set([...Object.keys(h.paylar), ...sanatcilar.odenen.map((o) => o.kim)])) {
    const b = Math.floor(bakiye(kim, ay) + (h.paylar[kim] || 0));
    if (usd && b * usd / 1e8 >= ODEME_ESIGI_USD) odenecek.push({ kim, sat: b, usd: Number((b * usd / 1e8).toFixed(2)) });
  }
  if (!onizle) {
    sanatcilar.aylar[ay] = { hesaplandi: simdiSn(), usd, uye: h.uye, dagitilan: h.dagitilan, dinlenmeyen: h.dinlenmeyen, sarkilar: h.sarkilar, paylar: h.paylar };
    for (const m of mailler) raporlar.liste.push({ id: crypto.randomBytes(6).toString("hex"), ay, ...m, durum: "bekliyor", zaman: simdiSn() });
    await sanatciYaz();
    await raporYaz();
  }
  return { ay, usd, ...h, mail: mailler.length, odenecek, ...onizle ? { onizleme: mailler.map((m) => ({ konu: m.konu, govde: m.govde })) } : {} };
}
async function isit(yalniz) {
  let kat;
  try {
    kat = (await katalog(!!yalniz)).sarkilar || [];
  } catch {
    return { hata: "katalog" };
  }
  const sonuc = [];
  for (const s of kat) {
    if (yalniz && s.id !== yalniz || !s.kapak) continue;
    for (const boy of [160, 600]) await kapakAl(s, boy).catch(() => null);
  }
  for (const s of kat) {
    if (yalniz && s.id !== yalniz) continue;
    if (!/^[a-z0-9][a-z0-9._-]{0,90}$/.test(s.dosya || "")) continue;
    try {
      fs.statSync(path.join(SES_KLASORU, s.dosya));
      continue;
    } catch {
    }
    let dolu = 0;
    try {
      for (const a of fs.readdirSync(SES_KLASORU)) dolu += fs.statSync(path.join(SES_KLASORU, a)).size;
    } catch {
    }
    if (dolu > SES_SINIRI * 0.8) break;
    const t = Date.now();
    while (iniyor.has(s.dosya)) await new Promise((ok) => setTimeout(ok, 500));
    await diskeIndir(s.dosya);
    sonuc.push({ id: s.id, sn: Math.round((Date.now() - t) / 100) / 10, diskte: fs.existsSync(path.join(SES_KLASORU, s.dosya)) });
  }
  return { indirilen: sonuc };
}
setTimeout(() => {
  isit().catch(() => {
  });
  setInterval(() => isit().catch(() => {
  }), 15 * 6e4);
}, 2e4);
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
  if (req.method === "GET" && u.pathname === "/yonetim/makbuzlar") {
    return yanit(req, res, 200, { liste: bekleyen.liste.filter((e2) => e2.makbuz && e2.makbuz.durum === "bekliyor" && e2.eposta).map((e2) => ({ id: e2.id, eposta: e2.eposta, konu: e2.makbuz.konu, govde: e2.makbuz.govde })) });
  }
  if (req.method === "GET" && u.pathname === "/yonetim/raporlar") {
    return yanit(req, res, 200, { liste: raporlar.liste.filter((r) => r.durum === "bekliyor").map((r) => ({ id: r.id, eposta: r.eposta, konu: r.konu, govde: r.govde })) });
  }
  if (req.method !== "POST") return yanit(req, res, 405, { hata: "yöntem" });
  const g = await govdeOku(req, u.pathname === "/yonetim/parmakizi" ? 262144 : 16384);
  if (u.pathname === "/yonetim/ay-raporu") return yanit(req, res, 200, await ayRaporu(String(g.ay || ""), g.onizle === true));
  const rp = /^\/yonetim\/rapor\/([a-f0-9]{12})$/.exec(u.pathname);
  if (rp) {
    const r = raporlar.liste.find((x) => x.id === rp[1]);
    if (!r || !["gitti", "hata"].includes(g.durum)) return yanit(req, res, 404, { hata: "yok" });
    Object.assign(r, { durum: g.durum, gonderildi: simdiSn() });
    delete r.govde;
    delete r.eposta;
    await raporYaz();
    return yanit(req, res, 200, { ok: true });
  }
  if (u.pathname === "/yonetim/sanatci-odendi") {
    if (!ADRES_DESENI.test(String(g.kim || "")) || !(Number(g.sat) > 0) || !/^[0-9a-f]{64}$/.test(String(g.txid || ""))) return yanit(req, res, 400, { hata: "kim, sat, txid" });
    sanatcilar.odenen.push({ kim: g.kim, sat: Math.floor(Number(g.sat)), txid: g.txid, zaman: simdiSn() });
    await sanatciYaz();
    return yanit(req, res, 200, { ok: true, bakiye: Math.floor(bakiye(g.kim)) });
  }
  if (u.pathname === "/yonetim/isit") return yanit(req, res, 200, await isit(typeof g.id === "string" ? g.id : ""));
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
  if (u.pathname === "/yonetim/uyelik-deneme") {
    if (typeof g.sil === "string" && /^deneme-uye-[a-f0-9]{16}$/.test(g.sil)) {
      delete kayitlar.txid[g.sil];
      await kayitYaz();
      return yanit(req, res, 200, { ok: true });
    }
    const saat = Math.min(72, Math.max(1, Number(g.saat) || 1)), kim = String(g.kim || "");
    if (!cashaddrKilit(kim)) return yanit(req, res, 400, { hata: "adres" });
    const txid = "deneme-uye-" + crypto.randomBytes(8).toString("hex"), zaman = simdiSn();
    kayitlar.txid[txid] = { kim, sat: 0, zaman, bitis: zaman + saat * 3600, n: "", deneme: true };
    await kayitYaz();
    return yanit(req, res, 200, { txid, bitis: zaman + saat * 3600 });
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
    if (e.rapor && e.durum === "onay" && e.eposta) e.raporEposta = e.eposta;
    e.eposta = "";
  }
  if (g.raporDur === true) {
    delete e.raporEposta;
    e.rapor = false;
  }
  if (typeof g.raporAc === "string") {
    const p = temiz(g.raporAc, 120);
    if (e.durum !== "onay" || !EPOSTA.test(p)) return yanit(req, res, 400, { hata: "onaylı şarkı ve geçerli e-posta gerekli" });
    e.raporEposta = p;
    e.rapor = true;
  }
  if (g.makbuz === "yaz" && e.haber && e.eposta) e.makbuz = makbuzYaz(e);
  if (g.makbuz === "gitti" || g.makbuz === "hata") e.makbuz = { durum: g.makbuz, zaman: simdiSn() };
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
dinlemeler = await kayitAc(DINLEMELER, KAYIT_ONEK + "yonetim/dinlemeler.json", { olay: [] });
sanatcilar = await kayitAc(SANATCILAR, KAYIT_ONEK + "yonetim/sanatcilar.json", { aylar: {}, odenen: [] });
raporlar = await kayitAc(RAPORLAR, KAYIT_ONEK + "yonetim/raporlar.json", { liste: [] });
if (!fs.existsSync(DINLEMELER)) await dinlemeYaz();
if (!fs.existsSync(SANATCILAR)) await sanatciYaz();
if (!fs.existsSync(RAPORLAR)) await raporYaz();
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
      if (u.pathname === "/odeme/link") return await linkKontrol(req, res);
      if (u.pathname === "/uyelik/giris") return await uyelikGiris(req, res);
      if (u.pathname === "/dinleme") return await dinlemeSay(req, res);
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
    if (!(e && e.kod)) console.error("hata", String(req.url || "").split("?")[0].replace(/[a-f0-9]{12}/g, "<id>").slice(0, 60), String(e && e.message || e).slice(0, 160));
    if (!res.headersSent) yanit(req, res, e && e.kod ? e.kod : 502, { hata: e && e.kod ? e.message : "sunucu" });
    else res.destroy();
  }
});
sunucu.requestTimeout = 15 * 6e4;
sunucu.listen(PORT, "0.0.0.0", () => console.log("gramofon dinliyor " + PORT));
