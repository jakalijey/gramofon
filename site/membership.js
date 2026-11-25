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
  var YALDIZ = [
    [0, [[255, 244, 194], [242, 207, 102], [215, 162, 43], [158, 111, 20], [226, 184, 76], [251, 230, 160]]],
    [0.55, [[241, 207, 166], [200, 142, 86], [156, 102, 50], [110, 68, 32], [174, 120, 69], [221, 178, 136]]],
    [1, [[165, 156, 144], [126, 113, 100], [94, 82, 72], [63, 54, 48], [102, 89, 78], [141, 131, 119]]]
  ];
  function karistir(a, b, k) {
    return a.map(function(x, i) {
      return Math.round(x + (b[i] - x) * k);
    });
  }
  function yaldiz(bitis, simdi) {
    if (!bitis) return null;
    var kalan = (+bitis - (simdi == null ? Date.now() : +simdi)) / GUN;
    var gun = Math.min(30, Math.max(1, 30 - Math.floor(kalan)));
    var t = (gun - 1) / 29, d = t <= YALDIZ[1][0] ? 0 : 1, a = YALDIZ[d], b = YALDIZ[d + 1], k = (t - a[0]) / (b[0] - a[0]);
    var stil = {};
    a[1].forEach(function(r, i) {
      stil["--y" + i] = "rgb(" + karistir(r, b[1][i], k).join(",") + ")";
    });
    stil["--y-kenar"] = "rgba(" + karistir([120, 80, 10], [40, 30, 25], t).join(",") + ",.55)";
    stil["--y-golge"] = "rgba(" + karistir([95, 60, 5], [30, 22, 18], t).join(",") + ",.5)";
    stil["--y-isilti"] = "rgba(255,196,70," + (0.45 * Math.max(0, 1 - t / 0.5)).toFixed(2) + ")";
    stil["--y-pas"] = Math.max(0, (t - 0.45) / 0.55).toFixed(2);
    return { gun, stil };
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
    },
    yaldiz
  };
})();
