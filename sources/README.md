# Source spreadsheets

Reference material the tracker's `data/*.json` is derived from. **Not loaded by
the site** — these live here only for traceability and reproducibility.

- `Malaria vaccine impact by country.xlsx` — original working spreadsheet behind
  the per-country model (the precursor to `data/countries.json`).
- `Seasonality_Dataset_Revised.xlsx` — malaria seasonality reference data (not
  currently used by the model; seasonality is not modelled — see the
  "Limitations" note in the About panel).

When refreshing data, commit the source file you worked from alongside the JSON
change (see [`../docs/DATA-UPDATE-RUNBOOK.md`](../docs/DATA-UPDATE-RUNBOOK.md)).
The WMR annex and any large report PDFs belong here too rather than at the repo
root.
