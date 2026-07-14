/* Jesli Chart.js nie wstal — bo CDN padl albo kontrola integralnosci (SRI) go odrzucila —
   uzytkownik ma zobaczyc powod, a nie puste miejsce po wykresach. */
(function () {
  if (window.Chart) return;
  function show() {
    var pl = (document.body || document.documentElement).classList.contains("lang-pl");
    var box = document.createElement("div");
    box.style.cssText = "margin:24px auto;max-width:640px;padding:16px 18px;border:1px solid #e6ebf2;" +
      "border-left:3px solid #c0392b;border-radius:12px;background:#fff;color:#4b5874;" +
      "font-family:Inter,sans-serif;font-size:.95rem;line-height:1.55";
    box.innerHTML = pl
      ? "<b style='color:#15233f'>Wykresy się nie załadowały.</b><br>Biblioteka Chart.js nie wstała — " +
        "sieć CDN jest niedostępna albo plik nie przeszedł kontroli integralności. " +
        "Tekst i wnioski poniżej są kompletne; brakuje wyłącznie grafiki."
      : "<b style='color:#15233f'>The charts did not load.</b><br>Chart.js failed to start — the CDN is " +
        "unreachable, or the file did not pass its integrity check. The text and findings below are " +
        "complete; only the graphics are missing.";
    var host = document.querySelector(".chart-grid") || document.querySelector("main") || document.body;
    (host.parentNode || document.body).insertBefore(box, host);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show);
  else show();
})();
