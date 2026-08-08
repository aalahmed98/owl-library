---
title: CDS Haircut — Domino Framework & Research Notes
tags: [banking, bahrain, cds, credit-risk]
summary: Working research doc for the haircut monitor rebuild — the six-domino causal chain, what we track (or plan to track) per domino and why, and the data APIs in use at the bottom.
created: 2026-08-07
status: draft
---

# CDS Haircut — Domino Framework

Working doc for the haircut-monitor rebuild (`~/nbb/haircut-monitor`). Everything the
tool tracks hangs off one causal chain. The haircut is the **last** domino — you
cannot watch the haircut to predict the haircut; you watch the earlier dominoes.

**The chain:**

1. **Oil falls below the fiscal breakeven** — the deficit starts (months of lead)
2. **Reserves drain, debt piles up** — temporary problem becomes structural (months)
3. **The curve inverts** — the market whispers before it shouts (weeks)
4. **The visible blowout** — spreads gap, ratings cut, liquidity dies (days)
5. **Prices go distressed → the haircut becomes observable** (1 − price)
6. **Restructuring** — lawyers set the realized haircut (months–years later)

Each indicator we track belongs to exactly one domino, and its job is to predict the
**next** domino — not the haircut directly. Example: OVX (oil volatility) doesn't
affect the haircut; it predicts Brent stress, which is what tips domino 1.

---

## Domino Zero — oil stress (upstream of Domino 1)

Indicators that predict **Brent**, not the haircut. Composite 0–100; `oil_stress`
alert fires crossing 50; graded hit if Brent falls ≥15% within 45 days (base rate
15.2%). Current scorecard, both units (spec C-R2): flag-level 12/41 = 29%;
**episode-level 4/14 = 28.6%, 90% CI 7–50%, lift CI 0.47×–3.29×** — the point
estimate is ≈2× base rate but 14 episodes cannot yet statistically exclude
no-skill; provisional until live flags accumulate. Fired **2020-02-28** (the
stored alert; an earlier "02-27" here was a transcription slip — correction-log
entry 3 has always said 02-28), **six trading days counted to the 2020-03-09
OPEC collapse** (Feb-28 → Mar 2/3/4/5/6 → Mar-9); a scheduled-meeting fire —
survives the announced-date audit.

### Signal registry (what feeds this domino)

| Signal | Exact measure | Source (series) | Weight | Status |
|---|---|---|---|---|
| Oil volatility | OVX trailing-3y percentile, gated by absolute level (min of the two scalings; 30→60 abs scale) | FRED `OVXCLS`, daily 2010→ | 40 | live, v1 frozen |
| Physical: futures curve | contango % = (+6m ÷ front − 1); level scale −1%→+4% | Yahoo `BZ=F` vs `BZ<M><YY>.NYM` (live, Aug-2026→); EIA `RCLC1`/`RCLC4` (history 2010→Apr-2024) | 30 | live, v1 frozen (percentile variant tested & REJECTED — see experiment log) |
| Spec positioning | CFTC managed-money net length as % of open interest, trailing-3y percentile | CFTC Socrata `72hh-3qpy`, code 067651, weekly 2006→ | 20 | live, v1 frozen |
| OPEC event proximity | scheduled meeting within 14 calendar days | manual CSV `data/manual/opec_meetings.csv` (majors 2014–2024) | 10 | live; future dates hand-maintained |
| US crude inventories | YoY change AND seasonal-norm deviation (both tested) | EIA `WCESTUS1`, weekly 2010→ (fetched) | — | **tested & REJECTED twice** — inventories confirm crashes, don't lead them; see experiment log |
| WTI prompt spread | (C2/C1−1)% persistence ≥10 obs (tested) | EIA `RCLC2` (fetched, 2010→2024) | — | **tested & REJECTED by a hair** (1.90× vs 1.97×; improved 2018, paid elsewhere) |

Retired: `oil_alarm` (2-of-3 family confirmation + falling-trend gate) — retired
2026-08-07 after measuring 7h/37fp = 16% ≈ 1.05× base rate at crash scale; it
added nothing over the composite. Full record kept in the experiment log below.
The falling-trend gate idea may return in a future pre-registered composite variant.

### The cascade, measured (2026-08-07)

Does Domino Zero firing lead the credit tiers? Over 26 oil flags (2016→today),
graded against the following 60 days:

- P(credit-tier alert follows) = 88.5% — but the baseline for ANY day is 87%.
- P(Bahrain proxy widens ≥50bp) = 31% — baseline 33%. **No aggregate lift.**
- Cause: Bahrain has been stressed for most of this era, so credit alerts and
  50bp widenings happen after almost any date — the metric saturates. Bahrain
  spread stress also frequently arises WITHOUT oil (fiscal, GCC politics, global
  rates), which the credit tiers catch on their own.
- Episode-level, the chain IS visible where it should be: **2020: contango flip
  Feb-3 → credit trend alert Feb-28 → crash Mar-9** (the physical oil signal led
  the bond market by ~3.5 weeks), and 2018-11/2025-26 oil flags sat before large
  widenings. But that is n≈2 clean sequences, not a statistic.

**Framing consequence (for any presentation): Domino Zero is a scenario trigger
for OIL-DRIVEN crises (scoping Scenario B), not a general Bahrain-spread
predictor. The credit tiers carry the non-oil crises; the layers are
complementary, and the aggregate no-lift number is the honest proof that neither
layer is redundant with the other.**

### Pre-registered candidate queue (literature research, 2026-08-07)

Ranked by published evidence × lead time × free-data access (full agent report
with all URLs archived; key anchors cited inline). Each becomes a one-shot
experiment under the frozen protocol when run:

1. **Relative inventory (deviation from seasonal norm)** — stocks minus the
   trailing 4–5yr same-calendar-week average. THE published transform (Ye–Zyren–
   Shore, IJF 2005; EIA's own STEO model uses it). Note: our rejected YoY variant
   has no published support — the literature agrees with our rejection. Data: EIA
   `WCESTUS1` (already fetched); norm computed in-house.
2. **Prompt spread + curvature** — CL1−CL2 and a curvature term (CL1−CL2 minus
   ⅓·(CL1−CL4)); Bredin et al. (Energy Economics 2021): slope AND curvature carry
   predictive content beyond a single 6m spread. Data: EIA `RCLC1`–`RCLC4` —
   **already in our database**; test persistence (2+ weeks) not daily values.
3. **De-seasonalized crack spreads** (gasoline−WTI, heating-oil−WTI spot) —
   largest documented effect in the oil-forecasting literature (Baumeister–
   Kilian–Zhou: up to 20% MSPE reduction). Data: free on FRED (`DGASNYH`,
   `DHOILNYH`, `DCOILWTICO`). Demand-side signal we currently lack entirely.
4. **Financial-stress left-tail composite** — HY OAS + stress-index percentiles;
   Bjørnland–Hardy–Korobilis (2026 QVAR): 10–25% left-tail improvement —
   downside is predictable, upside is not. Data: FRED `BAMLH0A0HYM2`, `NFCI`.
   Must show incremental value over OVX (they co-move).
5. **Cushing utilization × contango interaction** — storage-saturation crashes
   (2016, 2020). Data: EIA `WCSSTUS1` + semiannual capacity report.
6. **OVX variance-risk premium** (OVX² − 21d realized variance) — replaces
   "more OVX levels"; published: extreme OVX levels alone predict poorly.
7. **CFTC refinement**: net-length ≥90th pct AND 3-week change < 0 (liquidation
   begun) — Gorton–Hayashi–Rouwenhorst found positions per se do NOT predict;
   only the crowding-extreme + unwind combination is defensible.

Excluded by evidence: rig counts (lagging, wrong causation), tanker freight
(published causality runs price→freight), Saudi OSP (real signal, monthly, no
free history — event flag only), Kilian IGREA (validated but monthly + lagged).

### Candidate experiments 1 & 2 — EXACT SPECS, written before running (2026-08-08)

**C1 — Relative inventory (seasonal-norm deviation), the literature's transform:**
new component "inventories (seasonal dev)", max 20 pts: deviation = stocks −
trailing-4-year same-calendar-week average (asof ±14d per year, ≥3 years
required), scaled 0 kbbl → +50,000 kbbl → 0..20. Run SEQUENTIALLY before C2.
ACCEPTANCE: all three crash episodes still flagged by `oil_stress` inside their
windows; lift not below the current 1.97×; one run, adopt/reject.
Known risk (stated upfront): demand-shock crashes (2020) may see zero deviation
pre-crash → dilution, the same failure mode as the rejected YoY variant.

**C2 — Prompt-spread persistence refinement of the physical family:**
physical points = max(existing 6-month contango pts, promptPts), where promptPts
= full 30 pts iff the PROMPT contango ((C2/C1 − 1)%, WTI hist / Brent front vs
+3m live) has exceeded +0.3% for ≥10 consecutive observations, else 0 —
persistence per Bredin et al., not daily values. New data: EIA `RCLC2` (refetch),
Yahoo +3m contract (live). Evaluated on top of the ADOPTED post-C1 state.
ACCEPTANCE: episodes preserved; lift not below the post-C1 baseline; one run.

**RESULTS (2026-08-08) — both REJECTED:**
- **C1 rejected**: stress 5h/21fp = 19% = 1.27× lift; Feb-2020 fire delayed to
  Mar-6. Same dilution failure as the YoY variant — inventories sit at their
  seasonal norm right up until a demand-shock crash begins, so the component is
  present-but-zero exactly when the composite needs to fire. Conclusion now
  established twice: **inventory measures confirm oil crashes, they do not lead
  them** — at least not at our crash-scale grading with US-only data. Any third
  inventory attempt must first explain how it evades this mechanism.
- **C2 rejected by a hair**: stress 13h/32fp = 28.9% = 1.90× lift vs baseline
  30.0%/1.97×. It genuinely improved 2018-Q4 (three early hits incl. Nov-22 where
  baseline graded FP) but added 4 FPs elsewhere. Under the precision-must-not-
  degrade rule: rejected. Noted as the nearest miss so far; a stricter-persistence
  variant may be pre-registered in the future, but NOT iterated-until-it-passes.
- Composite stands unchanged: **12h/28fp = 30%, 1.97× lift** *(flag-level;
  C-R2's episode CI includes 1× — quote as "≈2×, provisional")*. Untested queue
  items remain: de-seasonalized crack spreads (#3, demand-side — the gap in our
  coverage), financial-stress left-tail composite (#4), Cushing×contango (#5),
  OVX VRP (#6), CFTC crowding+unwind refinement (#7).

### Candidate experiment 3 — EXACT SPEC, written before running (2026-08-08)

**C3 — Crack-spread demand signal, BONUS design.** The demand-side gap is our
only uncovered dimension (all live signals are supply/positioning/vol), and the
literature's largest effect sits here (Baumeister–Kilian–Zhou: product spreads,
up to 20% MSPE reduction). Design lesson from three rejections: any
present-but-zero component in the renormalizing average DILUTES episodes it
doesn't cover (2014 was a supply crash with STRONG cracks — an averaged crack
component would dilute it). Therefore C3 is a **bonus, not an averaged
component**: it can only add, never dilute.

- cracks: gasoline crack = 42·DGASNYH − DCOILWTICO; heating-oil crack =
  42·DHOILNYH − DCOILWTICO ($/bbl, FRED daily). De-seasonalized: deviation from
  the trailing-4-year same-week average (the same helper as C1, reused).
- signal: demandWeak = −avg(crackDevGas, crackDevHO) when negative (cracks
  collapsing below seasonal norm = demand dying).
- score' = min(100, baseScore + bonus), bonus = clamp(demandWeak / 8, 0, 1) × 15
  (full +15 at ≥$8/bbl below norm; 0 otherwise).
- ACCEPTANCE: three episodes preserved; lift not below 1.97×; one run.

**RESULT — REJECTED (2026-08-08).** stress 11h/33fp = 25% = 1.64× lift. The bonus
design worked as intended (no dilution; 2014 fired 5 days earlier, 2018-11-22
became a hit) but the bonus pushed borderline non-crash days over the alert
threshold — FPs 28→33 outran the coverage gains. **Six experiments, one adoption:
the four-component composite is genuinely hard to beat with free data.** Queue
items #4–#7 remain pre-specified but untested; recommendation: stop polishing
Domino Zero and build the credit dominoes.

### Candidate 8 — EXACT SPEC, written before running (2026-08-08)

**Time-series momentum flip (the canonical spec, zero tuned numbers).** New
standalone oil-tier rule `momentum_flip`: evaluated on the LAST TRADING DAY of
each month; fires when Brent's trailing 12-month return flips from non-negative
to negative (edge-triggered at monthly granularity — exactly the
Moskowitz–Ooi–Pedersen construction; 12 months and monthly evaluation are the
paper's numbers, not ours). Motivation: our two missed episodes (2014-H2,
2018-Q4) were vol-less grinding declines — the precise pattern momentum covers;
a momentum flag is partly coincident (fires weeks into a slide) but under
crash-scale grading catching the CONTINUATION still counts.
ACCEPTANCE: (a) fires inside the 2014 and 2018 episodes (the misses it exists to
cover), (b) standalone lift ≥ 1.5× the 15.2% base rate, (c) one run, adopt or
reject, recorded either way. Does not touch the composite.

**RESULT — REJECTED (2026-08-08).** 2h/10fp = 16.7% = **1.10× lift** (criterion b
failed; bar was 1.5×). The instructive part: it DID fire inside all three crash
episodes — including **2020-01-31, four weeks before the crash and 6 trading days
earlier than the composite** — but (i) 9 false flips in choppy sideways years
(2013, 2016–17, 2023–24; momentum's textbook failure mode), and (ii) its 2014 and
2018 in-episode fires both graded FP against the −15%/45d bar (2018 missed by
~1pt: Brent fell ~14% in-window). We explicitly decline to loosen the bar or
window for this one rule — that would be tuning the exam to the student. Standing
conclusion after 8 experiments / 2 adoptions: the composite + fair grading is the
system; free-data additions keep failing to clear it. Domino Zero is closed.

## Domino 1 — Oil below the fiscal breakeven

The budget-balancing oil price for Bahrain is well above $100/bbl. Brent below it =
the state runs a deficit just by operating. First domino, most lead time, least
drama.

**Tracking now:**
- Brent daily spot (FRED `DCOILBRENTEU`), smoothed as a 60-trading-day average
- Fiscal breakeven $/bbl — **vintage series** (`manual.breakeven_usd`, adopted
  2026-08-08 per correction 4): one row per IMF MCD REO release 2014-10→2025-05,
  `obs_date` = publication date, value = that release's current-year Bahrain
  fiscal breakeven, per-row provenance in `data/manual/breakeven_vintages.csv`.
  Consumed as-of (step function); releases without a printed number are gaps and
  the prior vintage carries forward (May-2014/Jan-2015/May-2015 chart-only,
  Apr-2016 none, Nov-2018 unlocatable, Jul-2020 special update none, Oct-2025 +
  Apr-2026 table discontinued). Pre-2014-10 dates fall back to the parameter
  ($125) — numerically ≈ the earliest vintage (125.4), so no separate clamp.
- Signal: **breakeven gap** = breakeven − Brent 60d avg (in $/bbl)

**LIVE — the "Domino Zero" oil-stress tier** (indicators that predict *Brent*,
not the haircut; an oil trader watches these, a bonds desk doesn't). Composite
0–100, alert fires crossing 50, graded hit if Brent falls ≥15% within 45 days (crash-scale target, adopted 2026-08-07; base rate 15.2%):
- **OVX** (CBOE crude oil vol, FRED `OVXCLS`, history to 2010): trailing-3y
  percentile gated by absolute level (a benign trailing-max can't fire it). 40pts.
- **Futures curve shape** (Brent front vs +6m via Yahoo): contango = physical
  oversupply. No free history — accumulates from Aug-2026 onward; renormalized
  before that. 30pts. Currently −8.9% (deep backwardation = tight market).
- **CFTC positioning** (Socrata API, weekly since 2006): managed-money net length
  as % of OI, percentile — fragility, says *how bad if*, not *when*. 20pts.
- **OPEC+ meeting calendar** (manual CSV, majors seeded 2014–2024): binary-event
  proximity window. 10pts.

**Backtest verdict — after the EIA out-of-sample test (2010→today, frozen v1
thresholds, contango history added AFTER thresholds were fixed):**
- `oil_stress` composite: 15 hits / 25 FP (~38%) — fired **2020-02-28, six
  trading days counted to the 2020-03-09 OPEC collapse** (hit). **Measured base rate: 31%** of ALL days
  are followed by an 8%/30d drop (oil is just that volatile), so the aggregate
  precision lift is only ~1.2× — the tier's demonstrated value is the TIMING on
  the big episodes (Feb-2020 lead), not aggregate precision. Earlier "2× base
  rate" claim was based on a guessed base rate and is hereby corrected.
- `contango_flip`: 12/37 hits. Feb-2020 CONFIRMED out-of-sample: WTI curve flipped
  contango 2020-02-03, a month before the crash. 2014 NOT confirmed: the flip came
  during the crash (Nov-2014), not before — the research claim didn't survive
  testing on this measure.
- `oil_alarm` (2-of-3 families + falling-trend gate): 16/44 hits (36%) — **same
  precision as the plain composite**, i.e. the confirmation idea did NOT beat the
  simple score. Main cause: 2015–17's multi-year glut kept contango permanently
  elevated, so "physical + anything" fired often. It did fire 2020-03-06 (the OPEC
  day itself, before the Mar-9 weekend gap — still actionable) and caught the late
  legs of 2014 and 2018. Kept on the board as the strict tier, verdict: marginal.
- **v2 physical family (percentile-gated contango) — EVALUATED ONCE AND REJECTED
  (2026-08-07).** Spec: physical points = min(levelPts, trailing-3y-percentile pts
  0.70→0.97). Result: stress 9h/18fp (33%), alarm 9h/20fp (31%) vs v1's 15h/25fp
  (37.5%) / 16h/28fp (36%). It met the letter of the pre-registered criteria
  (episode hits survived, absolute FPs fell) but cut hits harder than FPs — the
  2015–16 "glut" flags it suppressed were disproportionately REAL hits (oil kept
  crashing through that era) — and delayed the 2020 firing Feb-27→Mar-6. Precision
  is the objective; v2 reduced it; v1 stands. **Protocol amendment:** future
  acceptance criteria must include "precision must not degrade" explicitly.
- Data note: EIA daily futures series ends 2024-04 (discontinued); live Brent curve
  (Yahoo) covers 2026-08→; the 2024–26 gap renormalizes honestly.

**Re-grading experiment — EXACT SPEC, written before running (2026-08-07):**
change the oil-tier grading target from "Brent −8% within 30d" (base rate 31% —
too easy, routine volatility) to **"Brent −15% within 45d"** — the crash size that
actually cascades to Bahrain's haircut. Flag generation unchanged; only grading
and the base rate move. ACCEPTANCE: (a) the lift (accuracy ÷ base rate) must
exceed v1's ~1.2×, (b) the Feb-2020 oil_stress flag must still grade a hit,
(c) precision itself may fall (rarer target) — lift is the criterion. One run,
results recorded below, adopt or reject.

**RESULT — ADOPTED (same day).** Base rate 31.1% → 15.2%. `oil_stress`: 12h/28fp
= 30% accuracy = **1.97× lift** (vs 1.2× before) ✓. *[Flag-level; superseded as
a headline by C-R2: episode-level 90% lift CI 0.47×–3.29× includes 1× —
"≈2×, provisional" is the citable phrasing.]* Feb-2020 composite flag still
hits ✓ — and the Feb-3 contango flip now grades HIT (the old 30d window marked the
dataset's earliest, best warning a false positive because the crash landed on day
33 — the metric was punishing earliness). `contango_flip` 7/37 = 1.24× lift;
`oil_alarm` 7/44 = **1.05× — no better than base at crash scale**; flagged as the
weak rule, candidate for future pre-registered repair or removal. Grading params
are now oilDropPct 15 / oilDropWindowDays 45 (defaults; editable on /params).

**Retirement of `oil_alarm` — pre-registered (2026-08-07):** measured 1.05× lift
(7h/37fp) at crash scale = indistinguishable from the base rate; retiring the rule
(no new generation, historical rows removed from the live scoreboard; full record
preserved here: 44 flags, 16h/28fp at the old 8%/30d target, 7h/37fp at 15%/45d).

**Inventory experiment — EXACT SPEC, written before running (2026-08-07):** add a
5th component "US inventories" to the Domino Zero composite: **year-over-year
change in US crude stocks ex-SPR** (EIA `WCESTUS1`, weekly, ≤14d staleness),
scaled 0 kbbl (0 pts) → +50,000 kbbl (20 pts max). YoY change self-deseasonalizes
(vs level percentile) and +50k ≈ the 2015 glut's peak build. Composite renormalizes
as usual. ACCEPTANCE: (a) the composite must still flag all three crash episodes
(2014-Q4, 2018-Q4, Feb/Mar-2020) with `oil_stress` alerts inside their windows,
(b) lift must not fall below the current 1.97×, (c) one run, adopt or reject,
results recorded below.

**RESULT — REJECTED (same day).** With inventories in the composite: `oil_stress`
6h/20fp = 23% = **1.52× lift** (criterion b failed), and the Feb-2020 fire was
DILUTED from Feb-27 to Mar-6 — because US crude stocks did not build until AFTER
the demand collapse. Finding: **at crash scale, inventory builds are a confirming
indicator, not a leading one.** The series stays fetched (`oil.us_crude_stocks`)
for research; alternative transformations (deviation-from-seasonal-norm,
days-of-cover) remain possible future pre-registered candidates but must
demonstrate LEAD, not confirmation. Composite reverted to the four v1 components.

**Fundamental-tier grading window — EXACT SPEC, written before running
(2026-08-08):** the doc claims Domino 1/2 lead by MONTHS, yet its alerts were
graded on a 60-day trading-signal window — a theory/metric mismatch. New rule for
tier=fundamental alerts only: hit = proxy widens ≥100bp within 180 days.
The 100bp bar is BASE-RATE MATCHED, computed outcome-blind from the unconditional
spread history: P(any day passes) = 30.6% at 100bp/180d vs 32.9% for the old
50bp/60d — the longer window pays for itself with a higher bar (rounded AGAINST
us from the exact match of 93bp). Addresses the owner's correct objection that
long windows are trivially right in cyclical markets. One run; results recorded;
open-window alerts honestly revert to pending.

**RESULT — ADOPTED (2026-08-08), then SUPERSEDED same day by spec C-R1** (external
review, finding 8): the 100bp/180d bar was base-rate-matched on POOLED history,
but the reference series has two regimes with different base rates. The bar is
now era-stratified — 100bp (real-CDS era) / 180bp (Ariva era, ≥2019-07-01) — and
the Domino 1 record is published era-split; see the C-R1 spec + result in the
review-remediation section below. The record was then re-derived once more under
the vintage breakeven series (correction 4): **1/1 CDS era · 1/6 + 1 pending
Ariva era** — the earlier pooled "3/3" stays retired.

## Domino 2 — Reserves drain, debt piles up

Deficits get financed by spending savings and borrowing. Each month of cheap oil:
reserves down, debt/GDP up (Bahrain ~150% in current data). Converts a bad year
into a bad balance sheet. Sits here for years sometimes → high false-alarm tier,
attention signal only.

**Tracking now:**
- Debt/GDP and fiscal balance, annual (IMF WEO via DataMapper API — display/
  projection path only; historical scoring uses the WEO **vintage** series below)
- FX reserves + CBB public debt (manual CSV from the CBB bulletin — deliberate
  manual step, `data/manual/README.md`)
- **DSA anchor**: debt-dynamics arithmetic → the haircut L* that would be *needed*
  to restore sustainability. Anchors the band midpoint; restructuring outcomes
  historically cluster near what this arithmetic requires.

### Signal registry (Domino 2) + PRE-REGISTERED SPEC — written 2026-08-08, BEFORE any backtest run

Gate honored: the external review's verdict was "Domino 2 will not start until
those preconditions are in its pre-registration." All four are below. Nothing in
this section may change after the single evaluation run except the recorded
results.

**Data provenance (preconditions 1–3):**

| Series | Source + transformation | Semantics |
|---|---|---|
| `manual.weo_debt_gdp`, `manual.weo_fiscal_bal` | One row per IMF WEO release (Apr+Oct, 2014→present): Bahrain's CURRENT-YEAR estimate in that vintage, from the archived WEO database of that release. `data/manual/weo_vintages.csv` | `obs_date` = WEO **publication date**; as-of stepped; gaps carry forward; pre-2014 dates clamp to the earliest vintage. The live `imf.debt_gdp`/`imf.fiscal_bal` current-vintage fetch is display-only and NEVER feeds historical scoring |
| `manual.reserves_usd_mn` | CBB Monthly Statistical Bulletin, monthly FX reserves USD mn, Dec-2010→present. `data/manual/cbb_reserves.csv` | `obs_date` = month-end (period); extra column `published` = bulletin release date. **All signal computation is as-of `published`**, not month-end — a month's reserves are unknowable until the bulletin ships (~4–6 weeks). Rows without `published` fail closed (unavailable until the next sourced publication) |
| `manual.amortization_usd_mn` | Every Bahrain sovereign international issue (bond + sukuk) outstanding at any point 2015→present: face USD mn at maturity date, incl. matured lines. `data/manual/bond_maturities.csv` | `obs_date` = maturity date; extra columns `isin`, `issued` (issue/settlement date). **Issued-gating**: the wall at date t counts only bonds with `issued ≤ t` — a 2023 issue was not in the 2016 wall. Rows without a sourced `issued` fail closed. Taps/buybacks recorded as separate dated rows so the wall steps honestly |

**Signals** (pure module `src/engine/domino2.ts`):
- `rollover_cover` = reserves (latest published, as-of) ÷ sum of amortizations
  in (t, t+365d] (issued-gated). This is the Greenspan–Guidotti reserves-to-
  short-term-debt ratio — canonical, zero tuned numbers.
- `reserves_drawdown` = 12-month % change in reserves, as-of published.
- **DSA anchor, vintage-correct**: one `derived.dsa_required` point per WEO
  vintage (obs_date = publication date), L* computed from THAT vintage's
  current-year debt/GDP + fiscal balance via the unchanged `dsaRequiredHaircut`
  arithmetic. This REPLACES the current-vintage-over-all-history computation,
  which is the same defect as review finding 1 (stated blast radius: the
  published band-midpoint history shifts; the diff is published whatever it
  shows).

**Alert rules** (both `tier: fundamental` — inherit the frozen C-R1 era bars
100bp/180bp and the 180d window; edge-triggered like every rule in the system):
- `rollover_wall`: fires when `rollover_cover` crosses BELOW 1.0. The 1.0
  threshold is the canonical Guidotti adequacy line, not a tuned number.
- `reserves_drain`: fires when `reserves_drawdown` crosses below a threshold
  solved by the C-R1 procedure — outcome-blind, target exceedance fixed FIRST
  (= the unconditional probability matched to the fundamental tier's bar era
  by era), threshold rounded AGAINST us (toward rarer firing, next whole
  percentage point), derivation recorded here before any grading is looked at.
  **SOLVED (2026-08-08, before the run)**: target = 19.9% (C-R1's frozen
  exceedance); publication-gated 12m drawdown evaluated on all 2,403 proxy days
  2015→today; distribution p50 −2.5% / p75 +22.8% / p90 +45.9% / max +68.2%
  (Bahrain's reserves are structurally volatile — the bar must clear that
  noise floor); smallest whole % with exceedance ≤ 19.9% → **32%** (19.8%;
  31% gives 20.8%). Frozen as `regime_thresholds.drainFromPct = 32`.

**Grading unit (precondition 4 — committed before the run):** an *episode* is a
maximal chain of same-rule flags each within 180d of the previous (C-R2 rule
verbatim); episode grade = FIRST flag's grade; any-hit computed alongside as the
labeled sensitivity, never the headline; bootstrap CI over episodes (10,000
seeded draws, 90% CI). Both flag-level and episode-level scoreboards are
published side by side, permanently. Because Domino 2 inputs step on
*publications* (monthly bulletin, semiannual WEO/REO), each flag's
`details_json` records which publication moved the signal — "fired because the
March bulletin printed X" is part of the record.

**Honest framing, committed in advance:** this is the high-false-alarm
attention tier — deterioration is a process, not an event. The scoreboard is
published whatever it says. Any claim of predictive *skill* requires the
episode-level lift CI to exclude 1×; short of that, the tier is presented as
context (the consequence multiplier for the faster tiers), exactly like
Domino 1. The GCC-backstop caveat (the 2018 $10.2bn Saudi/UAE/Kuwait package;
support probability is political and has no market lead) is stated wherever
the Domino 2 record is shown.

**Acceptance criteria (one run, adopt/reject recorded either way):**
- `rollover_wall` ships as the tier's canonical attention signal regardless of
  its record (its threshold is definitional, not fitted); its record is
  published as-is.
- `reserves_drain` is adopted only if its episode-level record shows lift ≥ 1
  at the point estimate AND does not degrade the fundamental tier's overall
  precision; otherwise rejected and recorded, per protocol.

**RESULTS (single run, 2026-08-08).** Data landed in full: 49 WEO vintage rows
(25 releases 2014→2026; the Apr-2020 WEO published no debt/GDP for ANY country —
IMF-side vintage gap, carried forward), 187 reserve months (Dec-2010→Jun-2026,
zero gaps, 17 bulletins, all overlaps matched exactly), 39 international issues
(all tranche sums cross-check to reported deal sizes; 2016 and 2017 taps
recorded; no sovereign buybacks found — the 2023 "Bahrain LME" was nogaholding,
an SOE, excluded).

- **`rollover_wall` (ships as pre-committed; canonical threshold): 3 flags →
  2 episodes = 1 hit / 1 FP.** 2020-06-02 (shortfall $196mn, COVID) graded FP —
  market access + the GCC backstop absorbed it. 2025-01-27 episode (re-fire
  2025-06-02) graded HIT (+180bp within window). 90% CI is uninformative at
  n=2 (0–100%) — the rule is an attention signal, not a skill claim, and is
  presented as such. Notable and presentable: the wall correctly did NOT fire
  in 2018 — calendar-2018's only international maturity was the $750mn Nov
  sukuk, always covered by reserves; **2018 was a drain crisis, not a wall
  crisis.**
- **`reserves_drain` — REJECTED** per the frozen criterion. 8 flags → 6
  resolved episodes, first-flag hits 1 → **16.7% vs 19.9% base = 0.84× lift**
  (< 1; any-hit sensitivity 33.3%; 90% CI 0–50%). The full flag record
  (removed from the live scoreboard per the oil_alarm retirement precedent,
  preserved here): 2015-11-02 FP (+48.3%), 2017-07-31 FP (+33.4%),
  **2018-05-02 HIT (+49.4% — five months before the GCC rescue, the exact
  slow-burn the rule exists for)**, 2018-10-31 FP (+56.7%, fired into the
  post-package rally), 2020-04-30 FP (+44.3%), 2025-06-02 FP, 2025-10-31 hit
  (chained to the 2025-06 episode, so it counts only via any-hit),
  2026-06-30 pending (+51.8% — the condition is live today). Near-miss note,
  recorded for honesty: the Oct-2018 re-fire missed chaining into the May-2018
  hit episode by TWO days (182d gap vs the 180d window); chained, the record
  would be 1/5 = 20.0% ≈ 1.005×. The window was frozen before the run and is
  not re-litigated after seeing the data. `drainFromPct` reset to null
  (disarmed); the drawdown remains a context display on /domino2. A future
  variant (e.g. drawdown + wall-proximity conjunction) may be pre-registered,
  but NOT iterated-until-it-passes.
- **DSA re-anchor diff (committed blast radius):** `derived.dsa_required` went
  from 37 year-end points (today's WEO applied to all history) to 24
  publication-dated vintage points. Old→new at the visible end: 2020 68.3% →
  64.6% (Oct-2020 vintage), 2021 60.4% → 56.8%–59.9%, 2022 49.6% → 44.8%–49.3%,
  2023 59.3% → 50.6%–57.5%, 2024 63.1% → 55.6%–57.0%, 2025 67.4% → 63.7%–64.3%,
  2026 65.8% → 65.8% (unchanged — current vintage). Early history is now
  honest: L* ≈ 0% in Apr-2014 (debt 45.8%/GDP), 36→62% through the 2015–16
  crisis. Band-midpoint history shifts accordingly (w=0.5 anchor weight).

**Data caveats (recorded, affect interpretation not validity):** reserves are
CBB bulletin Table 1 Foreign Assets (gold+FX) — NOT the SDR-inclusive IMF-style
GIR (add ~$0.8bn post-2021 for that); gold revalued book→market from Dec-2025
adds a ~$0.6–0.8bn valuation (not flow) step; publication dates pre-2024 use the
M+1 upload rule (±2–6 weeks) because the CBB's 2024 site migration destroyed
original upload paths; three private placements (2022–23) were found only via
database listings, so further unlisted placements may exist — a missing issue
UNDERSTATES the wall (conservative direction for cover, aggressive for
shortfall-firing; noted). Discovered en route: the `BONDS` anchor XS1324931895
carries maturity 2026-01-12 but every external source says **2026-01-26** —
flagged for a separate fix (it feeds the calibration golden path; the wall CSV
uses the correct date).

## Domino 3 — The curve inverts

First domino living in market prices. Default worry concentrates on the near
future → short-dated bonds sell off harder than long-dated → inversion. Preceded
Lebanon/Sri Lanka/Zambia restructurings.

**CORRECTION (2026-08-08 — the earlier framing here did not survive testing).**
This section previously claimed "inverted Sep-2017, nine months before Bahrain's
2018 peak; weeks of lead, low false-alarm rate — the workhorse tier." Measured
against our own data, none of that stands:
- **The Sep-2017 lead claim is unverifiable**: the 2047 long leg was ISSUED
  Sep-2017, so the slope series is born already-inverted (+43.7bp on its first
  day, 2017-09-18). We never observed the curve turn. And the inversion peaked
  (+76.2bp, 2018-07-03) in the same week as the 2018 spread peak — coincident,
  not nine months ahead.
- **"Low false-alarm rate" is false**: `inversion` is the chattiest rule in the
  DB — 61 flags over 7 underlying episodes; under the flat 50bp/60d bar it
  graded 13/48 (21%), and in the very era the old claim cited (2017–2019),
  1 hit in 20 flags.
- What the tier is actually good for, per the record: **regime confirmation and
  acute repricing** — the Mar-2020 cluster went 3/3 (fired 2020-03-05, inside
  the COVID/OPEC crash window), and the 2024-08→2025-03 cluster led the
  current distress. It is a state indicator that re-fires on every zero
  re-crossing, not a rare clean siren; the episode view is the honest unit.

**Measured episode map (slope ≥ 0, runs merged across ≤30d gaps; 42% of all
observed days are inverted):** 2017-09→2018-10 (395d, peak +76), 2018-11→2019-07
(228d, +20), 2020-03→2021-03 (384d, +146), three noise-level blips ≤6bp
(2021×2, 2024), and **2025-03-04→open — the largest inversion on record (peak
+209bp), still running.**

**Tracking now:**
- Daily traded prices for 4 live Bahrain USD eurobonds (Ariva) → yield → spread
  over interpolated UST (FRED curve)
- **Proxy 5Y CDS**: bond spreads minus per-ISIN calibrated gaps (calibrated on the
  real 2015–19 CDS; validation stats reproduced to the basis point in tests)
- Signals: spread **level percentile** (3y window), **20-day trend** (bp/day),
  **curve slope** = mid(≈5y) − long(2047) spread; inversion > 0
- **Leg provenance** (slope registry): 2017-09-18→2020-09-04 mid = 6.75% 2029
  vs 7.5% 2047; 2020-09-07→present mid = 5.625% 2031 vs 2047 (longest fresh
  mid wins; ≤7d staleness; short legs never actually selected). Pull-to-par
  trims (550d) mean that **after 2030-03-29 no mid/short leg survives — the
  slope series dies unless a newer bond is added to `BONDS`.**

### Pre-registered spec C-R3 — era-stratified CURVE grading bar (written 2026-08-08, before the re-grade)

**Problem** (the fundamental tier's finding 8, present unfixed at curve tier):
curve alerts (`inversion`, `level_pct`, `slope_20d`) grade at a flat 50bp/60d.
Measured on the post-A2 proxy, a random day clears that bar 17.76% of the time
in the real-CDS era (106/597) but **35.64%** in the Ariva era (628/1,762) — the
apparent era hit-rate jump (inversion 5.0% → 29.3%) is plausibly bar difficulty,
not skill.

**Frozen procedure, target fixed before solving** (C-R1 verbatim, curve tier):
target exceedance = CDS-era rate at the adopted bar = **17.76%**; era boundary
2019-07-01; Ariva bar = smallest 10bp-rounded level with exceedance ≤ target.
Sweep: 80bp → 20.72% (overshoots), **90bp → 16.23%** → adopted, rounded AGAINST
us. Window stays 60d. Solve is outcome-blind (unconditional exceedance only).
Applies to all three curve rules in one run; all three records re-derive and are
published era-split, whatever they say.

**Result (single run, 2026-08-08) — published as-is.** CDS-era records unchanged
by construction; Ariva-era hits fell across all three rules, as the honest
direction predicted:

| Rule | CDS era (bar 50bp) | Ariva era, OLD (50bp) | Ariva era, C-R3 (90bp) |
|---|---|---|---|
| `inversion` | 1/20 | 12/41 (29.3%) | **10/41 (24.4%)** |
| `level_pct` | 3/5 | 20/28 (71.4%) | **10/28 (35.7%)** |
| `slope_20d` | 3/10 | 25/62 (40.3%) | **13/61 (21.3%) + 1 pending** |

Reading: `level_pct`'s flattering 71% was half bar-easiness — the honest number
is ~36%, still ~2× the 16.2% matched base and the best-graded rule in the
system. `inversion`'s episode-level record (C-R2 rule, 60d window): 61 flags
reduce to 12 episodes — **2/12 first-flag hits (16.7%, 90% CI 0–33%; any-hit
25%)** vs the 17.8% matched base — i.e. at episode level the inversion rule
cannot currently claim skill; its Mar-2020 episode (3/3 flags) remains the
showcase acute-repricing catch. The 2017–2019 era stays 1/20 — the
born-inverted period was genuinely uninformative, which the corrected section
above now says out loud.

## Domino 4 — The visible blowout

Spreads gap, ratings act, mandate-driven forced sellers meet a no-bid market.
This is when the average bank reacts — and when acting is most expensive. The
tool's whole purpose is to move the reaction to domino 3.

**Tracking now:**
- Regime flag calm/watch/distress (scored 0–100, hysteresis so it doesn't flap)
- Edge-triggered alerts per rule, persisted and **graded** hit/false-positive after
  a fixed window — the false-positive rate is a first-class KPI
- Pre-computed **scenario matrix** (oil shock × GCC support state → expected spread
  move + action) so a shock day executes a playbook instead of convening a meeting

### Pre-registered spec C-R4 — grading the REGIME FLAG's transitions (written 2026-08-08, before the run)

**Motivation** (owner's challenge, accepted): the per-rule alert tables carry
too many false alarms to act on — measured, not disputed (inversion episodes
16.7% vs 17.8% base). The design answer is confluence: the composite regime
flag requires multiple independent signals AND hysteresis. If the flag has
skill where single rules don't, IT is the system's headline alarm; if it
doesn't, that gets published too. Frozen before any outcome is looked at:

- **Event**: a day the persisted walk-forward regime (nowcast_snapshots,
  hysteresis applied) ESCALATES — rank calm(0) < watch(1) < distress(2);
  `degraded` days carry the last known regime (no event). A same-day jump
  calm→distress is ONE event, characterized by its destination. Entries into
  watch and into distress are graded separately AND combined.
- **Grade**: identical to the curve tier (the regime is a market-speed
  object): hit = proxy widens ≥ the era bar (C-R3: 50bp CDS era / 90bp Ariva
  era) within **60 days** of the transition day. Coverage rule applies (no FP
  stamp while the reference tail is unfetched); windows still open = pending.
- **Base rate**: the same era-matched targets (17.76% / 16.23%) — a random
  day passes the bar about that often; the flag must beat it.
- **Uncertainty**: bootstrap over transition events (10,000 seeded draws,
  90% CI on hit rate and lift), same machinery as C-R2.
- **De-escalations** (into calm) are reported descriptively (count + what
  spreads did after) but NOT graded — the alarm claim under test is
  escalation.
- **Publication**: era-split where n allows, event dates listed, published
  whatever it says. No threshold in this spec is new or tunable — every
  number is inherited frozen (regime thresholds untouched since adoption;
  bars from C-R3).

**RESULT (single run, 2026-08-08) — the flag has skill; the first (and, after
the audit's Oman calm→watch demotion, the only BAHRAIN) CI in the system to
exclude no-skill. Audit 2026-08-08: reproduced exactly from the DB and
strengthened under cluster/joint bootstrap stress — P(no-skill) ≈ 1.2%.**

| Slice | Record | Hit rate | 90% CI | Lift vs 17.76% base |
|---|---|---|---|---|
| **ALL escalations** | **8/17 (+1 pending)** | **47.1%** | 29–65% | **1.66×–3.64× — excludes 1×** |
| → watch | 3/7 | 42.9% | 14–71% | 0.80×–4.02× |
| → distress | 5/10 (+1 pending) | 50.0% | 20–80% | 1.13×–4.50× |
| CDS era | 1/3 | 33.3% | — | n too small |
| Ariva era | 7/14 (+1 pending) | 50.0% | 29–71% | 1.61×–4.02× |

Event log (all 18, published): 2017-06 watch FP (+3bp) · **2018-05-21
watch→distress HIT (+245bp — the 2018 crisis, caught at escalation)** ·
2018-07 re-escalation FP · 2019-08 watch FP · **2020-03-02 calm→watch HIT
(+536bp) and 2020-03-10 watch→distress HIT (+387bp — COVID caught at both
stages)** · three 2020 post-crash re-escalations FP (+23/−17/+9bp) ·
2022-11 watch HIT (+109bp) · 2023-01 FP · 2023-03 watch HIT (+102bp) ·
2024-07 FP (+61bp, just under the 90bp bar) · **2025-03/05/12 distress
re-entries 3 HIT (+150/+132/+96bp)** · 2025-04 FP (+67bp) · 2026-07-03
pending (+60bp so far, window open).

**Honest caveats, stated up front:** (i) n=17 resolved events, and they are
not fully independent — 2020 alone contributes five and the 2025 distress arc
four; the bootstrap treats events as exchangeable, so the effective sample is
smaller than 17. The CI excluding 1× survives this qualitatively (the hits
span five separate crisis arcs: 2018, 2020, 2022-23, 2025×2) but the point
estimate should be quoted as "≈2.5× lift, small n" never as a precise number.
(ii) The de-escalation log (16 events, descriptive) exposes a real weakness:
the two distress→watch de-escalations INSIDE the current crisis (2025-03-27,
2025-05-12) were each followed by +175/+185bp — the hysteresis released too
early in a grinding crisis. A future pre-registered candidate: longer
dwell/exit asymmetry; NOT tuned casually.

**Presentation rule**: this — not any single rule — is the system's alarm
number: "when the composite flag escalates, spreads follow through past a
base-rate-matched bar ~47% of the time vs ~18% for a random day; the 90% CI
on lift excludes 1×; single-rule alerts are audit trail, not signals."

**Served live**: the /domino4 page recomputes this scoreboard from current
data on every request (same frozen method — extractor `regimeEscalations`,
era bars, 60d window, bootstrap CI). Its numbers will drift from the frozen
record above as pending events resolve and new escalations occur; the frozen
record stays here as the as-evaluated reference.

## Domino 5 — Distressed prices make the haircut observable

Once a bond trades far below par, price ≈ expected recovery, so **1 − price** is
the market's own haircut estimate. Bahrain data: ~20% calm baseline → 35% (2018),
33% (Mar-2020), ~40–48% (2022–25, partly rates-contaminated). This is the number
everyone cares about, and it is the *second-to-last* thing to move.

**Tracking now:**
- Long-bond (2047) price floor, daily
- **Implied haircut band**: floor (hard lower bound) + restructuring-history prior
  [20%, 75%] + DSA anchor pulling the midpoint. Band, not point — spread ≈
  probability × haircut is one equation with two unknowns.
- Known contamination: on a 21y bond, 1 − price mixes rates risk with credit risk
  (the 2022 spike was mostly rates). Fix candidate for the rebuild: use
  spread-implied rather than raw price.
- **Served on /domino5** (2026-08-08): price + threshold chart, band with
  informative shading, and — surfaced for the first time — the Merrick fit
  diagnostics that live in benchmark meta (basis census: cds 830 / bond 1462 /
  fit 339 days; the 15pt gate rejected the fit on 1,913 of 2,631 days — the
  gate, not the 3-bond rule, is the binding constraint). Domino 6 is a context
  card on the same page (nothing live, by design). No new measurement.

## Domino 6 — Restructuring sets the realized haircut

If the chain completes, committees and lawyers — not markets — fix the loss:
Greece 2012 ≈ 53%, Iraq 2006 ≈ 89%, preemptive deals ≈ 20% (Cruces–Trebesch
database). Depends on creditor mix, governing law, IMF presence, GCC politics —
none of it in a price feed. Bahrain has never let the chain run past domino 4
(2018 GCC package = $10.2bn circuit-breaker).

**Tracking:** nothing live — inherently unpredictable from market data. The prior
band [20%, 75%] and the DSA anchor are how this domino enters the model. GCC
support stays a scenario branch (supportive / ambiguous / withdrawn), never a
forecast.

---

## How the haircut number is calculated

There is no single market formula ("Brent + rating = haircut" doesn't exist anywhere —
if it did, everyone would use it). The haircut is **assembled from three independent
estimates**, each answering the question a different way, blended into one band:

```
Ingredient A — what the MARKET says (only speaks when bonds are distressed):
    floor = 1 − bond price/100          ← a hard LOWER bound on the haircut

Ingredient B — what the FISCAL ARITHMETIC says (the DSA anchor):
    project debt/GDP forward 5 years, then
    L* = 1 − (sustainable debt target ÷ projected debt)
                                        ← "how much relief would be NEEDED"

Ingredient C — what HISTORY says (the prior):
    past sovereign restructurings ranged ≈ 20% (friendly) … 75%+ (oil collapse)
                                        ← the band can never leave this range

Blend:
    midpoint  = ½ × L*  +  ½ × max(floor, 47.5%)
    band      = midpoint ± width, clamped to [20%, 75%], never below the floor
    (width comes from proxy-calibration error + current stress level)
```

### Where each variable you'd want to track actually enters

| Variable | Enters through | Effect on the haircut number |
|---|---|---|
| **Brent price** | Ingredient B: oil ↓ → deficit ↑ → debt path ↑ → L* ↑ (via the fiscal sensitivity: −$10/bbl ≈ −1.5% of GDP). Also drives the *timing* signals (domino 1). | Slow, structural. −$20 Brent sustained ≈ +2–3 pts on L* per year it lasts |
| **Bond price (2047)** | Ingredient A directly | Fast. Every point the bond falls below par when distressed ≈ +1 pt on the floor |
| **Debt/GDP** (IMF) | Ingredient B: the starting point of the projection | Biggest single driver of the midpoint |
| **Fiscal balance** (IMF) | Ingredient B: the slope of the projection | Second-biggest |
| **CDS/proxy spread** | Band **width** and the regime flag (timing) — NOT the level | Spread alone can't give a haircut: spread ≈ probability × haircut, one equation, two unknowns |
| **Agency ratings** | **Deliberately not an input.** Ratings lag the market by weeks (2018: markets repriced from Sep-2017, downgrades came mid-2018). They matter at domino 4 because they *force other people* to sell — a timing signal for the blowout, not information about the haircut | none directly |
| **GCC support** | Scenario branches only (×0.5 / ×1 / ×2 multiplier) — political, unforecastable | Shifts everything, timing unknowable |

### Worked example — today's actual numbers (2026-08-06)

**Ingredient A (market floor):**
2047 bond price = 81.9 → floor = 1 − 0.819 = **18.1%**
(below the 20% historical minimum, so effectively: "market sees mild distress")

**Ingredient B (DSA anchor), latest full WEO year (2025):**
- Debt/GDP = 147.6% (IMF)
- Overall balance = −13.0% of GDP (IMF)
- Primary balance ≈ −13.0 + interest add-back (6.5% × 1.476) = **−3.4%**
- Project 5y at r = 6.5%, g = 4.0% → debt reaches **184% of GDP**
- Sustainable target = 60% → L* = 1 − 60/184 = **67.4%**

**Blend:**
- midpoint = ½ × 67.4% + ½ × max(18.1%, 47.5%) = ½ × 67.4 + ½ × 47.5 = **57.5%**
- band = clamped to prior and widened for uncertainty → **20% – 57.5% – 75%**

That reconciles exactly to what the dashboard shows today. Reading it in words:
*"the market is only mildly worried (bonds at 82), but the fiscal arithmetic says a
deep restructuring (~67%) would be needed if it ever came to that — so our best
guess sits near 57%, with honest uncertainty spanning 20–75%."* The wide band IS
the finding: market pricing and fiscal reality currently disagree, and the gap
between them is the GCC-support assumption.

### Sensitivity (what moves the number tomorrow)

- **Brent −$20 sustained** → primary balance −3 pts → L* ≈ +2 pts/yr of projection → midpoint +~1–2 pts (slow burn)
- **2047 bond falls 82 → 60** (Mar-2020-style) → floor jumps 18% → 40% → band lower edge snaps up to 40%, midpoint follows (fast)
- **IMF revises debt/GDP +10 pts** → L* +~3 pts → midpoint +~1.5 pts (annual step)
- **A real restructuring announcement** → the band collapses toward the negotiated
  number and this tool's job is over (domino 6 belongs to lawyers)

---

## Reference haircut benchmark (the scoring target)

Simulations are judged against a historical "what the haircut really was" range,
stored separately and never read by the model. v2 construction, following deep
research into the recovery-estimation literature:

- **Merrick cross-sectional fit** (Merrick 2001 — Russia/Argentina 1998; Pan–Singleton
  2008 for identification): jointly fit a constant default rate and a
  recovery-of-face R to the day's 4-bond price curve. One bond can't separate
  default probability from recovery; a 2y–21y curve can. Band = profile likelihood
  on R (±1.75pt retail-quote noise) blended with a prior (R ≈ 55 ± 15: Moody's
  sovereign recovery studies, never-defaulted + GCC backstop).
- **Consistency gate**: the tight fit band is used only when the fitted haircut
  agrees with the cheapest-bond price floor within 15pts. On steep price curves the
  constant-hazard fit collapses into implausible corners (hazard–recovery
  collinearity; Pan–Singleton found defensible fits differing by ~50pts) — those
  days fall back to the transparent floor/proximity-width range.
- **Resulting widths**: ±5 today (fit accepted, band 19–29%); ~±8 across 2025–26;
  ~±10–14 floor-based in the 2018 / Mar-2020 crises (34–54% and 33–48%); wide in
  calm years by design — near-par bonds genuinely don't price recovery.
- **Honesty labels**: everything is *market-implied* (risk-neutral). As a predictor
  of an eventual negotiated haircut, published evidence caps accuracy at ±8–12pts
  (at-default prices understate final recovery by ~10–13pts — Russia, Ecuador;
  Sri Lanka bonds traded 25–40 vs a final NPV haircut under 10% in scenarios).
- Key sources: Merrick (J. Banking & Finance 2001), Pan & Singleton (JF 2008),
  Duffie–Singleton (1999) on why recovery-of-market can never be identified,
  Andritzky (JFI 2005), Moody's sovereign default studies, Cruces–Trebesch (2013).

---

## Evaluation protocol — FROZEN v1 (2026-08-07)

The anti-overfitting contract. All scoring thresholds across every tier (credit
regime, oil-stress composite, alarm families, alert grading rules) are frozen as
of today as **v1**. From here on:

0. **Version-control choreography (adopted 2026-08-08, audit A1).** This doc is
   git-tracked in theArchive; its history is the pre-registration audit trail.
   Every spec change is TWO commits: a **spec-commit** (the registered spec,
   before any evaluation runs) and a **results-commit** (the recorded outcome,
   after the single run). A spec whose evaluation cannot point at an earlier
   spec-commit is self-attestation and does not count as pre-registered.

1. **Any proposed change must be specified before it is evaluated** — write the
   rule down first, then test it. No browsing history for what "would have worked".
2. **Leave-one-episode-out**: improvements motivated by one episode (e.g. 2018-Q4)
   must be validated on the episodes they were NOT designed against (2014, 2020).
   A tweak that only helps its inspiration episode is rejected.
3. **Data additions are not tuning**: activating an already-specified component on
   new history (e.g. EIA WTI contango, thresholds fixed before its history was
   seen) is a true out-of-sample test — the re-scored backtest is evidence, not fitting.
4. **Both operating points are reported**: `oil_stress` (sensitive, more false
   alarms) and `oil_alarm` (2-of-3 independent families + falling-trend gate;
   strict). *[SUPERSEDED markers, audit 2026-08-08: the "~2× base-rate hit
   ratio" here is the flag-level point estimate — C-R2's episode-level 90% lift
   CI (0.47×–3.29×) includes 1×, so "~2×, provisional" is the only honest
   phrasing. `oil_alarm`'s verdict is no longer "pending": it was measured at
   1.05× at crash scale and RETIRED 2026-08-07 — see the retirement record.]*
5. **The scoreboard is never curated.** False positives stay on the page.

### Protocol additions (2026-08-08, adopted from the independent audit — forward rules, no past verdicts relitigated)

- **Robustness annex is standing method for headline claims.** Any claim
  presented as a headline (a CI excluding no-skill, an adopted lens's lift)
  must also report the audit's two stress variants: (i) an **arc-cluster
  bootstrap** (resample crisis arcs, not individual events — events inside one
  arc are not exchangeable) and (ii) a **joint bootstrap** over the base-rate
  estimate and the hit rate. Audit reference results: Bahrain C-R4 escalations
  survive both (**P(no-skill) ≈ 1.2%** under cluster/joint stress —
  reproduced independently from the DB); Oman inversion survives (P 0.8–2.2%);
  Oman calm→watch does NOT (P ≈ 9.7%) and was demoted accordingly.
- **O-R1 rounding fork, recorded:** O-R1 solved its bars by NEAREST match
  (fundamental 50bp → 22.43% vs target 19.9%) where C-R1/C-R3 round AGAINST
  us (next level with exceedance ≤ target — which would have picked 60bp →
  16.15%). Sensitivity row, computed at audit: at the against-us 60bp bar the
  Oman fundamental record's only graded rule (breakeven_gap 1/2) is
  unchanged; the curve bar fork (30bp nearest vs 40bp against-us → 10.84%)
  would harden the inversion exam — the inversion episode CI excluding
  no-skill survives at 30bp and is expected to survive at 40bp but that run
  has NOT been performed; any future Oman re-derivation must use the
  against-us convention and note this fork. Convention now unified: ALL
  future bar solves round against us.
- **Noise-aware acceptance for FUTURE specs:** a candidate is rejected on
  precision grounds only if precision degrades beyond bootstrap-CI overlap of
  the incumbent's record, OR by an explicitly pre-committed false-positive vs
  missed-episode price stated in the spec. (Motivated by C2's
  rejected-by-a-hair 1.90× vs 1.97× — a difference well inside noise. C2 is
  NOT retroactively adopted; the rule applies forward only.)

## Audit remediation specs (2026-08-08) — registered BEFORE their evaluations

### Pre-registered spec B1 — CFTC publication gate (correction-log class: lookahead fix)

**Defect (audit B1):** `fetchers/cftcCot.ts` stamps COT rows at the Tuesday
`report_date`; the CFTC publishes Friday ~3:30pm ET. The composite therefore
read positioning ~3 days before it was public — the same defect class as the
OPEC announced-date fix (correction 3).

**Fix, frozen:** stamp each row's `obs_date` = report_date **+ 3 days** (the
Friday it became knowable); `meta.report_date` keeps the Tuesday. No
threshold, weight, or window changes; the crowding percentile and composite
read the same values 3 days later. One backfill re-run; the full oil-tier
flag-record diff is published below whatever it shows. Audit's measured
expectation (recorded before our run): only four historical fires were
crowding-decisive — 2011-02-22 (pre-composite era), 2020-07-23/30,
2020-10-21 — all FPs; no HIT depends on crowding timing; the Feb-2020 fire
had crowding = 0 points.

**RESULT (single re-run, 2026-08-08; before/after records preserved).**
1,051 Tuesday-stamped rows replaced by 1,052 Friday-stamped rows
(2006-06-16→). The oil flag record re-derived:
- **The hit set is IDENTICAL — 19/19 hits unchanged**, including the
  2020-02-28 composite fire (crowding contributed 0 points to it, as the
  audit predicted).
- False positives moved exactly where the lookahead lived: **removed**
  2020-07-23, 2020-09-10, 2020-10-21, 2020-10-28 (the post-crash
  crowding-decisive fires — with publication-correct timing the composite
  never crossed 50 on those days); **added** 2011-02-25 and 2011-05-11
  (the pre-composite-era 2011 crowding fire lands on its publication date
  and edge-triggering re-arms once more); **shifted by 1–3 days** the two
  2015-04 FPs.
- Net records: `oil_stress` 12h/29fp → **12h/27fp (39 flags)**;
  `contango_flip` unchanged 7/30 (crowding isn't an input to it). The
  correction slightly IMPROVES measured precision — reported as a
  correction, not claimed as skill.

### Pre-registered spec C-R4v2 — distress dwell/exit asymmetry (hysteresis revision, VERSIONED)

**Motivation (from the record, mechanism not outcome-scan):** the hysteresis
releases distress at the chatter time-scale (dwell 5bd, exit at entry−10)
while distress is GRADED at the 60-trading-day scale. Consequence, visible
twice: 2025's two distress→watch releases were each followed by +175/+185bp
inside the open crisis, and 2020's three post-crash re-escalation FPs are the
same mechanism mirrored (fast release → prompt re-entry → each re-entry
graded as a fresh escalation into an exhausted move).

**Parameterization, fixed blind (time-scale argument only):** leaving
DISTRESS (only) requires **dwell ≥ 20 business days** (≈ one grading month —
a quarter of the 60d exam window; the chatter scale stays for watch) AND
**score < distressAt − 20** (double the generic exitBelow=10 — symmetric
with how distress entry is twice watch's severity). Watch entry/exit and all
scoring components untouched. Frozen: `distressDwellDays = 20`,
`distressExitBelow = 20`.

**Evaluation (ONE run):** replay the full history with v2 hysteresis (all
else byte-identical), extract escalations, grade by the frozen C-R4 method
(era curve bars, 60d, seeded bootstrap). **Publish v1 and v2 side by side,
permanently**; the original C-R4 record remains the citable historical
record; the LIVE persisted regime stays v1 (adopting v2 live would be a
further pre-registered step, not taken here). Success criteria stated in
advance: fewer intra-crisis re-escalation FPs and fewer premature releases,
without losing the 2018/2020/2022/2025 first-entry hits; published either way.

**RESULT (single run, 2026-08-08; reproducible via
`scripts/research/cr4v2-evaluate.mjs`; served live on /domino4):**

| Variant | Escalations | Hit rate | 90% lift CI | De-escalations |
|---|---|---|---|---|
| **v1 (LIVE, citable)** | **8/17** (+1 pending) | 47.1% | **1.66×–3.64×** | 16 — incl. the premature 2025-03-27/05-12 releases (+175/+185bp after) |
| **C-R4v2** | **6/13** (+1 pending) | 46.2% | **1.30×–3.90×** | 12 — the 2025 premature releases GONE (distress held Mar-2025→May-2026) |

Success criteria: **met.** (i) Premature releases eliminated — under v2
distress entered 2025-03-07 and held through the crisis (release 2026-05-26,
followed by +90bp — still early, noted). (ii) Intra-crisis re-escalation FPs
fell (2020-05-29 and 2025-04-09 disappear; 2020-07-15/09-24 remain). (iii)
Every FIRST-entry hit kept: 2018-05-21, 2020-03-02, 2020-03-10, 2022-11-25,
2023-03-17, 2025-03-07. What v2 loses: the 2025-05-26 and 2025-12-23
re-entry "hits" — which existed only BECAUSE v1 released early; counting them
as fresh skill was the exact artifact the audit flagged. Honest netting: v2's
hit rate is the same, its CI is wider (fewer events) but still excludes 1×,
and its event log is cleaner. **Disposition per spec: both records published
permanently; v1 remains the live regime and the citable number. Adopting v2
as the live hysteresis is a candidate future spec, not taken now.**

### Corrections (audit latent-bug fixes, 2026-08-08 — measurement guards, no grade changed)

- **transitionStats degraded-rank fix**: `degraded` days previously ranked 0,
  so distress→degraded→distress sequences miscounted as fresh entries into
  distress in the DIRECTIONAL stats (display-level; the C-R4 extractor was
  always correct). Degraded days now carry the last known regime everywhere.
  Effect: Bahrain /api/evaluation unchanged (no mid-crisis degraded gaps);
  Oman's directional stats shifted (its history has degraded stretches).
  README's stale "distress widened 64% at +20bd" updated to the corrected
  55% (n=11) WITH its 43% any-calm-day baseline.
- **Grading coverage guard**: a false positive now additionally requires ≥1
  reference observation INSIDE the grading window (a window spanning a pure
  data gap can never prove the move didn't happen). Re-derived every grade:
  **zero changes** — the guard is protective for future gaps, not
  retroactive.
- Also fixed with no record impact: benchmark v1-fallback long-leg hardened
  to `leg==="long" && !fitOnly`; Ariva parse-time price sanity gate (20–130);
  stored-param schema failures now log loudly (a frozen threshold silently
  reverting to default must be seen); partial fetch runs log `warn` (not
  `ok`) in fetch_log and surface as "partial" in the UI; CFTC $limit
  headroom documented.

### Pre-registered decision — rejected recovery rules stop generating live rows

Mirroring the peg disposition: a recovery rule REJECTED at evaluation
(currently exactly `oil_above_breakeven`, rejected 2026-08-08 at 0/1) stops
generating rows dated after its rejection date; historical rows are retained,
labeled `experimental` on every surface (API row field + UI suffix), and stay
out of scoreboard headlines. No grades change.

## Candidate-signal specs P2-C1/C2/C3 (registered 2026-08-08, BEFORE any solve or evaluation)

Owner objective, which sets the acceptance frame: **reduce false positives
reaching the desk without losing hits.** Each candidate is evaluated in TWO
roles inside ONE registered evaluation: (a) standalone alert rule, (b)
conditioning/confirmation input on the historical desk-view items (the P2-P1
population) — the wall-lens precedent. Common commitments, frozen now:

- **Eligibility convention** (reused, not invented): live, non-fitOnly bonds
  more than 550 days from maturity (the bundle's pull-to-par constant) —
  this addresses C1's short-leg pull-to-par confound by the standing rule.
- **Standalone grading**: new rules grade on the RESIDUAL (P2-L1
  re-expression), widening, 60d window, era bars 80/110bp; C-R2 episodes
  (60d chain), flags before 2017-08-22 unresolvable. **Standalone
  acceptance — pre-committed hard bar**: a NEW desk-reaching rule is adopted
  only if its episode-level lift 90% CI EXCLUDES 1× in the single run
  (adding a rule ADDS desk items, so point-estimate lift is not enough given
  the owner's objective); otherwise not generated live, record kept.
- **Conditioning role (b)**: for every gradable P2-P1 desk item, the
  candidate's confirmation STATE is computed as-of the item's date
  (walk-forward by construction — all measures are trailing-window; state
  uses the latest measure date ≤ item date, ≤7d stale; items before the
  measure exists are "unknown" and reported separately). Measured: hit rate
  of confirmed vs unconfirmed items, era-split, with a seeded bootstrap
  (10k, seed 42) 90% CI on the hit-rate DIFFERENCE. **Adoption =
  display-layer confidence badge on desk cards ONLY** (like the wall
  annotation): pre-committed tradeoff price is ZERO — no suppression, so no
  hit can be lost by construction; suppression would require its own
  stronger registration. Adopted iff the pooled difference CI excludes 0 in
  the mechanism's direction.
- **Firing thresholds**: solved OUTCOME-BLIND before grading by frequency
  matching at the frozen 19.9% target (the drainFromPct procedure), rounded
  AGAINST us (toward rarer firing), grids stated per candidate. Solves are
  recorded with neighbors.
- One evaluation per candidate; era-split everything; flag-unit caveats as
  usual; published whatever it says. Any change to what reaches the desk is
  itself a registered decision (this spec registers only: possible new
  standalone rules per the hard bar, and possible display badges).

### P2-C1 — price compression ("trading on price", the domino-4→5 marker)

**Mechanism:** as restructuring becomes priced, bonds across maturities
converge toward a common dollar price (expected recovery); the market stops
trading yield and starts trading price. Definitionally the domino-4→5
transition.

**Measure:** daily cross-sectional **dispersion = max − min clean price**
($ points) across eligible bonds, requiring ≥3 eligible bonds; ≤7d-stale
as-of prices; evaluated on the proxy's trading days. Not normalized —
dollar-price dispersion is the object the mechanism talks about. **The state
is JOINT, because low dispersion also happens near par in calm markets:**
`compression = (avgPrice < 85) AND (dispersion ≤ D)` — 85 is the FROZEN
`price_floor_threshold` (the existing distress convention, not a new
number). D solved on a $1 grid: the LARGEST whole-dollar D whose
unconditional state share ≤ 19.9% (rounding DOWN = against us).

**Standalone rule** `price_compression` (tier curve-speed): edge-triggered
on state entry; claims further deterioration (the transition completes
toward domino 5) → graded on residual widening per the common frame.
**Conditioning state**: compression active as-of the desk item's date.

### P2-C2 — GCC-support decoupling

**Mechanism:** Bahrain trading as "Saudi's problem" = tight co-movement with
GCC peers. Bahrain widening while peers don't = the market repricing the
support assumption — the difference between a 2018-style caught chain and a
completion.

**How this differs from the residual lens (stated at registration):** the
residual strips GLOBAL EM beta + US rates; this candidate strips the PEER
co-movement specifically — the support-premium channel. The overlap risk is
real, so a **redundancy criterion is pre-committed**: if the weekly-change
correlation between the decoupling measure and the residual over their
common window is ≥ 0.8 in absolute value, the verdict is "redundant — fold
into a future residual-lens peer variant", with NO adoption in either role.

**Peer basket, honest:** Oman only — the sole peer with seeded price history
(Jordan/Egypt exist as verified ISINs in the recon, unseeded; a future data
addition can widen the basket under a new spec). The Oman proxy LEVEL
carries the borrowed-ratio assumption; the measure below is a CHANGE, which
that constant largely cancels out of (documented).

**Measure:** `decoupling_60` = (BH proxy − OM proxy) at t minus the same gap
60 common observations earlier — Bahrain widening RELATIVE to Oman over
~3 months. Threshold: smallest 10bp level whose unconditional exceedance
share ≤ 19.9% (rounded UP = against us).

**Standalone rule** `gcc_decoupling`: edge-triggered crossing ≥ the bar;
graded on residual widening per the common frame. **Conditioning state**:
`decoupling_60 ≥ bar` as-of the item's date.

### P2-C3 — liquidity evaporation

**Mechanism:** markets empty before they crash — "no bid" is domino 4 from
the inside. We have treated Ariva print gaps as a data quirk; this spec
inverts them into a signal.

**Infrastructure-vs-market confound, addressed:** historical prints were
seeded from full Ariva MONTH pages (and the daily fetcher re-fetches
current + prior month, self-healing transient outages) — so a missing
business day in the stored history is genuine venue no-print evidence, not
a fetch failure; fetch_log confirms failed runs leave no partial months.
Residual noise: German exchange holidays count as market gaps for all bonds
symmetrically (stated; affects the level, not changes).

**Measure:** `noPrintShare_20` = mean across eligible bonds (that have
traded for at least the full window) of the share of the trailing 20
business days with NO print, evaluated on proxy trading days. Threshold:
smallest 5%-grid level whose unconditional exceedance share ≤ 19.9%
(rounded UP = against us).

**Standalone rule** `liquidity_dry`: edge-triggered crossing ≥ the bar;
graded on residual widening per the common frame. **Conditioning state**:
`noPrintShare_20 ≥ bar` as-of the item's date.

### P2-C1/C2/C3 RESULTS (single run, 2026-08-08; reproducible via `scripts/research/p2c-evaluate.mjs`)

**Solves (outcome-blind, recorded with neighbors):** C1 D = **$50**
(state share 15.9%: the joint avg<85 condition binds — even a generous
dispersion cap keeps the state rare because prices are rarely that
distressed); C2 bar = **+60bp**/60obs (17.5%; 50bp → 20.2%); C3 bar =
**10%** no-print share (13.7%; 5% → 28.2%). Measure coverage: C1 from
2017-09-18 (needs 3 eligible bonds), C2 from 2017-07-05 (needs Oman), C3
from 2016-11-10.

**C2 redundancy check:** weekly-change corr vs the residual = **0.575** —
below the 0.8 pre-commit; the peer channel is a DISTINCT measure (not
folded). It failed on its own merits instead (below).

**Standalone role — ALL THREE FAIL the pre-committed hard bar (lift CI must
exclude 1×). No new desk-reaching rules:**

| Rule | Flags | Episodes (first-flag) | Lift 90% CI | Verdict |
|---|---|---|---|---|
| `price_compression` | 21 | 1/8 = 13% | 0.00×–2.43× | NOT adopted |
| `gcc_decoupling` | 34 | 2/13 = 15% | 0.00×–2.00× | NOT adopted |
| `liquidity_dry` | 19 | 2/17 = 12% | 0.00×–1.53× | NOT adopted |

Instructive honesty, recorded: decoupling's episode hits are exactly the
support-repricing episodes the mechanism names (2018-05, 2025-03) but the
rule drowns in 2023 FPs — with a single peer, OMAN's own idiosyncratic
moves masquerade as Bahrain decoupling; a wider basket is the obvious
future variant. `liquidity_dry`'s flag dates cluster at year-ends
(2017-12-26, 2018-12-25, 2019-12-27, 2020-12-28, 2022-01-03, 2023-12-27,
2024-12-27, 2025-12-29): the German-holiday confound STATED in the spec is
plainly the dominant driver — the measure as built detects the Frankfurt
calendar, not Bahrain liquidity. Any retry must be holiday-adjusted (new
spec).

**Conditioning role on the P2-P1 desk items (126 gradable; badge criterion:
confirmed − unconfirmed hit-rate difference CI excludes 0):**

| Candidate | Confirmed | Unconfirmed | Difference 90% CI | Verdict |
|---|---|---|---|---|
| `price_compression` | **10/19 = 53%** | 20/89 = 22% | **+10pp…+50pp — EXCLUDES 0** | **ADOPTED (display badge)** |
| `gcc_decoupling` | 7/21 = 33% | 23/87 = 26% | −11pp…+26pp | not adopted |
| `liquidity_dry` | 3/12 = 25% | 27/99 = 27% | −23pp…+21pp | not adopted |

**price_compression era-robustness (the pooled difference is NOT an era-mix
artifact):** CDS era confirmed 8/16 = 50% vs unconfirmed 1/5 = 20%; Ariva
era confirmed 2/3 = 67% vs unconfirmed 19/84 = 23% — the confirmed rate is
higher WITHIN both eras. Caveats attached wherever the badge appears:
flag-unit numbers; confirmed items concentrate in deep-distress periods
(that is the mechanism, and also the caveat); 18 desk items predate the
measure (reported "unknown", unbadged).

**Adoption implemented as registered:** a display-layer badge on desk cards
whose date falls in the compression state ("trading-on-price state —
desk items in this state verified 53% vs 22% historically") — computed
walk-forward from `derived.price_compression` (persisted each backfill;
state = avgPrice < 85 [frozen threshold] AND dispersion ≤ $50 [this solve],
≥3 eligible bonds, 550d pull-to-par exclusion). NO suppression, NO
composition change to Desk view, no grade touched. gcc_decoupling and
liquidity_dry: code retained as research measures, nothing generated, no
badge; both may return only under new specs (wider peer basket /
holiday-adjusted calendar).

Live observation at adoption (dated 2026-08-08, context not claim): the
compression state is ACTIVE now — the 2026-06/07 desk items, including the
open 2026-07-03 watch→distress escalation, carry the badge. The market is
currently trading Bahrain on price.

An independent reviewer audited the engine, grading code, and this doc's claims.
Verdict accepted in full (see `haircut-monitor/review-response.md` for the
two-pass exchange). Bottom line: the framework and discipline survive, but the
Domino 1 flag record (built on today's $125 breakeven applied to all history)
and the bare "1.97× lift" (inflated confidence from clustered re-fires) must be
re-derived before either goes into a presentation.

### Correction log (measurement fixes, not tuning — flag generation untouched)

1. **Grading coverage** (2026-08-07): a false positive may only be stamped once the
   reference series actually covers the full grading window — previously an alert
   whose window had passed on the calendar could be graded FP while the decisive
   prints sat in an unfetched tail (FRED lags days; Ariva gaps). Grades are now
   re-derived from data on every backfill, so no premature stamp can persist.
   Effect on the record: none (re-grade reproduced every outcome).
2. **Walk-forward inherited offsets** (2026-08-07): bonds without direct CDS
   overlap inherited a calibration offset measured on the MOST RECENT 250 common
   days and applied to their entire history — future information inside the
   grading reference. Now a rolling trailing-250-day median as-of each date
   (min 30 obs; the bond is excluded from the proxy before that). Effect: proxy
   shifts slightly in the Ariva era; oil-tier record unchanged; Ariva-era 180d
   100bp exceedance rate moved 34.0% → 32.9%.
3. **OPEC announced-date gating** (2026-08-07): the proximity component looked 14
   days forward at ALL calendar rows, including retro-added emergency meetings
   (2020-04-09, Doha 2016-04-17) that were not public knowledge 14 days ahead.
   Every calendar row now carries a sourced `announced_date` (scheduled ONOMMs:
   fixed at the prior conference's close per OPEC PRs; Doha: announced 2016-03-16,
   Bloomberg/CNBC; Apr-2020 emergency: called 2020-04-03) and scores nothing
   before it; rows without one fail closed. Load-bearing check: the 2020-02-28
   composite fire (50.6 pts incl. 10 OPEC) survives — its meeting was the
   scheduled 178th conference, date fixed 2019-12-05. Effect on the alert
   record: none (only score levels on non-firing days changed).
4. **Breakeven vintage series** (2026-08-08, reviewer finding 1 — the highest-value
   fix): the entire Domino 1 backtest and the regime score's 20-point
   breakeven-gap component ran on TODAY'S $125 breakeven applied to all history.
   Replaced by `manual.breakeven_usd` — 19 vintages transcribed from archived IMF
   MCD REO releases (Oct-2014→May-2025), keyed by publication date, per-row
   provenance in `data/manual/breakeven_vintages.csv`, gaps carried forward as-of
   (see Domino 1 registry entry). Effect on the record — published as-is:
   - D1 flags went 3 → 9. **2015-08-31 stays a hit**: the operative vintage in
     Aug-2015 was still Oct-2014's $125.4 — the interim 2015 releases printed
     charts, not numbers, so no lower breakeven existed in public print (the
     $107 arrived 2015-10-21, after the flag).
   - A **2021 false-positive cluster** (4 flags, Aug–Oct 2021) now exists: with
     period-correct breakevens ($88.2→$105), the gap genuinely crossed the $15
     threshold repeatedly in 2021 — fires the constant-$125 world hid by keeping
     the gap permanently elevated (edge-triggered rules need crossings). These
     are what the system would have flagged in real time; they stay on the board.
   - **2022-04-27 FP**: fired by the REO revision itself (105→127.5 while Brent
     was high) — a vintage-jump flag, legitimate in real time, graded honestly.
   - **2022-08-24 grades a hit** under the 180bp Ariva-era bar (its window opens
     9 days earlier than the 2022-09-02 flag, which stays FP); 2026-06-15 pending.
   - Era-split record now: **CDS era 1/1 · Ariva era 1/6 + 1 pending.**
   - Blast radius per the accepted verdict: the regime-score history and the
     regime-conditional evaluation stats (directional skill in distress, kStress
     band width) also shifted — the /evaluation page recomputes them live from
     the corrected history. Domino Zero is untouched (no breakeven input).

### Pre-registered spec C-R1 — era-stratified fundamental grading bar (written 2026-08-08, before the re-grade)

**Problem** (reviewer finding 8, confirmed material): the fundamental-tier bar of
100bp/180d was base-rate-matched on POOLED history, but the reference series has
two regimes — real CDS (→2019-06) and the Ariva retail proxy (2019-07→). Measured
on the post-correction proxy: a random CDS-era day sees +100bp within 180d 19.9%
of the time; a random Ariva-era day 32.9% of the time. Post-2019 alerts were
graded against a materially easier bar.

**Frozen procedure, target fixed before solving**: target exceedance = the
CDS-era rate at the adopted bar = **19.9%**. Era boundary = 2019-07-01 (first
Ariva-only proxy day). The Ariva-era bar is the bp level whose exceedance rate
matches the target, rounded AGAINST us (up, next 10bp).

**Solution (single evaluation, 2026-08-08)**: Ariva era at 170bp → 20.6%, at
180bp → 18.7%. Adopted: **Ariva-era fundamental bar = 180bp/180d** (18.7%
exceedance, rounded against us). CDS-era bar unchanged at 100bp/180d.

**Attribution caveat** (per reviewer): the higher Ariva-era touch rate is NOT
attributed entirely to retail-venue noise — the era contains COVID and the 2022
global tightening, i.e. genuinely higher spread volatility. The bar matches the
era's base rate regardless of the cause mix.

**Presentation rule**: the Domino 1 record is published ERA-SPLIT (pre-2019
record and post-2019 record separately), never as a pooled fraction.

**Re-grade result (single run, 2026-08-08)**: the record CHANGED, and we publish
it as-is. Era-split Domino 1 record: **real-CDS era 1/1** (2015-08-31, +115bp vs
100bp bar) · **Ariva era 0/1 + 1 pending** (2022-09-02 flipped hit→FALSE POSITIVE:
its +108bp peak clears the old pooled 100bp bar but not the era-matched 180bp;
2026-06-15 reverted hit→PENDING: +120bp so far, window open to Dec 2026 — it now
needs +180bp to grade hit). The previous "3/3" was partly an artifact of grading
post-2019 alerts against a bar calibrated on a quieter reference series.

### Pre-registered spec C-R2 — episode-level scoreboard + bootstrap CI (written 2026-08-08, before the run)

**Problem** (reviewer finding 2, confirmed): the composite alert re-arms as soon
as the score dips below the trigger, so one grinding episode emits several flags
(five of the twelve `oil_stress` hits are the single 2015-10→2016-01 decline).
Grading each flag as an independent trial pseudo-replicates the sample and makes
"30% vs 15.2% base = 1.97×" sound more certain than it is.

**Frozen clustering rule**: an *episode* is a maximal chain of same-rule,
same-tier alerts in which each alert falls within the rule's own grading window
(45d oil, 60d credit, 180d fundamental) of the previous alert. The episode's
grade is **the grade of its FIRST alert** — the desk acts on the first flag;
re-fires are reminders. A lenient **any-hit** variant (episode is a hit if any
member flag hit) is computed alongside and labeled as the sensitivity, never the
headline. Known mixed chain 2018-11-22→2019-01-02 (2 hits then 3 FPs): hit
episode under both variants (first flag was a hit).

**Uncertainty**: block bootstrap — resample episodes with replacement, 10,000
draws (seeded, reproducible), report the 90% CI on the episode-level hit rate
and on lift vs the day-level base rate. The unit mismatch (episode numerator,
day-denominator base rate) is stated wherever the number is shown.

**Presentation rule**: episode-level and flag-level scoreboards are shown side
by side, permanently; neither replaces the other.

**Result (single run, 2026-08-08)**:

| Rule | Flag-level | Episodes | First-flag hits | Episode rate | 90% CI | Any-hit | Lift CI vs 15.2% base |
|---|---|---|---|---|---|---|---|
| oil_stress | 12/41 (29%) | **14** | 4 | **28.6%** | 7.1–50.0% | 35.7% | **0.47×–3.29×** |
| contango_flip | 7/37 (19%) | **12** | 3 | **25.0%** | 8.3–50.0% | 33.3% | 0.55×–3.29× |

Reading, honestly: the episode-level POINT ESTIMATE matches the flag-level rate
(the clustering didn't change the story), but the honest sample is 14 episodes,
not 41 flags, and **the 90% lift CI includes 1×** — the record cannot yet
statistically exclude no-skill. "≈2× lift, n=14 episodes, CI includes 1,
provisional until live out-of-sample flags accumulate" is the only defensible
phrasing for the presentation. Notable detail: the 2015-08→2016-01 grind is ONE
episode whose FIRST flag (2015-08-24) was two months early and graded FP — under
the first-flag rule its 5 later hits count for nothing (that timing risk is real
for a desk); the any-hit sensitivity (35.7%) is where that episode's eventual
vindication shows up. Both numbers stay on the page, labeled.

## Out-of-sample test — Oman (2026-08-08)

The monitor gained a country dimension (Bahrain ⇄ Oman toggle; Bahrain output
verified byte-identical through the refactor). Oman is not primarily a second
deliverable — it is a **true out-of-sample test of the frozen v1 thresholds**
on a second GCC oil credit the system has never seen. Per protocol rule 3,
no threshold, weight, or window was touched; only the two things the protocol
itself says are per-country were created fresh: the data provenance and the
base-rate-matched grading bars (spec O-R1 below). Poor Oman results are a
finding, not a bug to fix.

### Data provenance — Oman signal registry

| Series | Source & transformation | Notes |
|---|---|---|
| `px.<isin>` ×7 | Ariva.de, same fetcher family as Bahrain (`ariva-oman`), full month-by-month seed 2017-03→ (12,851 prints) | Bond facts verified against OpenFIGI (Bloomberg ref data) + ≥2 sources each. Live legs: XS1575967218 (5.375% '27, short), XS1944412748 (6% '29), XS2288905370 (6.25% '31), XS2234859283 (7.375% '32) (mid), XS1575968026 (6.5% '47), XS1750114396 (6.75% '48), XS2288906857 (7% '51) (long; '47 is the benchmark leg). **Corrections vs first recon:** the '29 maturity is 2029-08-01 (six sources; an initial single-source claim of 2029-12-31 was wrong); two original-issue sizes were misattributed; a 2028 issue (144A US682051AH04, Reg-S ISIN unconfirmed) was missed entirely — it is in the maturity wall but NOT price-tracked. |
| `omn.manual.weo_debt_gdp` / `omn.manual.weo_fiscal_bal` | DBnomics `IMF/WEO:<rel>/OMN.*` (2014-04→2025-04) + IMF SDMX (2025-10, 2026-04); one current-year value per release, obs_date = publication date | Same vintage semantics as Bahrain. Apr-2020 debt/GDP missing IMF-wide (documented gap). |
| `omn.manual.breakeven_usd` | IMF MCD REO statistical appendix, **19/19 vintages recovered** (r.jina.ai proxy beat the IMF 403 wall; DBnomics MCDREO git vintages for the 3 releases with no printed table) | Every row cross-validated: Bahrain's value read from the same printed table matched the published Bahrain CSV in all 19 cases. Six earlier search-snippet values proved vintage-mislabeled and were replaced by table-verified ones. |
| `omn.manual.reserves_usd_mn` | IMF IFS `M.OM.RAFA_USD` via DBnomics (monthly, USD mn, 1970-04→2025-03), fetcher `omn-reserves` | **Publication gating: pre-registered M+2 rule** (published = month-end + 2 months) — IFS has no per-row release dates; actual lag is 1–3 months, so M+2 never claims a value before it was public. IFS tail stalls at 2025-03; recent months are hand-keyed from CBO monthly bulletins when live monitoring needs them (see data/manual/oman/README.md). |
| `omn.manual.amortization_usd_mn` | Hand-built from the verified issuance list (2016→), issued-gated like Bahrain's | Amounts = current outstanding (post-tap/tender). Honest flags: 2026 note tender arithmetic doesn't reconcile across sources; 2028 leg orig-size only; 2017/2018 sukuk (XS1620176831) has conflicting size/vintage across sources — better-detailed variant used, conflict recorded here. Ariva prints from 2021-01 empirically support the '32 bond's 2021 issue date. |
| `omn.imf.debt_gdp` / `omn.imf.fiscal_bal` | DataMapper, fetcher `imf-weo-oman` (pick OMN from all-countries payload) | Current-vintage annuals; DSA anchor uses the vintage CSV (above). |

Shared, deliberately NOT duplicated: the entire Domino-Zero oil tier, UST curve,
`manual.opec_meeting`.

### Real Oman CDS — searched, unavailable (2026-08-08; do not re-search without cause)

Exhaustive free-source hunt found NOTHING: investing.com has no Oman in its CDS
table; worldgovernmentbonds' Oman page 404s; cbonds index 23979 (the only
confirmed tracker) is 403-blocked; Trading Economics/Macrosynergy/IMF-portal/FRED
blocked or absent; no academic replication datasets; GitHub/Kaggle/Quandl empty;
Wayback blocked to agents. **Standing accuracy upgrade:** an owner-provided
terminal export (Bloomberg/LSEG) of Oman AND Bahrain 5Y CDS history would replace
the borrowed calibration below with a fit — the manual-series machinery already
supports it.

### Borrowed venue-gap — the proxy-level assumption (Oman's weakest link)

With no real Oman CDS, the bond→CDS proxy offset cannot be fitted. Decision
(owner, 2026-08-08, accuracy-favored): borrow Bahrain's fitted Ariva venue gap
as a same-venue assumption. Two candidate transfer forms:

- **Additive (REJECTED — falsified on first run):** subtracting Bahrain's mean
  direct gap (351bp) drove Oman's proxy to −115bp. An absolute retail-venue gap
  fitted on a B-rated credit at 600bp venue spreads cannot apply to an
  investment-grade credit at ~250bp. CDS cannot be negative; additive transfer
  is dead on arrival.
- **Proportional (ADOPTED):** Bahrain's calibration window (2016-01→2019-06)
  gives r = mean(real CDS) / mean(venue spread) = 293/643 = **0.455**; Oman
  proxy_t = r × venue spread_t per bond (equivalently gap_t = (1−r)·spread_t).
  Always positive, preserves Oman's own curve shape, and leaves spread CHANGES
  trusted up to the constant scale r.

Consequences, stated honestly: the Oman haircut-band LEVEL carries this
assumption end-to-end and ships with an on-page caveat. The regime flag and all
grading are **scale-invariant to r** (level_pct is a percentile of Oman's own
history; slope/curve/gap components are differences; the O-R1 bars below are
solved from the same r-scaled series they grade). Calibration rows are
provenance-flagged (`borrowed`, never counted as direct fits).

One-time hygiene note: alert rows generated by the falsified additive build
(170 rows, ZERO graded, nothing published, spec not yet registered) were purged
before this spec was written and regenerated from the fixed proxy. This is not
scoreboard curation — no record existed; the record starts here.

### Pre-registered spec O-R1 (2026-08-08): Oman grading bars

Written BEFORE any Oman alert is graded. Procedure identical to C-R1/C-R3:
bars are solved outcome-blind from Oman's own unconditional proxy history
(2,387 days, 2017-03-07→2026-08-07, single era — no real-CDS era exists) so
that the unconditional forward-widening exceedance rate matches the frozen
Bahrain-era targets, on a 10bp grid, nearest match:

| Tier | Frozen target | Solved bar | Achieved rate | Neighbors |
|---|---|---|---|---|
| fundamental (180d window) | 19.9% | **50bp** | 22.43% | 60bp → 16.15% |
| curve (60d window) | 17.76% | **30bp** | 17.93% | 20bp → 33.93%, 40bp → 10.84% |

Oman's bars are ~3× lower than Bahrain's Ariva-era bars (180/90) because an
investment-grade credit's spread distribution is that much quieter — this is
base-rate matching doing exactly its job. Mechanics: `omn:backtest_rules` with
`arivaEraFrom = 1900-01-01` (everything is one era), `fundWidenBpArivaEra = 50`,
`curveWidenBpArivaEra = 30`; storing this key ARMS Oman grading (the arming
gate refuses to grade before this spec exists). Also set with this spec:
`omn:breakeven_usd = 57` (fallback only; the 19-vintage manual series
overrides) and `omn:dsa_settings = {dTarget 0.6, horizon 5y, effRate 6.0%
(outstanding-weighted mean coupon of the verified curve = 6.27%, local mix
slightly cheaper), nomGrowth 3.5% (WEO Apr-2026 USD-nominal avg 2027–30),
fiscalSens 2.5 %GDP/$10 (hydrocarbon revenue ≈22% GDP at ~$80 Brent,
contract/PSA-buffered)}`.

Evaluation plan (ONE run, results recorded below whatever they say): flag-level
AND episode-level records per C-R2 (cluster window = grading window, first-flag
grade, any-hit sensitivity, seeded 10k bootstrap CI vs the achieved base rates
above); regime-flag escalations graded per the C-R4 method against the O-R1
curve bar. Acceptance language: this is an out-of-sample TEST of the frozen
thresholds — there is no adopt/reject decision on the thresholds themselves;
the result is published either way and interpreted against Bahrain's record.

### O-R1 results (2026-08-08, ONE run, published as-is)

Flag-level and episode-level (C-R2: cluster = grading window, first-flag grade,
any-hit sensitivity, 10k seeded bootstrap; base = O-R1 achieved unconditional
rates; the day-vs-event denominator mismatch applies as always):

| Rule | Flags h/fp | Episodes | First-flag | Any-hit | Base | Episode-lift 90% CI |
|---|---|---|---|---|---|---|
| curve/inversion | 13/30 | 9 | **5/9 = 55.6%** | 6/9 = 66.7% | 17.93% | **1.86×–4.34× — excludes 1×** |
| curve/level_pct | 9/29 | 10 | 3/10 = 30.0% | 4/10 | 17.93% | 0.56×–2.79× |
| curve/slope_20d | 4/22 | 15 | 4/15 = 26.7% | 4/15 | 17.93% | 0.37×–2.60× |
| fundamental/breakeven_gap | 1/2 | 2 | 1/2 | 1/2 | 22.43% | n too small |
| fundamental/rollover_wall | 0 fired | — | — | — | — | Oman's Guidotti cover never broke 1 — consistent with its reserve position; the signal correctly stayed silent |

Regime-flag escalations (C-R4 method, O-R1 curve bar 30bp/60d; honest
denominator is O-R1's achieved 17.93%, not the Bahrain target 17.76% the page
displays — difference negligible):

| Split | Record | Lift 90% CI |
|---|---|---|
| All escalations | 5/18 = 27.8% | 0.63×–2.50× (includes 1×) |
| calm→watch | **4/10 = 40.0%** | 1.13×–3.94× naive — **DEMOTED 2026-08-08**: under the audit's arc-cluster bootstrap the CI is **0.62×–3.72× (P≈9.7%)** — does NOT exclude no-skill; cite only as a caveated secondary |
| watch→distress | 1/8 = 12.5% | 0×–2.11× (no skill shown) |

**Interpretation (out-of-sample verdict on the frozen system):**

1. **The inversion signal generalizes.** The single strongest Bahrain-era curve
   rule shows a lift CI excluding no-skill on a credit it never saw — earned
   out-of-sample, and ROBUST under the audit's cluster/joint bootstrap
   (P(no-skill) 0.8–2.2%). **Oman inversion carries the out-of-sample story
   alone**; calm→watch's naive CI cleared 1× but did not survive arc-cluster
   stress (P≈9.7%, demoted above) — it is a caveated secondary, never a
   headline.
2. **watch→distress does NOT generalize on Oman (1/8).** The distress entries
   cluster in 2017–2018 early-sample days; several fired off the persistent
   curve component. Recorded as a genuine limitation, not explained away.
3. **A standing data caveat found by the test:** Oman's mid−long slope reads
   +129bp "inverted" today (25/25 curve points; the flag has sat in watch 336
   days on this component alone). Candidate explanation: the high-coupon 7.375%
   2032 retail quote pricing rich vs the 6.5% 2047 — a venue/coupon artifact
   rather than credit stress. Any fix (e.g. coupon-matched slope legs) must be
   pre-registered; until then the record stands as measured.
4. Current Oman state: regime watch (score 25, hysteresis-held), proxy 136bp
   (borrowed-ratio level), band 20–75% calm-wide, benchmark informative only in
   the 2020 distress window.

Comparison anchor: Bahrain C-R4 escalations 8/17 = 47.1% (CI 1.66×–3.64×);
Oman pooled escalations are weaker; **Oman inversion-episodes are the
comparable, robust result** (calm→watch demoted per the audit — secondary
only). Net: the frozen thresholds carried a real, measurable part of their
skill to a second sovereign without any re-tuning, demonstrated by the
inversion record.

## Phase 2 — the four lenses (2026-08-08→)

Executed per `cds-phase-2-plan.md` under the frozen v1 protocol. Every lens gets
its exact spec pre-registered HERE before its single evaluation run; frozen v1
thresholds and every existing record are untouched — lenses ADD, never retune.
Branch `lenses-phase2` in the repo; Bahrain/Oman API regression guard active
(38-endpoint byte-compare baseline captured at branch start).

**Phase-2 outcome summary (2026-08-08, all runs complete):**

| Item | Verdict | One line |
|---|---|---|
| P2-V1 proxy validation | **PASS 3/3** | The Ariva proxy's dynamics independently confirmed (NBER/Refinitiv changes) across the era boundary + COVID — first external validation of the Ariva-era record |
| Curve densification | measured | 2 fitOnly legs; the 4-bond Merrick fit had been overconfident and ~14pts too low; grading reference untouched (verified byte-identical) |
| P2-L1 residual | **ADOPTED** | 2025 crisis is 70% Bahrain-specific (COVID was 90% / 2022 was 96% global); hoped-for lower small-move base rate did NOT materialize — recorded |
| P2-L2 peg | **REJECTED** | 2018 invisible in the BHIBOR−USD differential (it tracks the Fed, not Bahrain); no flags ever generated; series kept as context |
| P2-L3 wall | **ADOPTED (conditioning)** | Near-wall flags hit 33% vs 7% away (Ariva era, caveated); the 2026-09-08 $500mn maturity was missing from the wall data — found, sourced, countdown live 31 days out |
| P2-L4 recovery | **3 rules LIVE, 1 gated** | market_access 1.29× / curve_uninversion 2.18× / trend_reversal 1.21× (all CIs include 1×; symmetric counterpart, not a skill claim); oil_above_breakeven failed (0/1) |

Regression guard final audit: zero outcome changes across all **366 distinct
pre-existing alert rows** (444 endpoint rows — the shared oil tier is served
to both countries, so per-country endpoint counts double-count it); existing
scoreboard rules byte-stable; every endpoint diff classified deliberate.
Tests 80 → 91, green throughout.

### Presentation convention — Desk view vs Research view (2026-08-08)

The UI ships a persistent toggle on every alert-listing page (default: Desk
view). **Desk view** shows only: (a) regime-flag transitions (the C-R4
escalation events, graded; de-escalations shown descriptively, never graded);
(b) each C-R2 episode's FIRST flag (re-fires collapse behind the episode; the
chaining is computed by the engine's `clusterFlags` with each rule's own
grading window — never reimplemented in the client); (c) currently-open
grading windows; (d) the wall countdown while ≤ 6 months out. **Research
view** is the complete uncurated record (protocol requirement — one click
away, always), grouped by episode with tier/outcome/pending filters and raw
flags expandable per episode.

**Definitional guard, stated for future sessions:** the Desk-view selection
rule is a PRESENTATION convention assembled from already-graded constructs.
It has never been evaluated as a unit. If anyone ever wants to CLAIM a
precision/hit-rate number for "desk-view alerts" as a composite, that
selection must first be pre-registered as its own spec (definition, grading
target, bar derivation, one run) — do not quote an ungraded composite. The
on-page hint says the same. Chain-strip hot-states follow desk semantics:
regime/signal STATE or an open grading window, never an internal re-fire.

### Pre-registered spec P2-P1 — the Desk-view composite record (written 2026-08-08, BEFORE computing)

The owner asked for an accuracy score for Desk view — the exact claim the
guard above exists for. Registration:

**Why this registration is legitimate:** the Desk-view COMPOSITION was fixed
at M10 for UX reasons (readability of ~333 rows), before any aggregate
accuracy for it had ever been computed or looked at. This spec changes
nothing about the selection — it commits to scoring the selection exactly as
shipped, and freezes that composition against future retouching: no rule,
tier, or event type may be added to or removed from Desk view in response to
this number, now or later. A future composition change creates a NEW spec.

**Population (per country):** (a) regime-flag ESCALATIONS (the C-R4 events);
(b) episode FIRST flags per the C-R2 membership as served by /api/alerts
(`episodeFirst = true`), across every tier Desk view lists (oil, fundamental,
curve, recovery — peg has no flags). **Excluded:** open/pending windows
(until they close — they enter the record when graded, not before);
de-escalations (descriptive by C-R4, never graded); the wall countdown (not
a graded object); `unresolvable` flags (no reference series exists at their
dates).

**Grading:** each item keeps its OWN frozen exam — escalations by the C-R4
method (era curve bar, 60d); first flags by their tiers' frozen bars (C-R1 /
C-R3 / O-R1 / P2-L1 residual bars for recovery). Nothing is re-graded.

**Score:** hits ÷ gradable items, ERA-SPLIT (real-CDS era / Ariva era,
boundary per the country's `arivaEraFrom`; Oman is single-era), at the
flag/event unit. **Heterogeneity caveat, attached wherever the number
appears:** this aggregates rules with different targets, windows, reference
series and directions — a composite record of "did the system's desk-level
claims verify", NOT a single signal's skill, and **no lift is quoted**
because no single base rate applies to the mixture. C-R4 remains the
skill headline; this number is descriptive.

**Uncertainty:** seeded bootstrap over items (10,000 draws, seed 42, 90% CI
on the hit rate), same machinery as C-R2. Items are not independent (crisis
arcs) — stated.

**One computation** (served live thereafter by the same frozen method, like
the /domino4 scoreboard; the as-computed record below stays the reference).
Published whatever it says; never re-tuned.

**RESULT (single computation, 2026-08-08, served by /api/deskrecord):**

| Country / era | Gradable items | Hits | Rate | 90% CI | Open windows |
|---|---|---|---|---|---|
| Bahrain, real-CDS era | 38 | 13 | **34.2%** | 21.1–47.4% | 0 |
| Bahrain, Ariva era | 87 | 21 | **24.1%** | 17.2–32.2% | 2 |
| Oman (single era) | 80 | 25 | **31.3%** | 22.5–40.0% | 0 |

Composition note (audit): 26 of Oman's 80 gradable desk items are SHARED
oil-tier episode-firsts (Domino Zero is computed once and served to both
countries) — the Oman-specific portion is 54 items. Stated wherever the Oman
desk record is quoted.

Reading, honestly: roughly one desk-level item in four (Ariva era) to one in
three verifies against its own frozen bar. That is the composite record of
everything Desk view surfaces — attention tiers, symmetric recovery flags and
the strong regime rule mixed together — and it is deliberately WORSE-looking
than the C-R4 headline (escalations alone: 47%) because the mixture includes
the honest low-precision tiers. The number ships on the Desk-view header with
its caveats; per the registration, the Desk-view composition may never be
adjusted in response to it.

### Phase-2 signal provenance registry (M1 intake, 2026-08-08)

| Series | Source + transformation | Semantics & quirks |
|---|---|---|
| `em.emb` | Yahoo chart API, EMB ETF (iShares J.P. Morgan USD EM Bond), daily ADJUSTED close, 2007-12-19→present, fetcher `emb` (4,687 pts at intake) | EM-beta regressor for the residual lens (P2-L1). Chosen over FRED ICE BofA EM OAS: FRED truncates ALL ICE series to a rolling 3y window at source (recon 2026-08-08; 3 of 6 series only launched 2023). EMB is a PRICE total-return index, not a spread — log-price enters the regression; duration/rates exposure is controlled by the DGS10 leg. The truncated FRED ICE series remain a 2023→ cross-check only. |
| `fred.sofr` | FRED `SOFR`, daily, 2018-04-03→present | USD leg of the peg differential post-splice. Overnight tenor vs BHIBOR 3M — tenor mismatch documented; quarterly averaging smooths it. |
| `fred.tb3ms` | FRED `TB3MS`, monthly avg 3M T-bill, fetched 2005→ (history to 1934 exists) | USD leg pre-splice. Treasury rate, NOT interbank: (BHIBOR − TB3MS) overstates (BHIBOR − LIBOR) by the T-bill–interbank credit spread (~50–150bp, era-dependent). Bias is consistent within the pre-splice era and documented wherever the differential is shown. FRED's LIBOR endpoint 403s (recon). |
| `manual.bhibor_3m` / `_6m` | `data/manual/bhibor.csv` — CBB Statistical Bulletin "Indicators" sheet, quarterly average interbank fixings, 66 gapless quarters 2009-Q4→2026-Q2 (recon extraction from archived bulletin Excels) | obs_date = quarter-end; `published` column = **quarter-end + 45 days** (pre-registered publication rule — bulletin for month M uploads ~M+1 and per-row upload dates are unrecoverable pre-2024; same reasoning as Oman's IFS M+2 rule). All signal computation is as-of `published`. Quarterly smoothing of intra-quarter spikes is a stated limitation. |

Correction to the recon README (`data-recon/rates/README.md`): its body text
claims BHIBOR coverage "2025-Q2 onwards" — stale; the delivered CSV actually
holds 66 quarters 2009-Q4→2026-Q2 (verified at intake, 132 rows, gapless).

### Pre-registered spec P2-V1 — Ariva-proxy validation vs the NBER change series (written 2026-08-08, BEFORE the run)

The only independent check of the proxy in the era where all grading disputes
live. Data: `data-recon/academic-cds/bahrain_cds_nber_dailychange_2019_2020.csv`
— 365 daily Bahrain 5Y CDS FRACTIONAL day-over-day changes, 2019-07-02→
2020-06-30 (Daehler–Aizenman–Jinjarak, NBER WP 27903 replication repo; vendor
Refinitiv Eikon). This is NOT a bp series; it is integrated into an approximate
level path and compared against the Ariva proxy's DYNAMICS, never its level.

**Method, fixed in advance:**
- Anchor: 2019-06-25 = 255bp (the last real WGB observation, independent of the
  proxy). Path: `level_t = 255 × Π(1 + cᵢ)` from 2019-07-02 — the fractional
  interpretation is committed here (matches the repo's own description of the
  variable); a log-interpretation path (`255 × exp(Σcᵢ)`) is computed alongside
  as a labeled sensitivity, never the headline. Unit-risk note, recorded before
  looking at the proxy: max |c| = 0.949 on 2020-03-12 — the interpretations
  diverge most exactly at the COVID spike.
- Comparison series: the persisted Bahrain walk-forward proxy
  (nowcast_snapshots.proxy_spread_bp), 2019-07-02→2020-06-30.
- **Pass/fail criteria (2 of 3 = PASS):**
  1. Weekly-change correlation ≥ 0.5 (both series sampled every 5th common
     observation, Pearson on changes — the same weekly-sampling convention as
     the calibration goldens).
  2. Spike timing: the start date of the proxy's largest 20-observation
     widening within ±10 business days of the NBER path's.
  3. Monthly-change directional agreement ≥ 70% (calendar-month end values,
     sign of month-over-month change).
- Level gap at the COVID peak reported as indicative only — the venue gap makes
  levels incomparable by construction.
- One run; PASS raises stated confidence in the Ariva-era record (incl. the
  2022-09-02 grading), FAIL lowers it; either way the result is recorded here
  and NOTHING is re-graded (this spec grades the proxy, not the flags).

**RESULT (single run, 2026-08-08) — PASS, 3 of 3:**

| Criterion | Bar | Measured | Verdict |
|---|---|---|---|
| Weekly-change correlation | ≥ 0.5 | **r = 0.671** (n=50 weekly changes; log-interp sensitivity 0.710) | PASS |
| COVID spike timing (largest 20-obs widening start) | ±10 bd | NBER 2020-02-21 vs proxy 2020-02-24 — **1 business day apart** | PASS |
| Monthly directional agreement | ≥ 70% | **8/11 = 73%** (disagreements: Oct-2019, Jan-2020, Apr-2020 — all small-move months) | PASS |

251 common observations (the proxy's trading days inside the NBER window).
Indicative level notes, NOT criteria: the proxy widened ~4× more than the
integrated NBER path in the same crash window (+647bp vs +172bp over the same
20 obs) and peaked 720bp on 2020-03-23 vs the NBER path's integrated peak of
317bp on 2020-05-04 — consistent with the known retail-venue amplification and
the log/fractional unit ambiguity at the 2020-03-12 |0.949| print (log-interp
peak 470bp). Levels were never the claim; dynamics were, and they agree.

**Consequence, recorded:** the Ariva proxy's DYNAMICS are independently
confirmed across the exact era boundary and the COVID crash by a
Refinitiv-sourced academic series — the first external validation of the
Ariva-era record. Confidence in Ariva-era grading (including the disputed
2022-09-02 FP) is RAISED; the standing caveat that proxy LEVELS carry a
venue gap is unchanged. Nothing re-graded.

### Pre-registered spec P2-L4 — recovery tier (written 2026-08-08, BEFORE the evaluation run)

**Where it sits:** the chain in reverse — signals that the dominoes are being
stood back up. New alert family `tier='recovery'`, `direction='tightening'`,
rendered in its own visual language (green, reverse arrow). Bahrain-scoped.

**Rules (edge-triggered; thresholds definitional or sign-mirrored from frozen
numbers — zero new tuned constants):**
1. `oil_above_breakeven` (180d window): the breakeven gap (operative vintage
   breakeven − Brent 60d avg) crosses ≤ 0 — the exact mirror of the frozen
   `breakeven_gap` construction at the definitional zero.
2. `market_access` (180d): a sovereign USD issuance settles (issued-gated
   rows from `bond_maturities.csv`; same-day tranches merge into one event;
   month-precision issue dates carry ±2-week timing uncertainty — immaterial
   at a 180d window, stated).
3. `curve_uninversion` (60d): the curve slope crosses < 0 after ≥ **30**
   consecutive inverted observations (30 mirrors the existing ≤30d
   episode-merge convention; prevents zero-crossing chatter).
4. `trend_reversal` (60d): the 20-day OLS slope of the proxy crosses ≤
   **−1 bp/day** — the frozen `slopeFromBpd`, sign-mirrored.

**Grading (armed by P2-L1's residual_bars):** hit = the RESIDUAL **tightens**
≥ the era bar within the rule's window — tighten 130/150bp (CDS/Ariva) at
180d; 80/90bp at 60d. Grading against the residual is deliberately the HARDER
exam: a recovery flag gets no credit for global rallies (2021's normalization
was partly global beta; the residual strips it). Flags before 2017-08-22
grade `unresolvable` (no reference; shown, excluded from denominators).
Flag-level AND episode-level per C-R2 (cluster window = grading window,
first-flag grade, any-hit sensitivity, 10k seeded bootstrap; base = the
achieved tightening exceedance rates from P2-L1: 16.4%/17.3% at 180d,
16.7%/14.8% at 60d, era-matched).

**Named checkpoints (reported, not criteria):** the 2016 oil-recovery, the
post-package 2019 normalization, and the 2021 reflation windows — did
recovery rules fire inside them? (2016 predates the residual: firing is
reportable, grading is not — stated now.)

**Acceptance (one run, per-rule):** a rule ships live iff its episode-level
lift ≥ 1× at the point estimate; otherwise it stays generated but
experimental-gated (labeled non-signal on-page), record kept either way.

**RESULTS (single run, 2026-08-08; 77 flags generated, graded on residual
tightening; full per-flag record reproducible via
`scripts/research/p2l4-evaluate.mjs`):**

| Rule | Flags (h/fp, resolved) | Episodes (first-flag) | vs base | Lift (pt est) | 90% lift CI | Verdict |
|---|---|---|---|---|---|---|
| `market_access` | 4/13 = 23.5% | **2/9 = 22.2%** | ~17.2% | **1.29×** | 0–2.58× | **LIVE** |
| `curve_uninversion` | 1/3 = 25.0% | **1/3 = 33.3%** | ~15.3% | **2.18×** | 0–4.36× | **LIVE** (tiny n) |
| `trend_reversal` | 7/41 = 14.6% | **4/22 = 18.2%** | ~15.0% | **1.21×** | 0.30–2.12× | **LIVE** |
| `oil_above_breakeven` | 0/1 | 0/1 | ~17.3% | 0× | — | **experimental-gated** (n=1; its one fire, 2022-04-14, was the REO vintage-jump quarter — residual fell only 90 of the required 130bp) |

Honest framing, committed with the record: every CI includes 1× — the
recovery tier ships as a SYMMETRIC counterpart to the attention tiers, not as
a proven skill claim; all four scoreboards stay on-page uncurated. Six flags
predate the residual (2015–2017) and grade `unresolvable` (shown, excluded
from denominators).

**What the residual exam did, worth presenting:** in the 2021 reflation
window, ELEVEN recovery flags fired; nine graded FP because the residual
strips the global rally — but the two `market_access` flags (Sep/Nov-2021
issuances) graded HIT with −258/−197bp of *Bahrain-specific* tightening. The
2019 normalization: 1/7 (the post-package rally was mostly not
Bahrain-specific either). A raw-spread exam would have flattered every one of
these; the pre-registered residual reference is exactly what kept the tier
honest. 2016 checkpoint: 4 flags fired (3 trend_reversal + 1 market_access) —
firing confirmed, grading impossible (predates the residual), as stated in
advance.

Current state: two flags inside the last 90 days — trend_reversal 2026-05-21
(graded FP, residual −79bp vs the 90bp bar) and market_access 2026-06-10
(PENDING, window open to Dec-2026). The regime remains distress; the tier is
watching a possible turn, not declaring one.

### Curve densification — fitOnly legs (method committed 2026-08-08, before measuring)

Two of the instrument sweep's four recommended legs are added; two are held out:

| ISIN | Facts (2 sources each) | Decision |
|---|---|---|
| XS3282969008 | bond 7.10% 2038-02-03, $1.3bn, issued 2026-02-03, Ariva-confirmed | **added** (fitOnly) |
| XS1110833123 | bond 6.0% 2044-09-19, $1.25bn, issued 2014-09, Ariva-confirmed | **added** (fitOnly) |
| XS2408002769 | sukuk 3.875% 2029-05-18 | **held out** — sukuk stay out of the curve until a basis treatment is pre-registered |
| XS2226916216 | type-ambiguous (boerse: bond; Ariva ticker "CBB INTL SUK 20/32 MTN") | **held out** pending prospectus-level type confirmation |

**Design constraint discovered during planning, resolved before any code ran:**
naively adding bonds to `BONDS` feeds them into the composite PROXY (via
inherited walk-forward gaps) and potentially into the slope-leg selection —
i.e. it would silently change the grading reference series and re-derive every
historical grade. That is a protocol violation disguised as a data addition.
Resolution (owner-approved): a `fitOnly` flag — fit-only bonds are fetched and
priced but consumed ONLY by the Merrick benchmark fit (`computeBenchmark`);
`buildMarketBundle` excludes them from spreads/proxy/slope/calibrations
entirely. The proxy and slope are verified byte-identical via the 38-endpoint
regression snapshots. Consequence: the 2030-03-29 slope-series cliff is NOT
fixed by this change (deliberately); promoting any bond into the slope legs
remains a future pre-registered measurement change.

Thresholds were frozen long before this price history was seen (protocol rule
3: data additions are not tuning). The only thing allowed to move is the
BENCHMARK band (scoring-only series, never a model input) — measured
before/after below.

Baseline (before): basis census cds/bond/fit = 830/1462/339 of 2,631 days;
15pt consistency gate rejected the fit on 1,913 days.

**Measured result (single run, 2026-08-08).** Seeds: XS3282969008 131 prints
(2026-02→), XS1110833123 2,702 prints (2014-09→). Regression guard: proxy,
slope, alerts, regime history, backtest and evaluation endpoints all
byte-identical; the only diffs are the benchmark/domino5 payloads (the measured
change), source freshness (new fetchers), and calibration re-run timestamps.
The fit-band change, published as-is:

| Measure | Before | After |
|---|---|---|
| Basis census cds/bond/fit | 830 / 1,462 / 339 | 830 / 1,519 / **283** |
| 15pt-gate fit rejections | 1,913 | **2,206** |
| Fit-day band width, mean | ±10.1÷2 pts (10.1pt span) | **14.9pt span** |
| Days flipped fit→fallback | — | **57** (51 in 2025, 6 in 2024); 0 flipped the other way |
| Mid shift on days fit in both (282) | — | **+13.9pts average** (max +23.2) — fitted haircut HIGHER with the denser curve |

**Honest reading:** densifying the 2031–2047 desert made the constant-hazard
Merrick fit *less* often trusted (more gate rejections, 57 days fall back to
the transparent floor/width range) and, where still trusted, wider and ~14pts
higher — the old 4-bond fit was extracting overconfident, too-low haircuts
from a curve with a 16-year hole in it. The 2044 leg (6%, quoted ~83) pulls
the long-end recovery estimate down / implied haircut up. This is the
benchmark (scoring-only) series moving, and moving toward honesty; no model
input and no grade changed (verified byte-identical). The /haircut page's
"did the reference rise after warnings" table shifts with it — display-level,
recomputed live.

### Pre-registered spec P2-L1 — residual spread decomposition (written 2026-08-08, BEFORE the evaluation run)

**Where it sits:** a cleaner *measurement* of dominoes 3–4 — separates
Bahrain-specific credit moves from global/EM beta. It is a measurement series,
NOT an alert rule: there is no hit-rate exam for the series itself, and saying
so up front prevents a fake exam later.

**Definition (frozen):** `residual_t = proxy_t − fitted_t`, where `fitted_t`
comes from a **walk-forward rolling OLS** of the Bahrain proxy LEVEL (bp) on:
- `log(EMB adjusted close)` (`em.emb`, Yahoo, daily 2007-12→), and
- `DGS10` (the `ust.par` 3650d tenor — already fetched),
- plus an intercept.

Window: trailing **500 trading days**, minimum **250 common observations**;
coefficients at date t are estimated from data ≤ t only (no lookahead — tested:
perturbing future inputs must not change past residuals). Days before the
warmup threshold have no residual. VIX is EXCLUDED from v1 (collinear with
EMB; a VIX variant would be a separate pre-registered spec). The peer-basket
variant (Oman/Jordan/Egypt bonds) is a documented SECOND pass, not mixed in
here. The truncated FRED ICE series serve only as a 2023→ cross-check.

**Stored series:** `derived.residual_bp` + `derived.residual_fitted_bp`
(first-class, recomputed on every backfill, full history from warmup).

**Deliverables of the single evaluation run:**
1. The series + fit diagnostics (rolling R², coefficient paths — reported, no
   acceptance bar on R²; the residual is defined by the procedure, not by fit
   quality).
2. **Base-rate study**, era-stratified (boundary 2019-07-01): unconditional
   exceedance tables P(series widens ≥ X within W) for X on a 10bp grid at
   W = 60d and 180d, residual vs raw proxy side by side — measuring whether
   the residual's small-move base rate is genuinely below the raw series'.
3. **The re-expression for NEW lenses only:** grading bars on the residual
   solved outcome-blind by the frozen C-R1/C-R3 procedure — target exceedance
   = the frozen era targets (fundamental 19.9% at 180d; curve-speed 17.76% at
   60d), era-stratified, 10bp grid, rounded AGAINST us. These bars arm the
   grading of lenses P2-L2 and P2-L4. Frozen v1 rules keep grading on the raw
   proxy — nothing existing is re-graded.
4. Attribution REPORT (not a criterion): share of the 2022–23 widening the
   global legs explain — the rates-contamination question, answered
   descriptively.

**Acceptance criteria (adopt/reject, one run):** adopted iff (a) the
no-lookahead property holds by construction and test; (b) residual coverage
≥ 95% of proxy days after warmup; (c) deliverables 2–3 completed and recorded.
Rejection would mean the construction is unsound (e.g. coverage collapse), not
that the numbers disappoint — hoped-for results are not criteria.

**Caveats stated in advance:** EMB is a total-return PRICE index (duration
exposure; DGS10 leg controls it only partially — a residual widening can still
contain a rates component). The CDS-era residual has few days (≤597 minus
warmup) — its bar carries a small-n flag; if the CDS-era residual sample after
warmup is under 250 days, the residual bars collapse to a SINGLE era solved on
the full residual history (decided now, before seeing the data).

**RESULT (single run, 2026-08-08) — ADOPTED.** Series: `derived.residual_bp`,
2,154 days 2017-08-22→2026-08-06 (warmup consumes the pre-2017-08 proxy).
Criteria: (a) no-lookahead holds by construction + test (truncation test in
`test/residual.test.ts`) ✓; (b) coverage 100% of proxy days post-warmup
(bar was 95%) ✓; (c) deliverables recorded below ✓. CDS-era residual sample =
348 days ≥ 250, so bars stay era-stratified per the pre-registered fallback
rule (with the small-n flag on every CDS-era bar). Rolling in-window R²:
p10 0.18 / p50 0.61 / p90 0.88 — the global legs explain most of the level
most of the time, and sometimes very little; both regimes are real.

**Base-rate study — the phase-2 plan's hope is NOT confirmed, recorded as-is:**
the hoped-for result was "the small-move base rate on the residual is far
below the raw ~33%". Measured, the residual's small-move base rates are
HIGHER than raw (Ariva era, 60d: ≥50bp passes 42.2% of days vs raw 35.6%) —
stripping the fitted component adds fit noise at small scales. Where the
residual genuinely differs is LARGE moves: Ariva-era 60d ≥130bp = 7.8% vs raw
9.4%, ≥180bp = 2.4% vs raw 4.5% — big Bahrain-specific moves are rarer and
therefore more meaningful than big raw moves. The lens's value is attribution
and a cleaner exam for new rules, not an easier small-move target.

**Bar re-expression (arms P2-L2/P2-L4 grading; frozen from here):**

| Direction/window | Target | CDS era (n=348, small-n flag) | Ariva era |
|---|---|---|---|
| widen, 180d | 19.90% | **250bp** (19.5%) | **170bp** (18.8%) |
| widen, 60d | 17.76% | **80bp** (15.5%) | **110bp** (15.4%) |
| tighten, 180d | 19.90% | **130bp** (16.4%) | **150bp** (17.3%) |
| tighten, 60d | 17.76% | **80bp** (16.7%) | **90bp** (14.8%) |

Stored as param `residual_bars` (nullable; storing it ARMS the new tiers'
grading — same gate pattern as `omn:backtest_rules`). Flags dated before the
residual's first day (2017-08-22) grade `unresolvable` — no reference exists;
they are shown but excluded from scoreboard denominators, stated on-page.

**Attribution report (deliverable 4):** proxy move = global(fitted) +
Bahrain-specific(residual):
- **COVID crash** (2020-01-31→2020-03-31): +537bp = +482 global + 55 specific
  — **90% global**.
- **2022 Fed-tightening year** (2021-12-30→2022-10-31): −302bp = −289 global
  − 13 specific — **96% global** (note: SPREADS narrowed through 2022 on high
  oil; the 2022 "rates contamination" lives in bond PRICES / domino 5, and the
  residual cleanly confirms the spread side carried almost no Bahrain news).
- **2025 crisis** (2024-12-30→2025-08-06): +260bp = +77 global + **183
  Bahrain-specific — 70% homegrown**. The current distress is NOT a global
  beta artifact; presentationally this is the residual lens's headline.

### Pre-registered spec P2-L3 — refinancing wall (written 2026-08-08, BEFORE the conditioning study)

**Where it sits:** a timing overlay on Domino 2 — a CONDITIONING input that
annotates existing alerts near maturity walls. It is NOT a standalone alert
family and adds no new flags; nothing frozen moves.

**Data reconciliation (recorded before the run):** the live wall
(`data/manual/bond_maturities.csv`, 39 issues, issued-gated) was found to be
MISSING `XS2384406612` — the 3.5% bond maturing **2026-09-08**, i.e. the
imminent wall event itself (the recon wall CSV listed it but with size
unknown, which would fail closed). Sourcing attempt (2026-08-08): coupon +
maturity dual-confirmed (cbonds census + instruments sweep); **size USD 500mn
per cbonds index data captured twice via independent searches** (primary page
paywalled — flagged LOW CONFIDENCE in the row note, per the CSV's existing
single-source flagging convention); issue month 2021-09, maturity-aligned
approx (the CSV's existing convention for pre-2015 rows). The row is ADDED.
Blast radius (a data addition changes the issued-gated cover history from
2021-09 on): the rollover_wall flag record is re-derived and any diff vs the
published record (3 flags → 2 episodes, 1 hit / 1 FP) is measured and
published below, whatever it says.

**Series (deterministic, walk-forward, issued-gated):**
- `derived.months_to_next_large_maturity` — months until the next maturity
  with face ≥ $500mn ("large" is a stated definitional convention, registered
  here), evaluated on each proxy trading day from issued-gated rows.
- `derived.maturing_12m_usd_mn` — rolling sum of amortizations in (t, t+365d],
  issued-gated (the same quantity rollover_cover already consumes,
  materialized as a series).

**Conditioning spec (frozen):** alerts in the fundamental and curve tiers
whose obs_date falls within **6 months** before a large maturity get
`wall_months` written into their `details_json` and a wall badge in the UI.
No weight, threshold, or grading changes — display + audit only.

**The single evaluation — conditional-precision study:** on the
already-graded historical record (Bahrain, fundamental + curve tiers,
resolved flags only), compare hit rates of flags fired within 6 months of a
large maturity vs the rest, era-split. Published whatever it says; if the
split shows nothing, the conditioning ships as context labels only. No
adopt/reject on thresholds (there are none) — the adopt/reject is on whether
wall proximity is CLAIMED as precision-relevant in presentations.

**The 2026-09-08 live event:** countdown card on /domino2 + chain-strip
badge; the system records `rollover_cover` and the wall series through the
event — live out-of-sample evidence either way; a dated observation note goes
here after the event.

**RESULTS (single run, 2026-08-08):**

- **Data reconciliation blast radius: ZERO.** After adding the XS2384406612
  row ($500mn, issued 2021-09), the rollover_wall flag record re-derived to
  exactly the published record — same 3 flags (2020-06-02 FP, 2025-01-27 hit,
  2025-06-02 FP), same outcomes. Today's cover with the September bond
  included: wall $1,500mn next 12m vs reserves $2,426mn → cover 1.62 (no
  breach). Next large maturity: **2026-09-08, $500mn, ~1 month out.**
- **Conditional-precision study (resolved fundamental+curve flags, era-split,
  near-wall = fired ≤6 months before a ≥$500mn maturity):**

| Era | Near-wall | Away from wall |
|---|---|---|
| CDS era | 2/5 = 40.0% | 6/31 = 19.4% |
| Ariva era | **32/96 = 33.3%** | **3/44 = 6.8%** |

  The effect is large and in the hypothesized direction: flags fired with no
  large maturity within 6 months almost never follow through (3/44), while
  the same rules near walls hit at ~5× that rate. Honest caveats: (i) Bahrain
  runs an almost-continuous wall calendar (101 of 176 resolved flags are
  near-wall), so "near-wall" is the common state, not a rare filter; (ii)
  this is a CONDITIONAL SPLIT of an existing record, not a new signal — the
  causality (funding stress bites when rollover needs loom) is the lens's
  thesis, not established fact; (iii) not graded per C-R2 episodes — flags,
  not episodes, are the unit here, so re-fire clustering inflates n in both
  buckets. **Disposition: adopted as a conditioning display** — wall badges
  on alerts + the split shown on /domino2; presentations may cite the split
  WITH caveats (i)–(iii) attached. No threshold, weight, or grade moved.

### Pre-registered spec P2-L2 — peg/funding lens (written 2026-08-08, BEFORE any evaluation)

**Where it sits:** between dominoes 2 and 3 — funding pressure is how
balance-sheet erosion first touches markets. Under the dollar peg, the
BHIBOR−USD differential ≈ the peg/funding risk premium.

**Series (frozen):** `derived.bhibor_usd_diff_bp` = BHIBOR 3M quarterly average
− USD leg quarterly average, in bp; obs_date = quarter-end, publication-gated
by the Q-end+45d rule (M1 registry). USD leg: **TB3MS through 2018-Q2, SOFR
from 2018-Q3** (first full SOFR quarter; splice explicit, owner-approved).
Documented biases: TB3MS is a Treasury rate, so the pre-splice differential is
OVERSTATED by the T-bill–interbank credit spread (~50–150bp, era-dependent,
consistent within era); SOFR is overnight vs BHIBOR 3M (tenor mismatch,
smoothed by quarterly averaging). A TB3MS-throughout variant is computed as a
labeled diagnostic (single consistent leg), never graded.

**Alert rule:** new tier `peg`, rule `funding_stress`, edge-triggered when the
differential crosses ≥ a firing threshold. Alert obs_date = the PUBLICATION
date (a quarterly average is not knowable at quarter-end). Threshold solved
OUTCOME-BLIND before any grading is looked at, per the drainFromPct precedent:
smallest 10bp-rounded level whose share of quarters at-or-above it ≤ the
frozen 19.9% target, solved on all quarters 2009-Q4→2026-Q2, stored as param
`peg_thresholds.diffFromBp` (storing it arms the lens).

**Grading — episode-level ONLY, pre-committed:** quarterly cadence makes
flag-level counting meaningless. Hit = the RESIDUAL series (P2-L1
re-expression) widens ≥ the era bar (250bp CDS era / 170bp Ariva era, 180d
window) within 180d of the flag. C-R2 clustering verbatim (180d chain window,
first-flag grade, any-hit sensitivity, 10k seeded bootstrap, 90% CI vs the
achieved residual base rates 19.5%/18.8%). Flags before the residual's first
day (2017-08-22) grade `unresolvable` and are excluded from the denominator
(shown, labeled). Small-n stated in advance: ~66 quarters can only produce a
handful of episodes; the CI will likely be uninformative.

**Acceptance criteria (one run, adopt/reject recorded either way):**
1. **HARD precommit — 2018 must be visible in the DIFFERENTIAL** (not just the
   level, which is Fed-contaminated): the 2017-Q4→2018-Q4 window must contain
   a top-decile differential reading or a funding_stress flag. Fail ⇒ the lens
   is rejected regardless of anything else.
2. Ships live only if the episode-level record shows lift ≥ 1× at the point
   estimate; otherwise the rule is gated experimental (flags generated but
   labeled non-signal), record kept.

**RESULT (single evaluation, 2026-08-08) — REJECTED on the pre-committed
criterion 1.** Full record:

- Differential built for all 66 quarters (2009-Q4→2026-Q2; TB3MS leg 35
  quarters, SOFR leg 31). Distribution: min −10bp (2024-Q3), p50 ≈ 425bp,
  max 764bp (2009-Q4).
- Outcome-blind threshold solve: target ≤ 19.9% of quarters → **590bp**
  (achieved 19.7%; 580bp → 25.8%). Stored, then the evaluation ran once.
- **Criterion 1 FAILED**: the 2017-Q4→2018-Q4 window's differentials are
  380 / 371 / 345 / 342 / 294bp — nowhere near the top decile (cutoff 670bp)
  and far below the 590bp threshold. The differential *compressed* through
  the 2018 crisis. No funding_stress flag exists in the window.
- The three edge-triggered flags at 590bp all sit in the ZIRP era
  (2010-02-14, 2013-05-15, 2014-05-15) — every one predates the residual
  reference (2017-08-22), so the gradable episode record is EMPTY. Criterion
  2 is unmeetable even in principle on this construction.
- **Mechanism, honestly stated:** the BHIBOR−USD differential is NOT the
  Fed-stripped peg-stress measure the phase-2 plan hoped for. BHIBOR carries
  a large, sticky Bahraini liquidity/credit premium whose measured size moves
  INVERSELY with the US cycle: at ZIRP the wedge is 600–760bp (mechanical,
  not stress); in hiking cycles it compresses (US legs rise faster than the
  quarterly-averaged BHIBOR follows). 2018's funding stress — clearly present
  in BHIBOR *levels*, which is what the recon note saw — is invisible in the
  quarterly differential. Quarterly averaging additionally smooths away any
  intra-quarter spike (limitation stated at registration).
- **Disposition per protocol:** `peg_thresholds.diffFromBp = null`
  (disarmed) — no peg flags were ever written to the live alerts table (the
  rejection landed before the first generation run; the would-be record above
  is preserved here). The differential SERIES stays computed
  (`derived.bhibor_usd_diff_bp` + the TB3MS-throughout diagnostic) and is
  displayed on /peg as context with the rejection verdict on-page. A future
  variant (e.g. differential CHANGES q/q, or daily BHIBOR fixings if a source
  ever surfaces) would require a new pre-registered spec — not iterated until
  it passes.

## APIs & data sources in use

| Source | What | URL / notes |
|---|---|---|
| FRED CSV (no key) | Brent spot, UST par curve 1–30y | `https://fred.stlouisfed.org/graph/fredgraph.csv?id=<SERIES>&cosd=<date>` — missing values are `.` or empty |
| Ariva.de | Daily traded prices, Bahrain USD eurobonds | `https://www.ariva.de/<isin>/historische_kurse?go=1&boerse_id=5&month=<month-end>...` — **serves HTTP 410 with a full body; read it anyway.** German number format. Live ISINs: XS1405766541 (7% '28), XS1675862012 (6.75% '29), XS2058948451 (5.625% '31), XS1675862103 (7.5% '47) |
| IMF DataMapper | Debt/GDP (`GGXWDG_NGDP`), fiscal balance (`GGXCNL_NGDP`), annual | `https://www.imf.org/external/datamapper/api/v1/<IND>/BHR` — **ignores the country filter, returns all 226 countries; always pick BHR from the payload.** Years past the WEO vintage are projections |
| CBB bulletin | Reserves, public debt (Table 12) | Manual quarterly CSV drop (`data/manual/`) — xlsx layout drifts, ~12 rows/yr not worth a parser |
| IMF MCD REO archive | Bahrain fiscal breakeven **vintages** ($/bbl), one row per release Oct-2014→May-2025 | `data/manual/breakeven_vintages.csv`, series `manual.breakeven_usd`, obs_date = publication date, per-row source note (Statistical Appendix Table 5/6, or data.imf.org MCDREO dataset vintage via DBnomics git where no table was printed). Table discontinued from Oct-2025 REO — future vintages need a new source or the value carries forward |
| Seed (cbb-report) | Real Bahrain 5Y CDS 2015-08→2019-06 (594 pts) | WorldGovernmentBonds feed, discontinued — calibration only, never live |
| FRED `OVXCLS` | Oil volatility index, daily 2010→ | Same FRED CSV endpoint; Domino Zero vol family |
| Yahoo finance | Brent futures curve: front (`BZ=F`) vs +6m contract (`BZ<M><YY>.NYM`) | `query1.finance.yahoo.com/v8/finance/chart/<sym>` — needs browser UA; **WSL quirk: slow IPv4 handshake + broken IPv6 route → disable Node happy-eyeballs** (see fetchers/http.ts). Live-only, accumulates from Aug-2026 |
| CFTC Socrata | WTI managed-money positioning, weekly 2006→ | `publicreporting.cftc.gov/resource/72hh-3qpy.json`, filter `cftc_contract_market_code=067651` (name changed in 2022, code is stable). Fields `m_money_positions_*` |
| OPEC calendar | Meeting dates (binary events) | Manual CSV `data/manual/opec_meetings.csv`, majors seeded 2014–2024; future dates maintained by hand |
| **Pending key:** EIA v2 | WTI futures contracts C1/C4 daily 1983→ (historical contango) + weekly US crude stocks | `api.eia.gov/v2/petroleum/pri/fut` (`RCLC1`,`RCLC4`) and `/petroleum/stoc/wstk` (`WCESTUS1`); free key via eia.gov/opendata, env `EIA_API_KEY`. US-gov public domain. Activates the physical family historically — the frozen contango thresholds make its backtest a true out-of-sample test |

Oman sources (Ariva `ariva-oman`, DataMapper `imf-weo-oman`, IFS reserves
`omn-reserves` via DBnomics, manual CSVs in `data/manual/oman/`) are catalogued
in the Oman section's provenance table above.

Related: the original scoping note lives one level up —
`nbb/CDS/cds-haircut-prediction-scoping.html`.
