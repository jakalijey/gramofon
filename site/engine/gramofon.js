(function() {
  var taban = (document.currentScript && document.currentScript.src || "").replace(/[^/]*$/, "");
  var M = null, cv = null, cx = null, ptr = 0, W = 0, H = 0, img = null, kare = 0, bas = 0, calisiyor = false;
  function cekirdekYukle() {
    return new Promise(function(ok, hata) {
      if (window.GramofonCekirdek) return ok();
      var s = document.createElement("script");
      s.src = taban + "gramofon-core.js";
      s.onload = function() {
        ok();
      };
      s.onerror = function() {
        hata(new Error("gramofon-core.js yüklenemedi"));
      };
      document.head.appendChild(s);
    });
  }
  var BASAMAK = [[960, 540], [1280, 720], [1600, 900], [1920, 1080]], basamak = 1, darMi = false, zorla = -1, kilit = false, calAcik = false, acilis = 0;
  var isler = [], araliklar = [], olcBas = 0, sonKare = 0, sonDegisim = 0, sonIs = 0, cizIs = 0, halka = [], halkaN = 0;
  function boyutla() {
    var o = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(cv.clientWidth * o) || cv.width, h = Math.round(cv.clientHeight * o) || cv.height;
    var b = BASAMAK[zorla >= 0 ? zorla : basamak], k = Math.min(1, Math.sqrt(b[0] * b[1] / (w * h)));
    w = Math.max(160, Math.round(w * k));
    h = Math.max(90, Math.round(h * k));
    if (w === W && h === H) return;
    W = w;
    H = h;
    cv.width = W;
    cv.height = H;
    ptr = M._gr_tampon(W, H);
    img = cx.createImageData(W, H);
  }
  function orta(d) {
    var s = d.slice().sort(function(a, b) {
      return a - b;
    });
    return s[s.length >> 1];
  }
  function kaliteAyarla(is, an) {
    if (zorla >= 0 || document.hidden) {
      isler = [];
      araliklar = [];
      olcBas = 0;
      sonKare = 0;
      return;
    }
    if (sonKare) araliklar.push(an - sonKare);
    sonKare = an;
    isler.push(is);
    if (!olcBas) {
      olcBas = an;
      return;
    }
    var gecen = an - olcBas;
    if (!(gecen >= 2e3 && isler.length >= 3 || gecen >= 4e3)) return;
    var oi = orta(isler), oa = araliklar.length ? orta(araliklar) : 16;
    isler = [];
    araliklar = [];
    olcBas = an;
    if (M._gr_gecis() || panelA && M._gr_panel_anim() % 1e3 || an - sonDegisim < 1500) return;
    var o = Math.min(window.devicePixelRatio || 1, 2), dogal = cv.clientWidth * o * cv.clientHeight * o, b = BASAMAK[basamak], s = BASAMAK[basamak + 1];
    if ((oi > 26 || oa > 45) && basamak > (darMi ? 0 : 1)) {
      basamak--;
      sonDegisim = an;
      kilit = true;
    } else if (!kilit && !calAcik && an - acilis < 3e4 && s && dogal > b[0] * b[1] * 1.05 && oi * (s[0] * s[1]) / (b[0] * b[1]) < 16 && oa < 21) {
      basamak++;
      sonDegisim = an;
    }
  }
  function dongu(simdi) {
    if (!calisiyor) return;
    var t0 = performance.now();
    boyutla();
    M._gr_ciz((simdi - bas) / 1e3);
    var t1 = performance.now();
    img.data.set(M.HEAPU8.subarray(ptr, ptr + W * H * 4));
    cx.putImageData(img, 0, 0);
    sonIs = performance.now() - t0;
    cizIs = t1 - t0;
    kaliteAyarla(sonIs, simdi);
    halka[halkaN++ % 120] = cizIs;
    if (M._gr_jeton_dustu()) {
      var e = "gramofon:jeton-dustu";
      cv.dispatchEvent(new CustomEvent(e));
      window.dispatchEvent(new CustomEvent(e));
    }
    if (M._gr_plak_kondu()) {
      var e2 = "gramofon:plak-kondu";
      cv.dispatchEvent(new CustomEvent(e2));
      window.dispatchEvent(new CustomEvent(e2));
    }
    if (panelA) {
      var pa = M._gr_panel_anim(), tam = panelHedef && pa >= 900;
      if (tam !== panelTam) {
        panelTam = tam;
        if (tam) olay("gramofon:panel-acildi");
      }
    }
    {
      var sn = M._gr_sahne_no();
      if (sn !== sahneN) {
        sahneN = sn;
        gecisBekle = true;
        olay("gramofon:perde", { n: sn });
      }
      if (gecisBekle && !M._gr_gecis()) {
        gecisBekle = false;
        olay("gramofon:sahne", { n: sahneN });
      }
    }
    kare = requestAnimationFrame(dongu);
  }
  var yc = null, panelA = false, panelTam = false, panelHedef = false, sahneN = 0, gecisBekle = false;
  function yaziKoy(hangi, metin) {
    if (!metin) {
      M._gr_yazi(hangi, 0);
      return;
    }
    if (!yc) {
      yc = document.createElement("canvas");
      yc.width = 384;
      yc.height = 96;
    }
    var g = yc.getContext("2d", { willReadFrequently: true });
    g.clearRect(0, 0, 384, 96);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    var satir = [String(metin)], boy = 46, f = function(b) {
      return "600 " + b + 'px Georgia, "Times New Roman", serif';
    };
    g.font = f(boy);
    if (g.measureText(satir[0]).width > 366) {
      var k = satir[0].split(" "), en = 1, fark = 1e9;
      for (var i = 1; i < k.length; i++) {
        var d = Math.abs(k.slice(0, i).join(" ").length - k.slice(i).join(" ").length);
        if (d < fark) {
          fark = d;
          en = i;
        }
      }
      if (k.length > 1) satir = [k.slice(0, en).join(" "), k.slice(en).join(" ")];
      boy = satir.length > 1 ? 36 : 46;
      g.font = f(boy);
      while (boy > 14 && Math.max.apply(null, satir.map(function(s) {
        return g.measureText(s).width;
      })) > 366) {
        boy -= 2;
        g.font = f(boy);
      }
    }
    for (var j = 0; j < satir.length; j++) g.fillText(satir[j], 192, 48 + (j - (satir.length - 1) / 2) * boy * 1.12);
    var px = g.getImageData(0, 0, 384, 96).data, p = M._malloc(384 * 96), h = M.HEAPU8;
    for (var q = 0; q < 384 * 96; q++) h[p + q] = px[4 * q + 3];
    M._gr_yazi(hangi, p);
    M._free(p);
  }
  var pc = null;
  function panoKoy(satir, metin, durum, ortala) {
    if (!metin) {
      M._gr_pano(satir, 0, durum);
      return;
    }
    if (!pc) {
      pc = document.createElement("canvas");
      pc.width = 512;
      pc.height = 48;
    }
    var g = pc.getContext("2d", { willReadFrequently: true });
    g.clearRect(0, 0, 512, 48);
    g.fillStyle = "#fff";
    g.textBaseline = "middle";
    g.textAlign = ortala ? "center" : "left";
    var boy = ortala ? 32 : 28, t = String(metin), f = function(b) {
      return (ortala ? "700 " : "600 ") + b + 'px Georgia, "Times New Roman", serif';
    };
    g.font = f(boy);
    while (boy > 21 && g.measureText(t).width > 500) {
      boy -= 2;
      g.font = f(boy);
    }
    while (t.length > 4 && g.measureText(t).width > 500) t = t.slice(0, -2).trimEnd() + "…";
    g.fillText(t, ortala ? 256 : 4, 25);
    var px = g.getImageData(0, 0, 512, 48).data, p = M._malloc(512 * 48), h = M.HEAPU8;
    for (var q = 0; q < 512 * 48; q++) h[p + q] = px[4 * q + 3];
    M._gr_pano(satir, p, durum);
    M._free(p);
  }
  function olay(ad, d) {
    cv.dispatchEvent(new CustomEvent(ad, { detail: d || null }));
    window.dispatchEvent(new CustomEvent(ad, { detail: d || null }));
  }
  function kutu(f, a, b) {
    return { x: f(a, 0 + b), y: f(a, 1 + b), w: f(a, 2 + b), h: f(a, 3 + b) };
  }
  function panoTik(e) {
    if (M && sahneN === 2 && !M._gr_gecis()) {
      var rk = cv.getBoundingClientRect(), kx = (e.clientX - rk.left) / rk.width, ky = (e.clientY - rk.top) / rk.height;
      for (var h = 0; h < 2; h++) {
        var k = kutu(function(a, i) {
          return M._gr_kapi_kutu(a, i);
        }, h, 0);
        if (kx >= k.x && kx <= k.x + k.w && ky >= k.y && ky <= k.y + k.h) {
          e.stopImmediatePropagation();
          olay("gramofon:kapi", { hangi: h ? "sag" : "sol" });
          return;
        }
      }
      return;
    }
    if (!M || !panelA || sahneN !== 0 || M._gr_panel_anim() > 0) return;
    var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, px = M._gr_panel_kutu(0), py = M._gr_panel_kutu(1);
    if (x >= px && x <= px + M._gr_panel_kutu(2) && y >= py && y <= py + M._gr_panel_kutu(3)) {
      e.stopImmediatePropagation();
      window.Gramofon.panelAc(true);
    }
  }
  function renkSayi(r) {
    if (typeof r === "number") return r >>> 0;
    var m = /^#?([0-9a-f]{6})$/i.exec(String(r).trim());
    return m ? parseInt(m[1], 16) : 1710618;
  }
  window.Gramofon = {
    kur: function(canvas) {
      cv = canvas;
      cx = cv.getContext("2d");
      cv.addEventListener("click", panoTik, true);
      return cekirdekYukle().then(function() {
        return window.GramofonCekirdek({ locateFile: function(d) {
          return taban + d;
        } });
      }).then(function(m) {
        M = m;
        W = H = 0;
        bas = acilis = performance.now();
        calisiyor = true;
        if (M._gr_saat) {
          var d = new Date();
          M._gr_saat(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1e3);
        }
        kare = requestAnimationFrame(dongu);
        return window.Gramofon;
      });
    },
    durdur: function() {
      calisiyor = false;
      cancelAnimationFrame(kare);
    },
    sahne: function(n) {
      sahneN = n | 0;
      if (M) M._gr_sahne(n | 0);
    },
    gir: function(hangi) {
      if (M) M._gr_gir(hangi === "sag" || hangi === 1 ? 1 : 0);
    },
    cik: function() {
      if (M) M._gr_cik();
    },
    kapiYeri: function(hangi) {
      if (!M || sahneN !== 2) return null;
      return kutu(function(a, i) {
        return M._gr_kapi_kutu(a, i);
      }, hangi === "sag" || hangi === 1 ? 1 : 0, 0);
    },
    salonPanoAlani: function() {
      if (!M || sahneN !== 2) return null;
      var f = function(a, i) {
        return M._gr_salon_pano(i);
      }, r = kutu(f, 0, 0);
      r.alt = kutu(f, 0, 4);
      r.satir = 5;
      return r;
    },
    jetonAt: function() {
      if (M) M._gr_jeton_at();
    },
    cal: function(ac) {
      calAcik = !!ac;
      if (M) M._gr_cal(ac ? 1 : 0);
    },
    plak: function(renk, yazi, sanatci) {
      if (!M) return;
      if (renk != null) M._gr_plak(renkSayi(renk));
      yaziKoy(0, yazi);
      yaziKoy(1, sanatci);
    },
    adam: function(durum, yazi) {
      if (!M) return;
      var d = { bekliyor: 0, istiyor: 1, inceliyor: 2, onay: 3, ret: 4, veriyor: 5, gosteriyor: 6 }[durum];
      if (d == null) d = durum | 0;
      if (d === 1) yaziKoy(2, yazi);
      M._gr_adam(d);
    },
    balon: function(acik) {
      if (M && M._gr_balon) M._gr_balon(acik ? 1 : 0);
    },
    konus: function(saniye) {
      if (M && M._gr_konus) M._gr_konus(Math.max(0, Number(saniye) || 0));
    },
    adamYeri: function() {
      if (!M || sahneN !== 1 || !M._gr_adam_kafa) return null;
      var x = M._gr_adam_kafa(0), y = M._gr_adam_kafa(1);
      return x < 0 ? null : { x, y };
    },
    yanKapi: function(mod) {
      if (M && M._gr_yan_kapi) M._gr_yan_kapi(mod === "gec" ? 2 : mod === "aralik" ? 1 : 0);
    },
    yanKapiYeri: function() {
      if (!M || sahneN !== 1 && sahneN !== 0 || !M._gr_yan_kapi_kutu) return null;
      return kutu(function(a, i) {
        return M._gr_yan_kapi_kutu(i);
      }, 0, 0);
    },
    dar: function(ac) {
      darMi = !!ac;
      if (M && M._gr_dar) M._gr_dar(ac ? 1 : 0);
    },
    panelSag: function(f) {
      if (M && M._gr_panel_sag) M._gr_panel_sag(+f || 0);
    },
    kalite: function(i) {
      zorla = i == null || i < 0 ? -1 : Math.min(BASAMAK.length - 1, i | 0);
    },
    olcum: function() {
      var h = halka.slice().sort(function(a, b) {
        return a - b;
      });
      return { is: Math.round(sonIs * 10) / 10, ciz: Math.round(cizIs * 10) / 10, orta: h.length ? Math.round(h[h.length >> 1]) : 0, enCok: h.length ? Math.round(h[h.length - 1]) : 0, kare: h.length, tuval: [W, H], basamak: zorla >= 0 ? zorla : basamak, kilit };
    },
    pano: function(baslik, satirlar) {
      if (!M) return;
      panoKoy(6, baslik, 0, true);
      satirlar = satirlar || [];
      for (var i = 0; i < 5; i++) {
        var s = satirlar[i];
        if (!s) {
          M._gr_pano(i, 0, -1);
          continue;
        }
        var d = { inceleniyor: 0, onay: 1, ret: 2, yok: -1 }[s.durum];
        panoKoy(i, s.yazi, d == null ? 0 : d, false);
      }
    },
    kapiYazi: function(sol, sag) {
      if (!M) return;
      yaziKoy(3, sol);
      yaziKoy(4, sag);
    },
    kapi: function(hangi, acik) {
      if (M) M._gr_kapi(hangi === "sag" || hangi === 1 ? 1 : 0, acik ? 1 : 0);
    },
    panel: function(acik) {
      panelA = !!acik;
      panelTam = false;
      panelHedef = false;
      if (M) M._gr_panel(panelA ? 1 : 0);
    },
    panelAc: function(acik) {
      if (!M || !panelA) return;
      panelHedef = !!acik;
      if (!acik && panelTam) {
        panelTam = false;
        olay("gramofon:panel-kapaniyor");
      } else if (!acik) olay("gramofon:panel-kapaniyor");
      M._gr_panel(acik ? 2 : 1);
    },
    panelYeri: function() {
      if (!M || !panelA || sahneN !== 0) return null;
      return { x: M._gr_panel_kutu(0), y: M._gr_panel_kutu(1), w: M._gr_panel_kutu(2), h: M._gr_panel_kutu(3) };
    },
    panelAlani: function() {
      if (!panelA || !panelTam || sahneN !== 0 || !cv) return null;
      var o = (cv.clientWidth || cv.width || 16) / (cv.clientHeight || cv.height || 9), c = 0.011, k = 4e-3;
      return { x: 0.022 + c + k, y: 0.07 + (c + k) * o, w: 0.275 - 2 * (c + k), h: 0.86 - 2 * (c + k) * o };
    },
    hava: function(ad) {
      if (!M) return;
      var h = { normal: 0, balad: 1, hareketli: 2 }[ad];
      M._gr_hava(h == null ? 0 : h);
    },
    plakVer: function(renk) {
      if (M) M._gr_plak_ver(renkSayi(renk));
    },
    tempo: function(periyot, gecen) {
      if (M) M._gr_tempo(periyot, gecen == null ? 0 : gecen);
    },
    don: function(derece) {
      if (M) M._gr_don(derece);
    },
    kamera: function(mx, my, kat) {
      if (M) M._gr_kamera(mx, my, kat);
    }
  };
})();
