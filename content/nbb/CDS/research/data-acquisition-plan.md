---
title: Data Acquisition Plan — Terminal Pull List & Ground-Truth Options
tags: [cds, credit-risk, bahrain, banking]
summary: What to extract if Bloomberg access arrives, in priority order; the honest answer on whether Bahrain's "actual" haircut can ever be obtained; and the one way to replace modelled recovery with observed ground truth.
created: 2026-08-09
status: draft
---

# Data Acquisition Plan

Take this to the terminal. Ordered so that if you only get twenty minutes, the
first three rows are the ones that matter.

---

## Part 1 — Can we get the ACTUAL haircut rate?

**For Bahrain: no. It does not exist, at any price, from any vendor.**

The realized haircut is set by creditor committees and an ISDA auction *after a
default*. **Bahrain has never defaulted.** There is no number to buy, because
the event that would create one has not happened. Bloomberg cannot sell it,
Markit cannot sell it, and neither can anyone else. This is the distinction
already documented in `three-haircut-rates.md`: the quoting convention (fake,
frozen at 25%), the market's expected haircut (real but hidden inside prices —
what this system estimates), and the realized haircut (only exists at a credit
event).

So the honest position: **for Bahrain, everything will always be inferred.** No
amount of data access changes that.

### But the METHOD can be validated against real ground truth

This is the part worth doing, and it has never been attempted.

Roughly twenty sovereigns HAVE defaulted and DO have an observed realized
recovery. For each, two things are knowable:

1. Their bond prices in the months before default — the same input our benchmark
   consumes.
2. The **ISDA auction final price**, i.e. the actual realized recovery.

So: run our exact benchmark construction (Merrick cross-sectional fit + the 15pt
consistency gate + the Bayesian prior shrinkage) on their pre-default prices, and
compare what it *would have predicted* against what actually happened.

**That converts the benchmark from an unfalsifiable model into a measured one.**
It answers, with real numbers, the question this system has never been able to
answer about itself: *when our benchmark says the haircut is 45%, how wrong is
that likely to be?*

Candidate events with auction outcomes: Ecuador (2008, 2020), Argentina (2001,
2014, 2020), Greece (2012), Ukraine (2015, 2022), Venezuela (2017), Lebanon
(2020), Zambia (2020), Sri Lanka (2022), Ghana (2022), Russia (2022), Belize,
Barbados, Suriname, Mozambique, Seychelles.

**There is a known bias to measure.** The literature already says at-default
prices UNDERSTATE final recovery by roughly 10–13 points (Russia, Ecuador; Sri
Lanka bonds traded 25–40 against a final NPV haircut under 10% in some
scenarios). Our benchmark has never been corrected for this because we have
never had the ground truth to measure it against. With auction data we could
measure the bias **on our own construction** rather than importing someone
else's estimate.

### Transferability — the objection, and what survives it (owner, 2026-08-09)

**Objection raised:** the defaulted sovereigns are not oil-dependent like
Bahrain, so an estimator validated on them may not transfer.

**Mechanism check first — the benchmark has NO oil input.** Verified in code:
`computeBenchmark` consumes bond prices, the UST curve and the recovery prior,
and nothing else; oil, Brent, breakeven and the DSA anchor appear nowhere in it.
The BAND (the model's output) does use oil, through
`fiscalSensPctGdpPer10Usd × oilDeltaUsd` in the DSA anchor at weight 0.5 — but
the band is not what this validation targets. So the estimator is not
oil-conditioned and the objection does not bite where it was aimed.

**But it lands on something worse.** Realized recovery is determined by creditor
mix, governing law and official-sector support — not by oil. And there the
sample really is unlike Bahrain:

> **Bahrain has not defaulted precisely BECAUSE of the GCC backstop** (the 2018
> $10.2bn Saudi/UAE/Kuwait package). The set of sovereigns with observed
> recoveries is therefore, almost by construction, **the set that had no rich
> neighbour.** Validating on defaulters means validating on the group Bahrain is
> structurally excluded from.

That is a SELECTION EFFECT and no volume of data removes it.

**Mitigation — stratify, do not pool.** The sample is not uniformly
non-commodity. Commodity exporters with observed recoveries include **Ecuador
(2008 and 2020), Venezuela (2017), Russia (2022), Suriname (2021), Ghana (2022),
Zambia (2020, copper) and Mozambique (2016, gas)**. **Ecuador is the closest
available analogue** — oil-dependent, dollarized (structurally close to a hard
peg), and defaulted twice, giving two observations of one sovereign.

The test to run is therefore NOT "does the method work on average" but **"does
the method's error differ systematically between commodity exporters and the
rest?"** If it does not, transfer to Bahrain is defensible. If it does, the
size of that difference is the discount to apply.

**What the validation can and cannot claim, fixed now:**

- CAN: *"on sovereigns that actually defaulted, our construction predicted
  realized recovery with an error of X ± Y, and that error was/was not different
  for commodity exporters."*
- CANNOT: *"the benchmark is accurate for Bahrain."* Bahrain's defining feature
  is the backstop that keeps it out of the sample.

Still worth doing: the benchmark currently has **no measured error bar at all**,
resting on a ±8–12pt figure imported from other people's literature. Moving from
"unmeasured" to "measured, with a stated transferability limit" is real. Moving
to "validated for Bahrain" is not available at any price.

**Free-first note:** the Cruces–Trebesch haircut database and the
Asonuma–Trebesch restructuring dataset are academic publications covering ~180
restructurings and may be obtainable without a terminal. **Check those before
spending terminal time** — the [20%, 75%] prior currently in the model comes from
this literature anyway, so grounding it in the underlying data may cost nothing.

---

## Part 2 — The pull list

### Tier 1 — foundations. Pull these even with twenty minutes.

| # | What | Why it matters |
|---|---|---|
| **T1.2** | **Bahrain 5Y CDS — daily BID and ASK, 2008→** | **PULL THIS FIRST.** Whether any of this makes money currently hinges on an *assumed* 10.9bp break-even round-trip. This turns the central question into a measurement. Rarely exported — ask explicitly. |
| T1.1 | Bahrain 5Y USD senior CDS — daily MID, 2008→ | Retires the Ariva proxy. No venue gap, no borrowed ratio, no era split, ~7 extra years of history. Every grade re-derives against the real instrument. |
| T1.3 | Peer CDS 5Y mid, 15–20 EM sovereigns, 2008→ | The real fix for statistical power — the properly-powered version of X-R1, which had to make do with three proxies. Oman, Qatar, Saudi, Kuwait, Abu Dhabi, Jordan, Egypt, Turkey, South Africa, Brazil, Mexico, Indonesia, Colombia, Nigeria, Angola, Morocco, Tunisia. |
| T1.4 | **Bahrain CDS quoted recovery assumption** | Replaces the system's single largest modelling construct with an observation. Our Merrick fit *estimates* recovery from bond prices, and its 15pt gate rejects 2,206 of 2,631 days. |
| T1.5 | Sovereign issuance history — launch spread vs secondary | N6 (new-issue concession) delivered complete, rather than reconstructed one press release at a time. |

### Tier 2 — signals genuinely unobtainable free

| # | What | Why it matters |
|---|---|---|
| T2.1 | Bahrain CDS term structure — 1Y/3Y/7Y/10Y mid | Real curve inversion. Our Domino 3 slope is a two-bond *reconstruction*; this is the instrument. Would show how much of the slope was bond artifact (cf. the Jordan roll-down failure). |
| T2.2 | Bahrain CDS in EUR → **quanto basis vs USD** | A direct market price of devaluation/redenomination risk. **The instrument P2-L2 should have used instead of BHIBOR**, and it routes around S1.2's BLOCKED verdict on BHD forwards. |
| T2.3 | CDS–bond basis (5Y CDS vs asset-swap spread) | Dislocation and funding stress; also quantifies how much of our proxy error was basis rather than noise. |
| T2.4 | Bahraini bank CDS — NBB, BBK, Ahli United | The sovereign–bank doom loop (N3) daily, without the CBB bulletin's monthly publication lag. |
| T2.5 | EMBI / CEMBI Bahrain sub-index spread | The residual lens regresses on the EMB *ETF* only because FRED truncates the proper ICE indices to a rolling 3y window. This is the correct regressor. |
| T2.6 | Bahrain equity index + bank equity prices | Daily read on the doom loop, versus monthly-and-lagged CBB tables. |
| T2.7 | Rating actions with dates, outlook/watch changes | S1.3 stalled because historical *scheduled* review dates are not archived free. The action history at least fixes the backtest arm. |

### Tier 3 — the ground-truth validation set (Part 1)

| # | What |
|---|---|
| T3.1 | **ISDA auction final prices** for every sovereign credit event available |
| T3.2 | Pre-default daily bond prices for those same sovereigns, ideally 12–24 months before the event, across their curve |

### Deliberately NOT on the list

Macro forecasts, analyst estimates, news sentiment. All available, all tempting,
and all backward-looking or survey-based — **the exact category that has failed
4-for-4 in this project** (attribution, GCC decoupling, reserves drain,
liquidity). Do not spend terminal time on them.

---

## Part 3 — Access, format, and what happens next

### A one-off export is all this needs

This is a **backtest**. No live feed, no API contract.

| Tier | Scripting | Needed? |
|---|---|---|
| Terminal seat (~$28–32k/yr) | Excel `BDH`/`BDP`, tied to your session | **YES — sufficient** |
| Desktop API (`blpapi`, bundled) | Only while logged in at that machine; no redistribution | no |
| Server API / B-PIPE | Yes | **NO — do not pursue** |
| Data License / Per-Security | Yes, bulk historical | only if NBB already holds one |

**The ask: one person, one terminal, one hour in Excel, one CSV.** Worth asking
whether NBB's market-data team already holds a Data License — that would be the
cleaner route.

**Clear it with compliance BEFORE the pull.** Bloomberg redistribution terms are
strict, and "exported to CSV for an internal model" is precisely the case that
gets scrutinised at a bank.

### How to pull

```
=BDH("<ticker>","PX_LAST","1/1/2008","today")     ' mid
=BDH("<ticker>","PX_BID","1/1/2008","today")      ' bid  ← ask for this
=BDH("<ticker>","PX_ASK","1/1/2008","today")      ' ask  ← and this
```

**Do not trust ticker strings from memory.** Sovereign CDS follows a
`C<COUNTRY><SENIORITY><TENOR> <SOURCE> Curncy` convention but the source suffix
and seniority code vary. Confirm each on the terminal via `SOVR <GO>` or
`WCDS <GO>`; use `CDSW <GO>` for curve work.

### Save format — drops straight in, no new parser

```csv
series,obs_date,value,source_note
cds.bh.5y,2016-03-01,284.5,"Bloomberg <TICKER> PX_LAST, pulled 2026-xx-xx"
```

`cds.bh.5y` is the name the engine already reads for the real-CDS era, so an
extended history slots in directly (`data/manual/README.md`).

### The wrinkle: an export creates a new era boundary

The live series after the export date stays the Ariva proxy, so the reference
becomes `real CDS (2008 → export) | proxy (export → )`. This is the CURRENT
problem improved, not a new one — today the split is real CDS 2015–19 then
proxy. The architecture already handles it (C-R1/C-R3 era-stratified bars exist
for exactly this); the boundary date simply moves. Re-exporting every year or
two keeps the proxy window short.

### What must happen when it lands — do not skip

Replacing the grading reference **re-derives every historical grade in the
system**. Under hard rule 3 that is a threshold-class change: pre-registered
spec BEFORE the re-run, single evaluation, full before/after diff published
whatever it shows.

**Stated in advance so it cannot be spun afterwards: better data may make the
record look WORSE.** The Ariva proxy is noisy and noise inflates apparent moves;
real CDS is cleaner, so base-rate-matched bars will land differently and some
current hits may not survive. The C-R4 47% is measured against a proxy.

**Expectation recorded now: the lift claims will likely shrink, and the decision
framing — "don't spend premium on unfiltered warnings" — will likely strengthen**,
because the latter is robust to measurement quality and the former is not.
