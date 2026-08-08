---
title: CDS Phase 2 — New Lenses, Free-Data Workarounds & Paid-Upgrade Path
tags: [cds, credit-risk, bahrain, banking]
summary: Companion to domino-framework.md. The four new prediction lenses, the free-data workarounds standing in for paid sources, and the exact swap plan if licensed data (Markit/Bloomberg) ever arrives.
created: 2026-08-08
status: draft
---

# CDS Phase 2 — New Lenses & Data Plan

Companion to `domino-framework.md` (which stays the governing doc — frozen
protocol, signal registry, grading rules all live THERE). This doc is the
phase-2 plan: what we intend to add, the results we hope for, and the
workarounds we used because paid data was assumed unavailable.

**Protocol note:** nothing here is a pre-registered spec. Before any lens is
evaluated, its exact spec (thresholds, windows, acceptance criteria) must be
written into the main doc's experiment log first, per the frozen protocol.
This doc records intent and data logistics only.

## Does the domino framework still apply?

Yes — every new lens slots into the existing chain rather than replacing it:

| Lens | Where it sits in the chain |
|---|---|
| Residual spread (beta-stripped) | Cleaner *measurement* of dominoes 3–4 — separates Bahrain-specific credit moves from global/EM noise |
| Peg / funding stress | Between dominoes 2 and 3 — funding pressure is how balance-sheet erosion first touches markets |
| Refinancing wall | Timing overlay on domino 2 — stress concentrates when big maturities approach |
| Recovery tier | The chain in reverse — signals that dominoes are being stood back up |

## The four new lenses (intent + hoped-for result)

1. **Residual spread decomposition.** Regress Bahrain's spread on an EM
   sovereign index (free: FRED ICE BofA EM OAS series) + regional peers; watch
   the RESIDUAL, not the raw spread. *Hoped-for results:* (a) the 2022–25
   "rates contamination" separates out cleanly, (b) the small-move base rate
   on the residual is far below the raw ~33%, making smaller haircut moves a
   predictable target for the first time. Highest-priority lens; zero paid data.
2. **Peg/funding stress (BHIBOR − SOFR differential).** Under the dollar peg,
   the interbank differential ≈ forward points ≈ peg risk premium. Free from
   CBB's own published rates + FRED. *Hoped-for result:* differential blowouts
   lead credit-tier alerts in 2018/2020-style episodes (a new independent
   family for the composite).
3. **Refinancing wall.** Months-to-next-large-USD-maturity × market-access
   state. Fully deterministic from public maturity schedules. *Hoped-for
   result:* conditioning alerts on wall proximity improves precision (fewer
   false positives in years with no rollover need).
4. **Recovery tier (haircut-DECREASE prediction).** Symmetric signals: oil back
   above breakeven, successful new issuance (= market access restored), curve
   un-inversion, spread trend reversal. *Hoped-for result:* graded record on
   normalization episodes (2016, 2021) — doubles the tool's use cases
   (sell-protection / re-enter timing, not just hedging).

## Data needs table — ideal vs. workaround vs. swap plan

Assumption: NO access to paid terminals (Bloomberg/Markit/Refinitiv/EPFR).

| # | Need | Ideal (paid) | Workaround (free, in use) | Swap plan when paid arrives |
|---|---|---|---|---|
| 1 | Bahrain 5Y CDS history post-2019 | Markit / Bloomberg daily quotes | Live historical tables on public CDS sites + alternate web archives (web.archive.org is network-blocked locally) + academic replication panels. ~~Chart digitization from CBB FSR / IMF Article IV~~ — TESTED 2026-08-08, route dead: 17 official PDFs scanned exhaustively, ZERO CDS/spread/FX-forward charts exist in any of them (CBB FSR is domestic-prudential only). Role: VALIDATE the Ariva proxy, not replace it | Load paid series as a NEW series id (never overwrite proxy); re-run proxy-calibration offsets against it; re-derive grading bars on the new reference outcome-blind (C-R1 lesson: never reuse bars across reference series); keep proxy live as fallback |
| 2 | Full 1y–10y CDS curve (PD/LGD separation) | Markit curve | Bond-curve cross-sectional fit (Merrick, already in engine) + densify curve with ALL listed Bahrain USD eurobonds & sukuk (retail venues sweep; sukuk enter as separate leg with fitted basis offset) | Add curve fetcher as new series family; run CDS-curve separation alongside bond-curve fit; publish both, adopt via pre-registered comparison |
| 3 | BHD 12m forward points (peg lens) | Bloomberg/Refinitiv FX forwards | BHIBOR − SOFR differential (CBB publishes BHIBOR; SOFR on FRED). Note: SOFR starts 2018 — pre-2018 differential needs USD LIBOR (FRED, discontinued series) with a documented splice | Fetch real forward points as new series; validate that differential tracked them in overlap; keep whichever grades better (pre-registered) |
| 4 | EM index for residual lens | J.P. Morgan EMBI | ~~FRED ICE BofA EM OAS~~ — TESTED 2026-08-08: FRED now serves only a rolling 3-year window for ALL ICE BofA series (source-level licensing restriction; ALFRED/vintage recovery also fails; 3 of 6 EM series only launched 2023). Working substitute: **EMB ETF via Yahoo (daily since Dec-2007)** as EM-beta proxy + self-built peer-sovereign index from retail-venue bonds (#5). Keep the truncated ICE series as a 2023→ cross-check | Swap in EMBI/ICE full history; re-fit betas; document as measurement change |
| 5 | Peer sovereign spreads (residual basket) | Terminal | Oman/Jordan/Egypt USD eurobonds via the same retail-venue technique as Bahrain | Same as #1 per peer |
| 6 | Maturity schedule (refi wall) | — | Public prospectus data; extend existing `bond_maturities.csv` to ALL outstanding USD debt incl. sukuk | Nothing to swap — this is already ground truth |
| 7 | Fund flows (EPFR) | EPFR | None viable — lens dropped | Revisit only if licensed |

## Workaround caveats (provenance requirements)

Every reconstructed series enters the main doc's signal-provenance registry
with its quirks documented, same as the existing six sources:
- **Wayback CDS**: unofficial republished dealer levels; snapshot dates ≠
  quote dates (staleness must be recorded per point); sparse/irregular.
- **Digitized charts**: ±reading-error bars; low frequency; official origin
  (CBB/IMF) is the credibility anchor.
- **Sukuk legs**: structural/legal basis vs conventional bonds — separate leg,
  fitted offset, never mixed raw.
- **BHIBOR splice**: SOFR-era vs LIBOR-era differential must carry a documented
  splice date; any grading bar computed on it is era-aware by construction.
  (2026-08-08 finding: real BHIBOR fixings exist as QUARTERLY averages in CBB
  Statistical Bulletin "Indicators" sheets, archives back to ~2001; quarterly
  smoothing of spikes is a documented limitation. FRED's LIBOR endpoint is
  blocked; TB3MS is the pre-2018 USD leg, with its credit-spread bias noted.)
- **Network constraint (2026-08-08)**: web.archive.org is unreachable from the
  local network (ISP-level). Wayback-based reconstruction reroutes via live
  historical tables on CDS-publishing sites, timetravel.mementoweb.org, and
  archive.today; provenance per data point records which route was used.

## Qualitative finding — Bahrain disclosure posture (2026-08-08)

While hunting official CDS charts, a structural fact surfaced: **no Bahrain IMF
Article IV Staff Report has been published for ANY year 2017–2025** — the
authorities have withheld publication consent every year in that window,
releasing only press releases (and one 2023 Selected Issues paper on CBDC).
Verified three ways (URL probing, IMF eLibrary index, press-release language).
Two implications: (a) the IMF-report data route is closed for Bahrain but OPEN
for peers that do publish (Oman publishes its Article IVs — another argument
for the peer panel); (b) the withholding itself is a disclosure-posture signal
a sovereign-risk framework may legitimately note qualitatively. Not a scoring
input without a pre-registered spec.

## Status — recon campaign results (2026-08-08, `~/nbb/data-recon/`)

Five agents dispatched in parallel; all complete. One follow-up in flight.

| Target | Outcome |
|---|---|
| Bahrain CDS history | **Partial.** 596 near-daily points 2015-08-31→2019-06-25 recovered from a public site's own JSON API (independent cross-check of the existing legacy CDS calibration era). **Post-2019 bp-levels: CONFIRMED UNAVAILABLE FREE** — academic sweep (Dataverse, Zenodo, openICPSR, OSF, Kaggle, GitHub) found no GCC replication package redistributing bp levels; Oman appears in NO academic GCC CDS panel at all. **Salvage: 365 daily Bahrain CDS FRACTIONAL CHANGES 2019-07-02→2020-06-30** (NBER WP 27903 replication repo) — spans exactly the Ariva-era boundary AND the COVID crash; anchored to the known Jun-2019 ~255bp level and integrated, it validates the proxy's dynamics in the most critical 12 months. Human-action leads for full levels recorded in `data-recon/academic-cds/README.md` (author contact: NBER WP 27903, BBVA Research; Datastream via any university affiliation; 2 MDPI papers needing manual download). |
| Oman CDS history | **Not found anywhere free** (source never carried it). |
| BHD forwards | One live curve snapshot only; no history. Peg lens rides on BHIBOR instead. |
| BHIBOR (peg lens) | **Won.** 66 gapless quarters 2009-Q4→2026-Q2, 3M+6M, from archived CBB bulletin Excel files. 2018 crisis visibly moves the series (levels; the graded signal must be the USD differential, which strips Fed-cycle effects). |
| EM benchmark (residual lens) | FRED ICE BofA series truncated to rolling 3y at source (all recovery routes failed; 3 of 6 series only launched 2023). **Fallback verified: EMB ETF daily since Dec-2007 (Yahoo)** + self-built peer index. VIX/DGS10 full history in hand. |
| Instrument sweep | **Won.** 29 Bahrain USD instruments (17 bonds, 9 live sukuk) vs 4 tracked; 9 with confirmed retail pricing; 4 recommended new curve legs. Peer basket: Oman 5 / Jordan 5 / Egypt 5 (Egypt unverified pricing). Maturity wall built — **next wall event: bond maturing 2026-09-08.** |
| Official reports | **Conclusive negative:** 17 CBB/IMF PDFs scanned; zero CDS/spread/FX charts exist. Plus the structural Article IV finding (section above). |

Environment notes for future runs: web.archive.org + archive.ph ISP-blocked;
timetravel.mementoweb.org doesn't resolve; Common Crawl reachable; FRED LIBOR
endpoint 403s. Formal lens specs still to be pre-registered in
`domino-framework.md` before any evaluation.
