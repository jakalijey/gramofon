(function() {
  var HZ = 50, SURE = 10, N = HZ * SURE;
  var an = null, au = null, sayac = 0, onceki = null, simdi = null, zaman = [], zarf = [], son = { bpm: 0, guven: 0, hazir: false }, periyot = 0, aday = 0, sonAnaliz = 0, oylar = {}, secili = null, gecmis = [];
  function coz(e, hz) {
    var n = e.length, i, k, L;
    if (n < hz * 3) return null;
    var d = new Float32Array(n), pen = Math.round(hz * 0.5), top = 0;
    for (i = 0; i < n; i++) {
      top += e[i];
      if (i >= pen) top -= e[i - pen];
      var ort = top / Math.min(i + 1, pen);
      d[i] = Math.max(0, e[i] - ort);
    }
    var enerji = 0;
    for (i = 0; i < n; i++) enerji += d[i] * d[i];
    if (enerji < 1e-9) return null;
    var Lmin = Math.round(hz * 60 / 185), Lmax = Math.round(hz * 60 / 58), puan = new Float32Array(Lmax + 2), ham = new Float32Array(Lmax * 4 + 3);
    for (L = Lmin - 1; L <= Lmax * 4 + 2 && L < n - hz; L++) {
      var s = 0;
      for (i = 0; i + L < n; i++) s += d[i] * d[i + L];
      ham[L] = s / (n - L);
    }
    var enIyi = 0, enL = 0, ref = hz * 60 / 105;
    for (L = Lmin; L <= Lmax; L++) {
      var lg = Math.log(L / ref) / Math.LN2, agirlik = Math.exp(-0.5 * lg * lg / (0.55 * 0.55));
      puan[L] = (ham[L] + 0.5 * (2 * L < ham.length ? ham[2 * L] : 0) + 0.25 * (4 * L < ham.length ? ham[4 * L] : 0)) * agirlik;
      if (puan[L] > enIyi) {
        enIyi = puan[L];
        enL = L;
      }
    }
    if (!enL) return null;
    var a = ham[enL - 1], b = ham[enL], c = ham[enL + 1], kay = a - 2 * b + c !== 0 ? 0.5 * (a - c) / (a - 2 * b + c) : 0;
    if (!(kay > -1 && kay < 1)) kay = 0;
    var Lf = enL + kay, enFaz = 0, enTop = -1, tumTop = 0;
    for (var o = 0; o < enL; o++) {
      var t = 0;
      for (k = 0; ; k++) {
        var x = n - 1 - o - k * Lf;
        if (x < 0) break;
        var xi = Math.round(x);
        t += d[xi] + 0.5 * (xi > 0 ? d[xi - 1] : 0) + 0.5 * (xi < n - 1 ? d[xi + 1] : 0);
      }
      tumTop += t;
      if (t > enTop) {
        enTop = t;
        enFaz = o;
      }
    }
    var guven = Math.max(0, Math.min(1, (enTop / (tumTop / enL + 1e-9) - 1) / 3)) * Math.max(0, Math.min(1, ham[enL] / (enerji / n + 1e-12) * 2));
    return { periyot: Lf / hz, sonVurus: enFaz / hz, guven };
  }
  function ornekle() {
    if (!an || !au || au.paused || au.ended) return;
    if (!simdi || simdi.length !== an.frequencyBinCount) {
      simdi = new Uint8Array(an.frequencyBinCount);
      onceki = new Uint8Array(an.frequencyBinCount);
    }
    an.getByteFrequencyData(simdi);
    var ust = Math.min(simdi.length, Math.max(8, Math.round(4e3 / (an.context.sampleRate / 2) * simdi.length))), bas = Math.max(2, Math.round(160 / (an.context.sampleRate / 2) * simdi.length)), aki = 0;
    for (var i = 0; i < ust; i++) {
      var f = simdi[i] - onceki[i];
      if (f > 0) aki += i < bas ? f * 2.5 : f;
    }
    var tmp = onceki;
    onceki = simdi;
    simdi = tmp;
    var t = au.currentTime;
    if (zaman.length && (t < zaman[zaman.length - 1] || t - zaman[zaman.length - 1] > 1)) {
      zaman = [];
      zarf = [];
    }
    zaman.push(t);
    zarf.push(aki);
    while (zaman.length && t - zaman[0] > SURE) {
      zaman.shift();
      zarf.shift();
    }
    if (t - sonAnaliz < 1 && t >= sonAnaliz) return;
    sonAnaliz = t;
    if (zaman.length < HZ * 3 || t - zaman[0] < 3.5) return;
    var uz = Math.min(N, Math.floor((t - zaman[0]) * HZ)), e = new Float32Array(uz), j = 0;
    for (var m = 0; m < uz; m++) {
      var tm = t - (uz - 1 - m) / HZ;
      while (j < zaman.length - 2 && zaman[j + 1] < tm) j++;
      var p = (tm - zaman[j]) / Math.max(1e-6, zaman[j + 1] - zaman[j]);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      e[m] = zarf[j] * (1 - p) + zarf[j + 1] * p;
    }
    var r = coz(e, HZ);
    if (!r || r.guven < 0.04) return;
    var k, kutu = Math.round(Math.log(60 / r.periyot) / Math.LN2 * 24), ag = r.guven + 0.05;
    for (k in oylar) {
      oylar[k] *= 0.93;
      if (oylar[k] < 5e-3) delete oylar[k];
    }
    oylar[kutu] = (oylar[kutu] || 0) + ag;
    oylar[kutu - 1] = (oylar[kutu - 1] || 0) + ag * 0.5;
    oylar[kutu + 1] = (oylar[kutu + 1] || 0) + ag * 0.5;
    gecmis.push({ p: r.periyot, w: ag, kutu });
    if (gecmis.length > 14) gecmis.shift();
    var enK = null, enO = 0, toplam = 0;
    for (k in oylar) {
      toplam += oylar[k];
      if (oylar[k] > enO) {
        enO = oylar[k];
        enK = +k;
      }
    }
    if (secili === null || !(oylar[secili] > 0) || enO > 1.35 * oylar[secili]) secili = enK;
    var pt = 0, wt = 0;
    gecmis.forEach(function(g) {
      if (Math.abs(g.kutu - secili) <= 1) {
        pt += g.p * g.w;
        wt += g.w;
      }
    });
    if (!wt) return;
    periyot = pt / wt;
    son = { bpm: Math.round(600 / periyot) / 10, guven: Math.round(Math.min(1, oylar[secili] / (toplam / 2 + 1e-9)) * 100) / 100, hazir: true };
    var uyumlu = Math.abs(r.periyot - periyot) / periyot < 0.06;
    if (window.Gramofon && window.Gramofon.tempo) window.Gramofon.tempo(periyot, uyumlu ? r.sonVurus + (au.currentTime - t) : -1);
  }
  window.GramofonTempo = {
    bagla: function(analyser, audio) {
      an = analyser;
      au = audio;
      zaman = [];
      zarf = [];
      periyot = 0;
      aday = 0;
      sonAnaliz = 0;
      oylar = {};
      secili = null;
      gecmis = [];
      son = { bpm: 0, guven: 0, hazir: false };
      if (an) an.smoothingTimeConstant = 0;
      if (!sayac) sayac = setInterval(ornekle, 1e3 / HZ);
    },
    birak: function() {
      if (sayac) clearInterval(sayac);
      sayac = 0;
      an = null;
      au = null;
    },
    durum: function() {
      return son;
    },
    coz
  };
})();
