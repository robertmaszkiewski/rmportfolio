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
      breakNote: "Series is drawn in segments — the ICD revision changed the definition.",
      covY: "Girls vaccinated against HPV (%)", cov: "coverage",
      tfrY: "Births per woman (total fertility rate)",
      under45X: "Share of deaths before age 45 (%)",
      deathsY: "Deaths (women aged 20–34)",
      typeX: "Share of HPV-positive cervical cancers (%)",
      typeBi: "Covered by every HPV vaccine (types 16, 18)",
      typeNona: "Added by the 9-valent vaccine (31, 33, 45, 52, 58)",
      typeNone: "Covered by no vaccine",
      infertY: "Infertile (%), married women aged 15–44",
      youngRateY: "Cervical cancer deaths per 100,000 (women 20–34)",
      wideY: "Cervical cancer deaths per 100,000 (age-standardised)",
      scatterX: "HPV vaccination coverage (%)",
      scatterY: "Change in deaths, women 20–34 (2012→2022, %)",
      oroY: "Deaths per 100,000 (age-standardised)",
      oroHpv: "HPV-linked sites (tongue base, tonsil, oropharynx)",
      oroOther: "Rest of the head & neck block (tobacco, alcohol)"
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
      breakNote: "Seria rysowana odcinkami — zmiana rewizji ICD zmieniła definicję.",
      covY: "Zaszczepione dziewczęta przeciw HPV (%)", cov: "pokrycie",
      tfrY: "Dzieci na kobietę (współczynnik dzietności)",
      under45X: "Udział zgonów przed 45. rokiem życia (%)",
      deathsY: "Zgony (kobiety 20–34 lata)",
      typeX: "Udział wśród HPV-dodatnich raków szyjki (%)",
      typeBi: "Pokryte przez KAŻDĄ szczepionkę HPV (typy 16, 18)",
      typeNona: "Dodane przez szczepionkę 9-walentną (31, 33, 45, 52, 58)",
      typeNone: "Nie pokryte przez żadną szczepionkę",
      infertY: "Niepłodne (%), kobiety zamężne 15–44 lata",
      youngRateY: "Zgony na raka szyjki na 100 tys. (kobiety 20–34)",
      wideY: "Zgony na raka szyjki na 100 tys. (standaryzowane wiekiem)",
      scatterX: "Pokrycie szczepieniami HPV (%)",
      scatterY: "Zmiana zgonów, kobiety 20–34 (2012→2022, %)",
      oroY: "Zgony na 100 tys. (standaryzowane wiekiem)",
      oroHpv: "Podmiejsca HPV-zależne (nasada języka, migdałek, gardło środkowe)",
      oroOther: "Reszta bloku głowa–szyja (tytoń, alkohol)"
    }
  };

  var H = null, C = null, F = null, P = null, charts = {}, lang = "en";
  function T() { return STR[lang]; }
  function L(o) { return (lang === "pl" ? o.pl : o.en) || o.en; }
  /* Wersja EN opowiada o Wielkiej Brytanii, wersja PL o Polsce —
     wykresy startuja od kraju, o ktorym mowi tekst obok. */
  function homeGeo() { return lang === "pl" ? "POL" : "GBR"; }

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

  /* WSPOLNA SIATKA LAT.
     Chart.js w trybie 'index' dopasowuje punkty po pozycji w tablicy, nie po roku.
     Serie startuja w roznych latach i maja rozne dlugosci, wiec bez wspolnej siatki
     "indeks 3" oznaczalby inny rok dla kazdego kraju — i kropki pod kursorem
     rozjezdzalyby sie w pionie. Kladziemy wiec wszystko na tej samej osi lat. */
  function gridOf(ranges) {
    var lo = Infinity, hi = -Infinity;
    ranges.forEach(function (r) {
      if (!r) return;
      lo = Math.min(lo, r[0]);
      hi = Math.max(hi, r[1]);
    });
    if (!isFinite(lo)) return [];
    var g = [];
    for (var y = lo; y <= hi; y++) g.push(y);
    return g;
  }
  function rangeOf(key, metric) {
    var s = H.series[key];
    return s ? [s.y0, s.y0 + s[metric].length - 1] : null;
  }
  /* Wartosci serii polozone na zadanej siatce lat; brak danych -> null (luka na wykresie). */
  function onGrid(grid, key, metric) {
    var s = H.series[key];
    if (!s) return null;
    var arr = s[metric];
    return grid.map(function (y) {
      var i = y - s.y0;
      return { x: y, y: (i >= 0 && i < arr.length) ? arr[i] : null };
    });
  }
  /* To samo dla serii spoza cancer-history (pokrycie, dzietnosc, gardlo...): {years, v}. */
  function onGridRaw(grid, years, vals) {
    var map = {};
    years.forEach(function (y, i) { map[y] = vals[i]; });
    return grid.map(function (y) {
      return { x: y, y: (y in map) ? map[y] : null };
    });
  }
  /* Przerwa na zmianie rewizji ICD: zamiast wstawiac dodatkowy punkt (co psulo
     indeksowanie), ukrywamy sam ODCINEK linii miedzy dwiema rewizjami. */
  function breakSegment(key) {
    var s = H.series[key];
    return function (ctx) {
      if (!s) return undefined;
      var a = ctx.p0.parsed.x - s.y0, b = ctx.p1.parsed.x - s.y0;
      var ra = (a >= 0 && a < s.rev.length) ? s.rev[a] : null;
      var rb = (b >= 0 && b < s.rev.length) ? s.rev[b] : null;
      return (ra && rb && ra !== rb) ? "transparent" : undefined;
    };
  }

  /* ---------- 1. Szesc nowotworow, szesc roznych kierunkow ---------- */
  var DIVERGE = [
    { site: "STOMACH", col: GREEN },
    { site: "LUNG", col: RED },
    { site: "COLORECTUM", col: INDIGO },
    { site: "PANCREAS", col: SLATE },
    { site: "LIVER", col: AMBER },
    { site: "ORAL_PHARYNX", col: BLUE }
  ];
  function divergeChart() {
    var iso = val("dvIso") || homeGeo();
    var keys = DIVERGE.map(function (d) { return iso + "|" + d.site + "|both"; });
    var grid = gridOf(keys.map(function (k) { return rangeOf(k, "asr"); }));
    var ds = DIVERGE.map(function (d, i) {
      var key = keys[i];
      return {
        label: L(H.sites[d.site]),
        data: onGrid(grid, key, "asr"),
        segment: { borderColor: breakSegment(key) },
        borderColor: d.col, backgroundColor: d.col,
        borderWidth: 2.2, pointRadius: 0, tension: .25, spanGaps: false
      };
    }).filter(function (d) { return d.data; });
    charts.dv = new Chart(document.getElementById("cDiverge"), {
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
    var iso = val("cvIso") || homeGeo(), site = val("cvSite") || "LUNG";
    var meta = H.sites[site];
    var sex = meta.sex || "male";
    var key = iso + "|" + site + "|" + sex;
    var grid = gridOf([rangeOf(key, "asr")]);
    var mk = function (metric, color, dash, label) {
      return { label: label, data: onGrid(grid, key, metric),
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
    var isos = ["POL", "GBR", "ESP", "USA"];
    var keys = isos.map(function (iso) { return iso + "|" + site + "|" + sex; });
    var grid = gridOf(keys.map(function (k) { return rangeOf(k, metric); }));
    var ds = isos.map(function (iso, i) {
      var key = keys[i];
      return { label: T().geo[iso], data: onGrid(grid, key, metric),
        segment: brk ? { borderColor: breakSegment(key) } : undefined,
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
    var geo = val("rkGeo") || homeGeo(), meas = val("rkMeas") || "incidence";
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
    var geo = val("agGeo") || homeGeo(), site = val("agSite") || "LUNG",
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

  /* ================= HPV ================= */

  /* Rok startu krajowego programu szczepien (do adnotacji na wykresie) */
  var HPV_START = { GBR: 2008, ESP: 2008, USA: 2006, POL: 2023 };

  /* 7. Pokrycie szczepieniami HPV */
  function hpvCovChart() {
    if (!P || !document.getElementById("cHpvCov")) return;
    var isos = ["GBR", "ESP", "USA", "POL"];
    var grid = gridOf(isos.map(function (iso) {
      var c = P.coverage[iso];
      return c ? [c.years[0], c.years[c.years.length - 1]] : null;
    }));
    var ds = isos.map(function (iso) {
      var c = P.coverage[iso];
      return {
        label: T().geo[iso],
        data: c ? onGridRaw(grid, c.years, c.pct) : [],
        borderColor: GEO_COL[iso], backgroundColor: GEO_COL[iso],
        borderWidth: 2.4, pointRadius: 2.5, tension: .2, spanGaps: false
      };
    });
    charts.hc = new Chart(document.getElementById("cHpvCov"), {
      type: "line", data: { datasets: ds },
      options: legendOn({
        responsive: true, maintainAspectRatio: false, parsing: false,
        interaction: { mode: "index", intersect: false },
        scales: axes(T().year, T().covY, {
          x: { type: "linear", min: 2008, max: 2024, ticks: { stepSize: 2 } },
          y: { beginAtZero: true, max: 100 }
        })
      })
    });
  }

  /* 8. Kogo zabija rak szyjki macicy — udzial zgonow ponizej 45 r.z. */
  function youngChart() {
    if (!P || !document.getElementById("cYoung")) return;
    var order = Object.keys(P.under45).sort(function (a, b) { return P.under45[b] - P.under45[a]; });
    charts.yg = new Chart(document.getElementById("cYoung"), {
      type: "bar",
      data: {
        labels: order.map(function (c) { return L(H.sites[c] || { en: c, pl: c }); }),
        datasets: [{
          data: order.map(function (c) { return P.under45[c]; }),
          backgroundColor: order.map(function (c) { return c === "CERVIX" ? RED : SLATE; }),
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: function (c) { return c.raw + "%"; } } } },
        scales: axes(T().under45X, null, { x: { grid: { color: GRID }, beginAtZero: true } })
      }
    });
  }

  /* 9. Dzietnosc — test twierdzenia "szczepionka niszczy plodnosc" */
  function fertChart() {
    if (!P || !document.getElementById("cFert")) return;
    var isos = ["GBR", "USA", "POL", "ESP"];
    var grid = gridOf(isos.map(function (iso) {
      var f = P.fertility[iso];
      return [f.years[0], f.years[f.years.length - 1]];
    }));
    var ds = isos.map(function (iso) {
      var f = P.fertility[iso];
      var cov = P.coverage[iso];
      var last = cov ? cov.pct[cov.pct.length - 1] : 0;
      return {
        label: T().geo[iso] + " (" + T().cov + " " + last + "%)",
        data: onGridRaw(grid, f.years, f.tfr),
        borderColor: GEO_COL[iso], backgroundColor: GEO_COL[iso],
        borderWidth: 2.2, pointRadius: 0, tension: .25, spanGaps: false
      };
    });
    charts.ft2 = new Chart(document.getElementById("cFert"), {
      type: "line", data: { datasets: ds },
      options: legendOn({
        responsive: true, maintainAspectRatio: false, parsing: false,
        interaction: { mode: "index", intersect: false },
        scales: axes(T().year, T().tfrY, {
          x: { type: "linear", min: 1970, max: 2024, ticks: { stepSize: 10 } },
          y: { beginAtZero: false }
        })
      })
    });
  }


  /* 10. Ktory typ HPV wywoluje ile raka — i co pokrywa ktora szczepionka */
  var VCOL = { bi: GREEN, nona: BLUE, none: SLATE };
  function typeChart() {
    if (!P || !document.getElementById("cTypes")) return;
    var rows = P.types.rows;
    charts.ty = new Chart(document.getElementById("cTypes"), {
      type: "bar",
      data: {
        labels: rows.map(function (r) {
          return r.t === "other" ? (lang === "pl" ? "pozostałe" : "other types") : "HPV " + r.t;
        }),
        datasets: [{
          data: rows.map(function (r) { return r.rc; }),
          backgroundColor: rows.map(function (r) { return VCOL[r.v]; }),
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: function (c) { return c.raw + "%"; } } } },
        scales: axes(T().typeX, null, { x: { grid: { color: GRID }, beginAtZero: true } })
      }
    });
  }

  /* 11. Jedyna ZMIERZONA nieplodnosc (USA, NSFG) — ksztalt litery U */
  function infertChart() {
    if (!P || !document.getElementById("cInfert")) return;
    charts.inf = new Chart(document.getElementById("cInfert"), {
      type: "line",
      data: {
        labels: P.nsfg.labels,
        datasets: [{
          data: P.nsfg.infertility,
          borderColor: RED, backgroundColor: "rgba(192,57,43,.10)",
          borderWidth: 2.6, pointRadius: 4, fill: true, tension: .2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: function (c) { return c.raw + "%"; } } } },
        scales: axes(null, T().infertY, { y: { beginAtZero: false } })
      }
    });
  }


  /* 12. Korelacja, o ktora chodzi: umieralnosc mlodych kobiet vs szczepienia.
         Srednia 3-letnia — liczby sa male i surowa seria to szum. */
  function cervYoungChart() {
    if (!P || !document.getElementById("cCervYoung")) return;
    var isos = ["GBR", "USA", "ESP", "POL"];
    var grid = gridOf(isos.map(function (iso) {
      var y = P.cervixYoungRate[iso].years;
      return [y[0], y[y.length - 1]];
    }));
    var ds = isos.map(function (iso) {
      var s = P.cervixYoungRate[iso];
      return {
        label: T().geo[iso],
        data: onGridRaw(grid, s.years, s.rate),   // lata jawne + wspolna siatka
        borderColor: GEO_COL[iso], backgroundColor: GEO_COL[iso],
        borderWidth: 2.2, pointRadius: 0, tension: .3, spanGaps: false
      };
    });
    charts.cyg = new Chart(document.getElementById("cCervYoung"), {
      type: "line", data: { datasets: ds },
      options: legendOn({
        responsive: true, maintainAspectRatio: false, parsing: false,
        interaction: { mode: "index", intersect: false },
        scales: axes(T().year, T().youngRateY, {
          x: { type: "linear", min: 1995, max: 2022, ticks: { stepSize: 5 } },
          y: { beginAtZero: true }
        })
      })
    });
  }


  /* 13. Rak szyjki w 11 krajach — gdzie stoi Polska */
  var GEO11 = { POL: "#c0392b", GBR: AMBER, ESP: BLUE, USA: "#7f8c8d",
                DNK: GREEN, SWE: GREEN, FIN: GREEN, NOR: GREEN,
                AUS: "#8e44ad", NLD: "#16a085", PRT: "#d35400" };
  var NAME11 = {
    en: { DNK: "Denmark", SWE: "Sweden", FIN: "Finland", NOR: "Norway",
          AUS: "Australia", NLD: "Netherlands", PRT: "Portugal" },
    pl: { DNK: "Dania", SWE: "Szwecja", FIN: "Finlandia", NOR: "Norwegia",
          AUS: "Australia", NLD: "Holandia", PRT: "Portugalia" }
  };
  function geoName(iso) {
    return T().geo[iso] || NAME11[lang][iso] || iso;
  }
  function wideChart() {
    if (!P || !P.wide || !document.getElementById("cWide")) return;
    var rows = Object.keys(P.wide.asr).map(function (iso) {
      var a = P.wide.asr[iso];
      var cov = P.wide.coverage[iso];
      return { iso: iso, asr: a.v[a.v.length - 1], year: a.years[a.years.length - 1],
               cov: cov ? cov.pct[cov.pct.length - 1] : null };
    }).sort(function (a, b) { return a.asr - b.asr; });
    charts.wd = new Chart(document.getElementById("cWide"), {
      type: "bar",
      data: {
        labels: rows.map(function (r) {
          return geoName(r.iso) + (r.cov !== null ? "  (" + r.cov + "%)" : "");
        }),
        datasets: [{
          data: rows.map(function (r) { return r.asr; }),
          backgroundColor: rows.map(function (r) { return r.iso === "POL" ? RED : SLATE; }),
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: {
          label: function (c) { return c.raw + " / 100k (" + rows[c.dataIndex].year + ")"; } } } },
        scales: axes(T().wideY, null, { x: { grid: { color: GRID }, beginAtZero: true } })
      }
    });
  }

  /* 14. Pokrycie vs zmiana umieralnosci — 9 krajow. Hiszpania odstaje i to widac. */
  function scatterChart() {
    if (!P || !P.scatter || !document.getElementById("cScatter")) return;
    charts.sc = new Chart(document.getElementById("cScatter"), {
      type: "scatter",
      data: {
        datasets: P.scatter.map(function (p) {
          // Zielony = kraj przeprowadzil kampanie nadrabiajaca obejmujaca roczniki,
          // ktore dzis maja 20-34 lata. Czerwony = nie przeprowadzil.
          var col = p.catchup ? GREEN : RED;
          return {
            label: geoName(p.iso) + (p.catchup ? "" : " ✗"),
            data: [{ x: p.cov, y: p.chg }],
            backgroundColor: col, borderColor: col,
            pointRadius: 8, pointHoverRadius: 10,
            pointStyle: p.catchup ? "circle" : "triangle"
          };
        })
      },
      options: legendOn({
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: function (c) {
          var p = P.scatter[c.datasetIndex];
          var cu = P.catchup[p.iso];
          return [c.dataset.label + ": " + c.parsed.x + "% → " + c.parsed.y + "%",
                  (cu.has ? (lang === "pl" ? "kampania nadrabiająca: " : "catch-up: ") + cu.cohorts
                          : (lang === "pl" ? "bez kampanii nadrabiającej" : "no catch-up campaign"))]; } } } },
        scales: axes(T().scatterX, T().scatterY, {
          x: { beginAtZero: true, max: 100, grid: { color: GRID } },
          y: { grid: { color: GRID } }
        })
      })
    });
  }

  /* 15. Drugi rak HPV: gardlo srodkowe rosnie, gdy tytoniowe spadaja */
  function oroChart() {
    if (!P || !P.oro || !document.getElementById("cOro")) return;
    var iso = val("oroIso") || (lang === "pl" ? "POL" : "GBR");
    var o = P.oro[iso];
    if (!o) return;
    var grid = gridOf(["hpv", "other"].map(function (g) {
      var y = o[g].years;
      return [y[0], y[y.length - 1]];
    }));
    var mk = function (grp, col, dash, label) {
      var s = o[grp];
      return { label: label,
        data: onGridRaw(grid, s.years, s.v),
        borderColor: col, backgroundColor: col, borderDash: dash,
        borderWidth: 2.4, pointRadius: 0, tension: .25, spanGaps: false };
    };
    charts.oro = new Chart(document.getElementById("cOro"), {
      type: "line",
      data: { datasets: [mk("hpv", RED, [], T().oroHpv),
                         mk("other", SLATE, [6, 4], T().oroOther)] },
      options: legendOn({
        responsive: true, maintainAspectRatio: false, parsing: false,
        interaction: { mode: "index", intersect: false },
        scales: axes(T().year, T().oroY, { x: { type: "linear", ticks: { stepSize: 5 } },
                                           y: { beginAtZero: true } })
      })
    });
  }

  function renderAll() {
    destroy();
    divergeChart(); crudeChart(); trendChart(); rankChart(); ageChart(); futureChart();
    hpvCovChart(); youngChart(); fertChart(); typeChart(); infertChart(); cervYoungChart();
    wideChart(); scatterChart(); oroChart();
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

  function refreshLabels(resetGeo) {
    var keep = { trSite: val("trSite"), cvSite: val("cvSite"), agSite: val("agSite") };
    fillSelect("trSite", siteEntries(H.sites), keep.trSite || "STOMACH");
    fillSelect("cvSite", siteEntries(H.sites), keep.cvSite || "LUNG");
    fillSelect("agSite", siteEntries(ageSites()), keep.agSite || "LUNG");
    var cur = val("trSex");
    fillSelect("trSex", ["both", "male", "female"].map(function (s) { return [s, T().sex[s]]; }),
               cur || "both");
    // Po zmianie jezyka wykresy wracaja do kraju, o ktorym opowiada tekst (EN->UK, PL->Polska).
    var home = homeGeo();
    [["dvIso", ["POL", "GBR", "ESP", "USA"]], ["cvIso", ["POL", "GBR", "ESP", "USA"]],
     ["rkGeo", ["POL", "GBR", "ESP", "USA", "WORLD"]], ["agGeo", ["POL", "GBR", "ESP", "USA", "WORLD"]]]
      .forEach(function (p) {
        var sel = resetGeo ? home : (val(p[0]) || home);
        fillSelect(p[0], p[1].map(function (g) { return [g, T().geo[g]]; }), sel);
      });
    fillSelect("ftGeo", ["WORLD", "POL", "GBR", "ESP", "USA"].map(function (g) { return [g, T().geo[g]]; }),
               val("ftGeo") || "WORLD");
    if (P && P.oro) {
      fillSelect("oroIso", Object.keys(P.oro).map(function (g) { return [g, geoName(g)]; }),
                 resetGeo ? homeGeo() : (val("oroIso") || homeGeo()));
    }
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
    var next = (l === "pl") ? "pl" : "en";
    var changed = (next !== lang);
    lang = next;
    if (!H) return;
    refreshLabels(changed);   // zmiana jezyka -> wykresy przeskakuja na kraj tej narracji
    renderAll();
  };

  /* Serwer ma fallback try_files -> index.html, wiec BRAKUJACY plik wraca
     jako HTML ze statusem 200. Bez tej kontroli wykresy po prostu cicho znikaja. */
  function getJson(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error(path + " -> HTTP " + r.status);
      var ct = r.headers && r.headers.get ? (r.headers.get("content-type") || "") : "";
      if (ct && ct.indexOf("json") === -1) {
        throw new Error(path + " -> serwer zwrocil '" + ct + "', nie JSON");
      }
      return r.json();
    });
  }
  function showLoadError(e) {
    console.error("Cancer data load failed:", e);
    var msg = document.createElement("p");
    msg.className = "note";
    msg.style.cssText = "color:#c0392b;font-weight:700;text-align:center;padding:20px";
    msg.textContent = (lang === "pl")
      ? "Nie udało się wczytać danych — wykresy są niedostępne. (" + e.message + ")"
      : "Data failed to load — charts unavailable. (" + e.message + ")";
    var host = document.querySelector(".chart-grid");
    if (host && host.parentNode) host.parentNode.insertBefore(msg, host);
  }

  function boot() {
    Promise.all([
      getJson("../assets/data/cancer-history.json"),
      getJson("../assets/data/cancer-current.json"),
      getJson("../assets/data/cancer-future.json"),
      getJson("../assets/data/cancer-hpv.json")
    ]).then(function (res) {
      H = res[0]; C = res[1]; F = res[2]; P = res[3];
      lang = document.body.classList.contains("lang-pl") ? "pl" : "en";
      refreshLabels(true);
      renderAll();
      ["dvIso", "cvIso", "cvSite", "trSite", "trMetric", "trSex",
       "rkGeo", "rkMeas", "agGeo", "agSite", "agMeas", "ftGeo", "ftMeas", "oroIso"]
        .forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.addEventListener("change", renderAll);
        });
    }).catch(showLoadError);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
