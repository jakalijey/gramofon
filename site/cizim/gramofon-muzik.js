(function() {
  function rastgele(t) {
    return function() {
      t |= 0;
      t = t + 1831565813 | 0;
      var r = Math.imul(t ^ t >>> 15, 1 | t);
      r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }
  function hz(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }
  var TON = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
  var TURLER = [
    { ad: "düz", vurus: 4, tekme: [0, 8], trampet: [4, 12], zil: 2, sal: 0.02, hiz: [88, 124] },
    { ad: "salıncak", vurus: 4, tekme: [0, 8, 10], trampet: [4, 12], zil: 2, sal: 0.2, hiz: [84, 116] },
    { ad: "bossa", vurus: 4, tekme: [0, 6, 8, 14], trampet: [3, 6, 10, 13], zil: 2, sal: 0, hiz: [92, 128], hafif: true },
    { ad: "yarım tempo", vurus: 4, tekme: [0, 10], trampet: [8], zil: 4, sal: 0.1, hiz: [72, 96] },
    { ad: "vals", vurus: 3, tekme: [0], trampet: [4, 8], zil: 4, sal: 0, hiz: [96, 132], hafif: true }
  ];
  function kur(ctx2, cikis, tohum) {
    var r = rastgele(tohum * 7919 + 13), sec = function(d) {
      return d[Math.floor(r() * d.length)];
    };
    var tur = TURLER[Math.floor(r() * TURLER.length)], OA = tur.vurus * 4;
    var bpm = tur.hiz[0] + Math.floor(r() * ((tur.hiz[1] - tur.hiz[0]) / 4 + 1)) * 4, adimSn = 60 / bpm / 4, kok = 45 + Math.floor(r() * 12), minor = r() < 0.5;
    var dizi = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    var gidisA = minor ? sec([[0, 5, 2, 6], [0, 3, 6, 2], [0, 6, 5, 6], [0, 3, 4, 0], [0, 5, 3, 4]]) : sec([[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 3], [5, 3, 0, 4], [0, 2, 3, 4], [0, 5, 1, 4]]);
    var gidisB = minor ? sec([[5, 6, 0, 0], [3, 6, 2, 4], [2, 6, 3, 4]]) : sec([[3, 4, 5, 4], [5, 3, 4, 4], [3, 0, 3, 4], [1, 4, 0, 5]]);
    var yedili = r() < 0.5, arpej = r() < 0.6, calgi = Math.floor(r() * 4), basKalip = tur.vurus === 3 ? [0] : sec([[0, 6, 8, 14], [0, 8, 11, 14], [0, 3, 8, 11], [0, 4, 8, 12], [0, 7, 8, 10]]);
    var sekizlik = OA / 2;
    function derece(d, oktav) {
      var o = Math.floor(d / 7), k = (d % 7 + 7) % 7;
      return kok + dizi[k] + 12 * (o + oktav);
    }
    function akorSesleri(ak) {
      var s = [derece(ak, 1), derece(ak + 2, 1), derece(ak + 4, 1)];
      if (yedili) s.push(derece(ak + 6, 1));
      return s;
    }
    function bolumYaz(gidis, yogun, yukari) {
      var olcu = [], konum = 7 + Math.floor(r() * 4) + yukari;
      for (var o = 0; o < 8; o++) {
        var ak = gidis[o % 4], sek = [];
        if (o === 4 || o === 5) {
          sek = olcu[o - 4].slice();
          if (o === 5) {
            for (var z = sekizlik - 2; z < sekizlik; z++) sek[z] = r() < 0.5 ? derece(ak + sec([0, 2, 4]) + 7, 1) : 0;
          }
          olcu.push(sek);
          continue;
        }
        for (var s = 0; s < sekizlik; s++) {
          var guclu = s % 2 === 0, cal = r() < (guclu ? 0.8 : 0.46) + yogun;
          if (o % 4 === 3 && s >= sekizlik - 2) cal = false;
          if (!cal) {
            sek.push(0);
            continue;
          }
          konum += sec([-2, -1, -1, 1, 1, 2]);
          if (konum < 5 + yukari) konum += 3;
          if (konum > 16 + yukari) konum -= 3;
          if (guclu) {
            var enY = konum, enF = 99;
            for (var a = 0; a < 3; a++) for (var q = -1; q <= 2; q++) {
              var aday = ak + a * 2 + q * 7, f = Math.abs(aday - konum);
              if (f < enF) {
                enF = f;
                enY = aday;
              }
            }
            if (enF <= 2) konum = enY;
          }
          sek.push(derece(konum, 1));
        }
        olcu.push(sek);
      }
      return olcu;
    }
    var ezgi = [bolumYaz(gidisA, -0.08, 0), bolumYaz(gidisB, 0.06, 2)];
    var duzen = sec([["A", "A", "B", "A", "C", "B"], ["A", "B", "A", "C", "A", "B"], ["A", "A", "B", "B", "C", "A"]]);
    var gb = ctx2.createBuffer(1, ctx2.sampleRate, ctx2.sampleRate), gd = gb.getChannelData(0), gr = rastgele(tohum + 5);
    for (var i = 0; i < gd.length; i++) gd[i] = gr() * 2 - 1;
    var cb = ctx2.createBuffer(1, ctx2.sampleRate * 2, ctx2.sampleRate), cd = cb.getChannelData(0);
    for (i = 0; i < cd.length; i++) {
      cd[i] = (gr() * 2 - 1) * 0.05;
      if (gr() < 9e-4) cd[i] += (gr() * 2 - 1) * 0.9;
    }
    var ana = ctx2.createGain();
    ana.gain.value = 0.8;
    var sicak = ctx2.createBiquadFilter();
    sicak.type = "lowpass";
    sicak.frequency.value = 6200;
    var sik = ctx2.createDynamicsCompressor();
    ana.connect(sicak);
    sicak.connect(sik);
    sik.connect(cikis);
    var yanki = ctx2.createDelay(1);
    yanki.delayTime.value = adimSn * 3;
    var yg = ctx2.createGain();
    yg.gain.value = 0.22;
    var yf = ctx2.createBiquadFilter();
    yf.type = "lowpass";
    yf.frequency.value = 1800;
    yanki.connect(yf);
    yf.connect(yg);
    yg.connect(yanki);
    yg.connect(ana);
    var cz = ctx2.createBufferSource();
    cz.buffer = cb;
    cz.loop = true;
    var czg = ctx2.createGain();
    czg.gain.value = 0.22;
    var czf = ctx2.createBiquadFilter();
    czf.type = "highpass";
    czf.frequency.value = 1200;
    cz.connect(czf);
    czf.connect(czg);
    czg.connect(ana);
    cz.start(0);
    function zarf(g, t, vur, tepe, sure) {
      g.gain.setValueAtTime(1e-4, t);
      g.gain.linearRampToValueAtTime(tepe, t + vur);
      g.gain.exponentialRampToValueAtTime(1e-4, t + vur + sure);
    }
    function ezgiSesi(t, f, sure, guc) {
      var g = ctx2.createGain(), fl = ctx2.createBiquadFilter();
      fl.type = "lowpass";
      g.connect(ana);
      g.connect(yanki);
      fl.connect(g);
      var o1 = ctx2.createOscillator(), o2 = ctx2.createOscillator(), g2 = ctx2.createGain(), son = t + sure * 1.6 + 0.08;
      if (calgi === 0) {
        o1.type = "triangle";
        o1.frequency.value = f;
        o2.type = "sine";
        o2.frequency.value = f * 2.003;
        g2.gain.value = 0.28;
        fl.frequency.setValueAtTime(3200, t);
        fl.frequency.exponentialRampToValueAtTime(900, t + sure);
        zarf(g, t, 6e-3, 0.24 * guc, sure * 1.5);
      } else if (calgi === 1) {
        o1.type = "sine";
        o1.frequency.value = f * 2;
        o2.type = "triangle";
        o2.frequency.value = f * 2;
        g2.gain.value = 0.18;
        fl.frequency.value = 2600;
        var tit = ctx2.createOscillator(), tg = ctx2.createGain();
        tit.frequency.value = 5.2;
        tg.gain.value = f * 0.012;
        tit.connect(tg);
        tg.connect(o1.frequency);
        tit.start(t);
        tit.stop(son);
        g.gain.setValueAtTime(1e-4, t);
        g.gain.linearRampToValueAtTime(0.2 * guc, t + 0.05);
        g.gain.setValueAtTime(0.18 * guc, t + Math.max(0.06, sure * 0.8));
        g.gain.linearRampToValueAtTime(1e-4, t + sure + 0.07);
        son = t + sure + 0.12;
      } else if (calgi === 2) {
        o1.type = "sine";
        o1.frequency.value = f * 4;
        o2.type = "sine";
        o2.frequency.value = f * 8.02;
        g2.gain.value = 0.22;
        fl.frequency.value = 7e3;
        zarf(g, t, 2e-3, 0.2 * guc, Math.min(0.9, sure * 2.2));
        son = t + Math.min(0.9, sure * 2.2) + 0.1;
      } else {
        o1.type = "square";
        o1.frequency.value = f;
        o2.type = "sine";
        o2.frequency.value = f * 2;
        g2.gain.value = 0.5;
        fl.frequency.value = 1500;
        fl.Q.value = 1.2;
        g.gain.setValueAtTime(1e-4, t);
        g.gain.linearRampToValueAtTime(0.11 * guc, t + 0.015);
        g.gain.setValueAtTime(0.1 * guc, t + sure * 0.9);
        g.gain.linearRampToValueAtTime(1e-4, t + sure + 0.05);
        son = t + sure + 0.1;
      }
      o1.connect(fl);
      o2.connect(g2);
      g2.connect(fl);
      o1.start(t);
      o2.start(t);
      o1.stop(son);
      o2.stop(son);
    }
    function yastik(t, frekanslar, sure) {
      var g = ctx2.createGain(), fl = ctx2.createBiquadFilter();
      fl.type = "lowpass";
      fl.frequency.value = 950;
      fl.Q.value = 0.5;
      fl.connect(g);
      g.connect(ana);
      var d = 0.2 / Math.sqrt(frekanslar.length);
      g.gain.setValueAtTime(1e-4, t);
      g.gain.linearRampToValueAtTime(d * 0.5, t + 0.45);
      g.gain.setValueAtTime(d * 0.5, t + sure - 0.3);
      g.gain.linearRampToValueAtTime(1e-4, t + sure + 0.5);
      frekanslar.forEach(function(f) {
        [-7, 7].forEach(function(c) {
          var o = ctx2.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = f;
          o.detune.value = c;
          o.connect(fl);
          o.start(t);
          o.stop(t + sure + 0.55);
        });
      });
    }
    function arp(t, f) {
      var o = ctx2.createOscillator(), g = ctx2.createGain();
      o.type = "triangle";
      o.frequency.value = f * 2;
      o.connect(g);
      g.connect(ana);
      g.connect(yanki);
      zarf(g, t, 4e-3, 0.07, adimSn * 2.2);
      o.start(t);
      o.stop(t + adimSn * 2.6 + 0.05);
    }
    function bas(t, f, sure) {
      var g = ctx2.createGain(), fl = ctx2.createBiquadFilter();
      fl.type = "lowpass";
      fl.frequency.value = 420;
      var o1 = ctx2.createOscillator();
      o1.type = "triangle";
      o1.frequency.value = f;
      var o2 = ctx2.createOscillator();
      o2.type = "sine";
      o2.frequency.value = f / 2;
      o1.connect(fl);
      o2.connect(fl);
      fl.connect(g);
      g.connect(ana);
      zarf(g, t, 0.01, 0.42, sure);
      o1.start(t);
      o2.start(t);
      o1.stop(t + sure + 0.1);
      o2.stop(t + sure + 0.1);
    }
    function tekme(t, guc) {
      var o = ctx2.createOscillator(), g = ctx2.createGain();
      o.frequency.setValueAtTime(125, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.13);
      o.connect(g);
      g.connect(ana);
      zarf(g, t, 3e-3, 0.85 * guc, 0.24);
      o.start(t);
      o.stop(t + 0.3);
    }
    function gurultu(t, turu, frekans, tepe, sure) {
      var k = ctx2.createBufferSource();
      k.buffer = gb;
      var fl = ctx2.createBiquadFilter();
      fl.type = turu;
      fl.frequency.value = frekans;
      fl.Q.value = 0.8;
      var g = ctx2.createGain();
      k.connect(fl);
      fl.connect(g);
      g.connect(ana);
      zarf(g, t, 2e-3, tepe, sure);
      k.start(t, t * 7.3 % 0.5);
      k.stop(t + sure + 0.05);
    }
    function adim(n2, t) {
      var olcuNo = Math.floor(n2 / OA), a = n2 % OA, giris = olcuNo < 4, ic = giris ? 0 : olcuNo - 4, bolumNo = Math.floor(ic / 8), harf = giris ? "G" : duzen[bolumNo % duzen.length], ol = ic % 8;
      var gidis = harf === "B" ? gidisB : gidisA, ak = gidis[olcuNo % 4], sonOlcu = !giris && ol === 7;
      if (a % 2 === 1) t += adimSn * tur.sal;
      if (a === 0) yastik(t, akorSesleri(ak).map(hz), adimSn * OA);
      if (a % tur.zil === 0) gurultu(t, "highpass", 7200, a % 4 === 0 ? 0.07 : 0.04, 0.035);
      if (giris && olcuNo < 2) return;
      if (basKalip.indexOf(a) >= 0) bas(t, hz(derece(a >= OA - 2 ? ak + 4 : ak, -1)), adimSn * (a === 0 ? 5 : 2.5));
      if (tur.vurus === 3 && (a === 4 || a === 8)) bas(t, hz(derece(ak + (a === 4 ? 2 : 4), 0)), adimSn * 2);
      if (sonOlcu && a >= OA - 4) {
        gurultu(t, "bandpass", 1900 + 300 * (a - (OA - 4)), 0.16 + 0.05 * (a - (OA - 4)), 0.09);
        if (a === OA - 4) tekme(t, 0.8);
      } else {
        if (tur.tekme.indexOf(a) >= 0) tekme(t, tur.hafif ? 0.6 : 1);
        if (tur.trampet.indexOf(a) >= 0) gurultu(t, "bandpass", tur.hafif ? 2600 : 1900, tur.hafif ? 0.16 : 0.3, tur.hafif ? 0.07 : 0.15);
      }
      if (giris) return;
      if (arpej && (harf === "B" || harf === "C") && a % 2 === 0) {
        var as = akorSesleri(ak), sira = a / 2 % (as.length * 2 - 2);
        arp(t, hz(as[sira < as.length ? sira : as.length * 2 - 2 - sira]));
      }
      if (harf === "C") return;
      if (a % 2 === 0) {
        var bolum = harf === "B" ? 1 : 0, nota = ezgi[bolum][ol][a / 2];
        if (nota) {
          var uz = 1;
          while (a / 2 + uz < sekizlik && !ezgi[bolum][ol][a / 2 + uz] && uz < 3) uz++;
          ezgiSesi(t, hz(nota), adimSn * 2 * uz, a % 4 === 0 ? 1 : 0.8);
        }
      }
    }
    return { bpm, adimSn, adim, ad: "Gramofon No. " + tohum, ton: TON[kok % 12] + (minor ? " minör" : " majör"), tur: tur.ad };
  }
  var ctx = null, an = null, sesG = null, sarki = null, sayac = 0, t0 = 0, n = 0, tohumS = 1, sonTempo = 0, eskiCikis = null;
  function tik() {
    if (!ctx || !sarki) return;
    while (t0 + n * sarki.adimSn < ctx.currentTime + 0.25) {
      sarki.adim(n, t0 + n * sarki.adimSn);
      n++;
    }
    if (ctx.currentTime - sonTempo > 0.5 && ctx.currentTime > t0) {
      sonTempo = ctx.currentTime;
      var v = sarki.adimSn * 4;
      if (window.Gramofon && window.Gramofon.tempo) window.Gramofon.tempo(v, (ctx.currentTime - t0) % v);
    }
  }
  window.GramofonMuzik = {
    analyser: null,
    hazirla: function() {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        an = ctx.createAnalyser();
        an.fftSize = 1024;
        sesG = ctx.createGain();
        sesG.gain.value = 0.9;
        sesG.connect(an);
        an.connect(ctx.destination);
        this.analyser = an;
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx.state;
    },
    baslat: function(tohum) {
      this.hazirla();
      if (eskiCikis) {
        var e = eskiCikis;
        e.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
        setTimeout(function() {
          e.disconnect();
        }, 900);
      }
      tohumS = tohum == null ? Math.floor(Math.random() * 1e5) + 1 : tohum;
      var cikis = ctx.createGain();
      cikis.connect(sesG);
      eskiCikis = cikis;
      sarki = kur(ctx, cikis, tohumS);
      t0 = ctx.currentTime + 0.15;
      n = 0;
      sonTempo = 0;
      if (!sayac) sayac = setInterval(tik, 50);
      tik();
      return { ad: sarki.ad, bpm: sarki.bpm, ton: sarki.ton, tur: sarki.tur };
    },
    sonraki: function() {
      return this.baslat(tohumS + 1);
    },
    durdur: function() {
      if (sayac) clearInterval(sayac);
      sayac = 0;
      sarki = null;
      if (eskiCikis && ctx) {
        eskiCikis.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      }
    },
    ses: function(d) {
      if (sesG) sesG.gain.value = Math.max(0, Math.min(1, d));
    },
    dene: function(tohum, sn) {
      var sr = 22050, oc = new OfflineAudioContext(1, Math.floor(sr * sn), sr), s = kur(oc, oc.destination, tohum);
      for (var k = 0; k * s.adimSn < sn - 0.1; k++) s.adim(k, 0.05 + k * s.adimSn);
      return oc.startRendering().then(function(buf) {
        var d = buf.getChannelData(0), top = 0, tepe = 0, bozuk = 0;
        for (var i = 0; i < d.length; i++) {
          var x = d[i];
          if (x !== x) bozuk++;
          top += x * x;
          if (Math.abs(x) > tepe) tepe = Math.abs(x);
        }
        return { ad: s.ad, bpm: s.bpm, ton: s.ton, tur: s.tur, rms: Math.sqrt(top / d.length), tepe, bozuk, zarf: d };
      });
    }
  };
})();
