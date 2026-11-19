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
  var DOKUNMATIK = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  var LINK = AG.anahtar("gramofon-link-odeme");
  function linkSonuc(r) {
    if (r.durum === 200 && r.hak) {
      if (!r.kullanildi) yaz(HAK, { hak: r.hak, bitis: r.bitis, txid: r.txid });
      yaz(LINK, null);
      return true;
    }
    if (r.durum === 200 && r.bilet) {
      bellek = { bilet: r.bilet, bitis: r.bitis, kim: r.kim || "", txid: r.txid };
      yaz(KAYIT, bellek);
      yaz(LINK, null);
      return true;
    }
    if (r.durum === 410 || r.durum === 400) yaz(LINK, null);
    return false;
  }
  function bekleyenLink(yukleme) {
    var l = oku(LINK);
    if (!l || !l.teklif || !!l.yukleme !== !!yukleme) return Promise.resolve(false);
    return postJson("/odeme/link", { teklif: l.teklif }).then(linkSonuc, function() {
      return false;
    });
  }
  function linkPencere(t, yukleme, yedek) {
    return new Promise(function(ok, red) {
      var bch = (t.sat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, ""), bitti = false, saat = 0;
      var ort = document.createElement("div");
      ort.className = "odeme-ort";
      ort.innerHTML = '<div class="odeme-kutu" role="dialog" aria-modal="true" aria-labelledby="odeme-baslik"><h2 id="odeme-baslik"></h2><p class="odeme-aciklama"></p><p class="odeme-tutar"></p><div class="odeme-dugmeler"></div><p class="odeme-durum" role="status" aria-live="polite"></p></div>';
      var $ = function(s) {
        return ort.querySelector(s);
      };
      $("h2").textContent = "Pay with your wallet app" + (AG.test ? " (test network)" : "");
      $(".odeme-aciklama").textContent = (AG.test ? "Test network: switch Paytaca to Chipnet first. " : "") + "Tap “Open wallet app”: Paytaca or Selene opens with the payment filled in. Approve it there, then come back to this page; it finishes by itself. If the button does nothing, copy the address and the amount into your wallet.";
      $(".odeme-tutar").textContent = "$" + t.usd + " = " + bch + " BCH " + (yukleme ? "to upload one song." : "for " + t.gun + " day" + (t.gun === 1 ? "" : "s") + " of music.") + " Send exactly this amount.";
      function durum(m) {
        $(".odeme-durum").textContent = m;
      }
      function dugme(metin, is, ikincil, adres) {
        var d = document.createElement(adres ? "a" : "button");
        if (adres) d.href = adres;
        else d.type = "button";
        d.textContent = metin;
        d.className = ikincil ? "ikincil" : "ana";
        if (is) d.addEventListener("click", is);
        $(".odeme-dugmeler").appendChild(d);
      }
      function kopyala(metin, yazi) {
        var y = function() {
          durum(yazi);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(metin).then(y, function() {
          durum(metin);
        });
        else durum(metin);
      }
      function kapat() {
        bitti = true;
        clearTimeout(saat);
        document.removeEventListener("visibilitychange", gorunur);
        document.removeEventListener("keydown", esc, true);
        ort.remove();
      }
      function sorgula() {
        if (bitti) return;
        postJson("/odeme/link", { teklif: t.teklif }).then(function(r) {
          if (bitti) return;
          if (linkSonuc(r)) {
            kapat();
            ok(r);
            return;
          }
          if (r.durum === 410) {
            durum("This payment request has expired. If you paid, keep this page open; otherwise close it and try again.");
            return;
          }
          if (r.durum === 202 && r.gorenler != null) durum("Payment found. Waiting for the network to confirm it…");
          saat = setTimeout(sorgula, document.hidden ? 8e3 : 3e3);
        }, function() {
          if (!bitti) saat = setTimeout(sorgula, 5e3);
        });
      }
      function gorunur() {
        if (!document.hidden && !bitti) {
          clearTimeout(saat);
          sorgula();
        }
      }
      function esc(e) {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        kapat();
        red(new Error("Cancelled."));
      }
      dugme("Open wallet app", null, false, t.adres + "?amount=" + bch);
      dugme("Copy address", function() {
        kopyala(t.adres, "Address copied. Paste it into your wallet.");
      }, true);
      dugme("Copy amount", function() {
        kopyala(bch, "Amount copied: " + bch + " BCH.");
      }, true);
      dugme("Use another device", function() {
        kapat();
        yaz(LINK, null);
        yedek().then(ok, red);
      }, true);
      dugme("Cancel", function() {
        kapat();
        red(new Error("Cancelled."));
      }, true);
      durum("Waiting for your payment…");
      document.addEventListener("visibilitychange", gorunur);
      document.addEventListener("keydown", esc, true);
      document.body.appendChild(ort);
      saat = setTimeout(sorgula, 3e3);
    });
  }
  function linkOde(yukleme, bilgi, yedek) {
    var l = oku(LINK);
    if (l && l.t && !!l.yukleme === !!yukleme && l.bitis * 1e3 > Date.now() + 6e4) {
      bilgi("Waiting for your payment…");
      return linkPencere(l.t, yukleme, yedek);
    }
    bilgi("Getting the price…");
    return postJson("/odeme/teklif", yukleme ? { amac: "yukleme", yol: "link" } : { yol: "link" }).then(function(t) {
      if (t.durum !== 200 || !t.adres || !t.teklif) throw new Error(t.hata === "ödeme kapalı" ? "Payments are not open yet." : "Could not get the price.");
      yaz(LINK, { teklif: t.teklif, yukleme: !!yukleme, bitis: t.gecerli, t: { adres: t.adres, sat: t.sat, usd: t.usd, gun: t.gun, gecerli: t.gecerli, teklif: t.teklif } });
      bilgi("Waiting for your payment…");
      return linkPencere(t, yukleme, yedek);
    });
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
      if (!b || !b.txid) return bekleyenLink(false).then(function() {
        var g = gecerli();
        return g ? { aktif: true, bitis: new Date(g.bitis * 1e3) } : { aktif: false, bitis: null };
      });
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
      function wizard() {
        return agirYukle().then(function(m) {
          return m.uyelikAl({ api: API, onek: AG.onek, test: AG.test, postJson, tamamla, bekleyenYaz: function(v) {
            yaz(BEKLEYEN, v);
          } }, bilgi);
        });
      }
      if (!DOKUNMATIK) return acikMi().then(wizard);
      return acikMi().then(function() {
        return bekleyenLink(false);
      }).then(function(o) {
        var g = o && gecerli();
        return g ? null : linkOde(false, bilgi, wizard);
      }).then(function() {
        var g = gecerli();
        if (!g) throw new Error("The payment did not go through.");
        return { bitis: new Date(g.bitis * 1e3), islem: g.txid };
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
      function wizard() {
        return agirYukle().then(function(m) {
          return m.yuklemeAl({ api: API, onek: AG.onek, test: AG.test, postJson, tamamla, bekleyenYaz: function(v) {
            yaz(BEKLEYEN_Y, v);
          } }, bilgi);
        });
      }
      if (!DOKUNMATIK) return acikMi().then(wizard).then(hakVarMi);
      return acikMi().then(function() {
        return bekleyenLink(true);
      }).then(function(o) {
        return o && gecerliHak() ? null : linkOde(true, bilgi, wizard);
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
  (function() {
    var l = oku(LINK);
    if (l && l.yukleme) bekleyenLink(true);
  })();
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
