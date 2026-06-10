# Malaria Vaccine Tracker — World Malaria Report 2024 vs 2025 data comparison

**Prepared:** 2026-06-09
**Question:** Is the tracker still on World Malaria Report (WMR) 2024 data, and if so, what would change if we moved to WMR 2025?
**Scope:** Comparison and impact analysis only. **No edits made to the live site / `data/`.**
**Sources:** *World Malaria Report 2025* (WHO, ISBN 9789240117822) narrative PDF + **Annex 4H Excel** (`wmr2025_annex_4h.xlsx`, "Population denominator … and estimated malaria cases and deaths, 2000–2024"). Both committed to `main`. All per-country figures below are read directly from Annex 4H (2024 point estimates).

---

## 1. Verdict: yes, the tracker is still on WMR 2024 (2023 figures)

Every epidemiological input is sourced to **World Malaria Report 2024** (2023 estimates) — explicit in `data/sources.json` (*"World Malaria Report (2024), Annex 4 – F"*, *"cases per year (2023)"*) and embodied in `malariaCasesPerYear`, `malariaDeathsPerYear`, `populationAtRisk` in `data/countries.json`. These three fields drive every burden, impact and cost-effectiveness output in `engine.js`.

**Tracker totals (45 countries, = 2023 / WMR 2024) → refreshed to 2024 / WMR 2025 Annex 4H:**

| | Tracker now (2023) | WMR 2025 (2024) | Change |
|---|--:|--:|--:|
| Total cases/year | 250,906,269 | **270,787,621** | **+7.9%** |
| Total deaths/year | 579,414 | **594,117** | **+2.5%** |
| Total population at risk | 1,193,854,584 | **1,181,698,605** | **−1.0%** |

---

## 2. Global & regional context (WMR 2025)

**Global (Table 2.1):** 2024 = 282M cases / 610k deaths, up from a *restated* 2023 of 273M / 598k.

⚠️ **Baseline restatement:** WMR 2024 originally put 2023 at **263M** cases; WMR 2025 restated 2023 to **273M** (+10M) on revised methodology/denominators. So part of any apparent global jump is a back-revision, not real-world change. The per-country table below avoids this trap — it compares the tracker's actual stored values against the new 2024 column directly.

**WHO African Region (Table 2.4):** 256M→**265M** cases (+3.5%), 567k→**579k** deaths; incidence essentially flat (235.5→237.6 /1000), mortality rate down slightly (52.2→51.9 /100k). *Most of the case rise is population growth, not higher risk per person.* (The tracker's 45-country total exceeds the African-Region figure because it also includes Eastern-Mediterranean countries — Sudan, Somalia, Djibouti.)

---

## 3. Biggest differences after switching — full per-country table

Read directly from Annex 4H (2024 point estimates) vs the tracker's stored 2023 values. Sorted by 2024 case burden.

| Country | Cases 2023 | Cases 2024 | Δ% | Deaths 2023 | Deaths 2024 | Δ% | Pop-at-risk Δ% |
|---|--:|--:|--:|--:|--:|--:|--:|
| Nigeria | 68,136,453 | 68,466,353 | +0.5% | 184,689 | 184,933 | +0.1% | +2.1% |
| DRC | 33,140,568 | 35,175,261 | +6.1% | 67,464 | 67,676 | +0.3% | +3.3% |
| Uganda | 12,572,518 | 13,215,579 | +5.1% | 15,945 | 16,204 | +1.6% | +2.8% |
| **Ethiopia** | 9,559,569 | 12,436,942 | **+30.1%** | 18,567 | 22,360 | +20.4% | **−30.2%** |
| Mozambique | 9,256,415 | 10,219,719 | +10.4% | 17,875 | 17,946 | +0.4% | +3.0% |
| Angola | 8,251,449 | 9,808,643 | +18.9% | 16,169 | 16,385 | +1.3% | +3.1% |
| Tanzania | 8,554,792 | 9,373,891 | +9.6% | 25,540 | 26,062 | +2.0% | +2.9% |
| Côte d'Ivoire | 7,835,921 | 8,556,747 | +9.2% | 10,771 | 10,817 | +0.4% | +2.5% |
| Mali | 8,229,337 | 8,474,969 | +3.0% | 14,203 | 14,239 | +0.3% | +3.0% |
| Burkina Faso | 8,139,355 | 8,324,231 | +2.3% | 16,146 | 16,184 | +0.2% | +2.3% |
| Niger | 7,982,516 | 8,248,768 | +3.3% | 35,381 | 35,478 | +0.3% | +3.3% |
| **Madagascar** | 6,239,943 | 8,165,311 | **+30.9%** | 15,974 | 20,903 | +30.9% | +2.5% |
| Cameroon | 7,343,057 | 7,585,555 | +3.3% | 11,602 | 11,702 | +0.9% | +2.6% |
| Ghana | 6,551,533 | 6,739,843 | +2.9% | 11,464 | 11,635 | +1.5% | +1.9% |
| **Malawi** | 4,810,053 | 6,378,088 | **+32.6%** | 7,376 | 7,501 | +1.7% | +2.6% |
| **Zambia** | 3,662,799 | 5,380,115 | **+46.9%** | 8,525 | 8,682 | +1.8% | +2.9% |
| Benin | 5,127,891 | 5,123,465 | −0.1% | 9,928 | 9,946 | +0.2% | +2.5% |
| **Sudan** | 3,406,260 | 4,956,698 | **+45.5%** | 7,974 | 12,689 | **+59.1%** | +0.8% |
| **Burundi** | 3,354,726 | 4,423,640 | **+31.9%** | 6,302 | 6,389 | +1.4% | +2.6% |
| Guinea | 4,433,772 | 4,221,103 | −4.8% | 10,188 | 10,245 | +0.6% | +2.4% |
| **Kenya** | 3,294,221 | 4,185,536 | **+27.1%** | 11,478 | 11,656 | +1.6% | +2.0% |
| Chad | 3,946,418 | 4,138,603 | +4.9% | 13,707 | 13,862 | +1.1% | +3.9% |
| South Sudan | 2,907,170 | 3,034,559 | +4.4% | 6,671 | 6,749 | +1.2% | +4.0% |
| Sierra Leone | 2,479,839 | 2,442,803 | −1.5% | 6,635 | 6,646 | +0.2% | +2.1% |
| Togo | 2,143,070 | 2,371,693 | +10.7% | 3,456 | 3,486 | +0.9% | +2.3% |
| Central African Republic | 1,574,284 | 1,832,924 | +16.4% | 5,052 | 5,062 | +0.2% | +3.5% |
| Congo-Brazzaville | 1,327,964 | 1,399,717 | +5.4% | 2,244 | 2,283 | +1.7% | +2.4% |
| **Rwanda** | 748,570 | 1,099,728 | **+46.9%** | 3,349 | 3,410 | +1.8% | +2.2% |
| Somalia | 1,081,187 | 1,012,760 | −6.3% | 2,611 | 2,592 | −0.7% | +3.5% |
| Liberia | 1,026,103 | 967,319 | −5.7% | 3,541 | 3,563 | +0.6% | +2.2% |
| **Senegal** | 1,199,388 | 680,515 | **−43.3%** | 3,070 | 1,742 | **−43.3%** | +2.3% |
| Gabon | 569,819 | 474,789 | −16.7% | 433 | 439 | +1.4% | +2.2% |
| Equatorial Guinea | 422,756 | 430,983 | +1.9% | 757 | 769 | +1.6% | +2.4% |
| **Eritrea** | 219,981 | 362,132 | **+64.6%** | 459 | 786 | +71.2% | +1.9% |
| **Mauritania** | 192,584 | 359,550 | **+86.7%** | 493 | 920 | +86.6% | +2.9% |
| Guinea-Bissau | 223,937 | 242,430 | +8.3% | 885 | 897 | +1.4% | +2.2% |
| The Gambia | 236,079 | 208,225 | −11.8% | 632 | 643 | +1.7% | +2.3% |
| **Zimbabwe** | 635,589 | 148,833 | **−76.6%** | 1,627 | 381 | −76.6% | +1.8% |
| Comoros | 21,049 | 54,413 | +158.5% | 53 | 139 | +162.3% | +1.9% |
| Djibouti | 38,944 | 39,523 | +1.5% | 80 | 72 | −10.0% | +1.4% |
| Namibia | 19,376 | 17,315 | −10.6% | 23 | 32 | +39.1% | +2.3% |
| São Tomé and Príncipe | 2,348 | 7,087 | +201.8% | 0 | 1 | (0→1) | +2.0% |
| South Africa | 5,291 | 735 | −86.1% | 64 | 10 | −84.4% | +1.3% |
| Botswana | 778 | 335 | −56.9% | 4 | 1 | −75.0% | +1.6% |
| Eswatini | 597 | 193 | −67.7% | 7 | 0 | −100.0% | +1.0% |

### What the annex reveals that the narrative did not
WHO's report text only named Ethiopia, Madagascar, DRC, Angola, Rwanda and Zimbabwe. The annex shows several **large movers WHO never called out**, which matter for the tracker:

- **Big case increases:** Zambia **+46.9%** (+1.7M), Sudan **+45.5%** (+1.6M), Malawi **+32.6%** (+1.6M), Burundi **+31.9%** (+1.1M), Kenya **+27.1%** (+0.9M) — alongside the expected Ethiopia (+30%), Madagascar (+31%), Rwanda (+47%), Angola (+19%).
- **Big decreases:** Zimbabwe **−76.6%**, South Africa −86%, Eswatini −68%, Botswana −57%, **Senegal −43%**, Gabon −17%, The Gambia −12%.
- **Deaths mostly flat, with sharp exceptions:** Sudan deaths **+59%** (+4.7k), Madagascar **+31%** (+4.9k), Ethiopia **+20%** (+3.8k); Senegal **−43%**, Zimbabwe **−77%**, Mauritania/Eritrea up ~70–87% off small bases.

### Impact on the tracker's outputs
- **Aggregate cases +7.9%, deaths +2.5%** — but the deaths increase is dominated by just Sudan, Madagascar and Ethiopia; for the other ~40 countries deaths move <2%.
- **Cost-per-case-averted** falls (more cost-effective) for the high-incidence risers — Rwanda, Zambia, Madagascar, Ethiopia, Malawi, Sudan, Kenya, Burundi — and rises sharply for Zimbabwe, South Africa, Senegal, Eswatini. Expect visible **re-ranking in the allocator**, mostly on the cases axis.
- **Cost-per-life-saved** is stable for most countries; only Sudan, Madagascar, Ethiopia (up) and Senegal, Zimbabwe, South Africa (down) shift much.
- **Ethiopia is a special case:** its population-at-risk is revised **down 30%** (128.7M→89.8M) while cases rise 30%, so its **incidence per million roughly doubles** — a large swing in any per-capita view.
- **Knock-on data note:** the `sources.json` note `AR35` states *"São Tomé and Príncipe had no recorded malaria deaths in 2024"*, but Annex 4H gives São Tomé a 2024 point estimate of **1 death** — that note (and the resulting "undefined cost to save a life") would need revisiting on refresh.

---

## 4. Bottom line & proposed refresh

1. **Refresh is warranted** — the tracker is one full cycle behind, and the gap is material (+7.9% cases) and very unevenly distributed.
2. **The change is asymmetric:** cases up sharply in ~9 countries (Rwanda, Zambia, Sudan, Malawi, Madagascar, Ethiopia, Burundi, Kenya, Angola) and down sharply in the near-elimination/southern-Africa group (Zimbabwe, South Africa, Eswatini, Botswana, Senegal); deaths broadly stable except Sudan/Madagascar/Ethiopia.
3. **A proposed data refresh has been generated for review** at `reports/countries.WMR2025.proposed.json` — identical schema to `data/countries.json`, with only `malariaCasesPerYear`, `malariaDeathsPerYear` and `populationAtRisk` updated to the Annex 4H 2024 point estimates (all other fields untouched). **This is a staging artifact, not the live data file — no site change has been made.**
4. **Before going live, also refresh** `populationUnderFive` / `birthsPerYear` from the matching UN World Population Prospects revision (Annex 4H only carries population-at-risk), and update the `sources.json` notes from "2023 / Annex 4-F" to "2024 / Annex 4-H", including the São Tomé death note.

---

## Sources

- **WMR 2025 Annex 4H** — `wmr2025_annex_4h.xlsx` (committed to `main`); sheet `ANNEX_H`, 2024 point estimates for cases, deaths and population at risk. Primary source for all per-country figures here.
- **WMR 2025 narrative PDF** — `9789240117822-eng.pdf` (committed to `main`); Table 2.1 (global, p24), Table 2.4 (African Region, p34), pp.34–37.
- [WHO — World malaria report 2025](https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2025) · [Annexes](https://www.who.int/publications/m/item/annexes-world-malaria-report-2025)
- [WHO — World malaria report 2024](https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2024) — current tracker source (2023 figures).
