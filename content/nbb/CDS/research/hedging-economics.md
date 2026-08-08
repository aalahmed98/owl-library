---
title: Why a 43% Warning Is Worth Acting On — Hedging Cost/Benefit
tags: [cds, credit-risk, bahrain, banking]
summary: Presentation notes. The break-even hit rate for acting on a haircut-monitor flag is far below 50% because the payoffs are asymmetric — worked three ways (conservative / middle / optimistic) against the system's CURRENT measured tier accuracy.
created: 2026-08-09
status: draft
---

# Why a 43% Warning Is Worth Acting On

Presentation notes for the "but it's wrong most of the time" objection. Nothing
here is a scoring input or a protocol object — it is decision framing built on
top of the measured record. All accuracy figures are **current measured
accuracy** (spec P2-C5 tiers, as of 2026-08-08), not a projection of what better
data might buy.

## The objection, and why it misreads the number

> "43% means you're wrong more often than right — that's a coin flip."

Two errors in one sentence.

**First: the comparison is to the base rate, not to 50%.** The grading bars are
calibrated so a *random day* clears them ~18–20% of the time. So:

| | Hit rate | vs. random |
|---|---|---|
| Random day (base rate) | ~18% | 1× |
| Bottom tier (0 confirmations) | 10% | worse than random |
| Top tier (3+ confirmations) | 43% | ~2.4× |

A coin flip is 50% on a 50/50 event — zero information. 43% on an 18% event is
information.

**Second, and more important: 50% is not the break-even.** The payoffs are
asymmetric, so the threshold for "worth acting on" is far lower — and it is
computable.

## The break-even hit rate

Acting on a flag has positive expected value when

```
    hit_rate  >  cost_when_wrong ÷ (payoff_when_right + cost_when_wrong)
```

Worked on a $10m Bahrain bond position, hedged with 5Y CDS protection for a
6-month window, at today's proxy spread of ~312bp. Mark-to-market on protection
≈ spread change × risky duration (RPV01 ≈ 4.0 at these levels) × notional.
Carry ≈ spread × time held.

| Assumption set | Payoff when right | Cost when wrong | Ratio | **Break-even hit rate** |
|---|---|---|---|---|
| **Conservative** — hit sized at the GRADING BAR (180bp, Ariva era), not the average crisis move; cost = full 6m carry **+** adverse mark-to-market if the spread tightens **+** round-trip bid/ask on a thin name | ~$720k (7.2%) | ~$250k (2.5%) | 2.9 : 1 | **~26%** |
| **Middle** — hit at 250bp (between the bar and the measured crisis moves); cost = full carry + modest execution | ~$1.00m (10%) | ~$190k (1.9%) | 5.3 : 1 | **~16%** |
| **Optimistic** — hit at 300bp+ (the measured 2018/2020/2025 follow-throughs were +245 / +325 / +387 / +536bp); cost = carry only, protection sold back near entry | ~$1.20m (12%) | ~$156k (1.6%) | 7.7 : 1 | **~11%** |

Read the middle column as the honest planning case: **break-even lands somewhere
around 16%, plausibly as high as 26% under pessimistic execution.**

## Worked example — the same math in dollars

**Setup.** You hold $10m of Bahrain bonds. A flag fires; you respond by buying
6 months of CDS protection on that $10m.

**Cost if nothing happens.** Protection runs ~312bp/yr, so six months costs
`$10m × 3.12% × ½ = $156,000`. Add dealing costs — Bahrain CDS is thin and you
pay a spread getting in and out — for **~$190,000 all-in**.

**Gain if right.** Say the spread widens 250bp (the bar is 180bp; the measured
2018/2020/2025 moves were 245–536bp, so 250 is a middling hit). A CDS gains
roughly *four times* the spread move, because the contract still has ~4 years
of protection left to sell: `250bp × 4 = 10%` of $10m = **+$1,000,000**.

So: **−$190k when wrong, +$1.0m when right.** Run ten flags at each tier:

```
TOP TIER — 43% hit rate (4 hits, 6 misses)
    4 × +$1,000,000  =  +$4,000,000
    6 ×    −$190,000  =  −$1,140,000
                          ───────────
                   Net =  +$2,860,000

BOTTOM TIER — 10% hit rate (1 hit, 9 misses)
    1 × +$1,000,000  =  +$1,000,000
    9 ×    −$190,000  =  −$1,710,000
                          ───────────
                   Net =    −$710,000
```

Same trade, same market, same costs — **the tier decides whether the activity
makes money.**

**Stress-test with the conservative column** (hit only just clears the bar →
+$720k; being wrong also suffers adverse mark-to-market → −$250k):

```
TOP TIER    4 × +$720,000 − 6 × $250,000  =  +$1,380,000   (still strongly profitable)
BOTTOM TIER 1 × +$720,000 − 9 × $250,000  =  −$1,530,000   (still a loser)
```

The conclusion is invariant to the assumption set: the top tier earns
$1.4m–$2.9m per ten flags, the bottom tier loses money in both.

*Sizing note for the room:* no desk hedges its full position on every flag —
real sizing is smaller and scaled to conviction. The dollar totals shrink
proportionally; the ratios, and therefore the conclusion, do not change.

## What that says about each tier (current measured accuracy)

| Tier | Hit rate | Conservative (BE 26%) | Middle (BE 16%) |
|---|---|---|---|
| 0 confirmations | 10% | loses money | loses money |
| 1 confirmation | 21% | ~loses money | marginal |
| 2 confirmations | 34% | profitable | profitable |
| 3+ confirmations | **43%** | **profitable** | **clearly profitable** |
| Whole desk record (all items) | 24% | break-even at best | profitable |

**This is the quantitative case for the action list (spec P2-P2/P2-C7).** Under
conservative assumptions, acting indiscriminately on every flag is roughly a
break-even activity; acting only on 2+ confirmation items is profitable in every
assumption set. The confluence ladder is not just noise reduction — it is the
line between paying for insurance you shouldn't have bought and buying it well.

## Two effects the table understates

1. **The cheapest responses cost nothing.** "Don't add to the position" and
   "don't roll into the next maturity" are free. Most flags warrant only those.
   The premium-paying response is reserved for the top tier — which is exactly
   the tier that clears break-even under every assumption set.
2. **The real edge is the PRICE of the same insurance, not whether you hold it.**
   Hedging at Domino 3 (proxy ~312bp) versus after the blowout (2020 peaked
   ~536bp wider) is roughly half price for identical cover. The lead time
   measured in the record — oil→credit median ~12 days, curve inversion ~9
   months before the 2018 peak — is what that discount is made of.

## Caveats to state out loud

- Illustrative, order-of-magnitude; real P&L depends on hedge ratio, tenor,
  and execution.
- **Liquidity risk is the big one:** Bahrain CDS is thin. The payoff column
  assumes you can sell protection into a widened market at screen levels; in a
  genuine panic that market may not be there.
- A hedge blunts a loss, it does not erase one — partial hedging is the norm.
- Hold-to-maturity books feel mark-to-market pain differently; for those the
  value shifts from hedge timing to *not adding exposure late in the chain*.
- Tier hit rates carry wide confidence intervals (top tier 24–62%, n=21). The
  break-even logic is robust to that range; the point estimate is not precise.
- Better data would raise tier accuracy modestly (conservatively ~10–15pts on
  the top tier) — but the break-even argument above does **not** depend on it.
