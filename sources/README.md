# Source spreadsheets

Reference material the tracker's `data/*.json` is derived from. **Not loaded by
the site** — these live here only for traceability and reproducibility.

- `Malaria vaccine impact by country.xlsx` — original working spreadsheet behind
  the per-country model (the precursor to `data/countries.json`).
- `Seasonality_Dataset_Revised.xlsx` — malaria seasonality reference data (not
  currently used by the model; seasonality is not modelled — see the
  "Limitations" note in the About panel).
- `wmr2025_annex_4h.xlsx` — WHO World Malaria Report 2025, Annex 4-H (2024 point
  estimates for cases, deaths, population at risk). Source for the current
  `malariaCasesPerYear` / `malariaDeathsPerYear` / `populationAtRisk` values.
- `9789240117822-eng.pdf` — WHO World Malaria Report 2025 narrative PDF.

When refreshing data, commit the source file you worked from alongside the JSON
change (see [`../docs/DATA-UPDATE-RUNBOOK.md`](../docs/DATA-UPDATE-RUNBOOK.md)).
Keep large source binaries (annex spreadsheets, report PDFs) here rather than at
the repo root.
