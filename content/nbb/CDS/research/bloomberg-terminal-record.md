---
title: Bloomberg Terminal Session Record — Bahrain Sovereign CDS
tags: [cds, credit-risk, bahrain, banking]
summary: Everything captured from the one Bloomberg session — instrument identifiers, access constraints, the 2018-2026 daily CDS history with bid, contract terms from CDSW, and the corrections these forced. Written to survive losing terminal access.
created: 2026-08-09
updated: 2026-08-09
status: draft
space: shared
---

# Bloomberg Terminal Session Record

**Captured 2026-08-09, in one session.** Terminal access is not assumed to be
permanent, so this records not just the numbers but the *route* to each of them —
tickers, screens, source codes, and which paths were blocked — so the session can
be repeated by someone else without rediscovering any of it.

Nothing here has entered the model. Replacing the grading reference is a
threshold-class change under hard rule 3: **pre-registered spec first, one
evaluation, results-commit published whichever way it lands.**

---

## 1. Instrument identifiers — the hard-won part

| Field | Value |
|---|---|
| Terminal ticker | `BHRAIN CDS USD SR 5Y D14 Curncy` |
| Alternate form | `BHRAIN CDS USD SR 5Y Corp` |
| Instrument ID (resolved by HP) | `CT393413` |
| Other tenors confirmed to exist | `BHRAIN CDS USD SR 2Y D14`, `... 10Y D14` |
| Reference entity | Kingdom of Bahrain |
| REF Obligation | `XS2172965282` |
| RED pair code | `MS9996AF1` |
| Contract | 2014 ISDA, `SEME` (Standard Emerging Market Sovereign) |
| Debt type / restructuring | Senior / `CR14` |
| Day count · frequency · calendar | ACT/360 · Q · 5U |

**How it was found:** typing `Bahrain CDS` into the command line and pressing
`<GO>` opens a security search panel. `WCDS <GO>` did **not** present a
sovereigns tab on this terminal. `SECF`, `SOVR` and `CDSW` are the fallbacks.

---

## 2. Access constraints — read this before repeating the session

**The Excel/BDH API and the terminal display have different data entitlements,
and the difference is source-specific.**

| Source | On screen | Via Excel BDH |
|---|---|---|
| `CMAN` (CMA New York) | full daily history 2013→ | **only 2009–2011** |
| `CBIN` (Bloomberg composite) | 2009–2010, 2022–2026 | same — consistent |

CBIN behaves identically in both places, so Excel is not broken and there is no
row cap. Only the CMA data disagrees, which is the signature of a third-party
data entitlement: licensed to *view*, not to *pull*. Unresolved — a `HELP HELP`
query about entitlement was drafted but the session proceeded without it.

**Consequence:** everything 2018–2023 below was transcribed from screen images,
not exported. Requesting an 18-year span in one BDH call also returns silently
truncated and flat-filled data (a 133-day frozen `170/145` quote in 2010) — pull
in ~3-year windows if the API route ever opens.

**Other traps:**
- Amber input fields commit on **Enter**, not on the `GO` button. The High/Low
  block is the tell — if it hasn't changed, the screen didn't refresh and you are
  about to export the previous range.
- HP accepts a maximum of **two** fields. Ask ≠ separate pull: see §5.
- CMAN's history begins **2008-07-29**; earlier start dates are clamped.

---

## 3. What was captured

**Bahrain 5Y USD senior CDS — mid and bid, daily, 2018-01-02 → 2026-08-10.**
2,398 unique days. Three missing business days in 8.6 years (two in 2024, one in
2026, both from the CBIN-exported portion).

File: `bloomberg-2026-08-09/bahrain-cds-5y-2018-2026-CMAN.xlsx`

| Year | Days | Source | Reconciliation vs terminal header |
|---|---|---|---|
| 2018 | 260/261 | CMAN screen | High ✓ Low ✓ mean mid +0.153 |
| 2019 | 261/261 | CMAN screen | High ✓ Low ✓ **mean ±0.000** |
| 2020 | 262/262 | CMAN screen | High ✓ Low ✓ |
| 2021 | 261/261 | CMAN screen | **range mean ±0.000** |
| 2022 | 260/260 | CMAN screen | **range mean ±0.000** |
| 2023 | 260/260 | CMAN screen | **range mean ±0.000** |
| 2024–2026 | ~680 | CBIN export | — |

Validation method: the HP header reports High, Low and both column averages for
whatever range is displayed. Transcribing a full range and recomputing those four
statistics is an exact check, not a plausibility check. Four of six periods
reconcile to the third decimal on **both** mid and bid.

**Pre-2018 is not usable.** CMAN 2009–2011 is sparse and contains a 133-day run
of an identical `170 / 145` quote ending July 2010 — a frozen placeholder, not a
market. 2012–2017 returned nothing from either source at the time of capture.

### Data-quality flags, in the source not the transcription

- **Alternating half-spread, mid-2019.** June alternates ~2.5bp / ~12.2bp day to
  day; July alternates ~10.2 / ~13.0. Too regular to be a market.
- **Stale runs.** Ten consecutive near-identical mids around 2019-11-20, shorter
  runs in July and December 2019.

Both are recorded in the workbook's `_notes` sheet. Do not build a volatility or
spread series across those stretches without addressing them.

---

## 4. Source basis — CMAN vs CBIN, measured

253 overlapping days, 2022-03-28 → 2023-12-29:

| | |
|---|---|
| Median mid difference | **−0.20bp** |
| Mean | −0.13bp |
| Range | −14.9bp to +24.2bp |
| Days differing by >5bp | **32 of 253 (12.6%)** |

**On average the two sources are the same instrument; on any given day they are
not.** A 24bp disagreement will not move a 180bp grading bar over a 60-day
window, but it can flip a 20-day slope signal. The series as it stands has a
source join at end-2023 and that join must be declared wherever the series is
cited. Capturing 2024–2026 from CMAN (~15 pages) would remove it entirely.

---

## 5. Execution cost — the finding that changes a published claim

`PX_LAST` is **exactly** the bid/ask midpoint (verified on live quotes from both
sources: mid 283.021 = midpoint of 278.688/287.353, to three decimals). So
`mid − bid` is the half-spread and **`ask = 2 × mid − bid`** — the ask series is
derivable and never needs its own pull.

| Year | Full round-trip bid-ask |
|---|---|
| 2018 | **29.5bp** |
| 2019 | 20.5bp |
| 2020 | 23.8bp |
| 2021 | 21.2bp |
| 2022 | 24.3bp |
| 2025 | 9.9bp |
| 2026 | 9.0bp |

`hedging-economics.md` computes a break-even at **10.9bp** and lists zero bid/ask
as "the single weakest assumption here". Measured cost runs 20–30bp through
2018–2022 — roughly **2–3× the break-even**, and widest in exactly the stressed
years that generated the backtest's profits.

Order of magnitude: ten round trips at ~25bp on $10m notional is ~$1.0m against
+$0.44m gross. **The hedging P&L is negative once the spread is paid.**

Two qualifiers held firmly:
- That arithmetic uses median spread × ten trades. The defensible version pays
  the spread prevailing on each actual entry and exit date, which is now
  computable. The sign is unlikely to change; the magnitude will.
- **The $1.8m filter swing survives untouched** — action list versus hedging
  everything is a relative comparison and both sides pay the same spread. It was
  always the stronger claim and it is now the one left standing.

The acquisition plan predicted, in advance, that better data would likely shrink
the lift claims and strengthen the decision framing. That is what happened.

---

## 6. CDSW — contract terms and pricing outputs

Screen: `CDSW <GO>` with the CDS loaded. Curve date 2026-08-09, $10mm notional,
5Y (maturity 2031-06-20), trade spread 287.3530bp.

| Field | Value |
|---|---|
| **Recovery Rate** | **0.25** (`use curve recovery rate: True`) |
| Coupon | 100bp running |
| Price | 92.36818407 |
| Principal | 763,181 |
| Accrued (49 days) | −13,611 |
| **Cash amount** | **749,570** |
| **Spread DV01** | **3,838.80** |
| IR DV01 | −177.40 |
| Rec Risk (1%) | −894.51 |
| Default exposure | 6,736,818 |
| Implied default prob (to 2031-06-20) | 0.1714 |

### Correction: the recovery rate is a dead end (T1.4 retired)

The acquisition plan listed "Bahrain CDS quoted recovery assumption" as a Tier-1
pull that would "replace the system's single largest modelling construct with an
observation." **It does not, and that expectation is withdrawn.**

25% is the **standard ISDA convention** for EM sovereigns under the `SEME`
contract — both sides of every trade agree to it so quotes are comparable. It
encodes no market view of Bahrain's recoverable value. The implied default
probability of 0.1714 is convention-dependent for the same reason.

This *confirms* rather than replaces: `three-haircut-rates.md` already
characterises the quoting convention as fake and frozen at 25%, and it is. The
benchmark still has to infer expected recovery from bond prices, and that job is
unchanged. **Strike T1.4 from the pull list.**

### RPV01 is 3.84, not 4.0

Spread DV01 of 3,838.80 on $10mm = **RPV01 = 3.84**. Every figure in
`hedging-economics.md` used an assumed 4.0, so all of it is overstated by ~4%.
Small, and in the same direction as everything else found this session.

### The duration curve — measured, and it is not flat

RPV01 falls as spreads widen, and the backtest spans entries at 166bp through
exits above 490bp. Spread DV01 read directly off CDSW by overtyping
`Trd Sprd (bp)`, $10mm notional, curve date 2026-08-09:

| Spread | Spread DV01 | RPV01 | Upfront PV on $10m |
|---|---|---|---|
| 166bp | 4,140.80 | **4.14** | $273k |
| 250bp | 3,929.27 | 3.93 | $589k |
| 287bp | 3,838.80 | 3.84 | $719k (screen: $763k) |
| 370bp | 3,646.11 | 3.65 | $984k |
| 490bp | 3,383.80 | 3.38 | $1,320k |
| 610bp | 3,140.82 | **3.14** | $1,602k |

**RPV01 declines 24.1% across the traded range.** The payoff is therefore
sub-linear in spread — you exit at a wide level where each basis point is worth
less — so a fixed duration overstates gains, and overstates them *most* on the
largest moves:

| Trade | Duration-correct | At fixed 4.0 | Overstated |
|---|---|---|---|
| 2020 contango_flip, 166 → 492bp | $1.05m | $1.30m | **24%** |
| 2018 crisis, 227 → 609bp | $1.09m | $1.53m | **40%** |
| Typical, 250 → 370bp | $0.40m | $0.48m | 22% |

This makes the concentration finding in `hedging-economics.md` **worse**: the two
trades carrying the entire backtest (2020-02-03 contango_flip, 2025-01-27
rollover_wall) are exactly the ones that exit widest and therefore shrink most,
while the eight small losers barely move.

`PV = (S − C) × RPV01(S)` reproduces $719k against the screen's actual $763k at
287bp, so **ISDA convexity adds ~6%** on top of the linear form. The correction
above is if anything conservative.

**Limitation, stated plainly.** RPV01 depends on the discount curve as well as
the spread, and these are readings on the 2026-08-09 curve. Rates in 2020 were
near zero, implying a *higher* RPV01 then than measured here — partially
offsetting the correction for the COVID trade specifically. Sizing that needs
historical swap-curve data we do not have. **Direction certain, magnitude
approximate, and the approximation degrades the further back the trade sits.**

*(First attempt returned IR DV01 by mistake — −65.87, −144.35, −264.71, −338.50,
−420.63, which interpolate to ≈−181bp at 287bp and match the IR DV01 field.
Recorded so the slip is not repeated: Spread DV01 sits one row ABOVE IR DV01 in
the right-hand Calculator column.)*

### Trade mechanics we have been modelling wrong

Sovereign CDS trades on a **standard 100bp running coupon plus an upfront
payment**. Buying $10m of protection at 287bp costs **$763,181 up front**
(cash $749,570 after accrued), not "287bp of carry per annum" as the hedging
model assumes. Same economics eventually, very different cash profile over a
six-month hold, and it changes how cost accrues within the window.

### Term structure

The CDSW chart plots the full BHRAIN USD Senior Curve at 6M / 2Y / 3Y / 4Y / 5Y /
7Y / 10Y — as of 2026-08-09 **upward sloping**, roughly 232 → 312bp, not
inverted. `CDSD <GO>` is the dedicated curve screen (current curve only; history
still requires per-tenor HP pulls).

This matters for Domino 3, whose slope is currently a **two-bond
reconstruction** — and the Jordan test showed that exact construction can be a
roll-down artifact rather than a signal. Real tenor history would settle it.

---

## 6b. CRPR — rating profile as at 2026-08-09

Screen: `CRPR <GO>`. **This is a snapshot with last-change dates, not a full
action history** — each row shows the current rating and when it last moved. The
`View Changes` tab is the route to actual history and has not yet been captured.

| Agency | Rating | Outlook | Last change |
|---|---|---|---|
| **Moody's** | B2u long term | **NEGATIVE** | **2026-04-18** |
| Moody's | Ba3u FC debt ceiling | — | 2024-05-13 |
| **S&P** | B (FC & LC LT) | STABLE | 2025-11-21 |
| **Fitch** | B (LT IDR) | STABLE | 2026-02-23 |
| Fitch | BB sovereign country ceiling | — | 2026-02-23 |
| Capital Intelligence | B | STABLE | 2026-04-03 |
| Dagong | BBB | NEG | 2016-06-07 (stale) |
| Thomson BankWatch | WR | — | 2000-12-01 (withdrawn) |

Bloomberg alternative risk measures: issuer category **HY**, contributor count 9,
level of agreement **High**, issuer rating assessment not shown (premium field).

### The live divergence

**Moody's went to NEGATIVE outlook on 2026-04-18 while S&P (Nov-2025) and Fitch
(Feb-2026) both sit at STABLE.** All three agree on the letter — single-B — but
disagree on direction, and Moody's is the most recent to have moved.

This is a live, current-state observation about a sovereign the system is
actively monitoring, and it is **not** an input to any existing domino. Whether
agency-outlook divergence has any predictive content is untested here and would
need its own pre-registered spec before it could be claimed either way. Recorded
as an observation, not a signal.

Note the two-notch gap between Fitch's **BB** country ceiling and its **B**
issuer rating — the ceiling is where the peg and transfer-and-convertibility risk
show up in the rating framework, which is the same territory Domino 6 covers and
the same thing the EUR quanto basis would price directly.

---

## 6c. RATC — full Bahrain rating action history, 2008-2026

**Route:** `CRPR <GO>` → `View Changes` opens `RATC` (global, ~18,000 rows for
the last 30 days). Filter with the orange box under **Company Name** or
**Ctry/Reg = BH**, widen the date range, then **`Export to Excel`**.

**It exported.** File: `bloomberg-2026-08-09/Bahrain_ratings.xlsx` — 2,225 rows,
**2008-02-22 → 2026-04-22**, all `BH`, eight agencies (Moody's 848, Fitch 566,
S&P 474, CI 223, AMBest 79, RAM 17, S&P Natl 13, Dagong 5), covering sovereign,
banks, and corporates.

### The export succeeding is itself the finding

RATC is Bloomberg-aggregated data and it exported without resistance. **The
entitlement block is therefore narrowly scoped to CMA pricing, not to the seat.**
Bonds, equities, indices and rating data should all be obtainable by formula or
export rather than by screen capture. Test before committing to any further
page-by-page transcription.

### Bahrain is mid-downgrade-cycle, and this is not in the framework

| Date | Agency | Action |
|---|---|---|
| 2025-04-11 | CI | outlook → NEG |
| **2025-11-21** | **S&P** | **B+ → B** |
| **2026-02-23** | **Fitch** | **B+ → B**, country ceiling BB+ → BB |
| **2026-04-03** | **CI** | **B+ → B** |
| **2026-04-18** | **Moody's** | B2u affirmed, **outlook → NEGATIVE** |

**Three agencies downgraded Bahrain by one notch in the five months to April
2026, and the fourth has signalled.** Neither `domino-framework.md` nor
`HANDOVER.md` carries this. It is live context for a system with grading windows
closing 2026-08-31/09-01 and a $500mn maturity on 2026-09-08.

### The sovereign→bank doom loop, dated

The 2026 sequence propagates cleanly and fast:

```
Fitch   sovereign 02-23  →  Mumtalakat, Bapco 02-26 (+3d)
                         →  AUB, BBK, NBB    03-02 (+7d)
                         →  Beyon            03-09 (+14d)
CI      sovereign 04-03  →  NBB, Al Baraka   04-08 (+5d)
Moody's sovereign 04-18  →  BBK, NBB         04-22 (+4d)
```

Across the full 2008–2026 history: **134 of 270 bank rating changes (49.6%) fall
within 45 days after a sovereign change**, while those windows cover only 24.7%
of the period — a **2.01× lift**, median lag **7 days**.

**But note the direction.** Sovereign moves first; banks follow within a week.
That makes bank rating actions a *confirming* indicator, not a leading one, so
they cannot serve as early warning for the sovereign. N3's doom-loop channel is
real and now dated, but this particular instrument points the wrong way. Whether
bank actions ever *precede* sovereign ones is untested.

### Rating actions and CDS — DESCRIPTIVE, not a test

CDS behaviour around the eleven sovereign rating actions with CDS coverage:

| | Median | Mean | Widened |
|---|---|---|---|
| 30d run-up **before** action | **+3.4bp** | +11.1bp | 6 / 11 |
| 30d move **after** action | **−1.3bp** | +4.9bp | 5 / 11 |

Coin flips on both sides. Individual events swing wildly in both directions
(2020-04-03 CI: +300bp run-up; 2026-04-18 Moody's: −91bp run-up).

**This confirms a call the framework already made.** The signal registry records
agency ratings as *"deliberately not an input — ratings lag the market by weeks"*.
That was asserted from the 2018 episode; it is now consistent with eleven events.

**Protocol status: this is DESCRIPTIVE and cannot be cited as a result.** It was
computed on the same data any rating-based rule would be tested against, so
designing a rule from it and then evaluating it here would be circular. What it
legitimately supports is a *resource decision* — do not spend a pre-registration
on a rating-based signal — which is a choice about where to spend effort, not a
finding about Bahrain.

### What this dataset is actually good for

RATC covers **every sovereign**, not just Bahrain, in one filtered export. If a
rating-conditioned signal is ever pre-registered, the cross-sovereign panel for
it costs one export rather than ~52 screen pages per country. It is by a wide
margin the cheapest cross-sovereign dataset found this session.

---

## 6d. Bond universe — and a flag on a live watch item

The `bhrain cds` search returned Bahrain's bond curve alongside the CDS, with
prices (end-of-day; `1 Day Chg .000`):

| Bond | Price | Yield |
|---|---|---|
| BHRAIN 7½ 09/20/2047 | 95.07 | 7.986 |
| BHRAIN 6 09/19/2044 | 82.60 | 7.810 |
| BHRAIN 7⅛ 06/10/2036 | 97.41 | 7.500 |
| BHRAIN 6¾ 09/20/2029 | 98.89 | 7.150 |
| BHRAIN 7 10/12/2028 | 99.94 | 7.024 |
| CBB Sukuk 3.95 09/16/2027 | 97.44 | 6.397 |

**None of these are the five ISINs in `BONDS`.** Bahrain's curve is materially
fuller than the one the benchmark prices off. The 2036 / 2044 / 2047 maturities
are direct candidates for handover item 6 — the **forward data cliff**, where
after 2030-03-29 no mid/short leg survives the pull-to-par trim and `slope_20d`
dies unless newer bonds are added.

### ⚠ FLAG — XS2384406612 did not resolve

`XS2384406612` — the **$500mn maturity dated 2026-09-08**, live on `/domino2`
with a countdown — returned **"information currently unavailable"** on the
terminal.

That is **not proof the bond does not exist**; the message also appears for
recognised securities with no accessible data. But it is a flag, and it lands on
a bond whose size is *already* marked LOW CONFIDENCE in `HANDOVER.md` because it
is cbonds-derived rather than primary-sourced.

> **CORRECTION, same session.** This flag was originally written up as also
> supported by a failed `=BDH("XS2384406612 Corp",...)` call. **That test never
> happened** — the formula was entered into the terminal's search bar rather than
> into Excel, where `BDH` has no meaning. The same applies to the `BHSEASI Index`
> test. **Bond and equity export via BDH remains completely untested**, and the
> only real evidence here is the bare-ISIN terminal lookup returning
> "information currently unavailable" — one weak signal, not two.
>
> A test workbook (`formula-tests.xlsx`, 28 identifiers via `BDP` plus 6 `BDH`
> history pulls) was built to settle this properly without hand-typing formulas.

**Resolve before anyone acts on the countdown.** The clean test is enumerating
Bahrain's bonds (`SRCH <GO>` filtered by country, or the `Fixed Income` tab of
the security search) and checking whether *any* September-2026 maturity appears.
If none does, both the ISIN and the $500mn figure need re-sourcing, and the
`/domino2` countdown should be suspended until they are.

### 52-week range cross-check

Search panel reports `52 Wk Hi/Lo 355.8759 / 147.8508` with the high in
**March 2026** — immediately after Fitch's 2026-02-23 downgrade, matching the
+86bp 30-day follow-through measured on that event in §6c. Independent
confirmation that the transcribed series tracks reality.

### Still unresolved: EUR CDS and bank CDS

Guessed ticker strings (`BHRAIN CDS EUR SR 5Y D14 Curncy`,
`NBB BI CDS USD SR 5Y D14 Curncy`) both returned nothing, but **guessed strings
are not evidence** — the USD ticker would not have been found that way either.
The `bhrain cds` search surfaced only the USD 5Y in Top Results; the
`Fixed Income (132)` tab was not yet opened. **Both remain genuinely untested.**

---

## 6e. Instrument enumeration — what exists, and what does not

`bhrain cds` search → `Fixed Income (132)` tab → `See All in SECF`.

### CDS: six real tenors, all USD

```
1Y  2Y  3Y  5Y  7Y  10Y                      real traded tenors
0M  1Y3M  1Y9M  4Y3M  4Y6M  5Y3M  5Y6M       Bloomberg curve interpolations
```

44 CDS instruments enumerated. **Every one is USD.**

### ✗ T2.2 RETIRED — there is no EUR-denominated Bahrain CDS

The quanto basis was ranked in the acquisition plan as *"the instrument P2-L2
should have used instead of BHIBOR"* and was the **single best candidate for a
genuinely new signal**. It does not exist. Bahrain's redenomination and peg risk
is not quoted as a separate instrument at any tenor.

P2-L2's rejection therefore stands with no better instrument available to
replace it. Domino 6's channel has no direct market price.

### Bond curve — twelve live maturities against five in `BONDS`

| Maturity | Coupon | Issuer |
|---|---|---|
| 2027-09-16 | 3.95 | CBB Sukuk |
| 2028-10-12 | 7 | Govt Intl |
| 2029-09-20 | 6¾ | Govt Intl |
| 2030-05-14 | 7⅜ | Govt Intl |
| 2031-02-12 | 6 | CBB Sukuk |
| 2032-09-16 | 5.45 | Govt Intl |
| 2033-07-07 | 6¼ | CBB Sukuk |
| 2034-02-06 | 5.8735 | CBB Sukuk |
| 2036-06-10 | 7⅛ | Govt Intl |
| 2036-02-12 | 7½ | Govt Intl |
| 2044-09-19 | 6 | Govt Intl |
| 2047-09-20 | 7½ | Govt Intl |

78 government bonds in total per SECF. **The 2036 / 2044 / 2047 maturities
resolve handover item 6 outright** — they survive the pull-to-par trim for a
decade, where the current `BONDS` set dies after 2030-03-29 and takes
`slope_20d` with it.

Also enumerated for the first time: **Bahrain sovereign syndicated loans**
(`BF…` deal / `BL…` term-loan tickers, maturities 2029–2032). Not a model input;
recorded because the loan stack has never been visible before.

### Still unresolved

The `See All in SECF (78)` bond enumeration did not navigate, so **no September
2026 maturity has been confirmed or ruled out**. The `XS2384406612` flag in §6d
stands. Next route to try: `BHRAIN <CORP key> <GO>` for the issuer's bond list.

---

## 6f. Strategic read — what kind of win this was

Set against the acquisition plan's tier list, the terminal delivered a **much
better measurement of things already in the model**, and almost **no new signal**:

| Candidate | Verdict |
|---|---|
| T1.1/T1.2 real CDS + bid | **delivered** — 8.6 years, replaces the Ariva proxy |
| T1.4 quoted recovery | dead — ISDA convention, carries no market view |
| T2.2 EUR quanto basis | **dead — instrument does not exist** |
| T2.7 ratings as signal | dead — coin flips; confirms the registry's existing call |
| T2.4 bank CDS | **dead — no CDS exists for NBB (loans only)** |
| T2.1 CDS term structure | **alive** — but a better measure of Domino 3, not a new domino |

### The new-signal search is exhausted, not merely unfinished

Every Tier-2 candidate has now been checked and closed. This is not "we ran out
of time" — the instruments themselves do not exist:

- **No EUR CDS** at any tenor → peg/redenomination risk is unpriced.
- **No bank CDS** → `nbb cds` returns syndicated loans only. Small local banks
  rarely have a CDS market; this is the expected answer, not a surprise. (AUB is
  the only Bahraini bank internationally active enough to plausibly carry one and
  was not checked; judged not worth the keystrokes.)
- **Recovery is a convention**, ratings are **coin flips**.

This matters for the exhaustion clause. Re-slicing Bahrain's existing ~126 desk
items is closed off, and new external data was the stated route forward. **The
terminal has now closed that route as well.**

What the session did deliver is **measurement quality**: real CDS replacing a
proxy, observed bid/ask replacing an assumed 10.9bp, a measured duration curve
replacing a flat 4.0. That is real — it overturned two published claims in one
afternoon — but it is a different thing from finding new predictive content, and
the record should not blur them.

**The honest forward statement: absent new *kinds* of data (not more of the same
kind), this system's predictive content is what it is. Further gains are
available in how accurately it is measured and how honestly it is framed, not in
how much it can be made to forecast.**

---

## 7. Still outstanding

| Item | Status | Cost |
|---|---|---|
| ~~Rating action history~~ | **DONE — exported, 2008-2026** | — |
| ~~EUR quanto basis~~ | **RETIRED — no EUR CDS exists at any tenor** | — |
| ~~Bahraini bank CDS~~ | **RETIRED — no CDS for NBB, loans only** | — |
| Bond prices via BDH | **XS2384406612 did not resolve — see 6d flag** | — |
| Verify a Sep-2026 Bahrain maturity exists | **BLOCKING for /domino2 countdown** | 2 min |
| Equities via BDH (`BHSEASI Index`) | untested — **likely works** | 2 min |
| CDS term structure history | not captured — **1Y/2Y/3Y/5Y/7Y/10Y all confirmed to exist** | ~36 pp for 3 crisis years |
| 2024–2026 from CMAN (removes source join) | not captured | ~15 pp |
| GCC peer CDS | deliberately deferred | ~5 × 52 pp |

**Priority if access is short:** the two existence checks (EUR quanto basis, bank
CDS) cost a minute between them and determine whether two genuinely *new* signals
are available at all. Under the exhaustion clause no further refinement is
permitted from re-slicing Bahrain's existing desk items — new external data is
the only route left, and those two are the only candidates that qualify.

**Explicitly not worth terminal time:** macro forecasts, analyst estimates, news
sentiment. Backward-looking and survey-based — the category that has failed
4-for-4 in this project (attribution, GCC decoupling, reserves drain, liquidity).

---

## 8. Provenance and handling

Licensed Bloomberg data, captured by screen transcription because the export path
was entitlement-blocked. Exposure is contractual rather than technical and lands
at the **distribution** end: keep it internal, keep the provenance label attached,
and get it acknowledged by whoever owns Bloomberg compliance before any of it
appears in circulated material.
