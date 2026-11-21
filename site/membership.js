(function() {
  var ANAHTAR = "gramofon-deneme-uyelik", GUN = 864e5, deneme = false;
  function yerelMi() {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  }
  function oku() {
    try {
      var v = Number(localStorage.getItem(ANAHTAR));
      return v > Date.now() ? new Date(v) : null;
    } catch (e) {
      return null;
    }
  }
  function yaz(t) {
    try {
      localStorage.setItem(ANAHTAR, String(t));
    } catch (e) {
    }
  }
  window.GramofonUyelik = {
    fiyatUsd: 0.01,
    bilet: function() {
      if (deneme) {
        try {
          return sessionStorage.getItem("gramofon-deneme-bilet") || "";
        } catch (e) {
          return "";
        }
      }
      if (window.GramofonOdeme && window.GramofonOdeme.bilet) return window.GramofonOdeme.bilet() || "";
      return "";
    },
    denemeAc: function() {
      if (yerelMi()) deneme = true;
      return deneme;
    },
    denemeMi: function() {
      return deneme;
    },
    bagliMi: function() {
      return deneme || !!window.GramofonOdeme;
    },
    durum: function() {
      if (deneme) {
        var b = oku();
        return Promise.resolve({ aktif: !!b, bitis: b });
      }
      if (window.GramofonOdeme) return window.GramofonOdeme.uyelikDurumu();
      return Promise.resolve({ aktif: false, bitis: null });
    },
    satinAl: function(bilgi) {
      bilgi = bilgi || function() {
      };
      if (deneme) {
        bilgi("Test payment, no real money.");
        return new Promise(function(ok) {
          setTimeout(function() {
            var t = Date.now() + 30 * GUN;
            yaz(t);
            ok({ bitis: new Date(t), islem: "deneme" });
          }, 1200);
        });
      }
      if (window.GramofonOdeme) return window.GramofonOdeme.uyelikAl(this.fiyatUsd, bilgi);
      return Promise.reject(new Error("Payments are not connected on this page yet."));
    },
    girisYap: function(bilgi) {
      if (deneme) return Promise.reject(new Error("Sign-in is not part of the local test."));
      if (window.GramofonOdeme && window.GramofonOdeme.girisYap) return window.GramofonOdeme.girisYap(bilgi || function() {
      });
      return Promise.reject(new Error("Sign-in is not connected on this page yet."));
    }
  };
})();
