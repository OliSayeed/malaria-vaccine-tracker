# Can `allocator.html` import `engine.js`? — investigation & recommendation

**Question:** the Grant Allocator (`allocator.html`) carries its own copy of the
impact maths in an inline `<script>`. Can it be refactored to import the real
`engine.js` (global `VaccineEngine`) to remove the duplicate-math drift risk?

**Short answer:** Yes for the genuinely duplicated pieces — and the core
cost-effectiveness metric is already implemented in the engine
(`getCostEffectiveness`). But it is **not a behaviour-preserving change**: the
allocator and engine use *different per-child risk denominators*, so unifying
will shift the allocator's numbers (and possibly its rankings). The
coverage-gap/budget logic is legitimately allocator-specific and should stay.

## What's actually duplicated

| Concept | `allocator.html` | `engine.js` | Same? |
|---|---|---|---|
| Data loading | own `fetch('data/*.json')` | `VaccineEngine.loadData()` | duplicate logic, same files |
| Avg doses per started child | inline `1 + dose2+dose3+dose4` | `getAvgDosesPerChild()` (commented "mirrors" in the allocator) | identical formula, duplicated |
| Year-1 efficacy | `config.efficacy[v].points[0].efficacy` | `getEfficacy(v, 1, 4)` | identical, duplicated |
| Cost per child | `avgDoses × price` | `getCostEffectiveness().costPerChild` | identical |
| Cost per death/case averted | `calc()` per country | `getCostEffectiveness(country, vaccine)` | **same structure, one differing input — see below** |
| Pricing / completion-rate values | `VaccineEngine.config` … same `data/config.json` | same file | values can't drift |

### The one substantive divergence — the risk denominator
Both compute `deathsAvertedPerChild = perChildDeathRate × efficacy1yr × completion`.
They differ only in `perChildDeathRate`:

- **Engine:** `malariaDeathsPerYear / populationAtRisk` (deaths per person-at-risk, all ages).
- **Allocator:** `malariaDeathsPerYear / birthsPerYear` (all national deaths attributed to one annual birth cohort).

These differ by the ratio `populationAtRisk / birthsPerYear` (~30×), so the
allocator's absolute cost-per-death-averted is far lower than the engine's, and
because that ratio varies by country, the **rankings can differ too**. Neither
denominator is rigorous (the correct figure would be under-5 deaths ÷ under-5
population); but the engine's choice is the one the live tracker already
publishes as "cost per life saved", so it is the canonical one.

### What is genuinely allocator-specific (keep local)
- **Eligible = annual births** and **coverage gap = births − children coverable
  from delivered doses.** This is an annual-flow view, deliberately different
  from the engine's stock-based `getEligiblePopulation` (under-5 × age fraction).
- **Greedy budget allocation** across the coverage gap. No engine equivalent.

## Options

**A — Shared primitives (recommended, low risk, ~30–40 LOC).**
Load `engine.js` in `allocator.html`; replace the allocator's data loading,
`avgDoses`, and year-1-efficacy lookups with `VaccineEngine.loadData()`,
`getAvgDosesPerChild()` (per scenario via `setCompletionScenario`), and
`getEfficacy()`. **Keep** the allocator's own `calc()` cost-effectiveness and
coverage-gap logic. This removes the duplicated *logic* that can silently drift,
while preserving the allocator's current numbers and its documented methodology.

**B — Unify the metric (medium effort, CHANGES numbers).**
Additionally drop `calc()` and use `getCostEffectiveness(country, vaccine)` for
cost-per-death/case-averted. This makes a single implementation the source of
truth — the real drift fix — but switches the allocator's denominator from
births to population-at-risk, **changing displayed numbers and possibly
rankings**. Worth doing only as a deliberate decision to align the allocator
with the tracker (and the methodology note in `allocator.html` would need
updating). Note `getCostEffectiveness` already uses year-1 efficacy + completion
scaling, so it's a drop-in shape-wise.

**C — Leave as-is, add a guard (lowest effort).**
Because both read the same `data/config.json`, the *values* can't drift; only
the derived logic can. Add a cross-check (e.g. a snapshot-style test asserting
the allocator's avgDoses/efficacy match the engine's) and a comment pointing at
`getCostEffectiveness`. Cheapest, but leaves two implementations.

## Recommendation

If the allocator is kept (see item #4): do **A now** (safe, kills the duplicated
logic, no number changes), and treat **B** as a separate, explicit decision —
it's the only option that truly removes the divergent metric, but it changes
outputs, so it shouldn't be slipped in silently. If the allocator may be retired
instead, do **C** (a guard) so it can't drift until that decision is made.

Either way, the allocator's coverage-gap/budget engine stays local — it's a
genuinely different (annual-cohort) model, not a drifted copy.
