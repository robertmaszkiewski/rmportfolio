/* Renders the Climate case-study dashboard from window.CLIMATE (Chart.js v4).
   Bilingual: window.setClimateLang('en'|'pl') rebuilds every chart in that language. */
(function () {
  var D = window.CLIMATE;
  if (!D) { console.error("CLIMATE data not loaded"); return; }

  var RED = "#c0392b", AMBER = "#c98a17", INDIGO = "#3b4ea0", GREEN = "#1f8a5b",
      BLUE = "#2f6db0", SLATE = "#8a93a7", INK = "#15233f",
      GRID = "rgba(20,35,63,.07)";

  if (window.Chart) {
    Chart.defaults.font.family = "Inter, sans-serif";
    Chart.defaults.color = "#4b5874";
    Chart.defaults.plugins.legend.display = false;
  }

  /* ---------- i18n ---------- */
  var STR = {
    en: {
      world: "World", nh: "N. Hemisphere", sh: "S. Hemisphere",
      paris: "+1.5 °C (Paris goal)",
      anomC: "°C vs 1850–1900", cetY: "°C (annual mean)",
      cetAnnual: "Annual CET", mean1: "Mean 1659–1900 (9.1 °C)", mean2: "Mean 2000–2025 (10.5 °C)",
      perDecade: "°C per decade (since 1960)", absLat: "Absolute latitude (°)",
      highlat: "High-latitude land", tropics: "Tropics",
      monthY: "°C (monthly mean)", early: "Early", recent: "Recent",
      tempAnom: "Temperature anomaly (°C)", co2: "CO₂ (ppm)", sunspots: "Sunspot number",
      fastest: "Fastest-warming", slowest: "Slowest-warming",
      months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      decade: "/decade"
    },
    pl: {
      world: "Świat", nh: "Półkula płn.", sh: "Półkula płd.",
      paris: "+1,5 °C (cel paryski)",
      anomC: "°C wzgl. 1850–1900", cetY: "°C (średnia roczna)",
      cetAnnual: "CET rocznie", mean1: "Średnia 1659–1900 (9,1 °C)", mean2: "Średnia 2000–2025 (10,5 °C)",
      perDecade: "°C na dekadę (od 1960)", absLat: "Szerokość geogr. (°, bezwzgl.)",
      highlat: "Ląd wysokich szerokości", tropics: "Tropiki",
      monthY: "°C (średnia miesięczna)", early: "Dawniej", recent: "Dziś",
      tempAnom: "Anomalia temperatury (°C)", co2: "CO₂ (ppm)", sunspots: "Liczba plam słonecznych",
      fastest: "Najszybciej", slowest: "Najwolniej",
      months: ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"],
      decade: "/dek."
    }
  };

  var LANG = "en";
  var charts = {};           // id -> Chart instance
  var seasonCountry = "POL"; // selected country for the seasonal chart

  function destroyAll() {
    Object.keys(charts).forEach(function (k) { try { charts[k].destroy(); } catch (e) {} });
    charts = {};
  }
  function mk(id, cfg) {
    var el = document.getElementById(id);
    if (!el) return;
    charts[id] = new Chart(el, cfg);
  }
  function line(data, color, extra) {
    return Object.assign({ data: data, borderColor: color, backgroundColor: color,
      borderWidth: 2, pointRadius: 0, tension: 0.25 }, extra || {});
  }
  function axes(t, xTitle, yTitle, extra) {
    var s = {
      x: { grid: { display: false }, title: xTitle ? { display: true, text: xTitle, color: SLATE } : undefined },
      y: { grid: { color: GRID }, title: yTitle ? { display: true, text: yTitle, color: SLATE } : undefined }
    };
    return Object.assign(s, extra || {});
  }
  function legendTop() {
    return { display: true, position: "top", labels: { usePointStyle: true, boxWidth: 8, padding: 14 } };
  }

  /* ---------- builders ---------- */
  function build() {
    var T = STR[LANG];

    /* 1 — global anomaly 1850–2025 */
    (function () {
      var g = D.global, yrs = g.map(function (d) { return d.year; });
      mk("cGlobal", {
        type: "line",
        data: { labels: yrs, datasets: [
          line(g.map(function (d) { return d.world; }), RED, { borderWidth: 2.4, label: T.world, order: 1 }),
          line(g.map(function (d) { return d.nh; }), AMBER, { borderWidth: 1.2, label: T.nh, order: 2 }),
          line(g.map(function (d) { return d.sh; }), BLUE, { borderWidth: 1.2, label: T.sh, order: 3 }),
          line(yrs.map(function () { return 1.5; }), SLATE, { borderWidth: 1, borderDash: [5, 5], label: T.paris, order: 4 })
        ] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: legendTop() },
          scales: axes(T, null, T.anomC, { x: { grid: { display: false }, ticks: { maxTicksLimit: 9 } } }) }
      });
    })();

    /* 2 — Central England Temperature 1659–2025 */
    (function () {
      var c = D.cet, yrs = c.map(function (d) { return d.year; });
      mk("cCet", {
        type: "line",
        data: { labels: yrs, datasets: [
          line(c.map(function (d) { return d.t; }), "rgba(192,57,43,.85)", { borderWidth: 1, label: T.cetAnnual, order: 3 }),
          line(yrs.map(function () { return 9.08; }), INDIGO, { borderWidth: 1.4, borderDash: [6, 4], label: T.mean1, order: 1 }),
          line(yrs.map(function () { return 10.48; }), RED, { borderWidth: 1.4, borderDash: [6, 4], label: T.mean2, order: 2 })
        ] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: legendTop() },
          scales: axes(T, null, T.cetY, { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } }) }
      });
    })();

    /* 3 — fastest vs slowest warming countries */
    (function () {
      var fast = D.rankings.fastest.slice(0, 8),
          slow = D.rankings.slowest.slice(0, 5);
      var rows = fast.concat(slow);
      rows.sort(function (a, b) { return a.trend60 - b.trend60; });
      var fastCodes = {}; fast.forEach(function (r) { fastCodes[r.code] = 1; });
      mk("cRank", {
        type: "bar",
        data: { labels: rows.map(function (r) { return r.name; }),
          datasets: [{ data: rows.map(function (r) { return r.trend60; }),
            backgroundColor: rows.map(function (r) { return fastCodes[r.code] ? RED : BLUE; }),
            borderRadius: 4 }] },
        options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false },
            tooltip: { callbacks: { label: function (c) { return "+" + c.parsed.x.toFixed(2) + " " + T.decade; } } } },
          scales: axes(T, T.perDecade, null, { y: { grid: { display: false } } }) }
      });
    })();

    /* 4 — warming rate vs latitude (Arctic amplification) */
    (function () {
      var pts = D.latScatter.map(function (d) { return { x: d.lat, y: d.trend, code: d.code, name: d.name }; });
      mk("cLat", {
        type: "scatter",
        data: { datasets: [{ data: pts,
          pointBackgroundColor: pts.map(function (p) { return p.y > 0.4 ? RED : p.y > 0.28 ? AMBER : BLUE; }),
          pointRadius: 5, pointHoverRadius: 7, borderColor: "rgba(0,0,0,.15)", borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false },
            tooltip: { callbacks: { label: function (c) {
              var p = c.raw; return p.name + ": " + p.y.toFixed(2) + " " + T.decade + " @ " + Math.round(p.x) + "°"; } } } },
          scales: axes(T, T.absLat, T.perDecade, { x: { grid: { color: GRID }, type: "linear" } }) }
      });
    })();

    /* 5 — Arctic amplification (high-lat vs tropics) */
    (function () {
      mk("cArctic", {
        type: "bar",
        data: { labels: [T.highlat, T.tropics],
          datasets: [{ data: [D.arctic.highlat, D.arctic.tropic],
            backgroundColor: [RED, BLUE], borderRadius: 6, barPercentage: 0.6 }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false },
            tooltip: { callbacks: { label: function (c) { return "+" + c.parsed.y.toFixed(2) + " " + T.decade; } } } },
          scales: axes(T, null, T.perDecade, { y: { grid: { color: GRID }, beginAtZero: true } }) }
      });
    })();

    /* 6 — seasonal cycle (selected country, early vs recent) */
    (function () {
      var s = D.seasonal[seasonCountry];
      var eLab = T.early + (s.early_years ? " (" + s.early_years + ")" : "");
      var rLab = T.recent + (s.recent_years ? " (" + s.recent_years + ")" : "");
      mk("cSeason", {
        type: "line",
        data: { labels: T.months, datasets: [
          line(s.early, SLATE, { borderWidth: 1.6, borderDash: [6, 4], label: eLab, tension: 0.35 }),
          line(s.recent, RED, { borderWidth: 2.4, label: rLab, tension: 0.35 })
        ] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: legendTop() },
          scales: axes(T, null, T.monthY) }
      });
      // active button state
      ["FIN", "POL", "ESP"].forEach(function (code) {
        var b = document.getElementById("seasBtn-" + code);
        if (b) b.classList.toggle("active", code === seasonCountry);
      });
    })();

    /* 7 — CO2 vs temperature 1850–2024 (dual axis) */
    (function () {
      var s = D.co2.series, yrs = s.map(function (d) { return d.year; });
      mk("cCo2", {
        type: "line",
        data: { labels: yrs, datasets: [
          line(s.map(function (d) { return d.temp; }), RED, { borderWidth: 2.2, label: T.tempAnom, yAxisID: "y" }),
          line(s.map(function (d) { return d.co2; }), SLATE, { borderWidth: 2, label: T.co2, yAxisID: "y1" })
        ] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: legendTop() },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 9 } },
            y: { position: "left", grid: { color: GRID }, title: { display: true, text: T.tempAnom, color: RED } },
            y1: { position: "right", grid: { display: false }, title: { display: true, text: T.co2, color: SLATE } }
          } }
      });
    })();

    /* 8 — sunspots vs temperature 1850–2024 (dual axis) */
    (function () {
      var sun = {}; D.sun.forEach(function (d) { sun[d.year] = d.sn; });
      var g = D.global.filter(function (d) { return d.year >= 1850 && d.year <= 2024; });
      var yrs = g.map(function (d) { return d.year; });
      mk("cSun", {
        type: "line",
        data: { labels: yrs, datasets: [
          line(g.map(function (d) { return d.world; }), RED, { borderWidth: 2.2, label: T.tempAnom, yAxisID: "y" }),
          line(yrs.map(function (y) { return sun[y] != null ? sun[y] : null; }), AMBER,
            { borderWidth: 1.4, label: T.sunspots, yAxisID: "y1", tension: 0.2 })
        ] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: legendTop() },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 9 } },
            y: { position: "left", grid: { color: GRID }, title: { display: true, text: T.tempAnom, color: RED } },
            y1: { position: "right", grid: { display: false }, title: { display: true, text: T.sunspots, color: AMBER } }
          } }
      });
    })();
  }

  function render() { destroyAll(); build(); }

  /* ---------- public API ---------- */
  window.setClimateLang = function (lang) {
    LANG = (lang === "pl") ? "pl" : "en";
    render();
  };
  window.setSeasonCountry = function (code) {
    if (D.seasonal[code]) { seasonCountry = code; render(); }
  };

  // initial paint (respect language already set on <html>/<body> by the page script)
  var initial = (document.body && document.body.classList.contains("lang-pl")) ? "pl" : "en";
  LANG = initial;
  if (document.readyState !== "loading") render();
  else document.addEventListener("DOMContentLoaded", render);
})();
