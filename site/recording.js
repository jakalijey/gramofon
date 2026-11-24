(function() {
  var API = window.GramofonAg ? GramofonAg.api : "https://api.heylogram.com/gramofon";
  var $ = function(s) {
    return document.querySelector(s);
  };
  var telefon = window.matchMedia("(max-width: 899px) and (orientation: portrait), (max-width: 899px) and (min-height: 501px)"), dokunmatik = window.matchMedia("(pointer: coarse)");
  var icerde = false, surum = 0, saatler = [], beklemeSaat = 0, yerSaat = 0, ilerle = null, satirNo = 0;
  var yuklemeUsd = null, yukleniyor = false, kapiGosterildi = false, denemeOdendi = false;
  var ANAHTAR_YUK = window.GramofonAg ? GramofonAg.anahtar("gramofon-yuklemelerim") : "gramofon-yuklemelerim";
  var EPOSTA = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,180}\.[a-z]{2,24}$/i;
  fetch(API + "/odeme/ayar", { cache: "no-store" }).then(function(r) {
    return r.ok ? r.json() : null;
  }).then(function(a) {
    if (a && Number(a.yukleme) > 0) yuklemeUsd = Number(a.yukleme);
  }, function() {
  });
  function fiyatYazi() {
    var u = yuklemeUsd || 0.5;
    return "$" + (u >= 1 ? String(u) : u.toFixed(2));
  }
  function cizim() {
    return window.Gramofon && Gramofon.adam ? Gramofon : null;
  }
  function adam(d) {
    var g = cizim();
    if (g) g.adam(d);
  }
  function kapiAralik(ac) {
    kapiGosterildi = !!ac;
    var g = cizim();
    if (g && g.yanKapi) g.yanKapi(ac ? "aralik" : "kapali");
  }
  function temizle() {
    surum++;
    saatler.forEach(clearTimeout);
    saatler = [];
    clearTimeout(beklemeSaat);
    ilerle = null;
  }
  function sonra(ms, f) {
    var s = surum;
    saatler.push(setTimeout(function() {
      if (s === surum && icerde) f();
    }, ms));
  }
  function okuma(m) {
    return Math.max(2300, Math.min(7e3, 1e3 + m.length * 55));
  }
  function soyle(metin, cevaplar, durum) {
    if (durum) adam(durum);
    ilerle = null;
    $("#balon-gec").hidden = true;
    $("#balon").classList.remove("ilerler");
    $("#balon-soz").textContent = metin;
    var g = cizim();
    if (g && g.konus) g.konus(Math.min(4.5, 0.5 + metin.length * 0.045));
    cevapKur(cevaplar || []);
    $("#konusma").hidden = false;
    yerlestir();
    return ++satirNo;
  }
  function cevapKur(liste) {
    var c = $("#cevaplar");
    c.textContent = "";
    liste.forEach(function(x) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "cevap" + (x.ikincil ? " ikincil" : "");
      d.textContent = x.yazi;
      d.addEventListener("click", function() {
        if (icerde) x.is();
      });
      c.appendChild(d);
    });
    c.hidden = !liste.length;
    if (liste.length && !telefon.matches && !$("#yukleme-kart").contains(document.activeElement)) c.firstChild.focus({ preventScroll: true });
  }
  function sirayla(satirlar, cevaplar, sonunda) {
    var i = 0;
    (function goster() {
      var s = satirlar[i], son = i === satirlar.length - 1, metin = typeof s === "string" ? s : s.s;
      var no = soyle(metin, son ? cevaplar : [], typeof s === "string" ? null : s.adam);
      if (son) {
        if (sonunda) sonunda();
        return;
      }
      var bu = function() {
        if (no !== satirNo) return;
        ilerle = null;
        i++;
        goster();
      };
      ilerle = bu;
      $("#balon-gec").hidden = false;
      $("#balon").classList.add("ilerler");
      sonra(okuma(metin), bu);
    })();
  }
  $("#balon-gec").addEventListener("click", function(e) {
    e.stopPropagation();
    if (ilerle) ilerle();
  });
  $("#balon").addEventListener("click", function() {
    if (ilerle) ilerle();
  });
  function yerlestir() {
    var k = $("#konusma"), g = cizim();
    if (telefon.matches) {
      k.style.left = k.style.top = "";
    } else if (!k.hidden) {
      var cv = $("#tuval"), W = cv.clientWidth, H = cv.clientHeight, y = g && g.adamYeri ? g.adamYeri() : null, r = k.getBoundingClientRect();
      var o = k.offsetWidth ? r.width / k.offsetWidth : 1, w = r.width, h = r.height, x, top;
      if (y) {
        x = y.x * W - w - 34 * o;
        top = y.y * H - 33 * o;
      } else {
        x = W * 0.46;
        top = H * 0.18;
      }
      x = Math.max(16 * o, Math.min(W - w - 16 * o, x));
      top = Math.max(16 * o, Math.min(H - h - 16 * o, top));
      k.style.left = Math.round(x) + "px";
      k.style.top = Math.round(top) + "px";
    }
    var b = $("#yan-kapi"), kk = icerde && g && g.yanKapiYeri && !(window.GramofonSahne && GramofonSahne.gecisVar()) ? g.yanKapiYeri() : null;
    if (!kk || !(kk.w > 0) || !(kk.h > 0)) b.hidden = true;
    else {
      b.hidden = false;
      b.style.left = kk.x * 100 + "%";
      b.style.top = kk.y * 100 + "%";
      b.style.width = kk.w * 100 + "%";
      b.style.height = kk.h * 100 + "%";
    }
  }
  (function() {
    var b = $("#yan-kapi");
    function aralik(ac) {
      if (icerde && !kapiGosterildi) {
        var g = cizim();
        if (g && g.yanKapi) g.yanKapi(ac ? "aralik" : "kapali");
      }
    }
    b.addEventListener("mouseenter", function() {
      aralik(true);
    });
    b.addEventListener("mouseleave", function() {
      aralik(false);
    });
    b.addEventListener("focus", function() {
      aralik(true);
    });
    b.addEventListener("blur", function() {
      aralik(false);
    });
    b.addEventListener("click", function() {
      if (icerde) kapidanGec();
    });
  })();
  function gir() {
    icerde = true;
    temizle();
    clearInterval(yerSaat);
    yerSaat = setInterval(yerlestir, 250);
    kapiAralik(false);
    adam("bekliyor");
    if (yukleniyor) {
      $("#yukleme-kart").hidden = false;
      soyle("Still working on your song. Hang on a moment.", [], "istiyor");
      return;
    }
    $("#yukleme-kart").hidden = true;
    sonra(900, function() {
      if (hakOku()) {
        soyle("Welcome back! You already paid for an upload. Ready to hand over your song?", [
          { yazi: "Yes, here it is", is: function() {
            kartAc(false);
          } },
          { yazi: "Just here to listen", is: dinlemeye, ikincil: true }
        ], "istiyor");
        return;
      }
      soyle("Hey there! Got a song for the gramophone?", [
        { yazi: "Yes, I have a song", is: sarkimVar },
        { yazi: "My songs and earnings", is: sarkilarim, ikincil: true },
        { yazi: "Just here to listen", is: dinlemeye, ikincil: true }
      ], "istiyor");
    });
  }
  function sarkilarim(cuzdanla) {
    temizle();
    soyle("Let me find your songs…", [], "istiyor");
    var istendi = false, bilgi = function() {
      if (istendi) return;
      istendi = true;
      soyle("Connect the wallet you paid the upload fee with, and I’ll pull up your songs.", [], "istiyor");
    };
    (cuzdanla === true ? GramofonOdeme.sanatciCuzdanla(bilgi) : GramofonOdeme.sanatciGiris(bilgi)).then(function(r) {
      soyle("Here are your songs. Thanks for being part of Gramofon!", [
        { yazi: "Back to my songs", is: function() {
          panelAc(r);
        } },
        { yazi: "Just here to listen", is: dinlemeye, ikincil: true }
      ], "istiyor");
      panelAc(r);
    }, function(e) {
      soyle((e && e.message ? e.message : "That didn’t work.") + " Want to try again?", [
        { yazi: "Try again", is: sarkilarim },
        { yazi: "Just here to listen", is: dinlemeye, ikincil: true }
      ], "istiyor");
    });
  }
  function bchYaz(sat) {
    return (sat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  }
  function paraYaz(sat, usd) {
    var d = usd && sat > 0 ? sat * usd / 1e8 : 0;
    return bchYaz(sat) + " BCH" + (!d ? "" : d >= 0.01 ? " (about $" + d.toFixed(2) + ")" : " (less than one cent)");
  }
  var DURUM_YAZI = { onay: "On the gramophone", inceleniyor: "Being reviewed", kanit: "Waiting for proof", eslesti: "Matched another song", ret: "Not approved" };
  function panelAc(r) {
    var eski = document.querySelector(".sanatci-ort");
    if (eski) eski.remove();
    var ort = document.createElement("div");
    ort.className = "odeme-ort sanatci-ort";
    ort.innerHTML = '<div class="odeme-kutu sanatci-panel" role="dialog" aria-modal="true" aria-labelledby="sp-baslik"><h2 id="sp-baslik">Your songs and earnings</h2><div class="sp-icerik"></div><div class="odeme-dugmeler"></div><p class="odeme-durum" role="status" aria-live="polite"></p></div>';
    document.body.appendChild(ort);
    var q = function(s) {
      return ort.querySelector(s);
    };
    function kapat() {
      document.removeEventListener("keydown", esc, true);
      ort.remove();
    }
    function esc(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        kapat();
      }
    }
    document.addEventListener("keydown", esc, true);
    function yaz(o) {
      var h = "";
      o.sarkilar.forEach(function(s) {
        h += '<div class="sp-sarki"><p class="sp-ad"></p><p class="sp-durum"></p>' + (s.durum === "onay" ? '<p class="sp-sayi"></p>' : "") + "</div>";
      });
      h += '<div class="sp-para"><p class="sp-bu-ay"></p><p class="sp-bakiye"></p><p class="sp-odenen"></p><p class="sp-cuzdan"></p></div><div class="sp-eposta"></div>';
      q(".sp-icerik").innerHTML = h;
      var kutular = ort.querySelectorAll(".sp-sarki");
      o.sarkilar.forEach(function(s, i) {
        kutular[i].dataset.durum = s.durum;
        kutular[i].querySelector(".sp-ad").textContent = "“" + s.ad + "” · " + s.sanatci;
        kutular[i].querySelector(".sp-durum").textContent = DURUM_YAZI[s.durum] || s.durum;
        var y = kutular[i].querySelector(".sp-sayi");
        if (y) y.textContent = "This month: " + s.buAy.sayildi + (s.buAy.sayildi === 1 ? " play" : " plays") + " from " + s.buAy.dinleyen + (s.buAy.dinleyen === 1 ? " listener" : " listeners") + (s.buAy.kendi ? " (including " + s.buAy.kendi + " of your own)" : "") + " · All time: " + s.toplam + (s.toplam === 1 ? " play" : " plays");
      });
      var odenen = (o.odenen || []).reduce(function(t, x) {
        return t + x.sat;
      }, 0);
      q(".sp-bu-ay").textContent = "Your share this month so far: " + paraYaz(o.buAyPay, o.usd) + ".";
      q(".sp-bakiye").textContent = "Balance from past months: " + paraYaz(o.bakiye, o.usd) + ". We send it in the month it passes $" + o.esik + ".";
      q(".sp-odenen").textContent = odenen ? "Paid to you so far: " + paraYaz(odenen, o.usd) + " in " + o.odenen.length + (o.odenen.length === 1 ? " payment." : " payments.") : "No payouts yet.";
      q(".sp-cuzdan").textContent = "Payouts go to " + o.cuzdan.slice(0, 18) + "…" + o.cuzdan.slice(-6) + ", the wallet you paid the upload fee from.";
      var e = q(".sp-eposta");
      if (!o.onayli) {
        e.textContent = "Once a song is on the gramophone, you can get a monthly email with your plays and earnings here.";
        return;
      }
      if (o.eposta) {
        e.innerHTML = '<p></p><button type="button" class="sp-dugme ikincil">Stop monthly emails</button>';
        e.querySelector("p").textContent = "Your monthly report goes to " + o.eposta + ".";
        e.querySelector("button").addEventListener("click", function() {
          kaydet(null);
        });
      } else {
        e.innerHTML = '<label class="sp-etiket" for="sp-adres">Get a monthly email with your plays and earnings</label><div class="sp-satir"><input type="email" id="sp-adres" maxlength="120" autocomplete="email" inputmode="email" placeholder="you@example.com"><button type="button" class="sp-dugme">Email me</button></div>';
        e.querySelector("button").addEventListener("click", function() {
          var v = q("#sp-adres").value.trim();
          if (!EPOSTA.test(v)) {
            q(".odeme-durum").textContent = "That email doesn’t look right.";
            q("#sp-adres").focus();
            return;
          }
          kaydet(v);
        });
      }
    }
    function kaydet(adres) {
      q(".odeme-durum").textContent = "Saving…";
      GramofonOdeme.sanatciEposta(r.bilet, adres).then(function(o) {
        if (o.durum !== 200) {
          q(".odeme-durum").textContent = o.durum === 401 ? "Your session ended. Close this and connect your wallet again." : "That didn’t work. Please try again.";
          return;
        }
        r = Object.assign({}, r, o);
        yaz(r);
        q(".odeme-durum").textContent = adres ? "Done. Your first report comes at the start of next month." : "Done. No more monthly emails.";
      }, function() {
        q(".odeme-durum").textContent = "That didn’t work. Please try again.";
      });
    }
    var baska = document.createElement("button");
    baska.type = "button";
    baska.className = "ikincil";
    baska.textContent = "Use another wallet";
    baska.addEventListener("click", function() {
      kapat();
      sarkilarim(true);
    });
    var kapatDugme = document.createElement("button");
    kapatDugme.type = "button";
    kapatDugme.textContent = "Close";
    kapatDugme.addEventListener("click", kapat);
    q(".odeme-dugmeler").appendChild(baska);
    q(".odeme-dugmeler").appendChild(kapatDugme);
    yaz(r);
    kapatDugme.focus({ preventScroll: true });
  }
  function gizle() {
    $("#konusma").hidden = true;
    $("#cevaplar").hidden = true;
    $("#yukleme-kart").hidden = true;
  }
  function cik() {
    icerde = false;
    temizle();
    clearInterval(yerSaat);
    yerSaat = 0;
    gizle();
    $("#yan-kapi").hidden = true;
    kapiGosterildi = false;
  }
  function kapidanGec() {
    if (!icerde) return;
    temizle();
    gizle();
    GramofonSahne.odaya("gramofon");
  }
  function salonaDon() {
    if (!icerde) return;
    temizle();
    gizle();
    GramofonSahne.odaya("salon");
  }
  function dinlemeye() {
    temizle();
    kapiAralik(true);
    var m = "Then you’re one door away! The gramophone is right next door. No need to go back out, just go through that door.";
    soyle(m, [{ yazi: "Go through the door", is: kapidanGec }], "gosteriyor");
    sonra(okuma(m) + 1500, kapidanGec);
  }
  function sarkimVar() {
    temizle();
    sirayla([
      { s: "Love it! Uploading a song costs " + fiyatYazi() + ".", adam: "istiyor" },
      "Believe me, that’s tiny. It only covers our costs.",
      "Without it, people would upload Michael Jackson and Eminem all day long, and that’s not legal.",
      "Don’t worry though: if it’s your own song and it just isn’t a fit, you get your money back. Someone else’s song? Then the fee stays here.",
      "And if your song is going to make you money, you can spare this little bit. As the saying goes: don’t spare the chicken when a goose is on its way!",
      dokunmatik.matches ? "Could you approve it in your wallet for me?" : "Could you scan this QR code for me?"
    ], [
      { yazi: dokunmatik.matches ? "Pay with my wallet" : "Scan the QR code", is: ode },
      { yazi: "Not now", is: simdiDegil, ikincil: true }
    ]);
  }
  function ode() {
    temizle();
    soyle("Take your time, I’ll wait.", [], "istiyor");
    var is;
    if (window.GramofonUyelik && GramofonUyelik.denemeMi()) {
      is = new Promise(function(ok, red) {
        setTimeout(function() {
          if (denemeHak()) {
            denemeOdendi = true;
            ok();
          } else red(new Error("No test upload pass on this page."));
        }, 1200);
      });
    } else if (window.GramofonOdeme && GramofonOdeme.yuklemeAl) is = GramofonOdeme.yuklemeAl(function() {
    });
    else is = Promise.reject(new Error("Payments are not connected on this page yet."));
    is.then(function() {
      if (icerde) kartAc(true);
    }, function(e) {
      if (icerde) odenmedi(e);
    });
  }
  function odenmedi(e) {
    temizle();
    var m = e && e.message ? e.message : "";
    soyle(/cancel/i.test(m) ? "No worries. Whenever you’re ready." : "Hmm, the payment didn’t go through. " + m, [
      { yazi: "Try again", is: ode },
      { yazi: "Not now", is: simdiDegil, ikincil: true }
    ], "bekliyor");
  }
  function simdiDegil() {
    temizle();
    kapiAralik(true);
    soyle("No problem. The gramophone is right next door if you want to listen. Or head back to the hall.", [
      { yazi: "Go through the door", is: kapidanGec },
      { yazi: "Back to the hall", is: salonaDon, ikincil: true }
    ], "gosteriyor");
    beklemeKur();
  }
  function kartAc(yeniOdendi) {
    temizle();
    kapiAralik(false);
    soyle(yeniOdendi ? "Got it, thank you! Now you can upload your song. Go ahead." : "Go ahead, put your song on the desk.", [], "istiyor");
    var k = $("#yukleme-kart");
    k.hidden = false;
    if (!yukleniyor) durumYaz("");
    if (telefon.matches) k.scrollIntoView({ behavior: "smooth", block: "start" });
    else $("#y-ses").focus({ preventScroll: true });
  }
  function durumYaz(m, tur) {
    var d = $("#yukleme-durum"), k = $("#yukleme-kart");
    d.textContent = m || "";
    d.dataset.tur = tur || "";
    if (m) k.scrollTop = k.scrollHeight;
  }
  function ilerleme(oran) {
    var k = $("#yukleme-ilerleme");
    if (oran == null) {
      k.hidden = true;
      k.classList.remove("belirsiz");
      return;
    }
    k.hidden = false;
    if (oran === "bekle") {
      k.classList.add("belirsiz");
      return;
    }
    k.classList.remove("belirsiz");
    $("#yukleme-dolu").style.transform = "scaleX(" + Math.max(0, Math.min(1, oran)) + ")";
    if (oran < 1) durumYaz("Sending your song… " + Math.round(oran * 100) + "%");
  }
  function formKilit(kilit) {
    document.querySelectorAll("#yukleme-form input, #yukleme-form button").forEach(function(x) {
      x.disabled = kilit;
    });
    $("#yukleme-gonder").textContent = kilit ? "Sending…" : "Hand it over";
    $("#yukleme-uyari").hidden = !kilit;
  }
  $("#y-haber").addEventListener("change", function() {
    $("#y-eposta-alan").hidden = !this.checked;
    $("#y-rapor-alan").hidden = !this.checked;
    if (this.checked) $("#y-eposta").focus();
  });
  function duzeldi(e) {
    if (e.target.getAttribute && e.target.getAttribute("aria-invalid")) e.target.removeAttribute("aria-invalid");
    if (!yukleniyor && $("#yukleme-durum").dataset.tur === "hata") durumYaz("");
  }
  $("#yukleme-form").addEventListener("input", duzeldi);
  $("#yukleme-form").addEventListener("change", duzeldi);
  $("#yukleme-form").addEventListener("submit", function(e) {
    e.preventDefault();
    gonder();
  });
  window.addEventListener("beforeunload", function(e) {
    if (yukleniyor) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  function gonder() {
    if (yukleniyor) return;
    var ses = $("#y-ses").files[0], kapak = $("#y-kapak").files[0], ad = $("#y-ad").value.trim(), sanatci = $("#y-sanatci").value.trim();
    var haber = $("#y-haber").checked, eposta = $("#y-eposta").value.trim(), rapor = haber && $("#y-rapor").checked;
    var sorun = !ses ? ["#y-ses", "Pick your song file."] : ses.size > 200 * 1048576 ? ["#y-ses", "That file is over 200 MB."] : kapak && kapak.size > 15 * 1048576 ? ["#y-kapak", "The cover picture is over 15 MB."] : !ad ? ["#y-ad", "Write the song name."] : !sanatci ? ["#y-sanatci", "Write the artist name."] : haber && !EPOSTA.test(eposta) ? ["#y-eposta", "That email doesn’t look right."] : !$("#y-sahibim").checked ? ["#y-sahibim", "Please confirm the song is yours to share."] : null;
    document.querySelectorAll("#yukleme-form [aria-invalid]").forEach(function(x) {
      x.removeAttribute("aria-invalid");
    });
    if (sorun) {
      var el = $(sorun[0]);
      el.setAttribute("aria-invalid", "true");
      el.focus();
      durumYaz(sorun[1], "hata");
      return;
    }
    var hak = hakOku();
    if (!hak) {
      durumYaz("Your upload pass is missing. Talk to the man at the desk again.", "hata");
      return;
    }
    yukleniyor = true;
    formKilit(true);
    ilerleme("bekle");
    durumYaz("Getting the desk ready…");
    var toplam = ses.size + (kapak ? kapak.size : 0);
    post("/yukle/baslat", { hak, ad, sanatci, haber, eposta: haber ? eposta : "", rapor, sahibim: true }).then(function(r) {
      if (r.durum === 401 || r.durum === 409) {
        hakSil();
        throw new Error(r.durum === 409 ? "This payment was already used for a song." : "Your upload pass has expired. Talk to the man at the desk again.");
      }
      if (r.durum !== 200 || !r.id) throw new Error(sunucuHata(r));
      if (r.sanatciBilet && GramofonOdeme.sanatciBiletEkle) GramofonOdeme.sanatciBiletEkle(r.sanatciBilet);
      var id = r.id;
      return dosyaGonder(id, "ses", ses, hak, function(n) {
        ilerleme(n / toplam);
      }).then(function() {
        return kapak ? dosyaGonder(id, "kapak", kapak, hak, function(n) {
          ilerleme((ses.size + n) / toplam);
        }) : null;
      }).then(function() {
        ilerleme("bekle");
        durumYaz("Almost there…");
        return post("/yukle/" + id + "/bitir", {}, hak);
      }).then(function(b) {
        if (b.durum !== 200) throw new Error(sunucuHata(b));
        return { id, karar: b.karar || "inceleniyor", eslesen: b.eslesen, yayin: b.yayin };
      });
    }).then(function(sonuc) {
      hakSil();
      if (sonuc.karar === "inceleniyor") benimEkle(sonuc.id, ad);
      yukleniyor = false;
      formKilit(false);
      $("#yukleme-form").reset();
      $("#y-eposta-alan").hidden = true;
      $("#y-rapor-alan").hidden = true;
      ilerleme(null);
      durumYaz("");
      if (window.GramofonSahne) GramofonSahne.bekleyenleriAl();
      if (icerde) {
        if (sonuc.karar === "eslesti") yakalandi(sonuc);
        else if (sonuc.karar === "kanit") kanitGerek(sonuc);
        else yuklendi(ad, haber);
      }
    }).catch(function(e) {
      yukleniyor = false;
      formKilit(false);
      ilerleme(null);
      durumYaz(e && e.message ? e.message : "The upload didn’t go through. Try again; your payment is safe.", "hata");
    });
  }
  function post(yol, govde, hak) {
    var h = { "content-type": "application/json" };
    if (hak) h["x-hak"] = hak;
    return fetch(API + yol, { method: "POST", headers: h, body: JSON.stringify(govde || {}) }).then(
      function(r) {
        return r.json().catch(function() {
          return {};
        }).then(function(j) {
          j.durum = r.status;
          return j;
        });
      },
      function() {
        throw new Error("Couldn’t reach the desk. Check your connection and try again; your payment is safe.");
      }
    );
  }
  function dosyaGonder(id, parca, dosya, hak, ilerle2) {
    return new Promise(function(ok, red) {
      var x = new XMLHttpRequest();
      x.open("PUT", API + "/yukle/" + id + "/" + parca);
      x.setRequestHeader("x-hak", hak);
      x.setRequestHeader("content-type", dosya.type || "application/octet-stream");
      x.setRequestHeader("x-dosya-adi", encodeURIComponent((dosya.name || "").slice(0, 100)));
      x.upload.onprogress = function(e) {
        if (!e.lengthComputable) return;
        ilerle2(e.loaded);
        if (e.loaded >= e.total) {
          ilerleme("bekle");
          durumYaz(parca === "ses" ? "Got it. Now saving your song and checking it. This can take a minute…" : "Saving the cover…");
        }
      };
      x.onload = function() {
        var j = {};
        try {
          j = JSON.parse(x.responseText);
        } catch (e) {
        }
        j.durum = x.status;
        if (x.status === 200) ok(j);
        else red(new Error(sunucuHata(j, parca)));
      };
      x.onerror = function() {
        red(new Error("The connection dropped. Try again; your payment is safe."));
      };
      x.send(dosya);
    });
  }
  function sunucuHata(j, parca) {
    var h = j && j.hata;
    if (j && j.durum === 413) return parca === "kapak" ? "The cover picture is too big (15 MB at most)." : "That file is too big (200 MB at most).";
    if (h === "ses dosyası değil") return "That file doesn’t look like a song. Try FLAC, WAV, MP3, M4A or OGG.";
    if (h === "resim değil") return "The cover should be a JPG, PNG or WebP picture.";
    if (h === "meşgul") return "The desk is busy for a moment. Try again in a minute.";
    if (h === "yer yok") return "We’re short on space right now. Try again later; your payment is safe.";
    if (h === "e-posta") return "That email doesn’t look right.";
    if (h === "ad ve sanatçı gerekli") return "Write the song name and the artist name.";
    return "The upload didn’t go through. Try again; your payment is safe.";
  }
  function yuklendi(ad, haber) {
    temizle();
    $("#yukleme-kart").hidden = true;
    sirayla([
      { s: "Thanks! We’ll give “" + ad + "” a proper listen.", adam: "inceliyor" },
      haber ? "I’m emailing you a receipt now, and we’ll write again once it’s reviewed. You can also check the board in the hall." : "Check the board in the hall to see if it’s approved.",
      "Once it’s on the gramophone, come back and ask me for “My songs and earnings” to see its plays.",
      "Meanwhile, why not listen to some music next door?"
    ], [
      { yazi: "Go to the gramophone", is: kapidanGec },
      { yazi: "Back to the hall", is: salonaDon, ikincil: true }
    ], beklemeKur);
  }
  function yakalandi(s) {
    temizle();
    $("#yukleme-kart").hidden = true;
    var e = s.eslesen || {};
    sirayla([
      { s: "Hmm… hold on a second.", adam: "inceliyor" },
      e.katalog ? "I know this one. It’s already on the gramophone: “" + e.ad + "” by " + e.sanatci + "." : "I know this recording. Someone handed it in before, under another name.",
      "It isn’t yours to share, so I can’t take it. And like I said, the fee stays here.",
      "If it really is your own song, email gramofon@heylogram.com with proof and we’ll look again."
    ], [
      { yazi: "Back to the hall", is: salonaDon },
      { yazi: "Listen next door", is: kapidanGec, ikincil: true }
    ], beklemeKur);
  }
  function kanitGerek(s) {
    temizle();
    $("#yukleme-kart").hidden = true;
    var y = s.yayin || {};
    sirayla([
      { s: "Hold on, this one is already released: “" + y.ad + "” by " + y.sanatci + (y.tarih ? " (" + String(y.tarih).slice(0, 4) + ")" : "") + ".", adam: "inceliyor" },
      "If that’s really you, I need proof before it goes on the gramophone.",
      "Email gramofon@heylogram.com from the artist’s official address, management, label or distributor, or ask us for a code to post on your official account.",
      "No proof, no gramophone, and the fee stays here. Fair?"
    ], [
      { yazi: "Back to the hall", is: salonaDon },
      { yazi: "Listen next door", is: kapidanGec, ikincil: true }
    ], beklemeKur);
  }
  function beklemeKur() {
    clearTimeout(beklemeSaat);
    var s = surum;
    beklemeSaat = setTimeout(function() {
      if (s !== surum || !icerde) return;
      soyle("Hmm…", []);
      sonra(2200, function() {
        soyle("Come on, let me take you to the hall. Next, please!", []);
        sonra(2800, salonaDon);
      });
    }, 2e4);
  }
  function denemeHak() {
    try {
      return sessionStorage.getItem("gramofon-deneme-hak") || "";
    } catch (e) {
      return "";
    }
  }
  function hakOku() {
    if (window.GramofonUyelik && GramofonUyelik.denemeMi()) return denemeOdendi ? denemeHak() : "";
    var h = window.GramofonOdeme && GramofonOdeme.yuklemeHakki ? GramofonOdeme.yuklemeHakki() : null;
    return h ? h.hak : "";
  }
  function hakSil() {
    if (window.GramofonUyelik && GramofonUyelik.denemeMi()) {
      denemeOdendi = false;
      try {
        sessionStorage.removeItem("gramofon-deneme-hak");
      } catch (e) {
      }
      return;
    }
    if (window.GramofonOdeme && GramofonOdeme.yuklemeHakkiSil) GramofonOdeme.yuklemeHakkiSil();
  }
  function benimEkle(id, ad) {
    try {
      var v = JSON.parse(localStorage.getItem(ANAHTAR_YUK) || "[]");
      if (!Array.isArray(v)) v = [];
      v.unshift({ id, ad, zaman: Date.now() });
      localStorage.setItem(ANAHTAR_YUK, JSON.stringify(v.slice(0, 20)));
    } catch (e) {
    }
  }
  window.GramofonKayit = { gir, cik };
})();
