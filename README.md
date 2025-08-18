# SecOps Lite — Incident & Access Review Toolkit

Working, client-side demo (no backend). Data stays in the browser (`localStorage`).

## Features
- **Dashboard**: Open incidents, MTTA/MTTR, severity chart (Chart.js)
- **Incidents**: triage/logbook with ack/resolved/evidence; CSV/JSON export; **PDF report**
- **Access Review**: checklist with owner/due; persistent
- **Log Parser**: paste logs + regex/text filter
- **PWA**: service worker caching (offline-friendly)
- **Sample Data**: About → “Load Sample Data”

## Deploy on GitHub Pages
1) Public repo → upload files to **root**  
2) Settings → **Pages** → Source: **Deploy from a branch** (main / root)  
3) Ensure a **`.nojekyll`** empty file exists in repo root  
4) Site: `https://<username>.github.io/<repo>/`

## PIPEDA PDF
Place your PDF at `docs/PIPEDA_Quick_Check_David_Ok_v1.1.pdf`.  
About tab has a button to open it.

## Notes
- To force updates, bump `CACHE` in `sw.js` and use `?v=` on CSS/JS.
- Clear site data or unregister SW to hard-refresh.
