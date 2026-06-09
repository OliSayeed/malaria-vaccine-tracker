# Malaria Vaccine Tracker — World Malaria Report 2024 vs 2025 data comparison

**Prepared:** 2026-06-09
**Question:** Is the tracker still on World Malaria Report (WMR) 2024 data, and if so, what would change if we moved to WMR 2025?
**Scope:** Comparison and impact analysis only. **No edits made to the site.**
**Primary source:** *World Malaria Report 2025* (WHO, ISBN 9789240117822), full PDF committed to `main` as `9789240117822-eng.pdf`. Figures below are cited to specific tables/pages.

---

## 1. Verdict: yes, the tracker is still on WMR 2024 (2023 figures)

Every epidemiological input in the tracker is sourced to **World Malaria Report 2024**, which reports **2023** estimates. This is explicit in `data/sources.json` (*"World Malaria Report (2024), Annex 4 – F"*, *"cases per year (2023)"*, *"deaths per year (2023)"*) and embodied in the `malariaCasesPerYear`, `malariaDeathsPerYear` and `populationAtRisk` fields of `data/countries.json`.

Those three fields drive essentially every output in `engine.js`:

| Field | Drives |
|---|---|
| `malariaCasesPerYear` | cases-per-million, cost-to-avert-a-case, cap on cases averted, cases-averted totals |
| `malariaDeathsPerYear` | deaths-per-million, cost-to-save-a-life, cap on lives saved, lives-saved totals |
| `populationAtRisk` | denominator for both per-million rates |

**Tracker's current implied totals (sum across its 45 countries, = 2023 / WMR 2024):**

- Total cases/year: **250,906,269**
- Total deaths/year: **579,414**
- Total population at risk: **1,193,854,584**

---

## 2. What WMR 2025 reports (2024 figures)

Published 4 December 2025; reports 2024 estimates across 80 endemic countries.

**Global — Table 2.1 (p24):**

| Year | Cases (point) | Deaths (point) |
|---|---|---|
| 2023 *(as restated in WMR 2025)* | 273,000,000 | 598,000 |
| **2024** | **282,000,000** | **610,000** |

**WHO African Region — Table 2.4 (p34)** — this is the relevant universe for the tracker's 45 countries:

| Year | Cases | Deaths | Case incidence /1000 | Mortality /100k |
|---|---|---|---|---|
| 2023 | 256,000,000 | 567,000 | 235.5 | 52.2 |
| **2024** | **265,000,000** | **579,000** | **237.6** | **51.9** |

Two things stand out immediately:
- The African-Region **2024 death total (579,000) is essentially identical to the tracker's current summed deaths (579,414)** — deaths barely move.
- Cases rose **+9M (+3.5%)** region-wide, but **incidence is virtually flat** (235.5 → 237.6 /1000): the case rise is largely population growth, not higher risk per person.

### ⚠️ The 2023 baseline was restated upward
WMR 2024 originally reported **2023 at 263M cases / 597k deaths**. WMR 2025 **restated 2023 to 273M cases** (+10M) on revised methodology/denominators. So when you compare the numbers the tracker *actually uses* (263M-era) against the new 2024 estimates, **roughly half of the apparent global "jump" is a back-revision, not real-world deterioration.** A wholesale switch imports both effects at once — this is the single most important caveat for interpreting the change.

---

## 3. Biggest differences the tracker would show after switching

### 3.1 Cases up ~5–6% in aggregate, concentrated in a handful of countries
The tracker's ~251M cases (45 countries) moves toward the **265M** African-Region 2024 figure — roughly **+14M (+5–6%)**. But WHO is explicit (p24, p34) that the increase is concentrated:

> *"The countries with the largest increases in cases between 2023 and 2024 were Ethiopia (+2.9 million), Madagascar (+1.9 million), the Democratic Republic of the Congo (+762 000), Angola (+420 000) and Rwanda (+351 000). … Zimbabwe reduced cases by 76.6% (–487 000)."* (p34)
>
> *"The countries that saw the biggest increases in incidence were Rwanda (43.8%), Madagascar (27.7%) and Ethiopia (26.7%)."* (p35)

### 3.2 Per-country movers (the headline story)
**Cases:** top-5 derived from WHO African-Region shares × 265M (p34); others from WHO's explicit +/− deltas added to the tracker baseline. **Deaths:** from WHO African-Region death shares × 579,000 (p36) and stated % changes.

| Country | Tracker cases (2023) | WMR 2025 cases (2024) | Δ cases | Basis |
|---|---|---|---|---|
| **Ethiopia** | 9,559,569 | ~12,455,000 | **+30%** (+2.9M) | 4.7% share *and* explicit +2.9M (they agree) |
| **Madagascar** | 6,239,943 | ~8,140,000 | **+30%** (+1.9M) | explicit +1.9M |
| **Rwanda** | 748,570 | ~1,100,000 | **+47%** (+351k) | explicit +351k; incidence +43.8% |
| Mozambique | 9,256,415 | ~10,335,000 | +12% | 3.9% share × 265M |
| DRC | 33,140,568 | ~35,245,000 | +6.4% | 13.3% share (1-yr real change only +762k; rest = restatement) |
| Uganda | 12,572,518 | ~13,250,000 | +5.4% | 5.0% share × 265M |
| Angola | 8,251,449 | ~8,671,000 | +5.1% | explicit +420k |
| Nigeria | 68,136,453 | ~68,370,000 | +0.3% (flat) | 25.8% share × 265M |
| **Zimbabwe** | 635,589 | ~148,600 | **−77%** (−487k) | explicit −487k |

→ **Ethiopia, Madagascar and Rwanda are the big upward movers; Zimbabwe is a dramatic downward mover.** Nigeria — the tracker's single largest line — is essentially flat, which is why the aggregate only moves ~5–6% despite the large country-level swings.

### 3.3 Deaths barely move — lives-saved outputs are stable
Region deaths went 567k → 579k (+2%), and the distribution maps almost exactly onto the tracker's existing death figures:

| Country | WMR 2025 share/Δ | Implied 2024 deaths | Tracker deaths (2023) | Diff |
|---|---|---|---|---|
| Nigeria | 31.9% | ~184,701 | 184,689 | ~0 |
| DRC | 11.7% | ~67,743 | 67,464 | +279 |
| Niger | 6.1% | ~35,319 | 35,381 | −62 |
| Ethiopia | +20.4% | ~22,355 | 18,567 | +3,788 |
| Madagascar | +30.9% | ~20,910 | 15,974 | +4,936 |
| Zimbabwe | −76.6% | ~381 | 1,627 | −1,246 |

So **cost-to-save-a-life and lives-saved outputs change very little** for most countries; only Ethiopia/Madagascar (up) and Zimbabwe (down) move materially.

### 3.4 Cost-effectiveness re-ranks toward Ethiopia, Madagascar, Rwanda
In the model, *cost to avert one case* ∝ 1 / case-incidence. Because incidence jumped in **Rwanda (+43.8%), Madagascar (+27.7%) and Ethiopia (+26.7%)** (p35) while costs/populations didn't, these countries become **more cost-effective** and climb the allocator ranking. **Zimbabwe** moves the opposite way (incidence −76.6%). *Cost to save a life* (deaths-driven) is stable, so the **re-ordering is essentially on the cases axis.**

### 3.5 Incidence is flat, so per-million rates move less than raw counts
Region incidence barely changed (235.5 → 237.6 /1000) and mortality rate fell slightly (52.2 → 51.9 /100k). With refreshed (larger) `populationAtRisk` denominators, the tracker's per-million metrics would move **less** than the raw case counts suggest — most of the case growth is population growth, not rising risk.

---

## 4. Bottom line

1. **Yes — a refresh is warranted.** The tracker is one full reporting cycle behind (2023 → 2024).
2. **The change is asymmetric:** aggregate cases +5–6%, concentrated in **Ethiopia, Madagascar, Rwanda** (up) and **Zimbabwe** (down); **deaths and lives-saved outputs essentially unchanged**; cost-per-case rankings shift toward the high-incidence risers.
3. **Mind the baseline restatement:** WMR 2025 lifted 2023 from 263M → 273M globally. Don't read the full delta as real-world change, and don't scale old numbers — pull the actual 2024 column.
4. **Refresh companion fields in the same pass** (`populationUnderFive`, `birthsPerYear`, `populationAtRisk`) from the newer UN denominators so incidence/mortality rates stay internally consistent.

### Data-completeness note
The committed PDF is the **narrative report**, which provides exact global/regional totals (Tables 2.1, 2.4) and the named per-country changes used above — enough to characterize the *biggest* differences with confidence. It does **not** contain a full 45-country numeric table; the exact per-country 2024 cases/deaths/population-at-risk for every country lives only in the **Excel Annex 4H** (`wmr2025_annex_4h.xlsx`). That spreadsheet is still needed to mechanically regenerate `data/countries.json` for all 45 countries — the figures here for countries WHO does not individually name are derived from regional shares/deltas, not read off the annex.

---

## Sources

- **World Malaria Report 2025 (full PDF), WHO** — committed to repo as `9789240117822-eng.pdf`. Table 2.1 (global, p24), Table 2.4 (WHO African Region, p34), narrative pp.34–37.
- [WHO — World malaria report 2025 (landing page)](https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2025)
- [WHO — Annexes: World malaria report 2025](https://www.who.int/publications/m/item/annexes-world-malaria-report-2025) — Annex 4H (per-country estimated cases & deaths, 2000–2024) needed for a full data refresh.
- [WHO — World malaria report 2024](https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2024) — current tracker source (2023 figures).
