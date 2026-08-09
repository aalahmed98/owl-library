---
title: What Acting On These Warnings Is Actually Worth — Hedging Cost/Benefit
tags: [cds, credit-risk, bahrain, banking]
summary: Presentation notes. Break-even on a haircut-monitor flag is ~16%, far below 50%, because payoffs are asymmetric — now backed by a backtest on the ACTUAL record rather than assumed averages, and corrected for the gap between a graded hit and a tradeable win.
created: 2026-08-09
updated: 2026-08-09
status: draft
---

# What Acting On These Warnings Is Actually Worth

Presentation notes for the "but it's wrong most of the time" objection. Nothing
here is a scoring input or a protocol object — it is decision framing built on
top of the measured record, and its numbers must never feed back into any
threshold or grading bar.

> **REVISION NOTE (2026-08-09).** This doc originally argued from per-trade
> averages. Three findings from the same day forced corrections, all of which
> make the argument *harder* to attack rather than softer:
> 1. **A graded hit is not a tradeable win.** Grading measures the PEAK move
>    inside the window; a desk holding to expiry captures the END move. They
>    diverge badly, so the old per-trade figures were optimistic.
> 2. **Part of the tier ladder is base-rate variation**, not signal.
> 3. The old text repeated a claim — *"curve inversion ~9 months before the
>    2018 peak"* — that the framework **retired on 2026-08-08** as unverifiable.
>    Removed.
> The headline conclusion survives all three, and is now backed by a backtest on
> the actual record instead of assumed averages.

## The objection, and why it misreads the number

> "43% means you're wrong more often than right — that's a coin flip."

**The comparison is to the base rate, not to 50%.** The grading bars are
calibrated so a *random day* clears them ~18–20% of the time. A coin flip is 50%
on a 50/50 event — zero information. 43% on an 18% event is information.

**And 50% is not the break-even.** The payoffs are asymmetric, so the threshold
for "worth acting on" is far lower — and computable.

## The break-even hit rate

Acting on a flag has positive expected value when

```
    hit_rate  >  cost_when_wrong ÷ (payoff_when_right + cost_when_wrong)
```

On a $10m Bahrain position hedged with 5Y CDS protection for six months, at a
~312bp proxy spread. Mark-to-market ≈ spread change × risky duration
(RPV01 ≈ 4.0) × notional. Carry ≈ spread × time held.

| Assumption set | Payoff when right | Cost when wrong | **Break-even** |
|---|---|---|---|
| **Conservative** — hit sized at the grading bar (180bp); cost = full carry + adverse mark-to-market + round-trip bid/ask on a thin name | ~$720k | ~$250k | **~26%** |
| **Middle** — hit at 250bp; cost = full carry + modest execution | ~$1.00m | ~$190k | **~16%** |
| **Optimistic** — hit at 300bp+; cost = carry only | ~$1.20m | ~$156k | **~11%** |

**Break-even lands around 16%, plausibly 26% under pessimistic execution.** Every
tier from 1 upward clears it; tier 0 does not.

## But hit rate is an UPPER BOUND on win rate

This is the correction that matters most, and it is better to raise it yourself
than to have it raised for you.

The system grades a flag a **hit** if the spread widens past the bar *at any
point* inside the window. A desk that buys protection and holds it to expiry
captures whatever the spread is doing *at the end*. Those are different numbers:

> **2018-05-21**, regime watch→distress. Peak **+245bp** — an unambiguous hit by
> the grading rules. The spread ended the window at **−105bp**. Held to expiry
> that trade **lost $610,000.**

So a 43% hit rate does not mean 43% of trades make money. It means 43% of flags
were followed by a move that, *if you timed the exit*, would have paid.

## The backtest — actual record, actual spreads, actual moves

Every action-list item since Nov-2017, no assumed averages. Fifty items collapse
to **ten trades**, because forty fired while protection was already on.

| Exit assumption | Profitable | Premium paid | **Net P&L** | Worst drawdown |
|---|---|---|---|---|
| **Hold to expiry** (no timing skill) | 4/10 | $0.99m | **+$0.44m (+4.4%)** | −$0.97m |
| Exit at half the peak | 7/10 | $0.99m | +$2.28m (+22.8%) | −$0.08m |
| Exit at the peak (unachievable) | 9/10 | $0.99m | +$5.54m (+55.4%) | −$0.02m |

**The honest planning case is the first row: +4.4% of notional over 8.5 years**,
before execution costs. Modest — and positive.

### The number that justifies the filter

| Strategy | Trades | Premium | Net |
|---|---|---|---|
| **Action list only** | 10 | $0.99m | **+$0.44m** |
| **Every desk item** | 19 | $2.14m | **−$1.36m** |

Acting on everything the system surfaces **loses 13.6% of notional.** Acting on
the filtered list breaks into profit. That **$1.8m swing** is the strongest
evidence the action list has, and it is denominated in money rather than
percentages.

### Concentration — say this before someone finds it

Two trades made everything: **2020-02-03** oil/contango_flip (+$1.03m) and
**2025-01-27** rollover_wall (+$1.01m). The other eight together lost
**−$1.60m**. That is normal for tail-hedging and survivable, but it means the
strategy is two events wide. Miss those and the decade is negative.

## Does the flag beat simply being hedged through the same period?

The sharpest challenge to any of this: *if your conditioners just identify
turbulent periods, why not stay hedged through them and skip the flags?*
Measured — comparing each tier's hit rate against the base rate prevailing in
the periods it fires in:

| Tier | Act on the flag | Hedge the whole period | **Flag advantage** |
|---|---|---|---|
| 3+ | +$322k | +$62k | **+$260k** |
| 2 | +$215k | +$61k | **+$154k** |
| 1 | +$60k | +$17k | +$43k |
| 0 | −$71k | −$111k | +$40k |

**Tier 3+ fires in periods running a 21.2% background rate and hits 43%** — it
roughly doubles the period, worth **+$260k per trade** over just sitting hedged.
The selection is doing real work.

## What that says about each tier

| Tier | Hit rate | Conservative (BE 26%) | Middle (BE 16%) |
|---|---|---|---|
| 0 confirmations | 10% | loses money | loses money |
| 1 confirmation | 21% | ~breaks even | marginal |
| 2 confirmations | 34% | profitable | profitable |
| 3+ confirmations | **43%** | **profitable** | **clearly profitable** |
| Whole desk record | 24% | break-even at best | profitable |

**Required caveat, to be stated wherever this ladder appears:** part of the
gradient is base-rate variation, not signal. Compared to the base rate
prevailing in each state, the individual conditioners are weaker than their raw
splits suggest — oil precursor 2.19× vs 1.21× (genuinely strong), compression
1.67× vs 1.41×, **wall proximity 1.71× vs 1.59× (marginal — its headline
"33% vs 7%" is mostly period, not signal)**, and attribution is negative on
average. The ladder's *ordering* is real and the tier-vs-period table above shows
the selection adds value; the raw gradient overstates how much.

## Sizing by tier — the one lever that needs no new accuracy

Everything above assumes **every flag is the same size trade**. That is the
current implied policy, and it is leaving money on the table: you already know
tier 3+ returns roughly five times what tier 1 does, and that tier 0 is
negative. Allocating equally across them discards information you have already
paid to measure.

Expected value per unit of risk (1 unit = the $10m hedge modelled above), using
the middle assumption set:

| Tier | Hit rate | EV per unit |
|---|---|---|
| 3+ | 43% | **+$322k** |
| 2 | 34% | **+$215k** |
| 1 | 21% | +$60k |
| 0 | 10% | **−$71k** |

Applying weights to those tiers:

| Sizing policy | Weights (3+ / 2 / 1 / 0) | Total EV | EV per unit deployed | vs uniform |
|---|---|---|---|---|
| **Uniform — today's implied policy** | 1 / 1 / 1 / 1 | +$525k | +$131k | 1.00× |
| **Skip tier 0 only** | 1 / 1 / 1 / 0 | +$596k | **+$199k** | **1.51×** |
| Linear by tier | 2 / 1.5 / 1 / 0 | +$1,025k | +$228k | 1.74× |
| Concentrated | 3 / 1.5 / 0.5 / 0 | +$1,317k | +$263k | 2.01× |
| Top tier only | 1 / 0 / 0 / 0 | +$322k | +$322k | 2.45× |

**The single biggest step is free: stop hedging tier 0.** Declining to act on
0-confirmation flags raises return per unit of capital by **~50%** and requires
no forecast, no new data, and no change to any threshold — only a decision not
to spend premium on the one tier measured to lose money.

Read the last two columns as answering different questions. **Total EV** matters
if opportunities are scarce and capital is not; **EV per unit deployed** matters
if capital or risk budget is the constraint. "Top tier only" wins on the second
and loses badly on the first — it deploys least and forgoes the profitable
middle tiers.

**Caveats, and they are not small:**

- This is the **expected-value model, not the backtest.** The backtest produced
  only 10 trades in 8.5 years — far too few to split four ways, so these
  weights cannot be validated on realised P&L. They are arithmetic on measured
  hit rates, and inherit every caveat those carry.
- **Sizing amplifies whatever edge exists — including the concentration risk.**
  Two trades produced the entire backtested profit. Concentrating into the top
  tier concentrates into fewer, larger events, so the distribution gets more
  skewed, not less. A policy that doubles expected return also widens the range
  of outcomes around it.
- Tier hit rates carry the **base-rate caveat above**, and tier 3+ rests on
  n=21 with a 24–62% CI. Weighting 3× on a number that uncertain is a strong
  bet on a soft estimate.
- **No sizing policy is registered or adopted by this note.** Sizing is a desk
  decision, not a scoring rule — it changes no threshold, grade or record, and
  therefore needs no spec. But it also gets no protocol protection: nothing here
  has been pre-registered or tested forward.

**Recommendation, stated plainly:** adopt "skip tier 0" — it is the largest
single gain, needs no conviction about the rest of the ladder, and follows
directly from the one thing measured with confidence (that tier 0 loses money).
Treat the more aggressive weightings as a discussion to have with the risk
budget in hand, not as a result.

## Two effects the tables understate

1. **The cheapest responses cost nothing.** "Don't add to the position" and
   "don't roll into the next maturity" are free. Most flags warrant only those;
   the premium-paying response is reserved for the top tier.
2. **The real edge is the PRICE of the same insurance, not whether you hold it.**
   Hedging at ~312bp versus after the blowout (2020 peaked ~536bp wider) is
   roughly half price for identical cover. The lead time that discount is made of
   is the measured **oil→credit median ~12 days** — *not* any curve-inversion
   lead claim, which the framework retired as unverifiable on 2026-08-08.

## The one-sentence version

> *"Hedging Bahrain indiscriminately over the last decade would have cost about
> 14% of the position. Hedging on our filtered signals roughly broke even to
> slightly positive — and you'd have owned protection through COVID and through
> the 2025 blowout. The system doesn't make money. It makes the insurance
> approximately free."*

That is more defensible than any accuracy percentage, and it is what the record
actually supports.

## Caveats to state out loud

- Illustrative and order-of-magnitude; real P&L depends on hedge ratio, tenor and
  execution.
- **The backtest models ZERO bid/ask.** Realistic execution on ten round trips in
  a thin name could plausibly erase the entire +$0.44m. This is the single
  weakest assumption here.
- **n = 10 trades.** Far too few for a confidence interval.
- It is a backtest over a period the thresholds were partly shaped on.
- **Liquidity risk:** the payoff column assumes you can sell protection into a
  widened market at screen levels. In a genuine panic that market may not exist.
- A hedge blunts a loss, it does not erase one — partial hedging is the norm.
- Hold-to-maturity books feel mark-to-market differently; for those the value
  shifts to *not adding exposure late in the chain*.
- Tier hit rates carry wide CIs (top tier 24–62%, n=21).
- **On "better data would help":** an earlier draft claimed licensed data would
  add ~10–15pts to tier accuracy. That was speculation and is withdrawn. Every
  free-data candidate tested since has been rejected, so the honest statement is
  that real CDS history would make the *grading reference* cleaner, with an
  unknown effect on accuracy.
