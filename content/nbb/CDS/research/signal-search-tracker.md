---
title: Signal Search — Candidate Tracker
tags: [cds, credit-risk, bahrain, banking]
summary: Live tracker for the next round of haircut-monitor research — what we are hunting, the queue of candidates with tried/result status, and the reasoning behind each. Update the status columns as each is attempted.
created: 2026-08-09
status: draft
---

# Signal Search — Candidate Tracker

## Synopsis

**The problem.** Manipulating the signals we already have is exhausted. Six
conditioners tested, two-and-a-half adopted, and the last two rejected outright.
Re-slicing the same 126 desk items is forbidden by the exhaustion clause.

**The plan.** Go find new information. In this order:

1. **More sovereigns first.** We have ~10 tradeable episodes in nine years. That
   sample is too small to detect anything. Seeding more countries multiplies the
   event count and gives real out-of-sample tests — no new indicator needed.
2. **Then new dominoes and indicators**, chosen by mechanism, not by search.

**What we are actually hunting.** Not a higher hit rate. Three specific jobs:

| Job | Question it answers | What we have |
|---|---|---|
| **Probability** | Will a move happen? | compression, oil precursor |
| **Magnitude** | If it happens, how big? | attribution |
| **Persistence** | Will the move HOLD, or reverse? | **nothing — this is the gap** |

Persistence is where the money leaks: a flag can peak +245bp (a graded hit) and
end −105bp (a $0.61m loss). Every new candidate must declare which job it does
before it is tested.

**Rules every candidate must clear** (all are binding, from P2-C8):

- Forward-looking **state or calendar** fact. Backward-looking *change* measures
  have failed 4 times out of 4 — do not propose another one.
- **Base-rate-matched** acceptance criterion, not raw hit rates.
- Graded on **end-of-window as well as peak**.
- Mechanism written down **before** touching outcome data.
- Pre-registered spec-commit → **one** run → results-commit, adopted or rejected.

---

## Tracker — the queue

Status key: ☐ not started · ◐ in progress · ☑ done
Result: — not yet · **ADOPTED** · **REJECTED** · **BLOCKED** (data unavailable)

### Stage 0 — Foundation (do before anything else)

| # | Candidate | Job | Tried | Result | Notes |
|---|---|---|---|---|---|
| S0.1 | Seed Jordan + Egypt (ISINs already verified in recon) | power | ☐ | — | |
| S0.2 | Seed Qatar + Saudi (Ariva) | power | ☐ | — | |
| S0.3 | Re-run frozen thresholds on each — out-of-sample test | validation | ☐ | — | needs its own O-R1-style bar spec per country |

### Stage 1 — Recon only (no specs, read-only, costs nothing)

| # | Question to answer | Tried | Result | Notes |
|---|---|---|---|---|
| S1.1 | What banking tables does the CBB Statistical Bulletin actually publish, and from when? | ☐ | — | |
| S1.2 | Are BHD forward points / NDF quotes obtainable free at any frequency? | ☐ | — | |
| S1.3 | Do S&P / Moody's / Fitch publish forward sovereign review calendars for Bahrain? | ☐ | — | |
| S1.4 | Can new-issue pricing vs secondary be reconstructed from public issuance records? | ☐ | — | |

### Stage 2 — Candidates (only after Stage 1 says the data exists)

| # | Candidate | Job | Tried | Result | Spec | Notes |
|---|---|---|---|---|---|---|
| N3 | **Sovereign–bank loop** — a new domino between D2 and D3 | probability | ☐ | — | — | |
| N4 | **BHD forward points** — peg-stress market price | probability | ☐ | — | — | |
| N5 | **Rating review calendar** — forced-seller timing | magnitude | ☐ | — | — | |
| N6 | **New-issue concession** — market-access price | probability | ☐ | — | — | |
| N7 | **Persistence signal** — does the move hold? | persistence | ☐ | — | — | design work needed first |

---

## Tracker — already tried (closed; do not re-propose)

| Candidate | Result | Why it closed |
|---|---|---|
| GCC decoupling (peer basket) | **REJECTED** | Trailing change measure — same failure mode as P2-C4. Widening the basket measures a spent move more precisely. |
| Liquidity evaporation | **REJECTED** | Detected the Frankfurt holiday calendar, not Bahrain liquidity. Retry needs holiday adjustment + new spec. |
| Attribution as a badge (P2-C4) | **REJECTED** as badge | Negative on average. **Kept in the confluence count** — it is a magnitude marker; removing it drops the +325bp hit. |
| Price compression standalone (P2-C1) | **REJECTED** standalone | Adopted as a conditioner instead. |
| Reserves drain | **REJECTED** | Episode lift 0.84×. |
| Peg / funding via BHIBOR (P2-L2) | **REJECTED** | The differential tracks the US cycle, not Bahrain. **N4 is a different object** — a market price, not a quarterly rate. |
| Rollover cover magnitude (P2-C8 N1) | **REJECTED** | Passed on raw rates, failed base-rate-matched (1.35× active vs 1.50× off). |
| Oil-stress score level (P2-C8 N2) | **REJECTED** | 28% vs 27%. Adds nothing over the binary precursor. |
| Signal severity (how far past threshold) | **REJECTED** | Correlation with move size ≈ 0. No intensity conditioner is worth building. |
| Inventories ×2, prompt spread, cracks, momentum flip | **REJECTED** | 6 of 8 Domino Zero experiments. Tier closed. |

---

## Expanded — the reasoning behind each item

### Why sovereigns come before signals (S0)

The binding constraint is not signal quality, it is sample size. The full record
holds ~126 desk items, and the P&L simulation collapsed those to **10 actual
trades** — the rest fired while already hedged. At n=10 almost nothing is
statistically detectable, which is exactly why five of the last six candidates
failed to clear their confidence intervals.

Adding a conditioner to a 126-item population has sharp diminishing returns.
Adding a sovereign multiplies the population itself, and does three things at
once:

- **Power.** Three or four more countries roughly triples the event count.
- **Out-of-sample validation.** Each new sovereign is a true test of frozen
  thresholds — the one thing the exhaustion clause says we need and cannot get
  by re-analysis. Oman already proved this works: the inversion rule generalized
  with a CI excluding no-skill on a credit the thresholds never saw.
- **The peer basket, free.** GCC decoupling failed partly because Oman was the
  only peer, so Oman's idiosyncratic moves masqueraded as Bahrain decoupling. A
  wider basket arrives as a byproduct rather than as its own project.

The pipeline is proven: Oman took 12,851 Ariva prints in one seeding pass, and
Jordan and Egypt ISINs are already verified in the recon, just unseeded.

Caveat to honor: each country needs its own base-rate-matched grading bars,
solved outcome-blind, per the O-R1 precedent. Bars are never inherited.

### N3 — Sovereign–bank loop (the one real gap in the chain)

The chain has an unfilled link: **D2 fiscal deterioration → ??? → D3 market
repricing.** In the crisis literature the missing middle is usually the banking
system: domestic banks hold the sovereign's debt, so sovereign stress impairs
bank balance sheets, impaired banks stop absorbing new issuance, and the
sovereign's funding position deteriorates further. Acharya–Drechsler–Schnabl and
Brunnermeier's "diabolic loop" are the canonical references.

We currently track **nothing** about Bahrain's banking system, despite already
using the CBB Statistical Bulletin for reserves and BHIBOR. Candidate measures
(pending S1.1 confirming what exists): retail bank claims on government, deposit
growth, foreign liabilities.

Why it fits: *bank claims on government* is a **state** measure, not a trailing
change — the right side of the design filter. And it is a genuine new domino
rather than another lens on an existing one.

Honest risk: bank data is monthly and publication-lagged, so it will be slow —
closer to D2's attention-tier speed than D3's market speed. Expect it to be a
conditioning input, not a fast signal.

### N4 — BHD forward points

Listed in the framework doc's own phase-2 limitations as undone. **This is not a
retry of P2-L2.** That lens failed on BHIBOR — a quarterly *average rate*,
backward-looking, and dominated by the US cycle to the point that the 2018
crisis showed up as a *decline*. Forward points are a different object: a
**market price that directly quotes devaluation risk**, forward-looking by
construction.

The open question is entirely data availability (S1.2). Peg-currency forwards
are often thinly quoted and may not be free at any usable frequency. If S1.2
comes back empty, mark **BLOCKED** and move on — do not substitute a proxy.

### N5 — Rating review calendar

Ratings are deliberately excluded as *information* — they lag every domino on
the chain. But the framework already states why they matter at D4: they **force
other people to sell**. A scheduled review date is a pure forward calendar fact,
the same shape as wall proximity, which is the strongest conditioner found.

Declared job is **magnitude**, not probability: forced selling should amplify a
move that is already happening rather than start one.

Risk: EU-regulated sovereign calendars are systematic; non-EU coverage is
patchier. S1.3 settles it.

### N6 — New-issue concession

How much extra yield Bahrain pays over its own secondary curve when it issues.
A classic real-time market-access stress measure, and forward-looking in the
sense that it prices the sovereign's *current* ability to raise money.

Structural limitation, stated up front: issuance is sparse — a handful of events
per decade. It will never carry a confidence interval. Its honest role is a
high-information occasional reading, not a scoreboard rule. Note the existing
`market_access` recovery rule already fires on issuance *settlement*; this would
add the *price* of that access, which is the informative part.

### N7 — Persistence (the unexplored dimension)

The most valuable finding of the 2026-08-09 session, and the one with no
candidate attached yet.

The system grades on the **peak** move inside the window. A desk holding to
expiry captures the **end** move. Those diverge badly:

> **2018-05-21**, regime watch→distress. Peak **+245bp** — a clean hit by the
> grading rules. Ended the window at **−105bp**. Held to expiry: **−$0.61m.**

Across the P&L run, a 43% hit rate produced only 4 profitable trades in 10. The
hit rate is an *upper bound* on the win rate, reachable only with exit timing
the backtest does not demonstrate.

So a signal answering **"will this move hold?"** is worth more per unit than
another probability signal — and nothing in the system attempts it.

This one needs design work before it can be a spec. Open questions to settle
first: is persistence a property of the *flag* (some rules produce durable moves)
or of the *state* (moves in distress hold, moves in calm mean-revert)? Is it
predictable at all, or is mean-reversion simply unforecastable? Answer those on
paper before registering anything.

**Do not skip straight to a rule here.** The temptation will be to grade on end
move instead of peak, which quietly re-grades the entire historical record — a
protocol change requiring its own spec and a full published diff, not a
convenience.

### Expectation management

Nine experiments on Domino Zero produced two adoptions. Six conditioners
produced two-and-a-half. **The realistic outcome of this programme is better
sizing and better persistence, not a materially higher hit rate** — and per the
P&L simulation, that is where the dollars are anyway. The honest framing of what
the system does remains: *hedging Bahrain indiscriminately cost ~14% of notional
over the decade; hedging on the filtered signals roughly broke even while
owning protection through COVID and the 2025 blowout. It makes the insurance
approximately free.*

Anything found here that raises accuracy is upside, not the plan.
