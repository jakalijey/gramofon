(function() {
  var ESIK = { baladBpm: 96, baladYogunluk: 2.8, baladParlaklik: 1900, sakinYogunluk: 2.2, sakinEnerji: -18, hareketliBpm: 112, hareketliYogunluk: 3.2, sertParlaklik: 2600, sertEnerji: -12 };
  function fft(re, im) {
    var n = re.length;
    for (var i = 1, j = 0; i < n; i++) {
      var b = n >> 1;
      for (; j & b; b >>= 1) j ^= b;
      j ^= b;
      if (i < j) {
        var t = re[i];
        re[i] = re[j];
        re[j] = t;
        t = im[i];
        im[i] = im[j];
        im[j] = t;
      }
    }
    for (var len = 2; len <= n; len <<= 1) {
      var a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (var s = 0; s < n; s += len) {
        var cr = 1, ci = 0;
        for (var k = 0; k < len / 2; k++) {
          var ur = re[s + k], ui = im[s + k], vr = re[s + k + len / 2] * cr - im[s + k + len / 2] * ci, vi = re[s + k + len / 2] * ci + im[s + k + len / 2] * cr;
          re[s + k] = ur + vr;
          im[s + k] = ui + vi;
          re[s + k + len / 2] = ur - vr;
          im[s + k + len / 2] = ui - vi;
          var nr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = nr;
        }
      }
    }
  }
  function turSec(o) {
    if (o.bpm < ESIK.baladBpm && o.yogunluk < ESIK.baladYogunluk && o.parlaklikHz < ESIK.baladParlaklik) return "balad";
    if (o.yogunluk < ESIK.sakinYogunluk && o.enerjiDb < ESIK.sakinEnerji) return "sakin";
    if (o.parlaklikHz > ESIK.sertParlaklik && o.enerjiDb > ESIK.sertEnerji) return "sert";
    if (o.bpm >= ESIK.hareketliBpm && o.yogunluk >= ESIK.hareketliYogunluk) return "hareketli";
    return "pop";
  }
  function ornekler(x, sr) {
    var bol = Math.max(1, Math.round(sr / 11025)), hz = sr / bol, n = Math.floor(x.length / bol), d = new Float32Array(n), i, j;
    for (i = 0; i < n; i++) {
      var s = 0;
      for (j = 0; j < bol; j++) s += x[i * bol + j];
      d[i] = s / bol;
    }
    var N = 512, hop = hz / 50, kare = Math.max(0, Math.floor((n - N) / hop)), zarf = new Float32Array(kare), once = new Float32Array(N / 2), ust = Math.round(4e3 / (hz / 2) * (N / 2)), bas = Math.max(2, Math.round(160 / (hz / 2) * (N / 2)));
    var karT = 0, merT = 0, merA = 0, dbler = new Float32Array(kare), pen = new Float32Array(N);
    for (i = 0; i < N; i++) pen[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    for (var f = 0; f < kare; f++) {
      var re = new Float32Array(N), im = new Float32Array(N), o = Math.floor(f * hop), kr = 0;
      for (i = 0; i < N; i++) {
        var v = d[o + i];
        kr += v * v;
        re[i] = v * pen[i];
      }
      fft(re, im);
      var aki = 0, ag = 0, at = 0;
      for (var b = 1; b < N / 2; b++) {
        var m = Math.sqrt(re[b] * re[b] + im[b] * im[b]) / N * 2;
        ag += m;
        at += m * b * (hz / N);
        if (b < ust) {
          var db = 20 * Math.log10(m + 1e-9), by = Math.max(0, Math.min(255, (db + 100) / 70 * 255)), fk = by - once[b];
          if (fk > 0) aki += b < bas ? fk * 2.5 : fk;
          once[b] = by;
        }
      }
      zarf[f] = aki;
      karT += kr / N;
      dbler[f] = 10 * Math.log10(kr / N + 1e-10);
      if (ag > 1e-6) {
        merT += at / ag * ag;
        merA += ag;
      }
    }
    if (kare < 250 || !window.GramofonTempo) return null;
    var oy = {}, liste = [], k, sonP = null;
    for (var son = 500; son <= kare; son += 250) {
      var c = window.GramofonTempo.coz(zarf.subarray(son - 500, son), 50);
      if (!c || c.guven < 0.04) continue;
      var ku = Math.round(Math.log(60 / c.periyot) / Math.LN2 * 24), w = c.guven + 0.05;
      oy[ku] = (oy[ku] || 0) + w;
      oy[ku - 1] = (oy[ku - 1] || 0) + w * 0.5;
      oy[ku + 1] = (oy[ku + 1] || 0) + w * 0.5;
      liste.push({ p: c.periyot, w, ku, son, faz: c.sonVurus });
    }
    var enK = null, enO = 0, top = 0;
    for (k in oy) {
      top += oy[k];
      if (oy[k] > enO) {
        enO = oy[k];
        enK = +k;
      }
    }
    var pt = 0, wt = 0;
    liste.forEach(function(g) {
      if (Math.abs(g.ku - enK) <= 1) {
        pt += g.p * g.w;
        wt += g.w;
        if (!sonP) sonP = g;
      }
    });
    var periyot = wt ? pt / wt : 0.5, bpm = 60 / periyot, ilk = 0;
    if (sonP) {
      ilk = (sonP.son / 50 - sonP.faz) % periyot;
      if (ilk < 0) ilk += periyot;
    }
    var ort = 0;
    for (i = 0; i < kare; i++) ort += zarf[i];
    ort /= kare;
    var sap = 0;
    for (i = 0; i < kare; i++) sap += (zarf[i] - ort) * (zarf[i] - ort);
    sap = Math.sqrt(sap / kare);
    var tepe = 0, sonT = -99;
    for (i = 1; i < kare - 1; i++) if (zarf[i] > ort + sap && zarf[i] >= zarf[i - 1] && zarf[i] > zarf[i + 1] && i - sonT >= 5) {
      tepe++;
      sonT = i;
    }
    var dbO = 0;
    for (i = 0; i < kare; i++) dbO += dbler[i];
    dbO /= kare;
    var dbS = 0;
    for (i = 0; i < kare; i++) dbS += (dbler[i] - dbO) * (dbler[i] - dbO);
    dbS = Math.sqrt(dbS / kare);
    var o2 = {
      sure: Math.round(n / hz * 10) / 10,
      bpm: Math.round(bpm * 10) / 10,
      bpmGuven: Math.round(Math.min(1, enO / (top / 2 + 1e-9)) * 100) / 100,
      ilkVurus: Math.round(ilk * 1e3) / 1e3,
      enerjiDb: Math.round(10 * Math.log10(karT / kare + 1e-10) * 10) / 10,
      dinamikDb: Math.round(dbS * 10) / 10,
      parlaklikHz: Math.round(merA ? merT / merA : 0),
      yogunluk: Math.round(tepe / (kare / 50) * 100) / 100
    };
    o2.tur = turSec(o2);
    o2.hava = o2.tur === "balad" || o2.tur === "sakin" ? "balad" : o2.tur === "hareketli" || o2.tur === "sert" ? "hareketli" : "normal";
    return o2;
  }
  function coz(buf) {
    var n = buf.length, x = new Float32Array(n);
    for (var c = 0; c < buf.numberOfChannels; c++) {
      var k = buf.getChannelData(c);
      for (var i = 0; i < n; i++) x[i] += k[i] / buf.numberOfChannels;
    }
    return ornekler(x, buf.sampleRate);
  }
  window.GramofonAnaliz = {
    esik: ESIK,
    ornekler,
    coz,
    turSec,
    dosya: function(g) {
      var okur = g instanceof ArrayBuffer ? Promise.resolve(g) : g.arrayBuffer();
      return okur.then(function(ab) {
        var C = window.OfflineAudioContext || window.webkitOfflineAudioContext, oc = new C(1, 44100, 44100);
        return new Promise(function(ok, hata) {
          oc.decodeAudioData(ab, ok, hata);
        });
      }).then(coz);
    }
  };
})();
