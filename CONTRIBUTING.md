# Contributing

Thanks for helping keep the Malaria vaccine impact tracker accurate and alive.
Corrections, data updates, and improvements are all welcome — contact
**oliver.sayeed@1daysooner.org**.

## Quick start

It's a static site with no build step. Serve it locally and edit:

```bash
python3 -m http.server 8000   # then open http://localhost:8000/index.html
```

See the [README](README.md) for how the pieces fit together
(`engine.js` = model, `app.js` = UI, `data/*.json` = inputs).

## Before you open a PR

1. **Keep data and provenance in lockstep.** Any change to a number in
   `data/*.json` must be matched by a note in `data/sources.json` and, where
   user-visible, the About panel in `index.html`.
2. **Run the checks:**
   ```bash
   python3 scripts/validate-data.py     # data integrity
   node scripts/snapshot-test.js        # model-output regression
   ```
   If you changed the model or data *intentionally*, regenerate the snapshot
   with `node scripts/snapshot-test.js --update` and review the diff.
3. **Model logic lives in `engine.js`**, presentation in `app.js`. Keep
   calculations out of the UI layer.
4. **Refreshing the data?** Follow
   [`docs/DATA-UPDATE-RUNBOOK.md`](docs/DATA-UPDATE-RUNBOOK.md).
5. **Work-in-progress / policy experiments** go in `drafts/` until they're wired
   in (see `drafts/README.md`).

## Licensing

Code contributions are accepted under the MIT [`LICENSE`](LICENSE). Note that
bundled data retains its third-party source terms — see the README's Licensing
section.
