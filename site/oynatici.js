(function() {
  var RENK = ["#D97706", "#0D9488", "#16A34A", "#7C3AED"];
  var SESSIZ = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
  var liste = [], sira = [], konum = -1, karisikMi = false, caliyor = false, dinle = function() {
  };
  var izinli = null;
  var au = null, ctx = null, an = null, kazanc = null, uyandi = false, hataSay = 0, tempoBagli = false;
  var uretimBas = 0, uretimGecen = 0, uretimSayac = 0;
  function parca() {
    return konum >= 0 && konum < sira.length ? liste[sira[konum]] : null;
  }
  function dosyaCaliyorMu() {
    var p = parca();
    return !!(p && p.tur !== "uretim");
  }
  function sesKur() {
    if (au) return;
    au = new Audio();
    au.preload = "auto";
    au.crossOrigin = "anonymous";
    au.addEventListener("playing", function() {
      if (!dosyaCaliyorMu()) return;
      hataSay = 0;
      caliyorYap(true);
      if (!tempoBagli) {
        tempoBagli = true;
        tempoBasla(parca());
      }
    });
    au.addEventListener("pause", function() {
      if (dosyaCaliyorMu() && !au.ended) caliyorYap(false);
    });
    au.addEventListener("ended", function() {
      if (dosyaCaliyorMu()) sonraki();
    });
    au.addEventListener("timeupdate", function() {
      if (dosyaCaliyorMu()) dinle("zaman", durum());
    });
    au.addEventListener("error", function() {
      if (!dosyaCaliyorMu() || !au.getAttribute("src") || au.getAttribute("src") === SESSIZ) return;
      hataSay++;
      dinle("hata", { metin: "This song could not be played, skipping." });
      if (hataSay < liste.length) setTimeout(sonraki, 1500);
      else caliyorYap(false);
    });
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      an = ctx.createAnalyser();
      an.fftSize = 2048;
      kazanc = ctx.createGain();
      ctx.createMediaElementSource(au).connect(kazanc);
      kazanc.connect(an);
      an.connect(ctx.destination);
    } catch (e) {
      ctx = null;
      an = null;
    }
  }
  function sesiAc() {
    if (ctx && ctx.state !== "running") ctx.resume().catch(function() {
    });
  }
  var bpmSayac = 0;
  function tempoDur() {
    if (bpmSayac) clearInterval(bpmSayac);
    bpmSayac = 0;
    if (window.GramofonTempo) window.GramofonTempo.birak();
  }
  function tempoBasla(p) {
    if (p && p.bpm > 0) {
      var per = 60 / p.bpm, ilk = p.ilkVurus || 0;
      var bildir = function() {
        if (window.Gramofon && au && !au.paused) window.Gramofon.tempo(per, ((au.currentTime - ilk) % per + per) % per);
      };
      bildir();
      bpmSayac = setInterval(bildir, 500);
    } else if (an && window.GramofonTempo) window.GramofonTempo.bagla(an, au);
  }
  function uyandir() {
    sesKur();
    sesiAc();
    if (uyandi) return;
    uyandi = true;
    if (au.paused && !au.getAttribute("src")) {
      au.src = SESSIZ;
      var s = au.play();
      if (s && s.then) s.then(function() {
        if (au.getAttribute("src") === SESSIZ) au.pause();
      }).catch(function() {
      });
    }
    if (window.GramofonMuzik && window.GramofonMuzik.hazirla) window.GramofonMuzik.hazirla();
  }
  function karistir(d) {
    for (var i = d.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = d[i];
      d[i] = d[j];
      d[j] = t;
    }
    return d;
  }
  function siraKur(basta) {
    var d = izinli ? izinli.slice() : liste.map(function(_, i) {
      return i;
    });
    if (karisikMi) {
      d = karistir(d.filter(function(i) {
        return i !== basta;
      }));
      if (basta >= 0) d.unshift(basta);
      konum = basta >= 0 ? 0 : -1;
    } else {
      if (basta >= 0 && d.indexOf(basta) < 0) d.unshift(basta);
      konum = basta >= 0 ? d.indexOf(basta) : -1;
    }
    sira = d;
  }
  function caliyorYap(v) {
    if (caliyor === v) return;
    caliyor = v;
    if (window.Gramofon) window.Gramofon.cal(v);
    if (navigator.mediaSession) try {
      navigator.mediaSession.playbackState = v ? "playing" : "paused";
    } catch (e) {
    }
    dinle("durum", durum());
  }
  function uretimDur() {
    if (uretimSayac) clearInterval(uretimSayac);
    uretimSayac = 0;
    if (window.GramofonMuzik) window.GramofonMuzik.durdur();
  }
  function baslat(k) {
    if (!liste.length || !sira.length) return;
    konum = (k % sira.length + sira.length) % sira.length;
    var p = parca(), i = sira[konum];
    if (au && !au.paused) au.pause();
    uretimDur();
    tempoDur();
    tempoBagli = false;
    if (window.Gramofon) window.Gramofon.plak(p.renk || RENK[i % RENK.length], p.ad, p.sanatci || "");
    if (window.Gramofon && window.Gramofon.hava) window.Gramofon.hava(p.hava || "normal");
    if (p.tur === "uretim") {
      var M = window.GramofonMuzik;
      if (!M) {
        dinle("hata", { metin: "The music engine did not load." });
        caliyorYap(false);
        return;
      }
      var b = M.baslat(p.tohum);
      M.ses(0.9);
      if (b && b.bpm) p.bpm = b.bpm;
      uretimBas = performance.now();
      uretimGecen = 0;
      uretimSayac = setInterval(function() {
        uretimGecen = (performance.now() - uretimBas) / 1e3;
        dinle("zaman", durum());
        if (uretimGecen >= (p.sure || 150)) sonraki();
      }, 250);
      caliyorYap(true);
    } else {
      sesKur();
      sesiAc();
      if (kazanc) kazanc.gain.value = Math.pow(10, Math.max(-12, Math.min(6, Number(p.kazanc) || 0)) / 20);
      au.src = typeof p.dosya === "function" ? p.dosya() : p.dosya;
      var s = au.play();
      if (s && s.catch) s.catch(function(e) {
        if (e && e.name === "AbortError") return;
        caliyorYap(false);
        dinle("hata", { metin: "Tap play to start the music." });
      });
    }
    medya(p);
    dinle("parca", durum());
  }
  function duraklat() {
    var p = parca();
    if (!p || !caliyor) return;
    if (p.tur === "uretim") {
      uretimGecen = (performance.now() - uretimBas) / 1e3;
      uretimDur();
      caliyorYap(false);
    } else au.pause();
  }
  function devam() {
    var p = parca();
    if (!p) {
      cal();
      return;
    }
    if (caliyor) return;
    if (p.tur === "uretim") {
      baslat(konum);
      return;
    }
    sesiAc();
    var s = au.play();
    if (s && s.catch) s.catch(function() {
    });
  }
  function degistir() {
    if (caliyor) duraklat();
    else devam();
  }
  function sonraki() {
    if (liste.length) baslat(konum + 1);
  }
  function onceki() {
    if (!liste.length) return;
    var p = parca();
    if (p && p.tur !== "uretim" && au && au.currentTime > 3) {
      au.currentTime = 0;
      if (!caliyor) devam();
      return;
    }
    baslat(konum - 1);
  }
  function karisik(ac) {
    karisikMi = !!ac;
    siraKur(konum >= 0 ? sira[konum] : -1);
    dinle("durum", durum());
  }
  function cal(i) {
    if (!liste.length) return;
    if (i == null) {
      if (konum < 0) {
        var havuz = izinli || liste.map(function(_, j) {
          return j;
        });
        if (!havuz.length) return;
        siraKur(karisikMi ? havuz[Math.floor(Math.random() * havuz.length)] : havuz[0]);
      }
      baslat(konum);
      return;
    }
    var k = sira.indexOf(i);
    if (k < 0) {
      siraKur(i);
      k = konum;
    }
    baslat(k);
  }
  function durum() {
    var p = parca(), gecen = 0, sure = 0;
    if (p && p.tur === "uretim") {
      gecen = caliyor ? (performance.now() - uretimBas) / 1e3 : uretimGecen;
      sure = p.sure || 150;
    } else if (p && au) {
      gecen = au.currentTime || 0;
      sure = isFinite(au.duration) ? au.duration : p.sure || 0;
    }
    return { parca: p, dizin: p ? sira[konum] : -1, caliyor, karisik: karisikMi, gecen, sure, ses: ctx ? ctx.state : "yok" };
  }
  var medyaKuruldu = false;
  function medya(p) {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: p.ad,
        artist: p.sanatci || "",
        album: "Gramofon",
        artwork: p.kapakBuyuk ? [{ src: p.kapakBuyuk, sizes: p.kapakTur ? "512x512" : "600x600", type: p.kapakTur || "image/jpeg" }] : []
      });
      if (medyaKuruldu) return;
      medyaKuruldu = true;
      navigator.mediaSession.setActionHandler("play", devam);
      navigator.mediaSession.setActionHandler("pause", duraklat);
      navigator.mediaSession.setActionHandler("nexttrack", sonraki);
      navigator.mediaSession.setActionHandler("previoustrack", onceki);
    } catch (e) {
    }
  }
  window.GramofonOynatici = {
    kur: function(l, d) {
      liste = l.slice();
      if (d) dinle = d;
      siraKur(-1);
    },
    uyandir,
    cal,
    duraklat,
    devam,
    degistir,
    sonraki,
    onceki,
    karisik,
    durum,
    izin: function(d) {
      izinli = Array.isArray(d) ? d.slice() : null;
      siraKur(konum >= 0 ? sira[konum] : -1);
      dinle("durum", durum());
    },
    liste: function() {
      return liste;
    }
  };
})();
