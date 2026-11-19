(function() {
  var q = new URLSearchParams(location.search), test = false;
  try {
    if (q.get("test") === "1") sessionStorage.setItem("gramofon-ag", "test");
    if (q.get("test") === "0") sessionStorage.removeItem("gramofon-ag");
    test = sessionStorage.getItem("gramofon-ag") === "test";
  } catch (e) {
    test = q.get("test") === "1";
  }
  if (q.has("test")) {
    q.delete("test");
    var kalan = q.toString();
    history.replaceState(history.state, "", location.pathname + (kalan ? "?" + kalan : "") + location.hash);
  }
  window.GramofonAg = {
    test,
    api: "https://api.heylogram.com/" + (test ? "gramofon-test" : "gramofon"),
    onek: test ? "bchtest" : "bitcoincash",
    anahtar: function(k) {
      return test ? k + "-test" : k;
    }
  };
})();
