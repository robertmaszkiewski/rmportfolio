/* Renders the UK Crime dashboard from window.CRIME_DATA + window.PFA_GEO (Chart.js v4 + Leaflet). */
(function () {
  var D = window.CRIME_DATA;
  if (!D) { console.error("CRIME_DATA not loaded"); return; }

  var NAVY = "#16335c", BLUE = "#2f6db0", RED = "#c0392b",
      GRID = "rgba(20,35,63,.07)", MUTED = "#8a93a7";

  if (window.Chart) {
    Chart.defaults.font.family = "Inter, sans-serif";
    Chart.defaults.color = "#4b5874";
    Chart.defaults.plugins.legend.display = false;
  }
  var k = function (v) { return Math.round(v).toLocaleString(); };
  /* ---------- i18n: wykresy musza mowic tym samym jezykiem co tekst obok ---------- */
  var LANG = (document.body || document.documentElement).classList.contains("lang-pl") ? "pl" : "en";
  var STR = {
    en: {
      per1000: "per 1,000 residents",
      medianPrice: "Median house price",
      crimeRate: "Crime per 1,000 residents",
      london: "London boroughs", rest: "Rest of England & Wales",
      chargePct: "% charged / summonsed",
      group: {}, outcome: {}
    },
    pl: {
      per1000: "na 1000 mieszkańców",
      medianPrice: "Mediana ceny domu",
      crimeRate: "Przestępstwa na 1000 mieszkańców",
      london: "Dzielnice Londynu", rest: "Reszta Anglii i Walii",
      chargePct: "% z zarzutami / wezwaniem",
      group: {
        "Violence against the person": "Przemoc wobec osoby",
        "Theft offences": "Kradzieże",
        "Criminal damage and arson": "Zniszczenie mienia i podpalenia",
        "Public order offences": "Przeciw porządkowi publicznemu",
        "Sexual offences": "Przestępstwa seksualne",
        "Drug offences": "Przestępstwa narkotykowe",
        "Miscellaneous crimes against society": "Inne przeciw społeczeństwu",
        "Robbery": "Rozbój",
        "Possession of weapons offences": "Posiadanie broni"
      },
      outcome: {
        "Investigation complete \u2013 no suspect identified": "Śledztwo zakończone \u2013 nie ustalono sprawcy",
        "Evidential difficulties (victim does not support action)": "Trudności dowodowe (ofiara nie popiera)",
        "Evidential difficulties (suspect identified; victim supports action)": "Trudności dowodowe (sprawca znany; ofiara popiera)",
        "Charged/Summonsed": "Zarzuty / wezwanie do sądu",
        "Out-of-court (informal)": "Poza sądem (nieformalnie)",
        "Not yet assigned an outcome": "Bez rozstrzygnięcia",
        "Prosecution prevented or not in the public interest": "Ściganie niemożliwe lub nie w interesie publicznym",
        "Responsibility for further investigation transferred to another body": "Sprawę przekazano innemu organowi",
        "Out-of-court (formal)": "Poza sądem (formalnie)",
        "Further investigation to support formal action not in the public interest \u2013 police decision": "Dalsze śledztwo nie w interesie publicznym \u2013 decyzja policji",
        "Diversionary, educational or intervention activity, resulting from the crime report, has been undertaken and it is not in the public interest to take any further action.": "Podjęto działania edukacyjne; dalsze kroki nie w interesie publicznym",
        "Taken into consideration": "Uwzględnione w innej sprawie"
      }
    }
  };
  function T() { return STR[LANG]; }
  /* Nazwy jednostek policji zostaja po angielsku — to nazwy wlasne. */
  function tGroup(g) { return T().group[g] || g; }
  function tOutcome(o) { return T().outcome[o] || o; }

  function baseOpts(extra) {
    return Object.assign({
      responsive: true, maintainAspectRatio: false,
      scales: { x: { grid: { display: false } }, y: { grid: { color: GRID }, beginAtZero: true } }
    }, extra || {});
  }

  /* ---------------- CHOROPLETH MAP (Leaflet, no basemap) ---------------- */
  var BINS = [60, 70, 80, 90, 100, 120];
  var SCALE = ["#eef4fb", "#d3e3f3", "#aecbe6", "#80acd6", "#5189c2", "#2f6aa8", "#16335c"];
  function getColor(r) {
    if (r === null || r === undefined) return "#e6ebf2";
    for (var i = 0; i < BINS.length; i++) if (r < BINS[i]) return SCALE[i];
    return SCALE[SCALE.length - 1];
  }
  if (window.L && window.PFA_GEO && document.getElementById("crimeMap")) {
    var map = L.map("crimeMap", { zoomControl: true, attributionControl: false, scrollWheelZoom: false, dragging: true });
    function style(f) { return { fillColor: getColor(f.properties.rate), weight: 1, color: "#ffffff", fillOpacity: 0.88 }; }
    function onEach(f, lyr) {
      var p = f.properties;
      var rate = (p.rate == null) ? "n/a" : p.rate.toFixed(1);
      lyr.bindTooltip(
        '<div class="map-tip">' + p.PFA23NM + '<br><span>' + rate + ' / 1,000 · ' + (p.crimes ? k(p.crimes) : "—") + ' crimes</span></div>',
        { sticky: true }
      );
      lyr.on({
        mouseover: function (e) { e.target.setStyle({ weight: 2.5, color: "#16335c", fillOpacity: 1 }); e.target.bringToFront(); },
        mouseout: function (e) { layer.resetStyle(e.target); }
      });
    }
    var layer = L.geoJSON(window.PFA_GEO, { style: style, onEachFeature: onEach }).addTo(map);
    try { map.fitBounds(layer.getBounds(), { padding: [10, 10] }); } catch (e) { map.setView([52.6, -1.5], 6); }

    // legend
    var leg = document.getElementById("mapLegend");
    if (leg) {
      var labels = ["<60", "60–70", "70–80", "80–90", "90–100", "100–120", "120+"];
      var html = '<strong style="color:var(--ink)">Crimes / 1,000:</strong>';
      for (var i = 0; i < SCALE.length; i++) html += '<span><i style="background:' + SCALE[i] + '"></i>' + labels[i] + '</span>';
      html += '<span style="color:var(--red)"><i style="background:#16335c"></i>City of London ≈ 607 (resident-pop artifact)</span>';
      leg.innerHTML = html;
    }
  }

  function renderCharts() {
    // zmiana jezyka -> niszczymy stare wykresy, inaczej nakladalyby sie na siebie
    ['chRate','chMix','chTrend','chShop','chOutcomes','chChargeGroup','chScatter'].forEach(function (id) {
      var el = document.getElementById(id);
      var ex = el && Chart.getChart ? Chart.getChart(el) : null;
      if (ex) ex.destroy();
    });
    /* ---------------- CHARTS ---------------- */
    // Where: top 12 forces by rate
    if (document.getElementById("chRate")) {
      var top = D.by_force.slice().sort(function (a, b) { return b.rate - a.rate; }).slice(0, 12).reverse();
      new Chart(document.getElementById("chRate"), {
        type: "bar",
        data: {
          labels: top.map(function (r) { return r.force; }),
          datasets: [{
            data: top.map(function (r) { return r.rate; }),
            backgroundColor: top.map(function (r) { return r.force.indexOf("London, City") === 0 ? RED : BLUE; }),
            borderRadius: 4
          }]
        },
        options: baseOpts({
          indexAxis: "y",
          plugins: { tooltip: { callbacks: { label: function (c) { var r = top[c.dataIndex]; return r.rate.toFixed(1) + " / 1,000  ·  " + k(r.crimes) + " crimes"; } } } },
          scales: { x: { grid: { color: GRID }, beginAtZero: true, title: { display: true, text: T().per1000 } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
        })
      });
    }
  
    // What: offence mix
    if (document.getElementById("chMix")) {
      var g = D.by_group.slice().sort(function (a, b) { return a.crimes - b.crimes; });
      new Chart(document.getElementById("chMix"), {
        type: "bar",
        data: { labels: g.map(function (r) { return tGroup(r.group); }), datasets: [{ data: g.map(function (r) { return r.crimes; }), backgroundColor: NAVY, borderRadius: 4 }] },
        options: baseOpts({
          indexAxis: "y",
          plugins: { tooltip: { callbacks: { label: function (c) { var r = g[c.dataIndex]; return k(r.crimes) + "  ·  " + r.share + "%"; } } } },
          scales: { x: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: function (v) { return (v / 1e6).toFixed(1) + "M"; } } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
        })
      });
    }
  
    // When: trend
    if (document.getElementById("chTrend")) {
      new Chart(document.getElementById("chTrend"), {
        type: "line",
        data: {
          labels: D.trend_by_year.map(function (r) { return r.fy; }),
          datasets: [{ data: D.trend_by_year.map(function (r) { return r.crimes; }), borderColor: BLUE, backgroundColor: "rgba(47,109,176,.14)", fill: true, tension: .3, pointRadius: 3, pointHoverRadius: 6, borderWidth: 2.5 }]
        },
        options: baseOpts({
          plugins: { tooltip: { callbacks: { label: function (c) { return k(c.parsed.y) + " offences"; } } } },
          scales: { x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } }, y: { grid: { color: GRID }, ticks: { callback: function (v) { return (v / 1e6).toFixed(0) + "M"; } } } }
        })
      });
    }
  
    // Shoplifting
    if (document.getElementById("chShop")) {
      new Chart(document.getElementById("chShop"), {
        type: "line",
        data: {
          labels: D.shoplifting_by_year.map(function (r) { return r.fy; }),
          datasets: [{ data: D.shoplifting_by_year.map(function (r) { return r.crimes; }), borderColor: RED, backgroundColor: "rgba(192,57,43,.12)", fill: true, tension: .3, pointRadius: 3, pointHoverRadius: 6, borderWidth: 2.5 }]
        },
        options: baseOpts({
          plugins: { tooltip: { callbacks: { label: function (c) { return k(c.parsed.y) + " offences"; } } } },
          scales: { x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } }, y: { grid: { color: GRID }, ticks: { callback: function (v) { return (v / 1e3).toFixed(0) + "k"; } } } }
        })
      });
    }
  
    // Outcomes (top 8)
    if (document.getElementById("chOutcomes")) {
      var o = D.outcomes.slice(0, 8).slice().reverse();
      new Chart(document.getElementById("chOutcomes"), {
        type: "bar",
        data: {
          labels: o.map(function (r) { var o = tOutcome(r.outcome); return o.length > 42 ? o.slice(0, 40) + "…" : o; }),
          datasets: [{ data: o.map(function (r) { return r.count; }), backgroundColor: o.map(function (r) { return r.outcome.indexOf("Charged") === 0 ? RED : NAVY; }), borderRadius: 4 }]
        },
        options: baseOpts({
          indexAxis: "y",
          plugins: { tooltip: { callbacks: { title: function (c) { return o[c[0].dataIndex].outcome; }, label: function (c) { var r = o[c.dataIndex]; return k(r.count) + "  ·  " + r.share + "%"; } } } },
          scales: { x: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: function (v) { return (v / 1e6).toFixed(1) + "M"; } } }, y: { grid: { display: false }, ticks: { font: { size: 9 } } } }
        })
      });
    }
  
    // Charge rate by offence group
    if (document.getElementById("chChargeGroup")) {
      var cg = D.charge_rate_by_group.slice().sort(function (a, b) { return a.rate - b.rate; });
      new Chart(document.getElementById("chChargeGroup"), {
        type: "bar",
        data: { labels: cg.map(function (r) { return tGroup(r.group); }), datasets: [{ data: cg.map(function (r) { return r.rate; }), backgroundColor: BLUE, borderRadius: 4 }] },
        options: baseOpts({
          indexAxis: "y",
          plugins: { tooltip: { callbacks: { label: function (c) { return c.parsed.x + " " + T().chargePct; } } } },
          scales: { x: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: function (v) { return v + "%"; } } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
        })
      });
    }
    /* ---------------- CORRELATION: crime vs house price ---------------- */
    if (window.LAD_CORR && document.getElementById("chScatter")) {
      var P = window.LAD_CORR.points;
      function pts(lon) { return P.filter(function (p) { return !!p.london === lon; }).map(function (p) { return { x: p.price, y: p.rate, lad: p.lad }; }); }
      new Chart(document.getElementById("chScatter"), {
        type: "scatter",
        data: { datasets: [
          { label: T().rest, data: pts(false), backgroundColor: "rgba(47,109,176,.6)", pointRadius: 4, pointHoverRadius: 6 },
          { label: T().london, data: pts(true), backgroundColor: "rgba(192,57,43,.82)", pointRadius: 4, pointHoverRadius: 6 }
        ] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top", labels: { usePointStyle: true, boxWidth: 8 } },
            tooltip: { callbacks: { label: function (c) { return c.raw.lad + ": £" + Math.round(c.raw.x / 1000) + "k · " + c.raw.y + "/1,000"; } } }
          },
          scales: {
            x: { title: { display: true, text: T().medianPrice }, ticks: { callback: function (v) { return "£" + (v / 1000) + "k"; } }, grid: { color: GRID } },
            y: { title: { display: true, text: T().crimeRate }, beginAtZero: true, grid: { color: GRID } }
          }
        }
      });
    }
  }
  renderCharts();

  function ladChoropleth(elId, legId, field, bins, scale, labels) {
    if (!window.L || !window.LAD_GEO || !document.getElementById(elId)) return;
    var map = L.map(elId, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, dragging: false, doubleClickZoom: false, keyboard: false });
    function col(v) { if (v == null) return "#e6ebf2"; for (var i = 0; i < bins.length; i++) if (v < bins[i]) return scale[i]; return scale[scale.length - 1]; }
    var layer = L.geoJSON(window.LAD_GEO, {
      style: function (f) { return { fillColor: col(f.properties[field]), weight: 0.3, color: "#fff", fillOpacity: 0.9 }; },
      onEachFeature: function (f, l) { var p = f.properties; l.bindTooltip('<div class="map-tip">' + p.name + '<br><span>' + (p.rate == null ? "no data" : (p.rate + "/1,000 · £" + Math.round(p.price / 1000) + "k")) + '</span></div>', { sticky: true }); }
    }).addTo(map);
    try { map.fitBounds(layer.getBounds(), { padding: [6, 6] }); } catch (e) { }
    var leg = document.getElementById(legId);
    if (leg) { var h = ""; for (var i = 0; i < scale.length; i++) h += '<span><i style="background:' + scale[i] + '"></i>' + labels[i] + '</span>'; leg.innerHTML = h; }
  }
  var SC_CRIME = ["#eef4fb", "#cfe0f2", "#9fc0e2", "#6f9fd0", "#447cbb", "#16335c"];
  var SC_PRICE = ["#eaf5f0", "#c7e7d8", "#9ad4bd", "#67bd9d", "#3f9e7f", "#155c47"];
  ladChoropleth("ladCrimeMap", "ladCrimeLegend", "rate", [30, 50, 70, 90, 120], SC_CRIME, ["<30", "30–50", "50–70", "70–90", "90–120", "120+"]);
  ladChoropleth("ladPriceMap", "ladPriceLegend", "price", [200000, 275000, 350000, 450000, 600000], SC_PRICE, ["<£200k", "£200–275k", "£275–350k", "£350–450k", "£450–600k", "£600k+"]);
  /* lang.js wola ten hook -> przerysowujemy wykresy w nowym jezyku (bez przeladowania) */
  window.setCrimeLang = function (l) {
    var next = (l === "pl") ? "pl" : "en";
    if (next === LANG) return;
    LANG = next;
    renderCharts();
  };
})();