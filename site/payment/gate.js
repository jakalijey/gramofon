(function() {
  var AG = window.GramofonAg || { api: "https://api.heylogram.com/gramofon", onek: "bitcoincash", test: false, anahtar: function(k) {
    return k;
  } };
  var API = AG.api;
  var KAYIT = AG.anahtar("gramofon-uyelik"), BEKLEYEN = AG.anahtar("gramofon-bekleyen-odeme"), bellek = null, agir = null;
  var HAK = AG.anahtar("gramofon-yukleme-hakki"), BEKLEYEN_Y = AG.anahtar("gramofon-bekleyen-yukleme");
  function gecerliHak() {
    var v = oku(HAK);
    return v && v.hak && v.bitis * 1e3 > Date.now() ? v : null;
  }
  function oku(a) {
    try {
      return JSON.parse(localStorage.getItem(a) || "null");
    } catch (e) {
      return null;
    }
  }
  function yaz(a, v) {
    try {
      if (v == null) localStorage.removeItem(a);
      else localStorage.setItem(a, JSON.stringify(v));
    } catch (e) {
    }
  }
  function gecerli() {
    var v = oku(KAYIT) || bellek;
    return v && v.bilet && v.bitis * 1e3 > Date.now() ? v : null;
  }
  function postJson(yol, govde) {
    return fetch(API + yol, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(govde) }).then(function(r) {
      return r.json().catch(function() {
        return {};
      }).then(function(j) {
        j.durum = r.status;
        return j;
      });
    });
  }
  function bekle(ms) {
    return new Promise(function(ok) {
      setTimeout(ok, ms);
    });
  }
  function tamamla(txid, teklif, kim, bilgi, ham) {
    var kez = 0;
    return (function dene() {
      return postJson("/odeme/tamamla", { txid, teklif, kim, ham: ham || void 0 }).then(function(r) {
        if (r.durum === 400 && r.hata === "ağ reddetti") throw new Error("The network refused this payment" + (r.detay ? ": " + r.detay : ".") + " Nothing was taken from your wallet.");
        if (r.durum === 200 && r.hak) {
          if (!r.kullanildi) yaz(HAK, { hak: r.hak, bitis: r.bitis, txid });
          yaz(BEKLEYEN_Y, null);
          return r;
        }
        if (r.durum === 200 && r.bilet) {
          bellek = { bilet: r.bilet, bitis: r.bitis, kim, txid };
          yaz(KAYIT, bellek);
          yaz(BEKLEYEN, null);
          return r;
        }
        if (r.durum !== 202 || ++kez >= 20) throw new Error(r.durum === 202 ? "Your payment is sent but the network has not shown it yet. Keep this page; it will finish on its own." : r.hata || "The payment check failed.");
        if (bilgi) bilgi("Waiting for the network to see your payment…");
        return bekle(2500).then(dene);
      });
    })();
  }
  var kapiAdresi = document.currentScript && document.currentScript.src;
  function agirYukle() {
    if (window.GramofonOdemeAgir) return Promise.resolve(window.GramofonOdemeAgir);
    if (agir) return agir;
    agir = import((kapiAdresi || location.href).replace(/gate\.js.*$/, "") + "payment.js").then(function() {
      if (!window.GramofonOdemeAgir) throw new Error("The payment module did not load.");
      return window.GramofonOdemeAgir;
    }, function() {
      agir = null;
      throw new Error("The payment module did not load.");
    });
    return agir;
  }
  window.GramofonOdeme = {
    ag: "BCH",
    bilet: function() {
      var v = gecerli();
      return v ? v.bilet : "";
    },
    uyelikDurumu: function() {
      var v = gecerli();
      if (v) return Promise.resolve({ aktif: true, bitis: new Date(v.bitis * 1e3) });
      var b = oku(BEKLEYEN);
      if (!b || !b.txid) return Promise.resolve({ aktif: false, bitis: null });
      return tamamla(b.txid, b.teklif, b.kim, null, b.ham).then(
        function(r) {
          return { aktif: true, bitis: new Date(r.bitis * 1e3) };
        },
        function() {
          return { aktif: false, bitis: null, bekleyen: true };
        }
      );
    },
    uyelikAl: function(fiyatUsd, bilgi) {
      bilgi = bilgi || function() {
      };
      var b = oku(BEKLEYEN);
      if (b && b.txid) {
        bilgi("Finishing your earlier payment…");
        return tamamla(b.txid, b.teklif, b.kim, bilgi, b.ham).then(function(r) {
          return { bitis: new Date(r.bitis * 1e3), islem: b.txid };
        });
      }
      return acikMi().then(agirYukle).then(function(m) {
        return m.uyelikAl({ api: API, onek: AG.onek, test: AG.test, postJson, tamamla, bekleyenYaz: function(v) {
          yaz(BEKLEYEN, v);
        } }, bilgi);
      });
    },
    yuklemeAl: function(bilgi) {
      bilgi = bilgi || function() {
      };
      var h = gecerliHak();
      if (h) return Promise.resolve(h);
      var b = oku(BEKLEYEN_Y);
      if (b && b.txid) {
        bilgi("Finishing your earlier payment…");
        return tamamla(b.txid, b.teklif, b.kim, bilgi, b.ham).then(hakVarMi);
      }
      return acikMi().then(agirYukle).then(function(m) {
        return m.yuklemeAl({ api: API, onek: AG.onek, test: AG.test, postJson, tamamla, bekleyenYaz: function(v) {
          yaz(BEKLEYEN_Y, v);
        } }, bilgi);
      }).then(hakVarMi);
    },
    yuklemeHakki: function() {
      return gecerliHak();
    },
    yuklemeHakkiSil: function() {
      yaz(HAK, null);
    }
  };
  function hakVarMi() {
    var h = gecerliHak();
    if (!h) throw new Error("This payment has already been used for a song.");
    return h;
  }
  function acikMi() {
    return fetch(API + "/odeme/ayar", { cache: "no-store" }).then(function(r) {
      return r.ok ? r.json() : null;
    }, function() {
      return null;
    }).then(function(ayar) {
      if (ayar && ayar.aktif === false) throw new Error("Payments are not open yet. Please check back soon.");
    });
  }
})();
