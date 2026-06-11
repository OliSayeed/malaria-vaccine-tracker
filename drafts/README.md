# Draft policy modules

This folder is for **non-production modeling drafts**.

- `gavi6-cost-model-draft.js` is a standalone draft of a Gavi 6.0-oriented future-cost model.
- `map-target-population-draft.js` defines the schema, a ready-to-populate per-country skeleton, and the engine integration for a MAP/WHO-derived "moderate-to-high transmission eligible population" column — the narrower Gavi/WHO denominator that would sit alongside the existing maximalist national 6–60-month figure. Fractions are `null` pending Malaria Atlas Project district data.
- These are **not used by the live website** (`index.html` / `app.js` / `engine.js`) yet.
- Use it as a working area to iterate policy assumptions (country scope caps, phase transitions, and co-financing shares) before integration.
