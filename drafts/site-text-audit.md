# Site Text Audit — Malaria Vaccine Impact Tracker

All user-visible text on the site, organised by location.
Review for correctness, then delete this file.

---

## Page metadata

- **Title:** Malaria vaccine impact tracker
- **Meta description:** Real-time tracker estimating the impact of RTS,S and R21 malaria vaccine rollouts across Africa — cases averted, lives saved, and coverage gaps.

---

## Navigation / top controls

- **Display dropdown:** Live trackers · Trends · Country rankings · Maps · Country profiles · Vaccination needs · Shipments
- **Country/region label:** "Country/region" — default "Africa (total)"
- **Share button:** "Copy share link" — status messages: "Link copied" / "Copy failed — copy URL from browser bar"

### Metric dropdown (Trends + Rankings)
- Doses administered (est.)
- Children vaccinated (est.)
- Cases averted (est.)
- Lives saved (est.)
- PMI funding (USD)
- Malaria cases/year
- Malaria deaths/year
- Coverage % (est.)
- Population at risk
- Children under 5

### Range dropdown (Trends only)
- Last six months · Last year · Last two years · All available

### Gavi group filter (Rankings only)
- All countries · Initial self-financing · Preparatory transition · Accelerated transition · Fully self-financing

### Sort (Rankings only)
- Largest first · Smallest first

### Course completion (shared across views)
- Average · Optimistic · Pessimistic

### Roll-out length (Trends/Trackers)
- Six months · One year

### Vaccine filter (Trends, dose metrics only)
- Both vaccines · R21 only · RTS,S only

### Buttons
- "Compare countries" / "Comparing N countries"
- "Select countries" / "N countries selected"

---

## Live Trackers view

- **Heading:** Malaria vaccine impact tracker
- **Dose completion label:** Dose completion — Average / Optimistic / Pessimistic
- **Roll-out period label:** Roll-out period — Six months / One year
- **Counter 1:** "Total cases averted" [Estimated] — countdown: "X to next case averted"
- **Counter 2:** "Total lives saved" [Estimated] — countdown: "X to next life saved"
- **Shipments blurb (dynamic):** "Most recent delivery: [month] ([doses] doses of [vaccine] to [country])" / "Next delivery: ..." / "No shipment data"
- **Loading state:** "Loading…"
- **Error state:** "Load error"
- **No-data state:** "No data"

---

## Trends view

- **Data window (dynamic):** "Data available since [month] ([N] months)"
- **Metric hint (dynamic):** "Doses administered apply rollout timing assumptions."
- **Y-axis label (dynamic):** matches metric name (e.g. "Doses administered", "Lives saved")
- **X-axis label:** "Month"
- **Empty state:** "No data for selected range."
- **Download buttons:** "Download chart" · "Download data (CSV)"

---

## Country Rankings view

- **Chart title (dynamic):** matches metric name
- **Tooltip (dynamic):** "[Country name]" + formatted value
- **Download buttons:** "Download chart" · "Download data (CSV)"

---

## Maps view

- **Metric dropdown:** Gavi financing group · Coverage % (est.) · Doses administered (est.) · Population at risk · Malaria cases/year · Malaria deaths/year
- **Age window (coverage only):** 6–60 months · 5–36 months
- **Course completion (coverage only):** Average · Optimistic · Pessimistic
- **Instructions:** "Click a country to see its vaccination trends. Hover for details. Grey countries have no malaria vaccine data."
- **Source note:** "Data sources: WHO, UNICEF, Gavi. See About the model."
- **Tooltip (dynamic):**
  - "Gavi group: [group]"
  - "Coverage: [X]%"
  - "Doses administered: [N]"
  - "Population at risk: [N]"
  - "Malaria cases/year: [N]"
  - "Malaria deaths/year: [N]"
  - "No data" (for grey countries)
- **Download buttons:** "Download chart" · "Download data (CSV)"

---

## Country Profiles view

- **Filters:** Gavi group · Age window (6–60 / 5–36 months) · Vaccine price (R21 $2.99/dose / RTS,S $9.81/dose) · Course completion
- **Instructions:** "Click column headers to sort"
- **Export buttons:** "Export CSV" · "Export Excel"
- **Summary (dynamic):** "[N] countries receiving vaccines | [X] of [Y] eligible children protected"
- **Table headers:** Country · Gavi · Eligible [Source] · Births/yr [Source] · Protected [Est.] · Coverage [Est.] · $/Life [Est.] · $/Case [Est.] · Deaths/yr [Source]
- **Empty state:** "No data available"

---

## Vaccination Needs view

- **Filters:** Age window · Vaccine price · Course completion · Projection year
- **Methodology note:** "Methodology: Uses completion rates, dose reallocation, and projection-year demographics."
- **Demographic basis (dynamic, several variants):**
  - "[year] country-level yearly projections."
  - "[year] growth projection from [base year] baseline under-5 population and births, using country-specific growth rates (World Bank 2021-2023 average; default [X]% when missing)."
  - "[year] mixed sources ([N] countries with yearly projections, [N] using growth fallback)."
  - "[year] projection assumptions."

### Cards
1. **Coverage gap** [Estimated]: "[N] children not yet vaccinated" / "[X] of [Y] fully vaccinated ([Z]%)" / "Note: more doses allocated than eligible children ([X]% of eligible population)"
2. **Catch-up doses needed** [Estimated]: "[N] doses to close the gap" / "Estimated cost: [$$] at $[X]/dose"
3. **Annual maintenance** [Estimated]: "[N] doses per year for new births" / "[N] births/year = [$$]/year"
4. **Cost-effectiveness** [Estimated]: "[$$] per life saved (1-year estimate)" / "[$$] per case averted"

### Country comparison table
- **Note:** "Defaults are preselected to show how comparison works. Use 'Select countries' to customize."
- **Heading:** "Compare selected countries"
- **Buttons:** "Select countries" · "N selected" · "Export CSV" · "Export Excel"
- **Table headers:** Country · Coverage gap · Coverage % · Catch-up doses · Annual doses · $/life · $/case
- **Empty state:** "No countries selected"

### Needs chart
- **Compare by:** Coverage gap · Cost per life saved · Eligible population · Doses needed
- **Show:** Top 10 · Top 15 · All countries
- **Download buttons:** "Download chart" · "Download data (CSV)"

---

## Shipments view

- **Filters:** Status (All shipments / Delivered only / Forecast only / Purchased only) · Vaccine (Both / R21 / RTS,S)
- **Instructions:** "Click column headers to sort"
- **Export buttons:** "Export CSV" · "Export Excel"
- **Summary (dynamic):** "[N] shipments shown | [X] total doses ([Y] delivered, [Z] scheduled)"
- **Table headers:** Date [Source] · Country · Vaccine · Doses [Source] · Children [Est.] · Financing · Status · Efficacy [Est.]
- **Efficacy badges:** "[X]%" (colour-coded) or "N/A" for undelivered
- **Empty state:** "No shipments found"

---

## Country Picker modal

- "Select countries to compare"
- "Select all" · "Clear all"
- "[N] selected"
- "Apply selection"

---

## Info Panel ("About the model")

### How the model works
This tracker estimates how vaccine deliveries translate into doses administered, children fully vaccinated, and the downstream impact on malaria cases and deaths. It combines shipment timing, completion rates, and efficacy waning to model protection over time.

All calculations are client-side and use the data files bundled with this site. You can explore assumptions in the sections below and switch scenarios using the controls on each view.

### Vaccine efficacy curves
The model accounts for waning vaccine efficacy over time. Efficacy data comes from clinical trials: RTS,S Clinical Trials Partnership (2015) and Datoo et al. (2024).

- R21 (starts at 75%)
- RTS,S (starts at 56%)

### Model assumptions
- Doses per child: 4 (3 primary doses + 1 booster at 12 months)
- Roll-out model: Linear ramp-up over 6 or 12 months (configurable)
- Dose timing: Dose 2 at +1 month, dose 3 at +2 months, dose 4 at +14 months after dose 1
- Efficacy curve: Flat at initial level until year 1, then linear decay through data points, then exponential extrapolation
- 3-dose efficacy: Same as 4-dose until year 1, then shifted: E₃(t) = E₄(t+1)
- Dose reallocation: Unused doses from children who do not complete the course are reassigned over time to vaccinate additional children.
- Age eligibility: 5–36 months follows WHO-recommended introduction ages (WHO position paper); 6–60 months is an explicit sensitivity scenario using under-5 month-share fractions (54/60 and 31/60).

### Assumption provenance (sourced vs model choices)
- Sourced: Vaccine efficacy points and completion-rate scenario anchors come from cited studies/program reports in this panel.
- Sourced: Country growth rates used for projection are from World Bank SP.POP.GROW (2021-2023 averages).
- Sourced/derived: Age-window fractions are arithmetic from the defined month ranges over the under-5 denominator (6–60 months = 54/60; 5–36 months = 31/60), with the 5–36 policy window taken from the WHO position paper.
- Model choice: 6- and 12-month linear roll-out options are scenario assumptions for planning and comparison.

### Dose completion rates
Not all children who receive a first dose complete the full four-dose course. The model supports three scenarios based on real-world data:

| Scenario | Dose 2 | Dose 3 | Dose 4 | Source |
|---|---|---|---|---|
| Optimistic | 90% | 88% | 71% | South Sudan R21 roll-out (WHO AFRO) |
| Average | 73% | 61% | 39% | Mid-point between optimistic and pessimistic scenarios |
| Pessimistic | 56% | 34% | 8% | Malawi RTS,S MVIP (WHO evidence report) |

Dose reallocation: When children drop out, their unused doses are reallocated to future children. This means more children can be fully vaccinated from the same number of doses than if no reallocation occurred.

### Dose flow summary
For every 100 children who start vaccination (Average scenario):

- **Dose 2:** [X] children ([X]%) continue
- **Dose 3:** [X] children ([X]%) continue
- **Dose 4:** [X] children ([X]%) complete the full schedule
- **Dropout before dose 4:** [X] children ([X]%)
- **Extra starts from reallocation:** +[X] children ([X]% of the starting cohort)

### Vaccine pricing

| Vaccine | Price per dose | Cost per child (4 doses) |
|---|---|---|
| R21 | $2.99 | $11.96 |
| RTS,S | $9.81 | $39.24 |

Prices from Duncombe, Elabd and Sandefur (2024)

### Gavi co-financing
Countries contribute to vaccine costs based on their Gavi eligibility phase:

| Phase | Co-financing |
|---|---|
| Initial self-financing | Flat $0.20 per dose |
| Preparatory transition | $0.20/dose + 30% increase per year |
| Accelerated transition | 20% of dose price + 10 points per year |
| Fully self-financing | 100% of dose price |

### Data sources
- Shipment data: UNICEF Supply Division shipment reports, WHO AFRO malaria updates
- Population data: UN World Population Prospects (2024) via Our World in Data
- Malaria burden: WHO World Malaria Report (2024), Annex 4-F
- Gavi eligibility: Gavi eligibility list
- PMI funding: PMI Annual Report, April 2024
- Efficacy data: RTS,S Clinical Trials Partnership (2015), Datoo et al. (2024)

**Download all source data (JSON)** — status: "Preparing download…" / "Downloaded." / "Download failed. Please try again."

### Understanding the numbers
This tracker shows two types of data:

- **Sourced:** Data from official sources (shipments, population, malaria burden)
- **Estimated:** Model outputs based on assumptions (cases averted, lives saved, doses administered)

### How projection year works (Needs view)
- Selector behavior: The Projection year dropdown selects the demographic basis year used for eligible-population and annual-maintenance calculations in the Needs view.
- Year bounds: Years are clamped to the supported model window (currently 2025-2030).
- Primary source: If a country has yearly demographic rows in the data table, the model uses the nearest available table year for that country.
- Fallback source: If yearly rows are unavailable, the model compounds each country's annual growth rate from the 2023 baseline under-5 population and births (rates sourced from World Bank SP.POP.GROW, using 2021-2023 averages).
- Why 0.0% for now: Country rates are sourced from World Bank annual population growth data (SP.POP.GROW) averaged across 2021-2023.
- Transparency: The "Demographic basis" line in Needs reports whether the current estimate is table-based, growth-fallback, or mixed across countries.

### Limitations & caveats
- Administration timing: The model assumes linear roll-out of doses over 6-12 months. Actual timing varies by country and may be faster or slower.
- Completion rates: Based on limited real-world data from early roll-outs. Rates may improve as programs mature.
- Efficacy extrapolation: Long-term efficacy (beyond clinical trial follow-up) is extrapolated and uncertain.
- Uniform efficacy: The model assumes vaccine efficacy is the same across all countries. Real-world efficacy may vary by malaria transmission intensity.
- No seasonality: Malaria transmission seasonality is not modeled; incidence is treated as uniform throughout the year.
- Data lag: Shipment data may be behind real-world deliveries. Some shipments may not be publicly reported.
- Wastage: The model does not account for vaccine wastage.

These estimates are useful for understanding scale and progress, but should not be used for precise policy decisions without additional analysis.

### About this tool
This tracker was built by Ollie Sayeed using GPT-5 and Claude Code to make malaria vaccine progress transparent and accessible.

The code is open source and available on GitHub. Feedback, corrections, and contributions are welcome.

Shipment data up to date with public information as of February 2026. Source: UNICEF Gavi shipment reports.

---

## Tooltip definitions (info buttons throughout the site)

### Current efficacy
Average vaccine efficacy across the cohort, accounting for the linear roll-out of doses and waning efficacy over time.

Efficacy is flat at the initial level (75% for R21, 56% for RTS,S) until year 1, then decays according to clinical trial data.

Children who complete only 3 doses (no booster) have faster-waning efficacy: their protection at time t equals 4-dose efficacy at time t+1.

### Dose completion rates
Not all children who start vaccination complete all four doses. This setting adjusts the impact estimates based on real-world completion data.

- Optimistic: 71% complete all four doses (South Sudan R21 roll-out)
- Average: 39% complete all four doses (estimated mid-point)
- Pessimistic: 8% complete all four doses (Malawi RTS,S MVIP)

The model accounts for dose reallocation: when children drop out, their unused doses are given to other children, creating cascading generations with delayed start times.

### Roll-out period
The time it takes for a shipment of vaccines to be fully administered. First doses are spread linearly over this period.

- Six months: optimistic roll-out assumption.
- One year: more conservative assumption.

Third doses occur 2 months after first doses, so protection starts building between month 2 and month 8 (for 6-month roll-out) or month 2 and month 14 (for 12-month roll-out).

### Coverage percentage
Percentage of eligible children in the selected age window who have completed the full four-dose vaccination course.

Default age window is 5–36 months (WHO recommendation). The 6–60 months option includes older children.

This accounts for dose completion rates and reallocation: when children drop out, their unused doses are given to other children.

### Cost per life saved
Estimated cost to save one life through vaccination, calculated as: (cost per child) ÷ (deaths averted per child per year).

Based on country-specific malaria mortality rates and vaccine efficacy at 1 year. Countries with higher malaria burden have lower cost per life saved.

This is a theoretical estimate and actual cost-effectiveness may vary based on implementation factors.

### Cases averted
Estimated malaria cases prevented by vaccination. For each shipment, the model calculates: number of protected children × country-specific malaria incidence rate × time-weighted vaccine efficacy × time since vaccination.

The model accounts for dose reallocation: unused doses from children who fail to complete the four-dose course can be used to vaccinate additional children.

### Lives saved
Estimated malaria deaths prevented by vaccination. For each shipment, the model calculates: number of protected children × country-specific malaria mortality rate × time-weighted vaccine efficacy × time since vaccination.

The model assumes vaccine efficacy against death equals efficacy against clinical malaria. Mortality rates are sourced from the WHO World Malaria Report 2024.

### Doses delivered
Total vaccine doses that have been shipped to countries. This is sourced data from UNICEF Supply Division and WHO.

The model assumes a delay between delivery and administration. Some doses may be lost to wastage.

### Doses administered
Estimated number of doses given to children, based on the delivery date and roll-out period assumption.

The model assumes doses are administered with a linear ramp-up from 0% to 100% over the roll-out period (six or twelve months).

This is an estimate — actual administration data is not always publicly available in real-time.

### Children vaccinated
Estimated number of children who have completed the full four-dose vaccination course.

Calculation: (doses administered ÷ 4) × dose-4 completion rate.

The completion rate varies by scenario (Optimistic: 71%, Average: 39%, Pessimistic: 8%). The model accounts for dose reallocation: unused doses from children who fail to complete the four-dose course can be used to vaccinate additional children.

### Needs methodology
Coverage gap = eligible children in the selected age window who have not completed all 4 doses.

Dose reallocation: unused doses from children who do not complete the full course are reassigned to other children over time.

Demographics: the selected projection year uses country-level yearly rows when available; otherwise country-specific growth rates from World Bank SP.POP.GROW (2021-2023 average) with a 0.0% carry-forward fallback when missing.

### Map metrics
- Gavi financing group: A country's status in Gavi's co-financing system, determining how much they pay for vaccines.
- Coverage %: Percentage of eligible children in the selected age window who have completed full vaccination. Use the Age window dropdown to switch between 5–36 and 6–60 months.
- Other metrics: Population at risk, malaria cases, and deaths are sourced from the WHO's World Malaria Report.

---

## Footer

Built by Ollie Sayeed using GPT-5 and Claude Code

About the model · View on GitHub · Shipment data current as of February 2026 · UNICEF source

This tool provides estimates based on published data and modeling assumptions. All estimates should be interpreted with caution. See "About the model" for methodology and data sources.

---

## Error / status messages

- "We could not load the data files. Please refresh or try again later."
- "Map data is temporarily unavailable. Other views continue to work."
- "No African features found in GeoJSON source"
- "App initialized with local data engine" (console only)

---

## Exported file names

- `malaria_vaccine_tracker_data_[date].json`
- `malaria_vaccine_[metric]_[region].png`
- `malaria_vaccine_[metric]_[region]_data.csv`
- `malaria_vaccine_compare_[metric].png`
- `malaria_vaccine_compare_[metric]_data.csv`
- `malaria_vaccine_needs_[metric].png`
- `malaria_vaccine_needs_[metric]_data.csv`
- `malaria_vaccine_countries.csv`
- `malaria_vaccine_shipments.csv`
- `malaria_vaccine_needs_comparison.csv`

---

## CSV/Excel column headers

### Countries export
Country, Gavi group, Eligible population, Births/year, Children vaccinated, Coverage %, Cost per life saved, Cost per case averted, Malaria deaths/year

### Shipments export
Date, Country, Vaccine, Doses, Children (est.), Financing, Status, Effective status, Current efficacy %

### Needs comparison export
Country, Coverage gap, Coverage %, Catch-up doses, Annual doses, Cost per life saved (USD), Cost per case averted (USD)
