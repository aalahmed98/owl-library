---
title: The Three Haircut Rates — Convention, Expectation, Reality
tags: [cds, credit-risk, bahrain, banking]
summary: Supporting explainer for the domino framework — why "the haircut rate" means three different numbers in the CDS world, which one the haircut monitor estimates, and why no terminal can sell you Bahrain's haircut history.
created: 2026-08-08
status: draft
---

# The Three Haircut Rates

Supporting note for `domino-framework.md`. People say "the haircut rate" as if it
were one number. In the CDS world it is three different numbers, and conflating
them is the standard confusion — including inside banks.

## 1. The quoting convention — always exists, frozen

Every CDS trade embeds a recovery rate, because the standard pricing model needs
one to convert a spread into upfront payments and probabilities. For
emerging-market sovereigns it is a **fixed ISDA convention — typically 25%
recovery (75% haircut)** — agreed so both sides' math matches when they trade.

- Same number for Bahrain in calm 2019 and panicked March 2020.
- It never moves with fundamentals, because it is not *about* Bahrain — it is a
  standardization, like quoting oil in dollars per barrel.
- Pull "Bahrain CDS recovery assumption" from a terminal and you get a flat line
  at 25%. Always there; zero information.

## 2. The market's expected haircut — always exists in principle, hidden

Somewhere inside the CDS spread and bond prices is what traders genuinely
believe the loss would be. But it is bundled:

> spread ≈ probability of default × haircut — one equation, two unknowns.

No screen displays the expected haircut, because it cannot be directly observed;
it has to be **inferred** — from a cross-sectional fit over the bond maturity
curve (Merrick 2001), from fiscal arithmetic (the DSA anchor), from the
distressed-price floor (1 − price). **This is the number the haircut monitor
estimates.** A Bloomberg analyst estimating it has better inputs (real CDS
quotes, full 1y–10y curves, institutional bond pricing) but faces the same
inference problem.

A direct market for it — recovery swaps / recovery locks — exists but only
springs to life when a name is already near default. There is no live Bahrain
recovery quote in normal times.

## 3. The realized haircut — the real number, exists only at a credit event

When a default or restructuring actually happens, ISDA runs an auction: dealers
bid on the defaulted bonds, the auction sets a final price, and CDS pays out
1 − that price. Later, the negotiated exchange fixes the definitive loss. That
is the moment the haircut stops being an assumption or an estimate and becomes
a **fact**.

Bahrain has never had that moment. Therefore **Bahrain has no actual haircut
history, at any price, from any vendor** — only the frozen convention (#1) and
inferable expectations (#2). The realized numbers exist only for sovereigns
that restructured, collected in the academic databases (Cruces–Trebesch,
Asonuma–Trebesch, Moody's sovereign default studies): Greece 2012 ≈ 53%,
Iraq 2006 ≈ 89%, Ecuador 2020, Sri Lanka, Zambia. Those databases — mostly
free — are the validation targets for any haircut-estimation method.

## What a trader actually touches

Day to day, a CDS participant handles **#1** (the frozen convention, so pricing
math agrees), is betting on **#3** (a number that does not exist yet), and is
never shown **#2** — the one that decides whether protection is cheap or
expensive at today's spread.

**The pitch in one sentence:** the market runs on a haircut number everyone
knows is fake (25%, frozen), settles on one that doesn't exist yet, and never
publishes the one that matters — the live expected haircut. The monitor
estimates the missing one.

## Does Bahrain's haircut "change", then?

Yes — number **#2** changes, and that is the thing being predicted:

- It moves a little every day (bond prices wiggle), but *meaningfully* it moves
  rarely — in stress episodes: ~20% calm baseline → ~35% (2018) → ~33%
  (Mar-2020) → 40–48% (2022–25, partly rates-contaminated).
- Because it is an expectation, "the haircut rose" strictly means "the market's
  belief about the loss rose." That belief is what a bond desk marks against
  and what makes hedging expensive — so predicting its jumps is economically
  real even though no restructuring occurs.
- The monitor's claim is exactly this: the big jumps in #2 arrive at the end of
  a causal chain (oil → fiscal → curve → blowout), so the earlier dominoes give
  advance warning of the jump.

## What paid data would and would not add

| Source | Gives you | Does not give you |
|---|---|---|
| Bloomberg / Markit | Real historical 5Y CDS quotes (replaces the retail bond proxy); full 1y–10y CDS curve (better probability/haircut separation); institutional bond pricing | Bahrain's realized haircut history (doesn't exist) |
| Markit recovery field | The quoting convention (#1) per name | A live expected haircut (#2) — the field is a static convention |
| Cruces–Trebesch / Asonuma–Trebesch / Moody's | Realized haircuts (#3) for every sovereign restructuring since the 1970s | Anything about Bahrain specifically |
