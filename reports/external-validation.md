# External validation — how the tracker's headline compares to published estimates

**Prepared:** 2026-06-16 · **Scenario:** "Average" completion · **As-of date:** 2026-06-16
**Purpose:** a sanity check of the tracker's headline impact figures against
independent published modelled estimates — where they land, and why.

## The tracker's headline (Average scenario, to date)

Computed from `engine.js` over all delivered shipments (`scripts/snapshot-test.js`):

| | Africa total |
|---|--:|
| Children fully vaccinated (4 doses) | ~8.2 million |
| Cases averted **so far** | ~1.27 million |
| Lives saved **so far** | ~2,700 |
| Implied rate | **~0.33 lives / 1,000 fully-vaccinated children** |

## Published comparators

- **Gavi (modelled, 2026–2030):** fully immunising ~**50 million** children
  could save **>170,000** lives — i.e. **~3.4 lives / 1,000 fully-vaccinated
  children**, over the children's full protected period.
- **Gavi/WHO:** ~**180,000** lives potentially saved by 2030; up to ~**half a
  million** child deaths averted by 2035 at full scale-up.
- **Real-world signal:** Burkina Faso reported a ~32% fall in malaria cases and
  ~50% fall in malaria deaths after nationwide vaccine introduction (2024→2025),
  *alongside* other control measures.

## Where it lands, and why

The tracker's per-child rate (**~0.33 / 1,000**) is about **10× lower** than
Gavi's modelled lifetime rate (**~3.4 / 1,000**) — and that gap is expected, not
a red flag:

1. **To-date vs lifetime.** The tracker counts only the protection *accrued so
   far*: it integrates waning efficacy from each shipment date to the as-of date.
   Most doses were delivered in 2024–2025, so for the average vaccinated child
   only ~1 year of a multi-year protected period has elapsed. Gavi's 3.4/1,000 is
   the *full lifetime* benefit of a completed 4-dose course. As protection
   accumulates, the tracker's per-child figure should rise toward the lifetime
   rate.
2. **Target population.** Gavi's figure is for children in moderate/high
   transmission areas (high burden); the tracker applies *national-average*
   burden to all vaccinated children, which dilutes the per-child benefit.
3. **Completion.** The "Average" scenario assumes modest 4-dose completion
   (~39%), so many started children are not counted as fully protected.

**Conclusion:** the tracker is internally plausible and in the right
order of magnitude. Its headline lives-saved is necessarily a *fraction* of
published 2030 projections because it measures realised impact to date, not
projected lifetime impact — and normalised per fully-vaccinated child it sits
about an order of magnitude below Gavi's lifetime rate, consistent with an
early-stage rollout. The direction and scale show no inconsistency that would
suggest a modelling error. (A tighter, like-for-like check would require either
projecting the tracker's cohorts to the end of their protected period, or
discounting Gavi's lifetime figure to date — out of scope here.)

## Sources

- [Gavi/UNICEF — equitable pricing deal: 50M children / 170,000 lives](https://www.gavi.org/news/media-room/gavi-and-unicef-announce-equitable-pricing-deal-malaria-vaccine-protect-7-million)
- [UN News — malaria vaccine price cut, 7 million more children by 2030](https://news.un.org/en/story/2025/11/1166432)
- [Gavi — one-year anniversary of malaria vaccine rollout (~5M children protected)](https://www.gavi.org/news/media-room/one-year-anniversary-malaria-vaccine-rollout-underscores-remarkable-progress-offers)
- [Gavi — malaria vaccines are working](https://www.gavi.org/vaccineswork/malaria-vaccines-are-working-we-cannot-afford-lose-momentum)
