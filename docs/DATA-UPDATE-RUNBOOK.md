# Data update runbook

How to keep the Malaria vaccine impact tracker current. The goal of this
document is that a refresh takes **an afternoon**, not a reverse-engineering
session — for the next maintainer, or for you in a year.

The tracker's outputs are only as fresh as four moving inputs:

| Input | Lives in | Source | Cadence |
|---|---|---|---|
| Malaria **cases, deaths, population at risk** | `data/countries.json` | WHO **World Malaria Report**, Annex 4-H | Annual (WMR drops ~December) |
| **Demographics** (under-5 population, births/year) | `data/countries.json` | UN **World Population Prospects** (via Our World in Data) | Per WPP revision |
| **Shipments** (doses delivered) | `data/shipments.json` | **UNICEF** Supply Division / Gavi shipment reports | Rolling (refresh whenever new reports appear) |
| **Pricing & policy** (dose prices, co-financing, Gavi target %) | `data/config.json` | Gavi / UNICEF / manufacturer announcements | Event-driven |

**Golden rule:** every number you change must be matched by (1) a note in
`data/sources.json` and (2) the user-visible "Data sources" / pricing text in the
About panel of `index.html` (and `allocator.html` where it repeats). Data and
provenance move together, or the tool lies about itself.

---

## A. The annual WMR refresh (the big one)

This is the cases/deaths/population-at-risk update — the inputs that drive every
burden, impact, and cost-effectiveness figure.

### 1. Get the source
- Download the **World Malaria Report** annexes from WHO. The relevant file is
  **Annex 4-H** — *"Population denominator for case incidence and mortality
  rate, and estimated malaria cases and deaths, 2000–2024"* (filename pattern
  `wmrYYYY_annex_4h.xlsx`). Commit it to the repo for traceability.
- Sheet `ANNEX_H` is the human-readable layout (a `Long_Format` sheet also
  exists and is easier to script against). Each country has rows per year and
  columns **Population at risk · Cases (Lower/Point/Upper) · Deaths
  (Lower/Point/Upper)**.

### 2. Map the columns to JSON fields
For each of the 45 countries, take the **most recent year's Point estimate**:

| `countries.json` field | Annex 4-H column |
|---|---|
| `malariaCasesPerYear` | Cases → **Point** |
| `malariaDeathsPerYear` | Deaths → **Point** |
| `populationAtRisk` | Population at risk |

Leave all other fields (`gaviGroup`, `pmiFunding`, `populationUnderFive`,
`birthsPerYear`, `annualGrowthRate`) untouched — those come from other sources
(see §B). Watch the country-name mapping: the tracker uses short names
(`DRC`, `Congo-Brazzaville`, `Côte d'Ivoire`, `The Gambia`,
`São Tomé and Príncipe`) that differ from the annex's official names.

### 3. Update provenance
- In `data/sources.json`, bump every WMR citation from the old cycle to the new
  one (e.g. `"World Malaria Report (2024), Annex 4 – F"` →
  `"... (2025), Annex 4 – H"`, `"cases per year (2023)"` → `"... (2024)"`).
- In `index.html` (and `allocator.html`), update the matching "Data sources"
  line and any "20XX baseline demographics" wording.

### 4. Mind these gotchas (all seen in the 2024→2025 cycle)
- **Baseline restatements.** WHO routinely *revises prior years* on new
  methodology (the 2023 global figure was restated +10M between WMR 2024 and
  2025). Compare the tracker's stored values against the **new report's current
  column**, not against last year's headline — otherwise you'll double-count a
  back-revision as real change.
- **Zero-death edge cases move.** A country with 0 estimated deaths produces an
  *undefined* "cost to save a life". This flag migrates between countries each
  cycle (in 2024→2025 it moved from São Tomé → Eswatini). Grep
  `sources.json` for any zero-deaths note and re-point it.
- **Population-at-risk can swing hard.** Ethiopia's was revised **down ~30%**
  while cases rose — doubling its per-capita incidence. Don't assume
  population-at-risk only drifts; sanity-check large movers.
- **Region mismatch is expected.** The 45-country total exceeds the WHO African
  Region figure because the tracker also includes Eastern-Mediterranean
  countries (Sudan, Somalia, Djibouti). Not a bug.

### 5. Write it up
Add a short comparison note under `reports/` (see
`reports/WMR-2025-data-comparison.md` for the template): aggregate deltas, the
biggest per-country movers, and anything the WHO narrative didn't call out.
This is the artefact that makes next year's refresh fast.

---

## B. Demographics refresh (under-5 population & births)

`populationUnderFive` and `birthsPerYear` come from **UN World Population
Prospects** (via Our World in Data's "Under 5 years" population table), *not*
from the WMR. `birthsPerYear` is currently approximated as
`populationUnderFive / 5`.

These should be refreshed from the WPP revision that **matches the WMR burden
year**, so demographics and burden line up. Note that `engine.js` has
`DEMOGRAPHIC_BASE_YEAR` — if you move the demographic base year, update that
constant too, and re-check the projection logic. (In the 2024→2025 burden
refresh this was *deliberately left on 2023* because the demographics weren't
moved at the same time — a known follow-up, not an oversight.)

---

## C. Shipments refresh

`data/shipments.json` is a flat list of records:
`{ country, vaccine, financing, date, doses, status }`. Source is **UNICEF
Supply Division / Gavi** shipment reporting.

- Append new shipments; correct any previously estimated ones.
- Update the "Shipment data up to date as of <month>" line in the About panel.
- `status` may be `Delivered` or pending; the engine also treats any past-dated
  shipment as delivered (see `isDelivered()` in `engine.js`).

---

## D. Pricing & policy refresh (`config.json`)

Event-driven, not annual. Update when prices or Gavi policy change, and always
update the matching note in `sources.json` + the About panel pricing/co-financing
tables:

- `pricing.R21`, `pricing.RTS,S` — dose prices (USD).
- `gaviTargetPct` — Gavi's funded share of children in moderate/high-transmission
  areas (0.85 pre-2026; 0.70 under Gavi 6.0). See the year-aware draft in
  `drafts/gavi6-cost-model-draft.js` and the eligible-population draft in
  `drafts/map-target-population-draft.js`.
- `efficacy.*`, `completionRates.*` — only if new clinical/roll-out evidence
  lands.

---

## E. Ship it — verification checklist

After any data change:

- [ ] All 45 countries still present in `countries.json`; numbers are **Point**
      estimates, not Lower/Upper.
- [ ] `data/sources.json` citations updated to the new cycle/year.
- [ ] About panel in `index.html` (+ `allocator.html`) updated: data-source
      lines, year wording, pricing/co-financing tables.
- [ ] Zero-deaths "undefined cost-to-save-a-life" note points at the right
      country for this cycle.
- [ ] Serve locally (`python3 -m http.server`) and click through: impact view,
      needs/coverage view, the allocator, and the JSON export.
- [ ] Bump the `?v=YYYYMMDDx` cache-busting suffix on the `engine.js`/`app.js`
      tags in `index.html` so visitors don't get a stale build.
- [ ] Commit the source `.xlsx` alongside the JSON change for traceability, and
      add/append a `reports/` note for a burden refresh.
- [ ] Confirm the deploy: the live site is GitHub Pages served from the
      **default branch (`main`)** — merge there for the update to go live, then
      check the Pages build actually rebuilt (the About panel should show the new
      vintage).

---

## Quick reference: source links

- WHO World Malaria Report (+ annexes): https://www.who.int/teams/global-malaria-programme/reports
- UN World Population Prospects (via OWID): https://ourworldindata.org/explorers/population-and-demography
- Gavi eligibility / co-financing: https://www.gavi.org/types-support/sustainability/eligibility
- PMI annual report: https://www.pmi.gov
- Malaria Atlas Project (for the moderate/high-transmission eligible-population
  work, still outstanding): https://malariaatlas.org
