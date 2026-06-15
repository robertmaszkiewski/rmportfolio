/* Renders the Online Retail II dashboard from window.DASH_DATA (Chart.js v4). */
(function () {
  var D = window.DASH_DATA;
  if (!D) { console.error("DASH_DATA not loaded"); return; }

  var GREEN = "#1f8a5b", GREENL = "rgba(31,138,91,.18)", INK = "#15233f",
      RED = "#c0392b", GRID = "rgba(20,35,63,.07)", MUTED = "#8a93a7";

  Chart.defaults.font.family = "Inter, sans-serif";
  Chart.defaults.color = "#4b5874";
  Chart.defaults.plugins.legend.display = false;

  var gbp0 = function (v) { return "£" + Math.round(v).toLocaleString(); };
  var gbpM = function (v) { return "£" + (v / 1e6).toFixed(2) + "m"; };

  function baseOpts(extra) {
    return Object.assign({
      responsive: true, maintainAspectRatio: false,
      scales: { x: { grid: { display: false } }, y: { grid: { color: GRID }, beginAtZero: true } }
    }, extra || {});
  }

  // 5.1 Revenue by month (line)
  new Chart(document.getElementById("chRevenue"), {
    type: "line",
    data: {
      labels: D.revenue_by_month.map(function (r) { return r.month; }),
      datasets: [{
        data: D.revenue_by_month.map(function (r) { return r.revenue; }),
        borderColor: GREEN, backgroundColor: GREENL, fill: true,
        tension: .32, pointRadius: 2.5, pointHoverRadius: 5, borderWidth: 2.5
      }]
    },
    options: baseOpts({
      plugins: { tooltip: { callbacks: { label: function (c) { return gbp0(c.parsed.y); } } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: function (v) { return "£" + (v / 1e6).toFixed(1) + "m"; } } }
      }
    })
  });

  // 5.2 Top products (horizontal bar)
  new Chart(document.getElementById("chProducts"), {
    type: "bar",
    data: {
      labels: D.top_products.map(function (r) { return r.name; }),
      datasets: [{ data: D.top_products.map(function (r) { return r.revenue; }), backgroundColor: GREEN, borderRadius: 4 }]
    },
    options: baseOpts({
      indexAxis: "y",
      plugins: { tooltip: { callbacks: { label: function (c) { return gbp0(c.parsed.x); } } } },
      scales: {
        x: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: function (v) { return "£" + (v / 1e3) + "k"; } } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    })
  });

  // 5.3 Country (horizontal bar)
  new Chart(document.getElementById("chCountry"), {
    type: "bar",
    data: {
      labels: D.revenue_by_country.map(function (r) { return r.country; }),
      datasets: [{ data: D.revenue_by_country.map(function (r) { return r.revenue; }), backgroundColor: "#3b4ea0", borderRadius: 4 }]
    },
    options: baseOpts({
      indexAxis: "y",
      plugins: { tooltip: { callbacks: { label: function (c) { return gbp0(c.parsed.x); } } } },
      scales: {
        x: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: function (v) { return "£" + (v / 1e6).toFixed(1) + "m"; } } },
        y: { grid: { display: false } }
      }
    })
  });

  // 5.4 RFM segments (horizontal bar, by revenue)
  var seg = D.rfm_segments.slice().sort(function (a, b) { return a.revenue - b.revenue; });
  new Chart(document.getElementById("chRfm"), {
    type: "bar",
    data: {
      labels: seg.map(function (r) { return r.segment; }),
      datasets: [{
        data: seg.map(function (r) { return r.revenue; }),
        backgroundColor: seg.map(function (r) { return r.segment.indexOf("Champ") === 0 ? GREEN : "#9bbfae"; }),
        borderRadius: 4
      }]
    },
    options: baseOpts({
      indexAxis: "y",
      plugins: { tooltip: { callbacks: { label: function (c) {
        var s = seg[c.dataIndex]; return gbp0(s.revenue) + "  ·  " + s.customers.toLocaleString() + " customers  ·  " + s.share + "%"; } } } },
      scales: {
        x: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: function (v) { return "£" + (v / 1e6).toFixed(1) + "m"; } } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    })
  });

  // 5.6 Returns rate (line)
  new Chart(document.getElementById("chReturns"), {
    type: "line",
    data: {
      labels: D.returns_by_month.map(function (r) { return r.month; }),
      datasets: [{
        data: D.returns_by_month.map(function (r) { return r.rate; }),
        borderColor: RED, backgroundColor: "rgba(192,57,43,.12)", fill: true,
        tension: .3, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2.5
      }]
    },
    options: baseOpts({
      plugins: { tooltip: { callbacks: { label: function (c) { return c.parsed.y + "% of revenue"; } } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: function (v) { return v + "%"; } } }
      }
    })
  });

  // Cohort heatmap (HTML table)
  (function () {
    var c = D.cohort, el = document.getElementById("cohort");
    if (!c || !el) return;
    var max = 50; // cap for colour scale
    function cell(v) {
      if (v === null || v === undefined) return '<td></td>';
      var a = Math.min(v / max, 1);
      var bg = "rgba(31,138,91," + (0.08 + a * 0.85).toFixed(3) + ")";
      var col = a > 0.55 ? "#fff" : "#15233f";
      return '<td style="background:' + bg + ';color:' + col + '">' + Math.round(v) + '</td>';
    }
    var h = '<table class="cohort"><thead><tr><th class="lab">Cohort</th>';
    c.offsets.forEach(function (o) { h += '<th>M' + o + '</th>'; });
    h += '</tr></thead><tbody>';
    c.cohorts.forEach(function (name, i) {
      h += '<tr><td class="lab">' + name + '</td>';
      c.matrix[i].forEach(function (v) { h += cell(v); });
      h += '</tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  })();
})();
