# Malaria vaccine impact tracker

A browser-based tool that models the impact of the malaria vaccine roll-out
(R21/Matrix-M and RTS,S/AS01) on malaria cases and deaths across 45 endemic
countries — starting from each real vaccine shipment, applying waning
clinical-trial efficacy, and estimating cases averted, lives saved, coverage
gaps, and cost-effectiveness.

It is a **static site** with no build step and no backend: all calculations run
client-side from the JSON data files bundled in `data/`.

> Built by Ollie Sayeed using GPT-5 and Claude Code. Feedback, corrections, and
> contributions are welcome — oliver.sayeed@1daysooner.org.

---

## Running it locally

Because the app loads its data with `fetch('data/*.json')`, you must serve it
over HTTP — opening `index.html` directly via `file://` will fail (the browser
blocks the fetches). Any static server works:

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

No dependencies, no `npm install`, no compilation. Edit a file, refresh the page.

> Note: `index.html` references scripts with a cache-busting query string
> (`engine.js?v=YYYYMMDDx`). Bump that suffix when you ship JS/CSS changes so
> returning visitors don't get a stale cached copy.

---

## How the pieces fit

| File | Role |
|---|---|
| `index.html` | Main UI — the impact tracker, charts, and the "About the model" panel (methodology, assumptions, and data-source citations live inline here). |
| `allocator.html` | Secondary, self-contained tool for exploring dose allocation. Has its own inline script that mirrors the engine's dose-accounting logic. |
| `engine.js` | **The model.** An IIFE exposing the global `VaccineEngine`. Owns all the maths: demographics, eligible population, efficacy/waning curves, completion + dose-reallocation, impact (cases/lives), coverage needs, and costs. No DOM. |
| `app.js` | **The UI layer.** Loads the data, wires up controls/scenarios, and calls `VaccineEngine.*` to render views, charts, tables, and the data export. Loaded after `engine.js`. |
| `app.css` | Styles. |
| `data/*.json` | All inputs (see below). The site reads these at runtime; nothing is hard-coded in the JS. |
| `drafts/` | Non-production modelling drafts (e.g. the Gavi 6.0 cost model, the MAP target-population schema). **Not loaded by the live site.** |
| `reports/` | Analysis write-ups (e.g. the WMR 2024→2025 data-comparison and refresh log). |
| `*.xlsx` (root) | Source spreadsheets some JSON is derived from. Reference material, not loaded by the site. |

### The data files (`data/`)

- **`countries.json`** — one object per country (45 total): Gavi income group,
  PMI funding, population at risk, under-5 population, malaria cases/deaths per
  year, births/year, and a population-growth fallback. These epidemiological
  fields drive every burden, impact, and cost output.
- **`shipments.json`** — one record per vaccine shipment (`country`, `vaccine`,
  `financing`, `date`, `doses`, `status`). The roll-out timeline the model
  integrates over.
- **`config.json`** — model parameters: efficacy curves, dose-completion
  scenarios, roll-out months, dose timing, pricing, doses per child,
  `gaviTargetPct`, and age-group windows.
- **`sources.json`** — **the provenance source-of-truth.** Per-field headers and
  citation notes (which report, which annex, which year). When you change a
  number, update its note here. The "Data sources" list in the About panel
  should always agree with this file.

> **Where to check the current data vintage:** `data/sources.json` and the
> "Data sources" section of the About panel in `index.html`. Don't assume a year
> from this README — those two are authoritative.

---

## Updating the data each cycle

The single biggest maintenance risk for this tool is **staleness** — the
epidemiological inputs lag the latest WHO/UNICEF releases by up to a year. The
step-by-step process for a refresh (with the WMR 2024→2025 cycle as a worked
example) lives in:

**→ [`docs/DATA-UPDATE-RUNBOOK.md`](docs/DATA-UPDATE-RUNBOOK.md)**

Read that before touching `data/`. It covers where each source comes from, how
the `.xlsx` annexes become the JSON fields, and a copy-paste checklist.

---

## Contributing

Corrections and contributions are welcome. Practical notes:

- **Keep data and provenance in lockstep.** Any change to a number in
  `data/countries.json` (or pricing/assumptions in `config.json`) must be
  matched by a note in `data/sources.json` and, where user-visible, the About
  panel in `index.html`.
- **Model logic lives in `engine.js`**, presentation in `app.js`. Try not to put
  calculations in the UI layer.
- **Drafts go in `drafts/`** until they're wired in — see `drafts/README.md`.
- Test by serving locally and clicking through the main views and the allocator.
  There is no UI test suite, but two scripts guard the important bits:
  - `python3 scripts/validate-data.py` — after any change under `data/`. Checks
    parsing, country count, shipment cross-references, dates/doses, and
    `lastUpdated`. Exits non-zero on problems.
  - `node scripts/snapshot-test.js` — golden-master regression on the model
    outputs (Africa-total + representative countries × each completion
    scenario). After an **intentional** code or data change, regenerate with
    `--update`. A failure with unchanged data means the model's numbers moved.

---

## Licensing

This repository mixes original code with third-party data, which are **not**
under the same terms — please respect the distinction:

- **Code** (`engine.js`, `app.js`, `app.css`, the HTML, and other original
  source) — **MIT**, see [`LICENSE`](LICENSE).
- **Data** (`data/*.json` and the source `.xlsx` files) — derived from
  third-party sources that retain their own licences, including the **WHO World
  Malaria Report** (WHO content is generally CC BY-NC-SA 3.0 IGO — note the
  **non-commercial** term), **UNICEF Supply Division** shipment reports,
  **Gavi**, **PMI**, **UN World Population Prospects**, and clinical-trial
  publications. See `data/sources.json` for per-field provenance. The original
  *curation and compilation* in this repo (the structuring into JSON) may be
  reused under **CC BY 4.0**, but the underlying figures remain governed by
  their original sources' terms.

> The MIT `LICENSE` file is intended to cover the **code**. If you want the data
> note above to be binding, confirm the WHO/UNICEF terms for your use case
> before relying on it — the WHO non-commercial clause in particular may matter.
