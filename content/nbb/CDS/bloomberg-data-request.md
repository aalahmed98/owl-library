---
title: Bloomberg Data Request — Bahrain Sovereign Credit Model
tags: [cds, credit-risk, bahrain, banking]
summary: Self-contained extraction request for whoever has terminal access. What to pull, in priority order, with field names, history depth and the save format. No project background needed to execute it.
created: 2026-08-09
status: draft
---

# Bloomberg Data Request

**For:** anyone with a Bloomberg terminal seat who can spend ~1 hour in Excel.
**From:** Abdulrahman Al Ahmed — sovereign credit risk model (Bahrain).
**Deliverable:** CSV files. Nothing needs to be installed, integrated or
automated.

---

## What this is for, in one paragraph

We run an internal early-warning model for Bahrain sovereign credit risk. It
currently estimates Bahrain's 5-year CDS spread indirectly, from traded
eurobond prices on a retail venue, because we have no licensed CDS feed. That
proxy works but carries a known bias, and several conclusions we would like to
present rest on it. **A one-off historical export of real CDS data would replace
the estimate with the actual instrument.** This is a backtest — we do not need a
live feed, an API, or anything ongoing.

---

## Priority — if you only have twenty minutes

Pull **item 1 first**. It is small, it is the one usually forgotten, and it
answers the single most important open question in the model.

| Order | Item | Why it comes first |
|---|---|---|
| 1st | **Bahrain 5Y CDS — BID and ASK** | Everything else improves a number. This one decides whether the strategy is viable at all. |
| 2nd | Bahrain 5Y CDS — MID | Replaces the whole proxy |
| 3rd | Peer sovereign CDS — MID | Gives us enough sample size to test anything |

---

## 1. Core request

| # | Instrument | Fields | History | Frequency |
|---|---|---|---|---|
| **1** | **Bahrain 5Y USD senior CDS** | **`PX_BID`, `PX_ASK`** | 2008 → today | daily |
| 2 | Bahrain 5Y USD senior CDS | `PX_LAST` (mid) | 2008 → today | daily |
| 3 | Bahrain CDS — 1Y, 3Y, 7Y, 10Y | `PX_LAST` | 2008 → today | daily |
| 4 | Bahrain CDS quoted **recovery rate** assumption | whichever field carries it | 2008 → today | daily or point-in-time |
| 5 | Bahrain CDS denominated in **EUR** | `PX_LAST` | 2008 → today | daily |

**Note on 1:** bid/ask is the priority item. If the terminal only offers mid by
default, please ask for bid/ask explicitly — it is what lets us estimate real
trading costs rather than guessing them.

**Note on 5:** we want the EUR-denominated contract alongside the USD one. The
difference between them prices devaluation risk on the dinar peg, which we
currently cannot measure at all.

## 2. Peer sovereigns — 5Y CDS mid, daily, 2008 → today

Same field (`PX_LAST`), same period, one column per name:

> Oman · Qatar · Saudi Arabia · Kuwait · Abu Dhabi · Jordan · Egypt · Turkey ·
> South Africa · Brazil · Mexico · Indonesia · Colombia · Nigeria · Angola ·
> Morocco · Tunisia

Purpose: our model has too few Bahrain crisis episodes to test anything with
statistical confidence. A peer panel is the only way to fix that.

## 3. Bahrain-related, if quickly available

| # | Instrument | Fields |
|---|---|---|
| 6 | Bahraini bank CDS — NBB, BBK, Ahli United (where quoted) | `PX_LAST` |
| 7 | EMBI / CEMBI **Bahrain sub-index** spread | index level + spread |
| 8 | Bahrain All Share equity index + listed bank equities | `PX_LAST`, daily |
| 9 | Bahrain sovereign **issuance history** — launch spread vs secondary at pricing | whatever the new-issue monitor gives |
| 10 | Bahrain **rating actions** with dates, plus outlook/watch changes — S&P, Moody's, Fitch | date, action, from/to |

## 4. Recovery ground truth — separate exercise, lower priority

To measure how accurate our recovery estimates are, we need cases where the
answer is actually known. That means sovereigns that **did** default:

| # | What |
|---|---|
| 11 | **ISDA credit-event auction final prices** for every sovereign auction available |
| 12 | Daily bond prices for those sovereigns in the 12–24 months **before** their default, across their curve |

Sovereigns of interest: Ecuador (2008, 2020), Argentina (2001, 2014, 2020),
Greece (2012), Ukraine (2015, 2022), Venezuela (2017), Lebanon (2020), Zambia
(2020), Sri Lanka (2022), Ghana (2022), Russia (2022), Suriname, Mozambique,
Belize, Barbados, Seychelles.

**Ecuador is the most valuable single name here** — oil-dependent and dollarized,
which makes it the closest structural analogue to Bahrain in the whole set.

---

## How to pull it

The Excel add-in is the simplest route. `BDH` returns a date-indexed history that
saves straight to CSV:

```
=BDH("<ticker>","PX_LAST","1/1/2008","today")
=BDH("<ticker>","PX_BID", "1/1/2008","today")
=BDH("<ticker>","PX_ASK", "1/1/2008","today")
```

**Please confirm tickers on the terminal rather than guessing them.** Sovereign
CDS identifiers follow a `C<COUNTRY><SENIORITY><TENOR> <SOURCE> Curncy` pattern,
but the source suffix and seniority code vary by name — a near-miss returns a
different instrument silently. `SOVR <GO>` or `WCDS <GO>` will confirm each one;
`CDSW <GO>` is the tool for curve/term-structure work.

If a series genuinely does not exist for a name, please note that rather than
substituting something similar — a documented gap is more useful to us than an
approximate fill.

## Save format

Any of these is fine:

- One CSV per instrument, with a date column and a value column, **or**
- One wide CSV with dates as rows and instruments as columns

Either way, please include the **ticker string you actually used** in the
filename or a header row, so we can trace exactly what was pulled and reproduce
it later.

Example of the shape that drops straight into our pipeline:

```csv
date,value
2016-03-01,284.5
2016-03-02,281.0
```

---

## Two practical notes

**Please clear this with compliance before pulling.** Bloomberg's redistribution
terms are strict, and exporting data for use in an internal model is exactly the
case that gets reviewed. We would rather have the conversation first.

**If NBB already holds a Data License or per-security feed**, that is a cleaner
route than a terminal export and avoids the seat-licence question entirely —
worth checking with the market-data team before doing any of the above.

---

## Questions

Anything ambiguous above — especially ticker selection or which recovery field
to use — please flag rather than guess. A short question now saves a re-pull
later.
