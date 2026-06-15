# rmportfolio.co.uk — Data Analytics Portfolio

Static multi-page portfolio site. No build step, no backend — just HTML, CSS and a little JavaScript (Chart.js from CDN). Built to make **adding new case studies trivial**.

## Structure

```
portfolio-site/
├── index.html                      # Home: hero, about, case-study grid, contact
├── case-studies/
│   └── online-retail-ii.html       # Case study 1 (live) — full dashboard + narrative
├── assets/
│   ├── css/style.css               # Shared styles (one theme for the whole site)
│   ├── js/
│   │   ├── data.js                 # window.DASH_DATA — aggregated numbers for the charts
│   │   └── dashboard.js            # Renders the charts + cohort heatmap
│   └── data/
│       └── dashboard_data.json     # Same data as JSON (reference / reuse)
└── README.md
```

## View locally
Just open `index.html` in a browser (double-click). Charts load Chart.js from a CDN, so keep an internet connection. Everything else is local.

## Deploy to the VPS
It's a static site — copy the **contents** of `portfolio-site/` into your web root and you're done.

```bash
# from your machine (adjust user/host/path to your VPS)
scp -r portfolio-site/* user@your-vps:/var/www/rmportfolio.co.uk/

# or with rsync (nicer for updates)
rsync -av --delete portfolio-site/ user@your-vps:/var/www/rmportfolio.co.uk/
```

Make sure your web server (Nginx/Apache) serves `index.html` from that directory. No PHP/Node/database needed.

> Tip: keep the repo on GitHub and `git pull` on the VPS, or use a deploy hook — then updating the site is one command.

## Add a new case study (e.g. UK Crime)
1. Copy `case-studies/online-retail-ii.html` → `case-studies/uk-crime.html` and edit the text + charts.
2. Put that study's aggregated numbers in `assets/js/` (e.g. `crime-data.js`) and point its page at them.
3. In `index.html`, duplicate the **Online Retail II** card in the `#cases` grid, change the text/links, and flip the "Coming soon" card to live.

That's it — the shared `style.css` keeps everything consistent automatically.

## Data note
`data.js` holds **aggregated** results only (monthly revenue, top products, country totals, RFM segments, cohort retention, returns rate) — not the raw 1.07M rows. Figures are computed with the same logic as the public Kaggle notebook, so the site and the notebook match to the pound (e.g. £19,645,072 product revenue; Champions = 69.2% of revenue).
```
```
