/* Cancer case-study dashboard (Chart.js v4).
   Dane: WHO Mortality DB (ICD-8/9/10) + UN WPP + IARC GLOBOCAN 2024.
   Bilingual: window.setCancerLang('en'|'pl') przebudowuje wszystkie wykresy. */
(function () {
  var RED = "#c0392b", AMBER = "#c98a17", INDIGO = "#3b4ea0", GREEN = "#1f8a5b",
      BLUE = "#2f6db0", SLATE = "#8a93a7", GRID = "rgba(20,35,63,.07)";
  var GEO_COL = { POL: GREEN, GBR: AMBER, ESP: BLUE, USA: RED };

  if (window.Chart) {
    Chart.defaults.font.family = "Inter, sans-serif";
    Chart.defaults.color = "#4b5874";
    Chart.defaults.plugins.legend.display = false;
  }

  var STR = {
    en: {
      asrY: "Deaths per 100,000 (age-standardised)",
      crudeY: "Deaths per 100,000 (crude)",
      countY: "Deaths", year: "Year", age: "Age group",
      rateY: "Rate per 100,000", casesY: "New cases",
      geo: { POL: "Poland", GBR: "United Kingdom", ESP: "Spain", USA: "United States", WORLD: "World" },
      sex: { both: "Both sexes", male: "Men", female: "Women" },
      crude: "Crude rate", asr: "Age-standardised",
      inc: "Incidence", mort: "Mortality",
      loading: "Loading data…", nodata: "No data for this combination.",
      breakNote: "Series is drawn in segments — the ICD revision changed the definition."
    },
    pl: {
      asrY: "Zgony na 100 tys. (standaryzowane wiekiem)",
      crudeY: "Zgony na 100 tys. (surowe)",
      countY: "Zgony", year: "Rok", age: "Grupa wieku",
      rateY: "Współczynnik na 100 tys.", casesY: "Zachorowania",
      geo: { POL: "Polska", GBR: "Wielka Brytania", ESP: "Hiszpania", USA: "USA", WORLD: "Świat" },
      sex: { both: "Obie płcie", male: "Mężczyźni", female: "Kobiety" },
      crude: "Surowy", asr: "Standaryzowany",
      inc: "Zachorowania", mort: "Zgony",
      loading: "Wczytywanie danych…", nodata: "Brak danych dla tej kombinacji.",
      breakNote: "Seria rysowana odcinkami — zmiana rewizji ICD zmieniła definicję."
    }
  };

  var H = null, C = null, F = null, charts = {}, lang = "en";
  function T() { return STR[lang]; }
  function L(o) { return (lang === "pl" ? o.pl : o.en) || o.en; }

  function destroy() {
    Object.keys(charts).forEach(function (k) { if (charts[k]) charts[k].destroy(); });
    charts = {};
  }
  function axes(xT, yT, extra) {
    var a = {
      x: { grid: { display: false }, title: xT ? { display: true, text: xT, color: SLATE } : undefined },
      y: { grid: { color: GRID }, title: yT ? { display: true, text: yT, color: SLATE } : undefined }
    };
    if (extra) { Object.keys(extra).forEach(function (k) { Object.assign(a[k], extra[k]); }); }
    return a;
  }
  function legendOn(opts) {
    return Object.assign({ plugins: { legend: { display: true, position: "bottom",
      labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } } }, opts || {});
  }
  function val(el) { var e = document.getElementById(el); return e ? e.value : null; }
  function fmt(n) { return n.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB"); }

  /* Buduje punkty {x: rok, y: wartosc}. Gdy seria jest nieciagla (zmiana ICD),
     wstawiamy null na granicy rewizji, zeby Chart.js NIE narysowal linii przez przerwe. */
  function points(key, metric, breakOnRev) {
    var s = H.series[key];
    if (!s) return null;
    var arr = s[metric], rev = s.rev, out = [];
    for (var i = 0; i < arr.length; i++) {
      var year = s.y0 + i;
      if (breakOnRev && i > 0 && rev[i] && rev[i - 1] && rev[i] !== rev[i - 1]) {
        out.push({ x: year - 0.5, y: null });   // jawna przerwa na granicy rewizji
      }
      out.push({ x: year, y: arr[i] });
    }
    return out;
  }

  /* ---------- 1. Epidemia tytoniowa: ASR raka pluca ---------- */
  function lungChart() {
    var sex = val("lungSex") || "male";
    var ds = ["GBR", "USA", "POL", "ESP"].map(function (iso) {
      return {
        label: T().geo[iso],
        data: points(iso + "|LUNG|" + sex, "asr", false),
        borderColor: GEO_COL[iso], backgroundColor: GEO_COL[iso],
        borderWidth: 2.2, pointRadius: 0, tension: .25, spanGaps: false
      };
    });
    charts.lung = new Chart(document.getElementById("cLung"), {
      type: "line", data: { datasets: ds },
      options: legendOn({
        responsive: true, maintainAspectRatio: false, parsing: false,
        interaction: { mode: "index", intersect: false },
        scales: axes(T().year, T().asrY, { x: { type: "linear", ticks: { stepSize: 10 } } })
      })
    });
  }

  /* ---------- 2. Dlaczego standaryzacja: surowy vs ASR ---------- */
  function crudeChart() {
    var iso = val("cvIso") || "POL", site = val("cvSite") || "LUNG";
    var meta = H.sites[site];
    var sex = meta.sex || "male";
    var mk = function (metric, color, dash, label) {
      return { label: label, data: points(iso + "|" + site + "|" + sex, metric, false),
        borderColor: color, backgroundColor: color, borderDash: dash,
        borderWidth: 2.2, pointRadius: 0, tension: .25 };
    };
    charts.cv = new Chart(document.getElementById("cCrude"), {
      type: "line",
      data: { datasets: [mk("crude", SLATE, [6, 4], T().crude), mk("asr", RED, [], T().asr)] },
      options: legendOn({
        responsive: true, maintainAspectRatio: false, parsing: false,
        interaction: { mode: "index", intersect: false },
        scales: axes(T().year, T().rateY, { x: { type: "linear", ticks: { stepSize: 10 } } })
      })
    });
  }

  /* ---------- 3. Eksplorator trendu (dowolny nowotwor) ---------- */
  function trendChart() {
    var site = val("trSite") || "STOMACH";
    var metric = val("trMetric") || "asr";
    var meta = H.sites[site];
    var sexSel = val("trSex") || "both";
    var sex = meta.sex || sexSel;
    var brk = !meta.continuous;
    var ds = ["POL", "GBR", "ESP", "USA"].map(function (iso) {
      return { label: T().geo[iso], data: points(iso + "|" + site + "|" + sex, metric, brk),
        borderColor: GEO_COL[iso], backgroundColor: GEO_COL[iso],
        borderWidth: 2.2, pointRadius: 0, tension: .25, spanGaps: false };
    }).filter(function (d) { return d.data; });

    var note = document.getElementById("trNote");
    if (note) {
      note.textContent = brk ? T().breakNote : "";
      note.style.display = brk ? "block" : "none";
    }
    var sexWrap = document.getElementById("trSexWrap");
    if (sexWrap) sexWrap.style.display = meta.sex ? "none" : "";

    charts.tr = new Chart(document.getElementById("cTrend"), {
      type: "line", data: { datasets: ds },
      options: legendOn({
        responsive: true, maintainAspectRatio: false, parsing: false,
        interaction: { mode: "index", intersect: false },
        scales: axes(T().year, metric === "asr" ? T().asrY : T().crudeY,
                     { x: { type: "linear", ticks: { stepSize: 10 } } })
      })
    });
  }

  /* ---------- 4. Obciazenie 2024 (GLOBOCAN) ---------- */
  function rankChart() {
    var geo = val("rkGeo") || "POL", meas = val("rkMeas") || "incidence";
    var rows = (C.burden[geo + "|" + meas] || []).slice(0, 10);
    charts.rk = new Chart(document.getElementById("cRank"), {
      type: "bar",
      data: {
        labels: rows.map(function (r) { return L(C.labels[r.c] || { en: r.c }); }),
        datasets: [{ data: rows.map(function (r) { return r.n; }),
          backgroundColor: meas === "incidence" ? INDIGO : RED, borderRadius: 5 }]
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: function (c) { return fmt(c.raw); } } } },
        scales: axes(meas === "incidence" ? T().casesY : T().countY, null,
                     { x: { grid: { color: GRID }, beginAtZero: true } })
      }
    });
  }

  /* ---------- 5. Profil wieku ---------- */
  function ageChart() {
    var geo = val("agGeo") || "POL", site = val("agSite") || "LUNG",
        meas = val("agMeas") || "incidence";
    var a = C.age[geo + "|" + site + "|" + meas];
    if (!a) { return; }
    charts.ag = new Chart(document.getElementById("cAge"), {
      type: "bar",
      data: { labels: a.x, datasets: [{ data: a.y, backgroundColor: GREEN, borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: axes(T().age, T().rateY, { y: { beginAtZero: true } })
      }
    });
  }

  /* ---------- 6. Prognoza do 2050 ---------- */
  function futureChart() {
    var geo = val("ftGeo") || "WORLD", meas = val("ftMeas") || "incidence";
    var s = F.series[geo + "|ALL|" + meas];
    if (!s) return;
    charts.ft = new Chart(document.getElementById("cFuture"), {
      type: "line",
      data: {
        labels: s.years,
        datasets: [{ data: s.n, borderColor: INDIGO, backgroundColor: "rgba(59,78,160,.10)",
          borderWidth: 2.4, pointRadius: 3, fill: true, tension: .25 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: function (c) { return fmt(c.raw); } } } },
        scales: axes(T().year, meas === "incidence" ? T().casesY : T().countY,
                     { y: { beginAtZero: false } })
      }
    });
  }

  function renderAll() {
    destroy();
    lungChart(); crudeChart(); trendChart(); rankChart(); ageChart(); futureChart();
  }

  /* ---------- selektory ---------- */
  function fillSelect(id, entries, selected) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    entries.forEach(function (e) {
      var o = document.createElement("option");
      o.value = e[0]; o.textContent = e[1];
      if (e[0] === selected) o.selected = true;
      el.appendChild(o);
    });
  }
  function siteEntries(src) {
    return Object.keys(src).map(function (k) { return [k, L(src[k])]; })
      .sort(function (a, b) { return a[1].localeCompare(b[1], lang); });
  }
  /* Kody, ktore FAKTYCZNIE maja profil wiekowy (bez kategorii zbiorczych i koszy). */
  function ageSites() {
    var seen = {};
    Object.keys(C.age).forEach(function (k) { seen[k.split("|")[1]] = 1; });
    var out = {};
    Object.keys(seen).forEach(function (c) { if (C.labels[c]) out[c] = C.labels[c]; });
    return out;
  }

  function refreshLabels() {
    var keep = { trSite: val("trSite"), cvSite: val("cvSite"), agSite: val("agSite") };
    fillSelect("trSite", siteEntries(H.sites), keep.trSite || "STOMACH");
    fillSelect("cvSite", siteEntries(H.sites), keep.cvSite || "LUNG");
    fillSelect("agSite", siteEntries(ageSites()), keep.agSite || "LUNG");
    [["lungSex", ["male", "female", "both"]], ["trSex", ["both", "male", "female"]]]
      .forEach(function (p) {
        var cur = val(p[0]);
        fillSelect(p[0], p[1].map(function (s) { return [s, T().sex[s]]; }), cur || p[1][0]);
      });
    [["cvIso", ["POL", "GBR", "ESP", "USA"]], ["rkGeo", ["POL", "GBR", "ESP", "USA", "WORLD"]],
     ["agGeo", ["POL", "GBR", "ESP", "USA", "WORLD"]], ["ftGeo", ["WORLD", "POL", "GBR", "ESP", "USA"]]]
      .forEach(function (p) {
        var cur = val(p[0]);
        fillSelect(p[0], p[1].map(function (g) { return [g, T().geo[g]]; }), cur || p[1][0]);
      });
    [["rkMeas", 0], ["agMeas", 0], ["ftMeas", 0], ["trMetric", 0]].forEach(function (p) {
      var el = document.getElementById(p[0]);
      if (!el) return;
      Array.prototype.forEach.call(el.options, function (o) {
        if (o.value === "incidence") o.textContent = T().inc;
        if (o.value === "mortality") o.textContent = T().mort;
        if (o.value === "asr") o.textContent = T().asr;
        if (o.value === "crude") o.textContent = T().crude;
      });
    });
  }

  window.setCancerLang = function (l) {
    lang = (l === "pl") ? "pl" : "en";
    if (!H) return;
    refreshLabels();
    renderAll();
  };

  function boot() {
    Promise.all([
      fetch("../assets/data/cancer-history.json").then(function (r) { return r.json(); }),
      fetch("../assets/data/cancer-current.json").then(function (r) { return r.json(); }),
      fetch("../assets/data/cancer-future.json").then(function (r) { return r.json(); })
    ]).then(function (res) {
      H = res[0]; C = res[1]; F = res[2];
      lang = document.body.classList.contains("lang-pl") ? "pl" : "en";
      refreshLabels();
      renderAll();
      ["lungSex", "cvIso", "cvSite", "trSite", "trMetric", "trSex",
       "rkGeo", "rkMeas", "agGeo", "agSite", "agMeas", "ftGeo", "ftMeas"]
        .forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.addEventListener("change", renderAll);
        });
    }).catch(function (e) { console.error("Cancer data load failed", e); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
