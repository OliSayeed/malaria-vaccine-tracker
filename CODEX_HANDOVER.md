# Malaria Vaccine Tracker - Codex Handover Report

**Last updated:** February 2026
**Prepared by:** Claude (Opus 4.5)

---

## Project Overview

This is a web-based malaria vaccine impact tracker that visualizes the rollout of RTS,S and R21 malaria vaccines across Africa. It displays real-time estimates of cases averted and lives saved, along with various analytical views including trends, country comparisons, maps, and vaccination needs analysis.

The site is entirely client-side (no backend server) and uses vanilla JavaScript with HTML5 Canvas for charts. Data is stored in JSON files.

---

## File Structure

```
malaria-vaccine-tracker/
├── index.html          # Main HTML structure, all views, tooltip templates
├── app.js              # Main application logic (~2500 lines)
├── engine.js           # VaccineEngine module - calculations and data access (~1200 lines)
├── app.css             # All styles (~1100 lines)
└── data/
    ├── countries.json  # 45 African countries + "Total" row with demographics
    ├── shipments.json  # 130 vaccine shipments with dates, doses, status
    ├── config.json     # Efficacy curves, completion rates, pricing, dose timing
    └── sources.json    # Data source citations and notes
```

---

## Architecture

### Data Flow

1. **On page load:** `engine.js` fetches all JSON files and initializes the `VaccineEngine` module
2. **VaccineEngine** provides:
   - Raw data access (`getAllCountries()`, `getCountryList()`)
   - Calculations (`getTotals()`, `getCoverageGap()`, `getCostEffectiveness()`)
   - Time series for charts (`getMonthlySeries()`)
   - Configurable parameters (completion scenario, rollout period)
3. **app.js** handles:
   - DOM manipulation and event handling
   - Chart rendering (Canvas 2D)
   - View switching and control visibility
   - Tooltip system

### Key Concepts

#### Completion Scenarios
Not all children complete the 4-dose course. Three scenarios model this:
- **Optimistic (71%):** Based on South Sudan R21 data
- **Average (39%):** Estimated midpoint
- **Pessimistic (8%):** Based on Malawi MVIP data

The model includes "dose reallocation" - when children drop out, their unused doses go to new children, creating cascading generations.

#### Efficacy Waning
Vaccine efficacy starts high (75% R21, 56% RTS,S) and decays over time following clinical trial data. The model:
- Holds efficacy flat until year 1 (when booster is given)
- Linearly interpolates through data points
- Exponentially extrapolates beyond trial follow-up
- 3-dose children (no booster) have shifted waning: E₃(t) = E₄(t+1)

#### Age Windows
Coverage calculations use two age windows:
- **5-36 months:** WHO recommendation (default)
- **6-60 months:** Full under-5 eligibility

The eligible population is calculated as a fraction of under-5 population.

---

## Views

| View | Description | Key Function |
|------|-------------|--------------|
| **Live Trackers** | Real-time counters for cases averted and lives saved | `updateTrackers()` |
| **Trends** | Line chart showing metrics over time, supports multi-country comparison | `updateTrends()` |
| **Country Rankings** | Bar chart comparing countries on selected metric | `updateCompare()` |
| **Maps** | Choropleth map of Africa with hover tooltips | `updateMap()` |
| **Country Profiles** | Table with all countries showing demographics and coverage | `updateCountries()` |
| **Vaccination Needs** | Cards showing coverage gap, doses needed, cost-effectiveness | `updateNeeds()` |
| **Shipments** | Sortable table of all vaccine shipments | `updateShipments()` |

---

## Known Issues & Incomplete Items

### Bugs to Watch For

1. **Cache busting:** The script tags use `?v=YYYYMMDD` version strings. If you make JS changes and they don't appear, bump the version in `index.html` (two places: `engine.js` and `app.js`).

2. **Tooltip click-outside:** The tooltip popup uses click-outside detection. It works but can occasionally get stuck if events fire in unexpected order.

3. **GeoJSON loading:** The map fetches GeoJSON from a GitHub raw URL. If that fails, the map shows "Failed to load map". There's no retry logic.

### UI Polish Needed

1. **Mobile responsiveness:** The site has no mobile-specific styles. Tables overflow, charts are too small, controls don't stack. This was explicitly deferred.

2. **Loading states:** Some views have loading states (`.loading` class) but they're inconsistent. The map shows "Loading map..." text but other views just freeze briefly.

3. **Error handling:** If data fails to load, error messages are minimal. The trackers show "Load error" but other views may just show empty.

4. **Keyboard navigation:** No keyboard shortcuts or focus management for accessibility.

### Data Gaps

1. **Guinea-Bissau:** Appears in shipment data but not in the UNICEF "24 countries" list (may be newer addition).

2. **Cabo Verde, Mauritius, Seychelles:** Shown on map as grey circles (no data) - they're malaria-free or have no vaccine program.

3. **Wastage:** The model doesn't account for vaccine wastage (typically 5-10% in practice).

4. **Seasonality:** Malaria transmission is treated as uniform year-round; no seasonal adjustment.

---

## Improvement Suggestions

### Structural Improvements

1. **Modularize app.js:** The file is 2500+ lines. Consider splitting into:
   - `charts.js` - Canvas rendering functions
   - `views.js` - View update functions
   - `controls.js` - Event handlers and wiring
   - `utils.js` - Formatting helpers

2. **Use a build system:** Currently no bundling. A simple Vite or esbuild setup would enable:
   - ES modules with proper imports
   - TypeScript for better maintainability
   - Minification for production
   - Hot reloading for development

3. **Component-based tooltips:** The current system copies innerHTML from template divs. A proper tooltip component could:
   - Accept dynamic content
   - Position intelligently (avoid viewport edges)
   - Support rich formatting without template duplication

4. **State management:** Currently state is scattered across:
   - DOM element values (dropdowns)
   - Module variables (selectedCountries arrays)
   - VaccineEngine internal state (completion scenario)

   A central state object would be cleaner.

### Feature Improvements

1. **Data export:** Add CSV/Excel export for:
   - The countries table
   - The shipments table
   - Chart underlying data

2. **Shareable URLs:** Encode view state in URL hash so users can share specific views (e.g., `#view=trends&country=Nigeria&metric=cases`).

3. **Comparison mode for needs:** The Needs view shows one country. Add multi-country comparison like Trends has.

4. **Historical efficacy:** Currently efficacy uses a single curve. Could add option to see "efficacy at 6 months", "efficacy at 1 year", etc.

5. **Confidence intervals:** All estimates are point estimates. Adding uncertainty ranges (based on completion rate variance) would be more rigorous.

### Data Improvements

1. **Sub-national data:** Some countries have regional rollouts. Could show province-level data where available.

2. **Actual administration data:** The model estimates doses administered from delivery dates. Real administration data (when available) would be more accurate.

3. **Cost-effectiveness validation:** The $/life saved estimates are theoretical. Cross-referencing with published cost-effectiveness studies would add credibility.

---

## Adding Future Demographic Projections

### Current State

The `countries.json` file has static demographic data:
- `populationAtRisk` - total at-risk population
- `populationUnderFive` - children under 5
- `birthsPerYear` - annual births (currently calculated as populationUnderFive / 5)
- `malariaCasesPerYear` - annual malaria cases
- `malariaDeathsPerYear` - annual malaria deaths

These are all 2023 values from UN/WHO sources. When the Needs view projects "annual maintenance doses needed", it uses these static values regardless of the projection year.

### Implementation Approach

#### Option A: Pre-computed Projections (Recommended)

1. **Expand countries.json schema:**
```json
{
  "name": "Nigeria",
  "demographics": {
    "2023": { "populationUnderFive": 33526624, "birthsPerYear": 6705325, ... },
    "2024": { "populationUnderFive": 34200000, "birthsPerYear": 6800000, ... },
    "2025": { ... },
    ...
    "2035": { ... }
  },
  ...
}
```

2. **Source:** UN World Population Prospects provides projections to 2100. Download the "medium variant" projections for African countries.

3. **Update VaccineEngine:**
```javascript
function getPopulationData(country, year = null) {
  const data = countries[country];
  if (!year) year = new Date().getFullYear();

  // Find closest available year
  const availableYears = Object.keys(data.demographics).map(Number).sort();
  const targetYear = Math.min(Math.max(year, availableYears[0]), availableYears.at(-1));

  return data.demographics[targetYear] || data.demographics[availableYears[0]];
}
```

4. **Update Needs view** to accept a projection year parameter and use `getPopulationData(country, year)`.

#### Option B: Growth Rate Extrapolation (Simpler)

1. **Add growth rates to countries.json:**
```json
{
  "name": "Nigeria",
  "birthsPerYear": 6705325,
  "annualGrowthRate": 0.025,  // 2.5% annual growth
  ...
}
```

2. **Calculate projected values:**
```javascript
function getProjectedBirths(country, year) {
  const baseYear = 2023;
  const baseValue = countries[country].birthsPerYear;
  const rate = countries[country].annualGrowthRate || 0.02;
  return baseValue * Math.pow(1 + rate, year - baseYear);
}
```

This is less accurate but requires less data maintenance.

#### Option C: API Integration

Use the UN Population Division API or World Bank API to fetch projections on demand:
```javascript
async function fetchPopulationProjection(countryCode, year) {
  const response = await fetch(
    `https://api.worldbank.org/v2/country/${countryCode}/indicator/SP.POP.0014.TO?date=${year}&format=json`
  );
  // Process and return
}
```

Pros: Always up-to-date. Cons: Adds external dependency, requires API key management, slower.

### UI Changes for Projections

1. **Add year selector** to Needs view:
```html
<label class="lbl" for="projectionYear">Projection year</label>
<select id="projectionYear">
  <option value="2024">2024</option>
  <option value="2025" selected>2025</option>
  <option value="2026">2026</option>
  ...
  <option value="2035">2035</option>
</select>
```

2. **Update charts** to show projected vs. current populations.

3. **Add projection disclaimer** explaining the source and uncertainty of projections.

### Data Sources for Projections

- **UN World Population Prospects 2024:** https://population.un.org/wpp/
  - Download: "Probabilistic Projections" → "Population" → by age and sex
  - Get under-5 population and births by year for each country

- **World Bank Open Data:** https://data.worldbank.org/
  - Indicator SP.POP.0014.TO (population ages 0-14)
  - Less granular but easier API access

---

## Code Style Notes

- **No semicolons** in most places (ASI style)
- **Single quotes** for strings
- **2-space indentation**
- **Compact canvas code:** Chart rendering uses terse variable names (W, H, ctx, padL, etc.)
- **Event delegation** for dynamic elements (tooltips, table sorting)
- **Cache objects** on canvas elements (`canvas._chartData`, etc.) for hover/download

---

## Testing

There are no automated tests. Manual testing checklist:

1. Load page, verify trackers count up
2. Switch to each view, verify data appears
3. Change country dropdown, verify charts update
4. Change completion/rollout settings, verify estimates change
5. Click info buttons, verify tooltips appear with correct content
6. Test bar chart hover tooltips
7. Test map hover and click
8. Download a chart, verify image is correct
9. Hard refresh (Ctrl+Shift+R) to test cache busting

---

## Contact & Attribution

Built by **Ollie Sayeed** with Claude (Anthropic) and GPT-5 (OpenAI).

Data sources: UNICEF Supply Division, WHO World Malaria Report 2024, UN World Population Prospects, Gavi, PMI.

---

*Good luck, Codex! Feel free to ask the user for clarification on any of these points.*
