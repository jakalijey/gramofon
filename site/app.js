(function() {
  var $ = function(s) {
    return document.querySelector(s);
  };
  var cizimHazir = false, uyelik = { aktif: false, bitis: null }, aliniyor = false;
  var denemeTur = "";
  (function() {
    var q = new URLSearchParams(location.search), oturum = null;
    try {
      oturum = sessionStorage.getItem("gramofon-deneme");
    } catch (e) {
    }
    var istek = q.get("deneme") || oturum;
    if ((istek === "1" || istek === "dosya") && GramofonUyelik.denemeAc()) {
      denemeTur = istek;
      try {
        sessionStorage.setItem("gramofon-deneme", istek);
      } catch (e) {
      }
      if (q.get("bilet")) try {
        sessionStorage.setItem("gramofon-deneme-bilet", q.get("bilet"));
      } catch (e) {
      }
      if (q.get("hak")) try {
        sessionStorage.setItem("gramofon-deneme-hak", q.get("hak"));
      } catch (e) {
      }
    }
    if (location.search) history.replaceState(null, "", location.pathname);
  })();
  function sureYaz(s) {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function tarihYaz(d) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function durumYaz(metin, tur) {
    var e = $("#durum");
    e.textContent = metin || "";
    e.dataset.tur = tur || "";
    if (tur === "hata" && panoVar && !panoAcik) panoAc(true);
  }
  var dikMi = window.matchMedia("(max-width: 899px) and (orientation: portrait), (max-width: 899px) and (min-height: 501px)");
  var yatayMi = window.matchMedia("(orientation: landscape) and (max-height: 500px) and (pointer: coarse)");
  var telefonMu = window.matchMedia("(max-width: 899px) and (orientation: portrait), (max-width: 899px) and (min-height: 501px), (orientation: landscape) and (max-height: 500px) and (pointer: coarse)"), panoSaat = 0, duvarSaat = 0;
  function yaprakOrani() {
    var w = $("#tuval").clientWidth || innerWidth;
    return Math.min(360, Math.max(300, innerWidth * 0.36)) / w;
  }
  var panoVar = false, panoAcik = false, sonPanel = null;
  function ikiKareSonra(f) {
    requestAnimationFrame(function() {
      requestAnimationFrame(f);
    });
  }
  function panelKonumSil() {
    var p = $(".panel");
    p.style.left = p.style.top = p.style.width = p.style.height = p.style.transform = "";
  }
  var PANO_EN = 340, PANO_BOY = 570;
  function panelYerlestir() {
    var p = $(".panel"), a = panoVar && panoAcik ? Gramofon.panelAlani() : null;
    if (!a) return;
    if (yatayMi.matches) {
      panelKonumSil();
      return;
    }
    var tv = $("#tuval"), w = a.w * tv.clientWidth, h = a.h * tv.clientHeight, k = Math.min(w / PANO_EN, h / PANO_BOY);
    if (!(k > 0)) return;
    p.style.left = a.x * 100 + "%";
    p.style.top = a.y * 100 + "%";
    p.style.width = w / k + "px";
    p.style.height = h / k + "px";
    p.style.transform = "scale(" + k.toFixed(4) + ")";
  }
  function olcekKur() {
    var d = $(".duzen"), kok = document.documentElement, masa = !dikMi.matches && !yatayMi.matches, tv = $("#tuval"), s = $("#test-serit");
    d.classList.toggle("masaustu", masa);
    kok.classList.toggle("masaustu", masa);
    if (masa) kok.style.setProperty("--o", Math.min((tv.clientWidth || innerWidth) / 1280, (tv.clientHeight || innerHeight) / 620).toFixed(4));
    else kok.style.removeProperty("--o");
    kok.style.setProperty("--serit", (s && !s.hidden ? Math.ceil(s.getBoundingClientRect().bottom) : 0) + "px");
  }
  function duvarDugmesi() {
    var b = $("#pano-duvar"), y = panoVar && !panoAcik && Gramofon.panelYeri ? Gramofon.panelYeri() : null;
    if (!y || !(y.w > 0) || !(y.h > 0)) {
      b.hidden = true;
      return;
    }
    b.hidden = false;
    b.style.left = y.x * 100 + "%";
    b.style.top = y.y * 100 + "%";
    b.style.width = y.w * 100 + "%";
    b.style.height = y.h * 100 + "%";
  }
  function panoDurumu() {
    panoVar = !!(cizimHazir && Gramofon.panel && Gramofon.panelAc && Gramofon.panelAlani) && !dikMi.matches && oda === "gramofon";
    if (cizimHazir && Gramofon.panelSag) Gramofon.panelSag(yatayMi.matches ? yaprakOrani() : 0);
    if (cizimHazir && Gramofon.panel && sonPanel !== panoVar) {
      Gramofon.panel(panoVar);
      sonPanel = panoVar;
      panoAcik = false;
    }
    $(".duzen").classList.toggle("panolu", panoVar);
    $(".duzen").classList.toggle("panoda", panoVar && panoAcik);
    if (panoVar && panoAcik) ikiKareSonra(panelYerlestir);
    else panelKonumSil();
    clearInterval(duvarSaat);
    duvarSaat = 0;
    if (panoVar) {
      duvarDugmesi();
      duvarSaat = setInterval(duvarDugmesi, 300);
    } else $("#pano-duvar").hidden = true;
  }
  function panoTazele() {
    clearTimeout(panoSaat);
    panoSaat = setTimeout(function() {
      ikiKareSonra(panoDurumu);
    }, 120);
  }
  function panoAc(ac) {
    if (panoVar && Gramofon.panelAc) Gramofon.panelAc(!!ac);
  }
  var tam = false, tamSaat = 0;
  function tamEkran(ac, geriden) {
    ac = !!ac && dikMi.matches && oda === "gramofon" && cizimHazir && !gecis;
    if (ac === tam) return;
    tam = ac;
    $(".duzen").classList.toggle("tam-ekran", tam);
    document.documentElement.classList.toggle("tam-kilit", tam);
    clearTimeout(tamSaat);
    if (tam) {
      $("#tam-yazi").classList.remove("ipucu-bitti");
      tamSaat = setTimeout(function() {
        $("#tam-yazi").classList.add("ipucu-bitti");
      }, 3200);
      history.pushState({ oda, tam: 1 }, "");
    } else if (!geriden && history.state && history.state.tam) history.back();
  }
  window.addEventListener("gramofon:panel-acildi", function() {
    if (!panoVar) return;
    panoAcik = true;
    $(".duzen").classList.add("panoda");
    panelYerlestir();
    duvarDugmesi();
    if (document.activeElement === $("#pano-duvar")) $("#pano-kapat").focus();
  });
  window.addEventListener("gramofon:panel-kapaniyor", function() {
    var icerde = $(".panel").contains(document.activeElement);
    panoAcik = false;
    $(".duzen").classList.remove("panoda");
    panelKonumSil();
    duvarDugmesi();
    if (icerde && !$("#pano-duvar").hidden) $("#pano-duvar").focus();
  });
  if (window.GramofonAg && GramofonAg.test) $("#test-serit").hidden = false;
  var oda = "salon", kapiSaat = 0, salonListe = [];
  $(".duzen").dataset.oda = oda;
  $(".duzen").dataset.sahne = oda;
  history.replaceState({ oda: "salon" }, "");
  function yerlestir(el, y) {
    if (!y || !(y.w > 0) || !(y.h > 0)) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.style.left = y.x * 100 + "%";
    el.style.top = y.y * 100 + "%";
    el.style.width = y.w * 100 + "%";
    el.style.height = y.h * 100 + "%";
  }
  var bekleyenler = [];
  function benimYuklemeler() {
    try {
      var v = JSON.parse(localStorage.getItem(window.GramofonAg ? GramofonAg.anahtar("gramofon-yuklemelerim") : "gramofon-yuklemelerim") || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }
  var yeniGelen = false, tabelaSaat = 0, tabelaKez = 0;
  try {
    yeniGelen = !localStorage.getItem("gramofon-gezdi");
  } catch (e) {
    yeniGelen = false;
  }
  function gezdi() {
    if (!yeniGelen) return;
    yeniGelen = false;
    clearTimeout(tabelaSaat);
    try {
      localStorage.setItem("gramofon-gezdi", "1");
    } catch (e) {
    }
  }
  function tabelaKur() {
    clearTimeout(tabelaSaat);
    if (!yeniGelen || tabelaKez > 0 || oda !== "salon") return;
    tabelaSaat = setTimeout(function() {
      if (oda === "salon" && yeniGelen && !gecis) {
        tabelaKez = 1;
        salonPanosu();
      }
    }, 12e3);
  }
  var DURUM_YAZI = { inceleniyor: "in review", onay: "approved", ret: "not this time" };
  function panoyaYaz(baslik, satirlar) {
    if (cizimHazir && Gramofon.pano) Gramofon.pano(baslik, satirlar);
    $("#st-baslik").textContent = baslik;
    var ul = $("#st-satirlar");
    ul.textContent = "";
    satirlar.forEach(function(s) {
      var li = document.createElement("li"), y = document.createElement("span");
      y.textContent = s.yazi;
      li.appendChild(y);
      if (DURUM_YAZI[s.durum]) {
        var d = document.createElement("span");
        d.className = "st-durum " + s.durum;
        d.textContent = DURUM_YAZI[s.durum];
        li.appendChild(d);
      }
      ul.appendChild(li);
    });
    $("#salon-tahta").hidden = false;
  }
  function salonPanosu() {
    var davet = { yazi: "Your song next? Knock on the Recording door", durum: "yok" }, satirlar;
    var benimIdler = benimYuklemeler().map(function(y) {
      return y.id;
    });
    var kendi = bekleyenler.filter(function(p) {
      return benimIdler.indexOf(p.id) >= 0;
    });
    if (kendi.length) {
      var sanatci = String(kendi[0].sanatci || "").trim(), bekliyor = false, onayli = false;
      satirlar = kendi.slice(0, 3).map(function(p) {
        var d = p.durum === "onay" || p.durum === "ret" ? p.durum : "inceleniyor";
        if (d === "inceleniyor") bekliyor = true;
        if (d === "onay") onayli = true;
        return { yazi: "“" + p.ad + "”" + (d === "onay" ? " made it! Left door" : d === "ret" ? ": not this time" : " is in the queue"), durum: d };
      });
      satirlar.push({ yazi: bekliyor ? "The man has his headphones on. Patience!" : onayli ? "Go on, hear yourself on the gramophone" : "The next one will make it. Right door", durum: "yok" });
      panoyaYaz(sanatci ? "Hey, " + sanatci + "!" : "Your song", satirlar);
      return;
    }
    if (yeniGelen) {
      if (tabelaKez === 0) panoyaYaz("Lost? This way, please", [
        { yazi: "← Listen to the artists: Gramofon door", durum: "yok" },
        { yazi: "Got a song? Recording door →", durum: "yok" }
      ]);
      else panoyaYaz("Okay, one more time", [
        { yazi: "← Artists to the left", durum: "yok" },
        { yazi: "Songs to the right →", durum: "yok" },
        { yazi: "How many times do I have to say this?", durum: "yok" }
      ]);
      return;
    }
    if (bekleyenler.length) {
      var benim = benimYuklemeler().map(function(y) {
        return y.id;
      });
      var sira = bekleyenler.slice().sort(function(a, b) {
        return (benim.indexOf(b.id) >= 0) - (benim.indexOf(a.id) >= 0);
      });
      satirlar = sira.slice(0, 4).map(function(p) {
        return { yazi: p.ad + (p.sanatci ? " – " + p.sanatci : ""), durum: p.durum === "onay" || p.durum === "ret" ? p.durum : "inceleniyor" };
      });
      satirlar.push(davet);
      panoyaYaz("New songs at the desk", satirlar);
    } else {
      satirlar = salonListe.slice(0, 4).map(function(p) {
        return { yazi: p.ad + (p.sanatci ? " – " + p.sanatci : ""), durum: "yok" };
      });
      satirlar.push(davet);
      panoyaYaz("Now on the gramophone", satirlar);
    }
  }
  function salonSozu() {
    var alt = $("#salon-karsilama-alt"), benim = benimYuklemeler(), son = null;
    bekleyenler.forEach(function(p) {
      if (!son && benim.some(function(y) {
        return y.id === p.id;
      })) son = p;
    });
    var metin = !son ? "" : son.durum === "onay" ? "“" + son.ad + "” was approved. It’s on the gramophone now!" : son.durum === "ret" ? "“" + son.ad + "” wasn’t approved this time." : "“" + son.ad + "” is on the board, waiting for a listen.";
    alt.textContent = metin || "Step through the Gramofon door.";
    $("#salon-durum").textContent = metin;
    $("#salon-durum").hidden = !metin;
  }
  function bekleyenleriAl() {
    return fetch(API + "/bekleyenler", { cache: "no-cache" }).then(function(r) {
      return r.ok ? r.json() : null;
    }).then(function(j) {
      if (j && Array.isArray(j.liste)) {
        bekleyenler = j.liste;
        salonPanosu();
        salonSozu();
      }
    }, function() {
    });
  }
  function salonDugmeleri() {
    var salonda = oda === "salon" && cizimHazir;
    var ky = salonda && Gramofon.kapiYeri ? Gramofon.kapiYeri("sol") : null;
    var pa = salonda && Gramofon.salonPanoAlani ? Gramofon.salonPanoAlani() : null;
    yerlestir($("#kapi-sol"), ky);
    yerlestir($("#kapi-sag"), salonda && Gramofon.kapiYeri ? Gramofon.kapiYeri("sag") : null);
    yerlestir($("#salon-bag"), pa ? pa.alt || { x: pa.x, y: pa.y + pa.h * 5 / 6, w: pa.w, h: pa.h / 6 } : null);
    $(".duzen").classList.toggle("kapili", !!(ky && ky.w > 0));
    $("#salon-karsilama").hidden = !(salonda && ky && ky.w > 0);
  }
  function kapiAralik(hangi, acik) {
    if (cizimHazir && oda === "salon" && !gecis && Gramofon.kapi) Gramofon.kapi(hangi, acik);
  }
  [["#kapi-sol", "sol"], ["#kapi-sag", "sag"]].forEach(function(k) {
    var b = $(k[0]);
    b.addEventListener("mouseenter", function() {
      kapiAralik(k[1], true);
    });
    b.addEventListener("mouseleave", function() {
      kapiAralik(k[1], false);
    });
    b.addEventListener("focus", function() {
      kapiAralik(k[1], true);
    });
    b.addEventListener("blur", function() {
      kapiAralik(k[1], false);
    });
  });
  var gecis = false, gecisSaat = 0, bekleyenOda = null;
  function katmanlariKur() {
    $(".duzen").classList.remove("geciste");
    $(".duzen").dataset.sahne = oda;
    $("#salona-don").hidden = oda === "salon";
    panoDurumu();
    clearInterval(kapiSaat);
    kapiSaat = 0;
    salonDugmeleri();
    if (oda === "salon") kapiSaat = setInterval(salonDugmeleri, 300);
    tabelaKur();
    clearInterval(yanSaat);
    yanSaat = 0;
    yanKapiDugmesi();
    if (oda === "gramofon") yanSaat = setInterval(yanKapiDugmesi, 300);
  }
  var yanSaat = 0;
  function yanKapiDugmesi() {
    yerlestir($("#yan-kapi-oda"), oda === "gramofon" && cizimHazir && !gecis && Gramofon.yanKapiYeri ? Gramofon.yanKapiYeri() : null);
  }
  function kayitOdasina() {
    if (oda === "gramofon") odaKur("kayit", "degistir");
    else odaKur("kayit", true);
  }
  (function() {
    var b = $("#yan-kapi-oda"), ac = function(a) {
      if (cizimHazir && oda === "gramofon" && !gecis && Gramofon.yanKapi) Gramofon.yanKapi(a ? "aralik" : "kapali");
    };
    b.addEventListener("mouseenter", function() {
      ac(true);
    });
    b.addEventListener("mouseleave", function() {
      ac(false);
    });
    b.addEventListener("focus", function() {
      ac(true);
    });
    b.addEventListener("blur", function() {
      ac(false);
    });
    b.addEventListener("click", kayitOdasina);
    $("#panel-kayit").addEventListener("click", kayitOdasina);
  })();
  function gecisBitti() {
    if (!gecis) return;
    gecis = false;
    clearTimeout(gecisSaat);
    katmanlariKur();
    if (oda === "salon") {
      var o = !$("#kapi-sol").hidden ? $("#kapi-sol") : $("#gir-gramofon");
      if (o && !dikMi.matches) o.focus({ preventScroll: true });
    } else if (oda === "kayit") {
      if (window.GramofonKayit) GramofonKayit.gir();
    } else if (!GramofonOynatici.durum().caliyor) setTimeout(function() {
      if (oda === "gramofon" && !gecis) panoAc(true);
    }, 300);
    if (bekleyenOda && bekleyenOda !== oda) {
      var b = bekleyenOda;
      bekleyenOda = null;
      odaKur(b, false);
    } else bekleyenOda = null;
  }
  function odaKur(yeni, kayit) {
    if (tam && yeni !== oda) tamEkran(false, true);
    if (gecis) {
      bekleyenOda = yeni;
      return;
    }
    if (yeni === oda) return;
    if (yeni !== "salon") gezdi();
    var eski = oda;
    oda = yeni;
    $(".duzen").dataset.oda = oda;
    if (kayit === "degistir") history.replaceState({ oda }, "");
    else if (kayit) history.pushState({ oda }, "");
    if (eski === "kayit" && window.GramofonKayit) GramofonKayit.cik();
    if (oda === "salon") bekleyenleriAl();
    if (!cizimHazir) {
      katmanlariKur();
      if (oda === "kayit" && window.GramofonKayit) GramofonKayit.gir();
      return;
    }
    $(".duzen").classList.add("geciste");
    ["#salona-don", "#kapi-sol", "#kapi-sag", "#salon-bag", "#salon-karsilama", "#yan-kapi", "#yan-kapi-oda"].forEach(function(s) {
      $(s).hidden = true;
    });
    clearInterval(kapiSaat);
    kapiSaat = 0;
    if (oda === "salon") {
      panoDurumu();
      salonPanosu();
      if (Gramofon.cik) Gramofon.cik();
      else Gramofon.sahne(2);
    } else if ((eski === "kayit" && oda === "gramofon" || eski === "gramofon" && oda === "kayit") && Gramofon.yanKapi) Gramofon.yanKapi("gec");
    else if (Gramofon.gir) Gramofon.gir(oda === "kayit" ? "sag" : "sol");
    else Gramofon.sahne(oda === "kayit" ? 1 : 0);
    gecis = true;
    if (Gramofon.gir && Gramofon.cik) gecisSaat = setTimeout(gecisBitti, 3e3);
    else gecisBitti();
  }
  window.GramofonSahne = {
    odaya: function(yeni) {
      if (yeni === "salon") {
        if (history.state && history.state.oda && history.state.oda !== "salon") history.back();
        else odaKur("salon", false);
      } else if (yeni === "gramofon" && oda === "kayit") odaKur("gramofon", "degistir");
      else odaKur(yeni, true);
    },
    oda: function() {
      return oda;
    },
    gecisVar: function() {
      return gecis;
    },
    bekleyenleriAl
  };
  $("#kapi-sol").addEventListener("click", function() {
    odaKur("gramofon", true);
  });
  $("#gir-gramofon").addEventListener("click", function() {
    odaKur("gramofon", true);
  });
  $("#salona-don").addEventListener("click", function() {
    if (history.state && history.state.oda && history.state.oda !== "salon") history.back();
    else odaKur("salon", false);
  });
  window.addEventListener("popstate", function(e) {
    if (tam && !(e.state && e.state.tam)) tamEkran(false, true);
    odaKur(e.state && e.state.oda ? e.state.oda : "salon", false);
  });
  $("#kapi-sag").addEventListener("click", function() {
    odaKur("kayit", true);
  });
  $("#gir-kayit").addEventListener("click", function() {
    odaKur("kayit", true);
  });
  window.addEventListener("gramofon:kapi", function(e) {
    var h = e.detail && e.detail.hangi;
    if (h === "sol" && oda === "salon") odaKur("gramofon", true);
    else if (h === "sag" && oda === "salon") odaKur("kayit", true);
  });
  window.addEventListener("gramofon:sahne", gecisBitti);
  window.addEventListener("gramofon:perde", function(e) {
    var ad = e.detail ? ["gramofon", "kayit", "salon"][e.detail.n] : null;
    if (ad) $(".duzen").dataset.sahne = ad;
  });
  $("#pano-kapat").addEventListener("click", function() {
    panoAc(false);
  });
  $("#pano-duvar").addEventListener("click", function() {
    panoAc(true);
  });
  $("#tuval").addEventListener("click", function() {
    if (panoVar && panoAcik) panoAc(false);
  });
  document.addEventListener("keydown", function(e) {
    if (e.key !== "Escape") return;
    if (tam) tamEkran(false);
    else if (panoVar && panoAcik) panoAc(false);
  });
  $("#sahne").addEventListener("click", function() {
    if (tam) tamEkran(false);
  });
  $("#tam-ac").addEventListener("click", function(e) {
    e.stopPropagation();
    tamEkran(true);
  });
  (function() {
    var f = function() {
      if (!dikMi.matches) tamEkran(false);
    };
    if (dikMi.addEventListener) dikMi.addEventListener("change", f);
    else if (dikMi.addListener) dikMi.addListener(f);
  })();
  olcekKur();
  window.addEventListener("resize", olcekKur);
  [dikMi, yatayMi].forEach(function(m) {
    if (m.addEventListener) m.addEventListener("change", olcekKur);
    else if (m.addListener) m.addListener(olcekKur);
  });
  if (window.Gramofon) {
    Gramofon.kur($("#tuval")).then(function() {
      cizimHazir = true;
      if (Gramofon.kapiYazi) Gramofon.kapiYazi("Gramofon", "Recording");
      if (Gramofon.balon) Gramofon.balon(false);
      if (Gramofon.dar) {
        Gramofon.dar(telefonMu.matches);
        var darDegis = function() {
          Gramofon.dar(telefonMu.matches);
        };
        if (telefonMu.addEventListener) telefonMu.addEventListener("change", darDegis);
        else if (telefonMu.addListener) telefonMu.addListener(darDegis);
      }
      var d = GramofonOynatici.durum();
      if (!d.parca) Gramofon.plak("#D97706", "Gramofon", "");
      Gramofon.sahne(oda === "salon" ? 2 : 0);
      if (oda === "salon") salonPanosu();
      panoDurumu();
      salonDugmeleri();
      if (oda === "salon") {
        clearInterval(kapiSaat);
        kapiSaat = setInterval(salonDugmeleri, 300);
        tabelaKur();
      }
      if (window.ResizeObserver) new ResizeObserver(panoTazele).observe($("#tuval"));
      window.addEventListener("resize", panoTazele);
      [telefonMu, dikMi, yatayMi].forEach(function(m) {
        if (m.addEventListener) m.addEventListener("change", panoTazele);
        else if (m.addListener) m.addListener(panoTazele);
      });
      setTimeout(function() {
        salonDugmeleri();
        bekleyisBitti();
      }, 350);
    }).catch(function() {
      $("#sahne").classList.add("cizimsiz");
      bekleyisBitti();
    });
  } else {
    $("#sahne").classList.add("cizimsiz");
    bekleyisBitti();
  }
  function bekleyisBitti() {
    $(".duzen").classList.remove("bekliyor");
  }
  setTimeout(bekleyisBitti, 8e3);
  function jetonDusur() {
    return new Promise(function(ok) {
      if (!cizimHazir) {
        ok();
        return;
      }
      var bitti = false, kez = 0, saat = 0;
      function dustu() {
        if (bitti) return;
        bitti = true;
        clearTimeout(saat);
        window.removeEventListener("gramofon:jeton-dustu", dustu);
        ok();
      }
      window.addEventListener("gramofon:jeton-dustu", dustu);
      (function at() {
        if (bitti) return;
        if (document.hidden) {
          saat = setTimeout(at, 1e3);
          return;
        }
        if (kez >= 3) {
          dustu();
          return;
        }
        kez++;
        Gramofon.jetonAt();
        saat = setTimeout(at, 7e3);
      })();
    });
  }
  function uyelikCiz() {
    $("#uyelik").dataset.aktif = uyelik.aktif ? "1" : "0";
    $("#jeton-al").hidden = uyelik.aktif;
    $("#uye-bilgi").hidden = !uyelik.aktif;
    $("#pano-duvar").dataset.uye = uyelik.aktif ? "1" : "0";
    $("#pano-duvar-yazi").textContent = uyelik.aktif ? "Playlist" : "Drop a token";
    if (uyelik.aktif && uyelik.bitis) $("#uye-bitis").textContent = tarihYaz(uyelik.bitis);
    var u = Number(GramofonUyelik.fiyatUsd) || 0;
    $("#fiyat").textContent = "$" + (u >= 1 ? u : u.toFixed(2)) + (window.GramofonAg && GramofonAg.test ? " in test BCH" : " in BCH") + (GramofonUyelik.denemeMi() ? " (test, no real money)" : "");
    if (!GramofonOynatici.durum().parca) $("#simdi-sanatci").textContent = uyelik.aktif ? "Press play" : "Drop a token to listen";
  }
  fetch((window.GramofonAg ? GramofonAg.api : "https://api.heylogram.com/gramofon") + "/odeme/ayar", { cache: "no-store" }).then(function(r) {
    return r.ok ? r.json() : null;
  }).then(function(a) {
    if (a && Number(a.usd) > 0 && !GramofonUyelik.denemeMi()) {
      GramofonUyelik.fiyatUsd = Number(a.usd);
      uyelikCiz();
    }
  }, function() {
  });
  function jetonaYonlendir() {
    durumYaz("Drop a token to start the music.");
    var b = $("#jeton-al");
    b.focus();
    b.classList.remove("dikkat");
    void b.offsetWidth;
    b.classList.add("dikkat");
  }
  $("#jeton-al").addEventListener("click", function() {
    if (aliniyor) return;
    GramofonOynatici.uyandir();
    aliniyor = true;
    this.disabled = true;
    durumYaz("Opening the payment…");
    GramofonUyelik.satinAl(function(m) {
      durumYaz(m);
    }).then(function(s) {
      uyelik = { aktif: true, bitis: s.bitis };
      durumYaz("Paid. Here comes your token…");
      return jetonDusur();
    }).then(function() {
      uyelikCiz();
      durumYaz("Enjoy. Your month of music starts now.", "iyi");
      GramofonOynatici.cal();
      setTimeout(function() {
        panoAc(false);
      }, 1800);
    }).catch(function(e) {
      durumYaz(e && e.message ? e.message : "The payment did not go through.", "hata");
    }).then(function() {
      aliniyor = false;
      $("#jeton-al").disabled = false;
    });
  });
  function uyeIse(is) {
    return function() {
      if (!uyelik.aktif) {
        jetonaYonlendir();
        return;
      }
      GramofonOynatici.uyandir();
      is();
    };
  }
  $("#cal").addEventListener("click", uyeIse(function() {
    if (kip === "benim" && !benimDizinler().length && !GramofonOynatici.durum().parca) {
      durumYaz("Your playlist is empty. Tap the heart next to a song to add it.");
      return;
    }
    GramofonOynatici.degistir();
  }));
  $("#sonraki").addEventListener("click", uyeIse(function() {
    GramofonOynatici.sonraki();
  }));
  $("#onceki").addEventListener("click", uyeIse(function() {
    GramofonOynatici.onceki();
  }));
  $("#karisik").addEventListener("click", function() {
    GramofonOynatici.karisik(this.getAttribute("aria-pressed") !== "true");
  });
  document.addEventListener("keydown", function(e) {
    if (e.code !== "Space" || e.repeat || /^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(e.target.tagName)) return;
    e.preventDefault();
    $("#cal").click();
  });
  function simdiCiz(d, listeDe) {
    var p = d.parca;
    $("#simdi-ad").textContent = p ? p.ad : "Nothing playing";
    $("#tam-ad").textContent = p ? p.ad : "";
    $("#tam-sanatci").textContent = sanatciYazi(p);
    if (p) $("#simdi-sanatci").textContent = sanatciYazi(p);
    var kapak = $("#simdi-kapak");
    if (p && p.kapakBuyuk) {
      if (kapak.getAttribute("src") !== p.kapakBuyuk) kapak.src = p.kapakBuyuk;
      kapak.hidden = false;
    } else kapak.hidden = true;
    $("#cal").dataset.caliyor = d.caliyor ? "1" : "0";
    $("#cal").setAttribute("aria-label", d.caliyor ? "Pause" : "Play");
    $("#karisik").setAttribute("aria-pressed", d.karisik ? "true" : "false");
    $("#ilerleme-dolu").style.transform = "scaleX(" + (d.sure ? Math.min(1, d.gecen / d.sure) : 0) + ")";
    $("#gecen").textContent = sureYaz(d.gecen);
    $("#sure").textContent = sureYaz(d.sure);
    if (!listeDe) return;
    document.querySelectorAll("#liste .parca").forEach(function(b) {
      var bu = Number(b.dataset.i) === d.dizin;
      b.classList.toggle("calan", bu);
      if (bu) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
  }
  var caliyorDu = false;
  function olay(tur, d) {
    if (tur === "hata") {
      durumYaz(d.metin, "hata");
      return;
    }
    simdiCiz(d, tur !== "zaman");
    if (tur === "parca") gonderDugmesi();
    if (!!d.caliyor !== caliyorDu) {
      caliyorDu = !!d.caliyor;
      $(".duzen").classList.toggle("caliyor", caliyorDu);
      tamEkran(caliyorDu);
    }
  }
  var tumListe = [], begeni = [], kip = "hepsi";
  try {
    begeni = JSON.parse(localStorage.getItem("gramofon-begenilenler") || "[]");
    if (!Array.isArray(begeni)) begeni = [];
  } catch (e) {
    begeni = [];
  }
  try {
    var kk = localStorage.getItem("gramofon-liste-kip");
    kip = kk === "benim" || kk === "radyo" ? kk : "hepsi";
  } catch (e) {
  }
  var KALP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.4-4.5-9.2-9.1C1.5 8 3.7 4.6 7 4.6c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.3 0 5.5 3.4 4.2 6.6-1.8 4.6-9.2 9.1-9.2 9.1z"/></svg>';
  function benimDizinler() {
    return tumListe.map(function(p, i) {
      return begeni.indexOf(p.id) >= 0 ? i : -1;
    }).filter(function(i) {
      return i >= 0;
    });
  }
  function kipDizinler() {
    if (kip === "benim") return benimDizinler();
    return tumListe.map(function(p, i) {
      return (kip === "radyo" ? p.havuz : !p.havuz && !p.kalpEk || p.gonderildi) ? i : -1;
    }).filter(function(i) {
      return i >= 0;
    });
  }
  function kipUygula() {
    var benim = kip === "benim", d = kipDizinler(), bd = benimDizinler();
    $("#kip-hepsi").setAttribute("aria-pressed", kip === "hepsi" ? "true" : "false");
    $("#kip-benim").setAttribute("aria-pressed", benim ? "true" : "false");
    $("#kip-radyo").setAttribute("aria-pressed", kip === "radyo" ? "true" : "false");
    $("#benim-sayi").textContent = bd.length ? "(" + bd.length + ")" : "";
    $("#benim-bos").hidden = !(benim && !d.length);
    $("#radyo-not").hidden = kip !== "radyo";
    var sn = 0;
    document.querySelectorAll("#liste .satir").forEach(function(li) {
      li.hidden = d.indexOf(Number(li.dataset.i)) < 0;
      if (!li.hidden) li.querySelector(".no").textContent = String(++sn).padStart(2, "0");
    });
    var n = d.length;
    $("#liste-sayi").textContent = n + (n === 1 ? " song" : " songs");
    if (GramofonOynatici.izin) GramofonOynatici.izin(d);
    if (panoVar && panoAcik) panelYerlestir();
  }
  function kipSec(k) {
    kip = k;
    try {
      localStorage.setItem("gramofon-liste-kip", k);
    } catch (e) {
    }
    kipUygula();
  }
  function begeniDegis(p, dugme) {
    var var_ = begeni.indexOf(p.id) >= 0;
    if (var_) begeni = begeni.filter(function(x) {
      return x !== p.id;
    });
    else begeni.push(p.id);
    try {
      localStorage.setItem("gramofon-begenilenler", JSON.stringify(begeni));
    } catch (e) {
    }
    begeniDugmesi(dugme, p);
    kipUygula();
  }
  function begeniDugmesi(b, p) {
    var var_ = begeni.indexOf(p.id) >= 0;
    b.setAttribute("aria-pressed", var_ ? "true" : "false");
    b.setAttribute("aria-label", var_ ? "Remove " + p.ad + " from my playlist" : "Add " + p.ad + " to my playlist");
  }
  $("#kip-hepsi").addEventListener("click", function() {
    kipSec("hepsi");
  });
  $("#kip-benim").addEventListener("click", function() {
    kipSec("benim");
  });
  $("#kip-radyo").addEventListener("click", function() {
    kipSec("radyo");
  });
  var KAPAK_RENK = ["#D97706", "#0D9488", "#16A34A", "#7C3AED"];
  var SIFAT = [
    "Amber",
    "Slow",
    "Velvet",
    "Paper",
    "Quiet",
    "Silver",
    "Neon",
    "Sunday",
    "Lonely",
    "Golden",
    "Tender",
    "Hollow",
    "Bright",
    "Distant",
    "Summer",
    "Winter",
    "Electric",
    "Gentle",
    "Midnight",
    "Copper",
    "Little",
    "Wild",
    "Blue",
    "Late"
  ];
  var ISIM = [
    "Hours",
    "Rain",
    "Harbor",
    "Letters",
    "Streets",
    "Lights",
    "Window",
    "River",
    "Echo",
    "Garden",
    "Static",
    "Postcard",
    "Balcony",
    "Tide",
    "Lanterns",
    "Sparrow",
    "Satellite",
    "Corner",
    "Waltz",
    "Signal",
    "Avenue",
    "Daydream",
    "Engine",
    "Orchard"
  ];
  var HECE = ["ka", "lo", "mi", "ra", "ne", "so", "va", "ri", "ta", "lu", "ve", "no", "sa", "ze", "ma", "li", "de", "ro", "fa", "ni", "be", "ko", "ya", "te"];
  var KOTU = /sik|got|kaka|pic|sex|fuk|nig|^am|am$|^ana|oc$|mama|ibne|beko/;
  function tohumRastgele(t) {
    var a = Math.imul(t, 2654435761) >>> 0;
    return function() {
      a = a + 1831565813 >>> 0;
      var z = a;
      z = Math.imul(z ^ z >>> 15, z | 1);
      z ^= z + Math.imul(z ^ z >>> 7, z | 61);
      return ((z ^ z >>> 14) >>> 0) / 4294967296;
    };
  }
  function uydurAd(r, enAz, enCok) {
    for (var k = 0; k < 16; k++) {
      var n = enAz + Math.floor(r() * (enCok - enAz + 1)), s = "";
      for (var i = 0; i < n; i++) s += HECE[Math.floor(r() * HECE.length)];
      if (!KOTU.test(s) && !/(..)\1/.test(s)) return s.charAt(0).toUpperCase() + s.slice(1);
    }
    return "Lumo";
  }
  function radyoKimlik(t) {
    var r = tohumRastgele(t), c = KAPAK_RENK.slice();
    var ad = SIFAT[Math.floor(r() * SIFAT.length)] + " " + ISIM[Math.floor(r() * ISIM.length)];
    var sanatci = uydurAd(r, 2, 3) + (r() < 0.7 ? " " + uydurAd(r, 2, 2) : "");
    for (var i = c.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), x = c[i];
      c[i] = c[j];
      c[j] = x;
    }
    var ufuk = 58 + r() * 14, f = function(v) {
      return v.toFixed(1);
    };
    var tepe = function(y, h) {
      var d = "M0 " + f(y);
      for (var x2 = 0; x2 < 100; x2 += 25) d += " Q" + f(x2 + 12.5) + " " + f(y - h * (0.4 + r())) + " " + f(x2 + 25) + " " + f(y + (r() - 0.5) * h);
      return d + " V100 H0 Z";
    };
    var yildiz = "";
    for (var k = 0, n = 4 + Math.floor(r() * 6); k < n; k++) yildiz += '<circle cx="' + f(r() * 100) + '" cy="' + f(r() * ufuk * 0.7) + '" r="' + (0.5 + r() * 0.9).toFixed(2) + '" fill="#F5EFE1" opacity="' + (0.5 + r() * 0.5).toFixed(2) + '"/>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A0D2E"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>' + yildiz + '<circle cx="' + f(20 + r() * 60) + '" cy="' + f(22 + r() * 22) + '" r="' + f(9 + r() * 9) + '" fill="' + c[0] + '"/><path d="' + tepe(ufuk, 8) + '" fill="' + c[2] + '" opacity="0.9"/><path d="' + tepe(ufuk + 14, 6) + '" fill="#1A0D2E" opacity="0.85"/></svg>';
    return { ad, sanatci, renk: c[0], kapak: "data:image/svg+xml," + encodeURIComponent(svg) };
  }
  function radyoParca(t, gonderildi) {
    var p = { id: "radyo-" + t, ad: "Gramofon No. " + t, sanatci: "Composed by the gramophone", tur: "uretim", tohum: t, sure: 150, radyo: true, gonderildi: !!gonderildi };
    if (gonderildi) {
      var k = radyoKimlik(t);
      p.ad = k.ad;
      p.sanatci = k.sanatci;
      p.renk = k.renk;
      p.kapakKucuk = p.kapakBuyuk = k.kapak;
      p.kapakTur = "image/svg+xml";
    }
    return p;
  }
  function sanatciYazi(p) {
    return p ? (p.sanatci || "") + (p.radyo && p.gonderildi ? " · from the radio" : "") : "";
  }
  function radyoHavuzu(n, haric) {
    var a = new Uint32Array(n * 2), d = [];
    try {
      crypto.getRandomValues(a);
    } catch (e) {
      for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 4294967296);
    }
    for (var j = 0; j < a.length && d.length < n; j++) {
      var t = 13 + a[j] % 9999e3;
      if (haric.indexOf(t) < 0 && d.indexOf(t) < 0) d.push(t);
    }
    return d;
  }
  function radyoGonderilenler() {
    return fetch(API + "/radyo", { cache: "no-cache" }).then(function(r) {
      return r.ok ? r.json() : null;
    }).then(function(j) {
      return j && Array.isArray(j.liste) ? j.liste.map(function(x) {
        return Number(x.tohum);
      }).filter(function(t) {
        return t > 0;
      }) : [];
    }, function() {
      return [];
    });
  }
  function gonderDugmesi() {
    var p = GramofonOynatici.durum().parca;
    $("#radyo-gonder").hidden = !(p && p.radyo && !p.gonderildi);
  }
  $("#radyo-gonder").addEventListener("click", function() {
    var d = GramofonOynatici.durum(), p = d.parca, b = this;
    if (!p || !p.radyo || p.gonderildi) return;
    if (!uyelik.aktif) {
      jetonaYonlendir();
      return;
    }
    b.disabled = true;
    fetch(API + "/radyo/gonder", { method: "POST", headers: { "content-type": "application/json", "x-bilet": GramofonUyelik.bilet() || "" }, body: JSON.stringify({ tohum: p.tohum }) }).then(function(r) {
      return r.json().catch(function() {
        return {};
      }).then(function(j) {
        return { kod: r.status, j };
      });
    }).then(function(c) {
      if (c.kod === 200) {
        Object.assign(p, radyoParca(p.tohum, true));
        p.havuz = false;
        p.kalpEk = false;
        var sat = document.querySelector('#liste .parca[data-i="' + d.dizin + '"]');
        if (sat) {
          sat.querySelector(".ad").textContent = p.ad;
          sat.querySelector(".sanatci").textContent = sanatciYazi(p);
          var img = document.createElement("img");
          img.src = p.kapakKucuk;
          img.alt = "";
          img.width = 40;
          img.height = 40;
          img.className = "kapak";
          sat.querySelector(".kapak").replaceWith(img);
        }
        simdiCiz(GramofonOynatici.durum(), false);
        kipUygula();
        if (window.Gramofon && Gramofon.plak) Gramofon.plak(p.renk, p.ad, p.sanatci);
        salonListe.push(p);
        durumYaz("A new artist is born: “" + p.ad + "” by " + p.sanatci + " is on everyone’s playlist now.", "iyi");
      } else if (c.kod === 429) durumYaz("You can send " + (c.j && c.j.sinir || 5) + " songs a day. Come back tomorrow!");
      else if (c.kod === 401) jetonaYonlendir();
      else durumYaz("The song could not be sent. Please try again.", "hata");
    }, function() {
      durumYaz("The song could not be sent. Please try again.", "hata");
    }).then(function() {
      b.disabled = false;
      gonderDugmesi();
    });
  });
  function listeCiz(l, uretim) {
    tumListe = l;
    $("#liste-not").hidden = !uretim;
    var ol = $("#liste");
    ol.textContent = "";
    l.forEach(function(p, i) {
      var li = document.createElement("li"), b = document.createElement("button"), be = document.createElement("button");
      li.className = "satir";
      li.dataset.i = i;
      be.type = "button";
      be.className = "begen";
      be.innerHTML = KALP;
      begeniDugmesi(be, p);
      be.addEventListener("click", function() {
        begeniDegis(p, be);
      });
      b.type = "button";
      b.className = "parca";
      b.dataset.i = i;
      var no = document.createElement("span"), ad = document.createElement("span"), sn = document.createElement("span"), kp;
      no.className = "no";
      ad.className = "ad";
      sn.className = "sanatci";
      no.textContent = String(i + 1).padStart(2, "0");
      ad.textContent = p.ad;
      sn.textContent = sanatciYazi(p);
      if (p.kapakKucuk) {
        kp = document.createElement("img");
        kp.src = p.kapakKucuk;
        kp.alt = "";
        kp.loading = "lazy";
        kp.width = 40;
        kp.height = 40;
      } else {
        kp = document.createElement("span");
        kp.setAttribute("aria-hidden", "true");
      }
      kp.className = "kapak" + (p.kapakKucuk ? "" : " plak-simge");
      b.append(no, kp, ad, sn);
      b.addEventListener("click", uyeIse(function() {
        GramofonOynatici.cal(i);
      }));
      li.append(b, be);
      ol.appendChild(li);
    });
    kipUygula();
  }
  function listeAcKapa(ac) {
    $("#liste-ac").setAttribute("aria-expanded", ac ? "true" : "false");
    $("#liste-bolum").dataset.acik = ac ? "1" : "0";
    if (panoVar && panoAcik) panelYerlestir();
  }
  (function() {
    var kayit = null;
    try {
      kayit = localStorage.getItem("gramofon-liste-acik");
    } catch (e) {
    }
    listeAcKapa(kayit ? kayit === "1" : true);
    $("#liste-ac").addEventListener("click", function() {
      var ac = this.getAttribute("aria-expanded") !== "true";
      listeAcKapa(ac);
      try {
        localStorage.setItem("gramofon-liste-acik", ac ? "1" : "0");
      } catch (e) {
      }
    });
  })();
  function uretimListesi() {
    var l = [];
    for (var i = 1; i <= 12; i++) l.push({ id: "uretim-" + i, ad: "Gramofon No. " + i, sanatci: "Composed by the gramophone", tur: "uretim", tohum: i, sure: 150 });
    return l;
  }
  var API = window.GramofonAg ? GramofonAg.api : "https://api.heylogram.com/gramofon";
  function sunucudanKatalog() {
    return fetch(API + "/sarkilar", { cache: "no-cache" }).then(function(r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function(k) {
      return { sarkilar: (k.sarkilar || []).map(function(s) {
        var kapak = s.kapak ? function(boy) {
          return API + "/kapak/" + encodeURIComponent(s.id) + "/" + boy + "?v=" + s.kapak;
        } : null;
        return Object.assign({}, s, { tur: "dosya", tarz: s.tur || "", kapakKucuk: kapak && kapak(160), kapakBuyuk: kapak && kapak(600), dosya: function() {
          var b = GramofonUyelik.bilet();
          return API + "/dinle/" + encodeURIComponent(s.id) + (b ? "?bilet=" + encodeURIComponent(b) : "");
        } });
      }) };
    });
  }
  Promise.all([(denemeTur === "dosya" ? fetch("deneme/sarkilar.json", { cache: "no-cache" }).then(function(r) {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }) : sunucudanKatalog()).catch(function() {
    return { sarkilar: [] };
  }), radyoGonderilenler()]).then(function(iki) {
    var k = iki[0], gonderilen = iki[1];
    var l = (k.sarkilar || []).map(function(s) {
      s.tur = s.tur || "dosya";
      return s;
    });
    var uretim = !l.length;
    if (uretim) l = uretimListesi();
    var kalpli = begeni.map(function(id) {
      var m = /^radyo-(\d+)$/.exec(id);
      return m ? Number(m[1]) : 0;
    }).filter(function(t) {
      return t > 0 && gonderilen.indexOf(t) < 0;
    });
    gonderilen.forEach(function(t) {
      l.push(radyoParca(t, true));
    });
    kalpli.forEach(function(t) {
      var p = radyoParca(t, false);
      p.kalpEk = true;
      l.push(p);
    });
    radyoHavuzu(30, gonderilen.concat(kalpli)).forEach(function(t) {
      var p = radyoParca(t, false);
      p.havuz = true;
      l.push(p);
    });
    GramofonOynatici.kur(l, olay);
    salonListe = uretim ? [] : l.filter(function(p) {
      return !p.radyo || p.gonderildi;
    });
    salonPanosu();
    listeCiz(l, uretim);
    simdiCiz(GramofonOynatici.durum(), true);
  });
  GramofonUyelik.durum().then(function(d) {
    uyelik = d;
    uyelikCiz();
  }).catch(function() {
    uyelikCiz();
  });
  uyelikCiz();
  bekleyenleriAl();
})();
