/* Shared EN/PL language switch for all case-study pages.
   Toggles `lang-pl` on <body>; CSS (style.css) shows the active language only.
   Persists the choice in localStorage so it carries across pages. */
(function () {
  function syncButtons(pl) {
    var be = document.getElementById("langEn"), bp = document.getElementById("langPl");
    if (be) be.classList.toggle("active", !pl);
    if (bp) bp.classList.toggle("active", pl);
  }
  function apply(l) {
    var pl = (l === "pl");
    var root = document.body || document.documentElement;
    root.classList.toggle("lang-pl", pl);
    document.documentElement.lang = pl ? "pl" : "en";
    syncButtons(pl);
    try { localStorage.setItem("rmlang", l); } catch (e) {}
    // pages with re-renderable charts (climate) expose this hook
    if (typeof window.setClimateLang === "function") window.setClimateLang(l);
  }
  window.setLang = apply;

  var saved = "en";
  try { saved = localStorage.getItem("rmlang") || "en"; } catch (e) {}
  apply(saved);
  // buttons may not be parsed yet if this runs early — re-sync once DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    syncButtons((document.body || document.documentElement).classList.contains("lang-pl"));
  });
})();
