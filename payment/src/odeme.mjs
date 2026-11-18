import { initiateDappRelay } from "@wizardconnect/core";
import { sourceOutputToRelay } from "@wizardconnect/core/hdwalletv1-serialize";
import { DappConnectionManager } from "@wizardconnect/dapp";
import {
  binToHex,
  cashAddressToLockingBytecode,
  encodeCashAddress,
  encodeTransaction,
  hash160,
  hashTransaction,
  hexToBin
} from "@bitauth/libauth";
import qrcode from "qrcode-generator";
const KIRINTI = 546n;
const ADRES_SAYISI = 20;
const ADRES_DESENI = /^(bitcoincash|bchtest):[qp][02-9ac-hj-np-z]{41}$/;
let stilVar = false;
function stilEkle() {
  if (stilVar) return;
  stilVar = true;
  const s = document.createElement("style");
  s.textContent = `
.odeme-ort{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:16px;background:rgba(18,10,36,.72)}
.odeme-kutu{width:min(420px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:22px;border-radius:18px;background:#F5EFE1;color:#1A0D2E;
border:2px solid #D97706;box-shadow:inset 0 0 0 5px #F5EFE1,inset 0 0 0 6px rgba(217,119,6,.45),0 18px 44px rgba(18,10,36,.5);
font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.odeme-kutu h2{margin:0 0 6px;font:600 22px/1.2 Georgia,"Times New Roman",serif}
.odeme-aciklama{margin:0 0 12px;color:#6B6479}
.odeme-qr{display:grid;place-items:center;margin:4px 0 14px;padding:12px;background:#fff;border-radius:12px}
.odeme-qr[hidden]{display:none}
.odeme-qr svg{width:100%;max-width:260px;height:auto}
.odeme-dugmeler{display:flex;flex-wrap:wrap;gap:8px}
.odeme-dugmeler a,.odeme-dugmeler button{flex:1 1 auto;min-height:44px;padding:10px 14px;border:0;border-radius:10px;background:#1A0D2E;color:#F5EFE1;
font:inherit;font-weight:600;text-align:center;text-decoration:none;cursor:pointer}
.odeme-dugmeler .ikincil{background:transparent;color:#1A0D2E;box-shadow:inset 0 0 0 1px #E8E0D0}
.odeme-dugmeler :focus-visible{outline:2px solid #D97706;outline-offset:2px}
.odeme-durum{min-height:1.4em;margin:12px 0 0;font-size:14px}
.odeme-durum:empty{min-height:0;margin:0}`;
  document.head.appendChild(s);
}
function pencere(baslik, aciklama) {
  stilEkle();
  const ort = document.createElement("div");
  ort.className = "odeme-ort";
  ort.innerHTML = '<div class="odeme-kutu" role="dialog" aria-modal="true" aria-labelledby="odeme-baslik"><h2 id="odeme-baslik"></h2><p class="odeme-aciklama"></p><div class="odeme-qr" hidden></div><div class="odeme-dugmeler"></div><p class="odeme-durum" role="status" aria-live="polite"></p></div>';
  const $ = (s) => ort.querySelector(s);
  document.body.appendChild(ort);
  const esc = (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const iptal = [...ort.querySelectorAll(".odeme-dugmeler button")].find((b) => b.textContent === "Cancel" || b.textContent === "Close");
    if (iptal) iptal.click();
  };
  document.addEventListener("keydown", esc, true);
  const p = {
    baslik(b, a) {
      $("h2").textContent = b;
      if (a != null) $(".odeme-aciklama").textContent = a;
    },
    qr(metin) {
      const q = qrcode(0, "L");
      q.addData(metin, "Alphanumeric");
      q.make();
      $(".odeme-qr").innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      $(".odeme-qr").hidden = false;
    },
    qrGizle() {
      $(".odeme-qr").hidden = true;
    },
    dugme(metin, is, ikincil, adres) {
      const d = document.createElement(adres ? "a" : "button");
      if (adres) d.href = adres;
      else d.type = "button";
      d.textContent = metin;
      if (ikincil) d.className = "ikincil";
      if (is) d.addEventListener("click", is);
      $(".odeme-dugmeler").appendChild(d);
      return d;
    },
    dugmeleriSil() {
      $(".odeme-dugmeler").textContent = "";
    },
    yaz(m) {
      $(".odeme-durum").textContent = m;
    },
    kapat() {
      document.removeEventListener("keydown", esc, true);
      ort.remove();
    }
  };
  p.baslik(baslik, aciklama);
  return p;
}
function baglan(p, simge) {
  return new Promise((ok, red) => {
    const mgr = new DappConnectionManager("Gramofon", simge, { session: false });
    const relay = initiateDappRelay((d) => mgr.updateConnection(d.client, d.status));
    mgr.attachRelay(relay);
    p.qr(relay.qrUri);
    p.dugme("Open wallet app", null, false, relay.uri);
    p.dugme("Copy link", async () => {
      try {
        await navigator.clipboard.writeText(relay.uri);
        p.yaz("Link copied. Paste it into your wallet.");
      } catch {
        p.yaz(relay.uri);
      }
    }, true);
    p.dugme("Cancel", () => {
      relay.cleanup();
      red(new Error("Cancelled."));
    }, true);
    mgr.on("walletready", (msg) => ok({ mgr, relay, cuzdan: msg.wallet_name || "wallet" }));
    mgr.on("disconnect", () => red(new Error("The wallet disconnected.")));
  });
}
const adresYap = (pub, onek = "bitcoincash") => {
  const r = encodeCashAddress({ prefix: onek, type: "p2pkh", payload: hash160(pub) });
  return typeof r === "string" ? r : r.address;
};
function adresler(mgr, onek) {
  const liste = [];
  for (const [cocuk, yol] of [[0, "receive"], [1, "change"]]) {
    for (let i = 0; i < ADRES_SAYISI; i++) {
      const pub = mgr.getPubkey(cocuk, BigInt(i));
      if (pub) liste.push({ adres: adresYap(pub, onek), yol, sira: i });
    }
  }
  return liste;
}
function kilit(adres) {
  const k = cashAddressToLockingBytecode(adres);
  if (typeof k === "string") throw new Error("Bad address: " + k);
  return k.bytecode;
}
function islemKur(utxolar, yollar, teklif, paraUstuAdresi) {
  const hedef = BigInt(teklif.sat);
  const ucret = (n) => BigInt(10 + 149 * n + 34 * 2 + 10);
  const secilen = [];
  let toplam = 0n;
  for (const u of [...utxolar].sort((a, b) => b.sat - a.sat)) {
    secilen.push(u);
    toplam += BigInt(u.sat);
    if (toplam >= hedef + ucret(secilen.length)) break;
  }
  const f = ucret(secilen.length);
  if (!secilen.length || toplam < hedef + f) {
    const e = new Error("Not enough BCH in this wallet.");
    e.eksikBch = { var: toplam, gerek: hedef + f };
    throw e;
  }
  const girisler = secilen.map((u) => ({
    outpointTransactionHash: hexToBin(u.txid),
    outpointIndex: u.vout,
    sequenceNumber: 4294967295,
    unlockingBytecode: Uint8Array.of()
  }));
  const cikislar = [{ lockingBytecode: kilit(teklif.adres), valueSatoshis: hedef }];
  const ustu = toplam - hedef - f;
  if (ustu >= KIRINTI) cikislar.push({ lockingBytecode: kilit(paraUstuAdresi), valueSatoshis: ustu });
  return {
    islem: { version: 2, inputs: girisler, outputs: cikislar, locktime: 0 },
    kaynaklar: secilen.map((u, i) => ({ ...girisler[i], lockingBytecode: kilit(u.adres), valueSatoshis: BigInt(u.sat) })),
    yollar: secilen.map((u, i) => {
      const y = yollar.get(u.adres);
      return [i, y.yol, y.sira];
    })
  };
}
async function ode(a, bilgi, yukleme) {
  const dokunmatik = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const onek = a.onek || "bitcoincash", test = !!a.test;
  const p = pencere(test ? "Connect your BCH wallet (test network)" : "Connect your BCH wallet", (test ? "Test network: switch Paytaca to Chipnet first (Settings: Use Chipnet Network). Free test coins: faucet.paytaca.com. " : "") + (dokunmatik ? "Tap “Open wallet app” to connect Paytaca or Selene on this phone, or scan the code from another device." : "Scan this code with Paytaca or Selene.") + " Nothing is paid until you approve it in your wallet.");
  let b = null;
  try {
    bilgi("Waiting for your wallet…");
    b = await baglan(p, location.origin + "/icon-192.png");
    p.qrGizle();
    p.dugmeleriSil();
    p.baslik("Approve the payment", `Connected to ${b.cuzdan}. Getting the price…`);
    const t = await a.postJson("/odeme/teklif", yukleme ? { amac: "yukleme" } : {});
    if (t.durum !== 200 || !ADRES_DESENI.test(t.adres || "")) throw new Error(t.hata === "ödeme kapalı" ? "Payments are not open yet." : "Could not get the price.");
    const bch = (t.sat / 1e8).toFixed(8).replace(/0+$/, "");
    p.baslik("Approve the payment", yukleme ? `$${t.usd} = ${bch} BCH to upload one song (1 BCH = $${t.kur}).` : `$${t.usd} = ${bch} BCH for ${t.gun} days of music (1 BCH = $${t.kur}).`);
    p.yaz("Reading your wallet…");
    const liste = adresler(b.mgr, onek);
    if (!liste.length) throw new Error("The wallet did not share its addresses.");
    const u = await a.postJson("/odeme/utxo", { adresler: liste.map((x) => x.adres) });
    if (u.durum !== 200) throw new Error("Could not read your wallet balance.");
    const yollar = new Map(liste.map((x) => [x.adres, x]));
    const ustuSira = typeof b.mgr.getIndexToUse === "function" ? b.mgr.getIndexToUse(1) : 0n;
    const ustuPub = b.mgr.getPubkey(1, BigInt(ustuSira)) || b.mgr.getPubkey(0, 0n);
    const k = islemKur(u.utxolar || [], yollar, t, adresYap(ustuPub, onek));
    p.yaz("Check your wallet and approve.");
    bilgi("Approve the payment in your wallet…");
    const c = await b.mgr.signTransaction({
      transaction: {
        transaction: binToHex(encodeTransaction(k.islem)),
        sourceOutputs: k.kaynaklar.map(sourceOutputToRelay),
        userPrompt: yukleme ? "Gramofon: upload one song" : `Gramofon: ${t.gun} days of music`,
        broadcast: false
      },
      inputPaths: k.yollar
    });
    if (!c || !c.signedTransaction) throw new Error("The wallet did not sign.");
    const ham = String(c.signedTransaction).toLowerCase();
    const txid = hashTransaction(hexToBin(ham));
    const kim = liste[0].adres;
    a.bekleyenYaz({ txid, teklif: t.teklif, kim, ham });
    p.yaz("Sending your payment…");
    const s = await a.tamamla(txid, t.teklif, kim, (m) => p.yaz(m), ham);
    p.kapat();
    return yukleme ? { hak: s.hak, bitis: s.bitis, islem: txid } : { bitis: new Date(s.bitis * 1e3), islem: txid };
  } catch (e) {
    if (e && e.eksikBch) {
      const bch = (n) => (Number(n) / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
      p.qrGizle();
      p.dugmeleriSil();
      p.yaz("");
      p.baslik("Not enough BCH yet", `Your wallet is connected, but it has ${bch(e.eksikBch.var)} BCH. ` + (yukleme ? "Uploading a song needs " : "A month of music needs ") + `${bch(e.eksikBch.gerek)} BCH, network fee included. ` + (test ? "Get free test coins at faucet.paytaca.com, then " : "Add some BCH to this wallet and ") + (yukleme ? "try again." : "drop the token again."));
      await new Promise((ok) => p.dugme("Close", ok));
    }
    p.kapat();
    throw e;
  } finally {
    if (b) {
      try {
        await b.mgr.sendDisconnect("done");
      } catch {
      }
      try {
        b.relay.cleanup();
      } catch {
      }
    }
  }
}
window.GramofonOdemeAgir = { uyelikAl: (a, bilgi) => ode(a, bilgi, false), yuklemeAl: (a, bilgi) => ode(a, bilgi, true) };
