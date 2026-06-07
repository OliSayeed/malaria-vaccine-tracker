# Malaria Vaccine Tracker — World Malaria Report 2024 vs 2025 data comparison

**Prepared:** 2026-06-07
**Question:** Is the tracker still on World Malaria Report (WMR) 2024 data, and if so, what would change if we moved to WMR 2025?
**Scope of this report:** Comparison and impact analysis only. **No edits made to the site.**

---

## 1. Verdict: yes, the tracker is still on WMR 2024 (2023 figures)

Every epidemiological input in the tracker is sourced to **World Malaria Report 2024**, which reports **2023** estimates. This is unambiguous in the data and its provenance notes:

- `data/countries.json` — the per-country `malariaCasesPerYear`, `malariaDeathsPerYear` and `populationAtRisk` values.
- `data/sources.json` — the headers and notes explicitly cite *"World Malaria Report (2024), Annex 4 – F"* and *"Population at risk (2023)"*, *"Total malaria cases per year (2023)"*, *"Total malaria deaths per year (2023)"*.
- `data/countries.json` was last touched 2026-04-24, but only for name/phase fixes — the epidemiology was uploaded earlier and not refreshed.

These three fields feed essentially every headline output of the model (`engine.js`):

| Field | Used for |
|---|---|
| `malariaCasesPerYear` | cases-per-million, cost-to-avert-a-case, the cap on cases averted, cases-averted totals |
| `malariaDeathsPerYear` | deaths-per-million, cost-to-save-a-life, the cap on lives saved, lives-saved totals |
| `populationAtRisk` | denominator for both per-million incidence/mortality rates |

So a data refresh propagates straight through to the tracker's burden, impact and cost-effectiveness numbers.

**Tracker's current implied totals (sum across its 45 countries, = 2023 / WMR 2024):**

- Total cases/year: **250,906,269**
- Total deaths/year: **579,414**
- Total population at risk: **1,193,854,584**

---

## 2. What WMR 2025 says (2024 figures)

WMR 2025 was published **4 December 2025** and reports **2024** estimates.

| Metric | WMR 2024 (2023) | WMR 2025 (2024) | Change |
|---|---|---|---|
| Global cases | 263 million | **282 million** | +19M vs the 263M headline |
| Global cases (2023, *revised in WMR 2025*) | — | 273 million | WMR 2025 restated 2023 upward to 273M |
| Global deaths | 597,000 | **610,000** | +~12–13k |
| WHO African Region — cases | ~94% (~247M) | **~265 million (94–95%)** | up |
| WHO African Region — deaths | ~95% (~567k) | **~579,000 (95%)** | roughly flat |
| Under-5 share of African deaths | 73.7% (~440k) | ~76% | similar |

**Important methodology caveat:** WMR 2025 revised the *2023* global figure up to ~273M (from the 263M originally published in WMR 2024). So the official "+9 million cases" year-on-year increase is measured against the *revised* baseline. If you compare the number the tracker actually uses (the 263M-era 2023 estimates) against the new 2024 estimates, part of the apparent jump is a **back-revision of methodology/denominators**, not real-world deterioration. A wholesale switch to 2025 data imports both effects at once.

**Where the increase is concentrated** (this is the crux for the tracker):

- **Ethiopia, Madagascar and Yemen together account for 58% of the entire 2023→2024 case increase.**
- Madagascar: **+~1.9 million** cases.
- Ethiopia: reported **>10 million** cases in 2024 (tracker has 9.56M); ~4.4% of African-region cases.
- Deaths, by contrast, are **essentially flat and stably distributed** — see §4.

---

## 3. Biggest differences the tracker would show after switching

### 3.1 Cases rise ~5–6% in aggregate, but very unevenly
The tracker's ~251M total cases (45 countries) would move toward the ~265M WHO African-Region figure — roughly **+14M cases (+5–6%)** in aggregate. But the change is **not spread evenly**: a handful of countries drive almost all of it.

### 3.2 Per-country case movers (the headline story)
Derived WMR 2025 estimates vs the tracker's current values. **Bold = exact WHO-stated figure; others derived from published shares × WHO totals (approximate, pending the Annex 4-H Excel).**

| Country | Tracker cases (2023) | WMR 2025 cases (2024) | Δ cases | Δ % | Basis |
|---|---|---|---|---|---|
| **Ethiopia** | 9,559,569 | ~11.7–12.4M | **+2–3M** | **+22–30%** | "4.4% of region"; press ">10M"; named top driver |
| **Madagascar** | 6,239,943 | ~8.1M | **+1.9M** | **+30%** | WHO-stated +1.9M increase |
| **DRC** | 33,140,568 | ~35.3M | +2.1M | +6.5% | 12.5% of global ×282M |
| **Uganda** | 12,572,518 | **13.6M** | +1.0M | +8.2% | **WHO-stated 13.6M** |
| **Mozambique** | 9,256,415 | ~9.5–10.2M | +0.3–0.9M | +3–10% | 3.6% of global |
| **Nigeria** | 68,136,453 | ~68.5M | ~+0.4M | ~flat | 24.3% of global ×282M |

→ **Ethiopia and Madagascar are the biggest single movers** and would jump noticeably in any "burden" or "cases averted per dose" view. Nigeria — the single largest line in the tracker — is essentially unchanged, which keeps the overall totals from moving more.

### 3.3 Deaths barely move
The WMR 2025 African-Region death total (~579,000) is almost identical to the tracker's current summed deaths (**579,414**), and the country distribution lines up tightly (see §4). **Lives-saved and cost-to-save-a-life outputs would therefore change very little.**

### 3.4 Cost-effectiveness rankings shift toward Ethiopia & Madagascar
In the model, *cost to avert one case* ∝ 1 / case-incidence. Because Ethiopia's and Madagascar's case counts rise sharply while their costs/populations don't, **they become more cost-effective on a cost-per-case-averted basis** and climb the allocator/ranking. *Cost to save a life* (driven by deaths) stays roughly put everywhere. So the **main re-ordering is on the cases axis, concentrated in the surge countries.**

### 3.5 Population-at-risk denominators tick up
WMR 2025 uses newer UN population denominators, so `populationAtRisk` rises modestly with population growth. This slightly **dampens** the per-million incidence/mortality increases (a bigger denominator offsets a bigger numerator), so per-million rates move less than raw counts.

---

## 4. Deaths: distribution is remarkably stable (validation point)

WMR 2025's African-Region death shares, applied to the 579,000 regional total, reproduce the tracker's current death figures almost exactly — evidence the death side needs little change:

| Country | WMR 2025 share | Implied 2024 deaths | Tracker deaths (2023) | Diff |
|---|---|---|---|---|
| Nigeria | 31.9% | ~184,700 | 184,689 | ~0 |
| DRC | 11.7% | ~67,700 | 67,464 | +~240 |
| Niger | 6.1% | ~35,300 | 35,381 | ~0 |
| Uganda | (stated) 16,204 | 16,204 | 15,945 | +259 |

---

## 5. Bottom line / recommendation

1. **Yes — refresh is warranted.** The tracker is a full reporting cycle behind (2023 → 2024 estimates).
2. **The change is asymmetric:** cases up ~5–6% in aggregate and concentrated in **Ethiopia, Madagascar, DRC and Uganda**; **deaths essentially flat**. Expect movement in burden and cost-per-case-averted views, and re-ranking that favours Ethiopia/Madagascar; expect little change in lives-saved / cost-per-life views.
3. **Watch the baseline-revision artifact:** WMR 2025 restated 2023 upward (263M → 273M). When the change is made, pull the **full 2024 column from Annex 4-H**, don't just scale old numbers, and update the source notes from "2023 / Annex 4-F" to "2024 / Annex 4-H".
4. **Companion fields to refresh in the same pass:** `populationUnderFive` / `birthsPerYear` (UN World Population Prospects has a newer revision) and `populationAtRisk` (new denominators), so incidence/mortality rates stay internally consistent.

### Data-quality caveat on this report
This environment's network policy blocks `who.int` / `cdn.who.int` and the mirror PDFs, so I could **not** download the **Annex 4-H Excel** for exact per-country 2024 values. Figures above are either WHO-stated in summary/press coverage (bolded) or derived from published percentage shares × WHO totals (approximate). Before editing the site, the Annex 4-H spreadsheet should be obtained for authoritative per-country numbers.

---

## Sources

- [WHO — World malaria report 2025](https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2025)
- [WHO — Annexes: World malaria report 2025](https://www.who.int/publications/m/item/annexes-world-malaria-report-2025) (Annex 4-H: population denominator, estimated cases and deaths, 2000–2024)
- [WHO — Executive summary, World malaria report 2025](https://www.who.int/publications/m/item/executive-summary-world-malaria-report-2025)
- [UN News — Malaria: Drug resistance and underfunding threaten progress (4 Dec 2025)](https://news.un.org/en/story/2025/12/1166508)
- [Medicines for Malaria Venture — Malaria facts & statistics 2025](https://www.mmv.org/malaria/about-malaria/malaria-facts-statistics-2025)
- [Target Malaria — World Malaria Report 2025](https://targetmalaria.org/latest/news/world-malaria-report-2025/)
- [United to Beat Malaria — 2025 World Malaria Report: What You Need to Know](https://beatmalaria.org/blog/2025-world-malaria-report-what-you-need-to-know/)
- [WHO — World malaria report 2024](https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2024) (current tracker source, 2023 figures)
- [United to Beat Malaria — 2024 World Malaria Report](https://beatmalaria.org/blog/world-malaria-report/)
