---
title: What Acting On These Warnings Is Actually Worth — Hedging Cost/Benefit
tags: [cds, credit-risk, bahrain, banking]
summary: Presentation notes, rebuilt on the REAL CDS series (G-R1) with measured RPV01 and measured execution. Systematically buying protection on flags LOSES money under every configuration — the flags' value lives entirely in the free responses and in regime awareness. Every prior positive P&L figure in this doc's history was a proxy artifact and is retired.
created: 2026-08-09
updated: 2026-08-10
status: draft
space: shared
---

# What Acting On These Warnings Is Actually Worth

Presentation notes for the "is this worth acting on" question. Nothing here is
a scoring input or a protocol object — decision framing only; its numbers must
never feed back into any threshold or grading bar.

> **REVISION v3 (2026-08-10) — SUPERSEDES EVERYTHING BELOW ITS OWN TABLES.**
> Spec G-R1 replaced the grading reference with real Bloomberg CDS and exposed
> a median 84.5bp proxy error. This doc's previous P&L — including the
> "+$0.44m hold-to-expiry" and the "$1.8m filter swing" — was computed on that
> proxy. The backtest is now REBUILT on the real series, with the measured
> RPV01 curve (4.14→3.14 across the traded range, CDSW 2026-08-09) and
> measured daily bid/ask execution, from a committed reproducible script
> (`haircut-monitor/scripts/research/hedging-backtest.mjs`) instead of an
> in-session analysis. Population: P2-P1 desk items (episode first-flags +
> escalations) since Nov-2017; "action list" = confluence ≥2 (v2, retrodicted).
> This population is defined more cleanly than the earlier ten-trade list, so
> numbers are not item-for-item comparable with prior revisions — the script
> reproduces the OLD frame's sign on the proxy (+$0.29m), confirming the
> methodology, before showing what the real series does to it.

## The rebuilt backtest — real reference, measured costs

$10m notional, 6-month holds to expiry (no timing skill), enter on eligible
item when no protection is on:

| Configuration | Trades | Gross MTM | Carry | Execution | **NET** |
|---|---|---|---|---|---|
| **Action list (conf ≥2), real ref, measured RPV01 + execution** | 11 | +$0.30m | $1.33m | $0.76m | **−$1.79m (−17.9%)** |
| Every desk item, same | 15 | +$0.30m | $1.83m | $1.09m | **−$2.63m (−26.3%)** |
| Action list, real ref, flat 4.0, ZERO execution | 11 | +$0.35m | $1.33m | — | **−$0.97m** |
| Action list, PROXY ref, flat 4.0, zero execution *(the old frame)* | 11 | +$1.38m | $1.09m | — | **+$0.29m** |

**The old positive number only ever existed on the proxy.** On the real series
the strategy loses money before execution costs are even charged, and the loss
deepens with every measured correction applied.

Winners: 3 of 11. The 2020-02-03 contango_flip remains the genuine article
(+$436k net of all costs, 167→327bp). Everything else bleeds.

## Why it loses — structural, not fixable by accuracy

**Carry dominates.** Bahrain trades ~170–380bp; six months of protection costs
$85–190k per $10m. The flags' realized six-month moves on the real series
average far less than that. Gross MTM across eleven trades was +$0.30m against
$1.33m of carry — **the moves are real but small relative to what standing
protection costs on a wide-spread credit.** A better hit rate does not fix
this: grading measures peak-within-window against a ~50–90bp bar, while
break-even on carry alone needs ~+45bp *retained to expiry* — different
quantities. (Whether hedging only C-R4v2 escalations — 8/14 = 57% on the real
series — clears carry is an open, untested question; no claim is made.)

Also retired with the proxy: the "$1.8m filter swing." On the real series the
action list still ranks above hedging everything (−$1.79m vs −$2.63m, a $0.84m
difference), but **both sides are deeply negative** — the filter chooses the
less bad way to lose money on premium. That is not a selling point.

## What actually survives — and it is the point, not a consolation

1. **The free responses are untouched by every number above.** "Don't add
   $10m before a widening", "don't roll into the next maturity", "don't price
   new exposure off a stale haircut" avoid the same mark-to-market the CDS
   would capture, at zero carry and zero execution. Every cost line in the
   table above is a cost of the PAID response only. A bank that already holds
   Bahrain risk gets the entire value of the signal through the free menu.
2. **The price-of-insurance asymmetry is still real.** Cover bought at
   167bp (Feb-2020) versus after the blowout at 300+ is roughly half price for
   identical protection — the measured oil→credit lead (~12 days) is what that
   discount is made of. This argues for *timing unavoidable hedges*, not for
   discretionary premium spending.
3. **The cost-to-act gauge** (from the L-R1 salvage): measured round-trip
   execution ran 20–30bp in 2018–2022 vs ~10bp in 2025–26. When the quoted
   cost is in its stressed regime, the paid response is off the table
   arithmetically and the free menu is the whole menu.

## The one-sentence version

> *"Buying protection on our flags would have lost money in every configuration
> we can measure — carry eats the moves. The system's value is not a trading
> edge: it is knowing when NOT to add exposure, when not to roll, and what a
> defensible haircut mark is — actions that cost nothing and avoid the same
> losses the hedge would have captured."*

## Caveats to state out loud

- Decision framing on n=11 trades; no confidence intervals claimed.
- RPV01 curve measured on the 2026-08-09 discount curve; near-zero 2020 rates
  imply a somewhat higher duration then (direction certain, magnitude
  approximate — recorded in `bloomberg-terminal-record.md` §6).
- Carry approximated as S×t (upfront-standardized contracts amortize to
  roughly this); execution = entry half-spread + exit half-spread, measured
  daily, 2018 median (14.75bp) used for the two pre-2018 dates.
- The action list here is composition v2 retrodicted; the live v3 list accrues
  only from 2026-08-08 and has no resolved items yet.
- Population differs from this doc's earlier ten-trade list (which was
  proxy-based and not script-reproducible); the frame-reproduction row is the
  bridge between the two.
- Tier hit rates and their base-rate caveats now live in the G-R1 results
  (post-G-R1 ladder 10/15/29/39%); nothing here uses them as inputs.
