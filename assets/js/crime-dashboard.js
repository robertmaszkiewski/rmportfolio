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
        scales: { x: { grid: { color: GRID }, beginAtZero: true, title: { display: true, text: "per 1,000 residents" } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
      })
    });
  }

  // What: offence mix
  if (document.getElementById("chMix")) {
    var g = D.by_group.slice().sort(function (a, b) { return a.crimes - b.crimes; });
    new Chart(document.getElementById("chMix"), {
      type: "bar",
      data: { labels: g.map(function (r) { return r.group; }), datasets: [{ data: g.map(function (r) { return r.crimes; }), backgroundColor: NAVY, borderRadius: 4 }] },
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
        labels: o.map(function (r) { return r.outcome.length > 42 ? r.outcome.slice(0, 40) + "…" : r.outcome; }),
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
      data: { labels: cg.map(function (r) { return r.group; }), datasets: [{ data: cg.map(function (r) { return r.rate; }), backgroundColor: BLUE, borderRadius: 4 }] },
      options: baseOpts({
        indexAxis: "y",
        plugins: { tooltip: { callbacks: { label: function (c) { return c.parsed.x + "% charged / summonsed"; } } } },
        scales: { x: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: function (v) { return v + "%"; } } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
      })
    });
  }
})();
