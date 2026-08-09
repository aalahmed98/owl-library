---
title: Funds Transfer Pricing — Reference Guide
tags:
  - banking
  - ftp
  - treasury
  - alm
  - bahrain
summary: >-
  Verbatim reference guide to FTP: the three rate components, tenor buckets and
  behavioural maturity, blended FTP, ALM economics, deposit beta, governance,
  breakage cost, and stress testing — with NBB/Bahrain context, quick-reference
  formulas, and glossary.
created: '2026-08-05'
status: final
source: FTP_Reference_Guide_1.docx (ingested from local file)
updated: '2026-08-05'
---

# Funds Transfer Pricing

*A reference guide — components, buckets, pricing mechanics, and governance.*
*Prepared for internal reference · National Bank of Bahrain context.*

## 1. What FTP Is, and Why It Exists

Funds Transfer Pricing (FTP) is the internal mechanism a bank uses to price money as it moves between business units. Every loan a bank writes is charged an internal cost of funds; every deposit it gathers is credited an internal rate. The gap between what a customer pays or receives and that internal FTP rate is the margin a business unit actually earns.

Without FTP, a bank cannot fairly compare a mortgage against a current account, or a lending branch against a deposit-gathering branch, because the two carry completely different interest-rate and liquidity risk. FTP strips that risk out of the comparison by charging and crediting it centrally, through Treasury/ALM, so what's left in each business unit's number is only what that unit actually controls — pricing, credit selection, and customer relationship.

## 2. The Three Components of an FTP Rate

Every FTP rate is built by stacking three things:

- **Base rate** — the market yield curve (swap/OIS) read at the deal's matched tenor. This is the pure price of money, with no bank-specific risk attached.
- **Term liquidity premium** — the bank's own funding spread above the base rate at that tenor. This is bank-specific: a stronger bank pays less, a weaker one pays more, and this is the component that moves most violently in a crisis.
- **Add-ons** — smaller charges for contingent liquidity (undrawn commitments), basis/cross-currency mismatch, and optionality (e.g. a borrower's right to prepay).

> **Base rate + liquidity premium + add-ons = the FTP rate** charged on an asset or credited on a liability.

## 3. Buckets and Maturities

A bank maintains a ladder of tenor "buckets" — overnight, 1 month, 1 year, 5 years, 10 years, and so on — each with its own point on the curve. Every balance on the balance sheet is assigned to a bucket, which determines the rate it's charged or credited.

### Contractual maturity

A fixed-term deposit or a bullet loan has a maturity written into the contract, so bucketing is mechanical: a 3-year deposit goes straight into the 3-year bucket. No modelling is required.

### Behavioural maturity

Non-maturity balances — current accounts, savings accounts — have no contractual end date. The bank studies how the balance has actually behaved over time and splits it into tranches: a stable "core" portion (treated as long-tenor, sticky funding), a "volatile" portion, and a "surge" portion (short-tenor, treated as if it could leave any day). This is sometimes formalised as a **replicating portfolio** — a mix of tenor buckets that would have reproduced the balance's real historical behaviour.

### Repricing maturity vs final maturity

These can differ. A 5-year loan at a fixed rate has both final and repricing maturity at 5 years. A 5-year loan at a floating rate that resets every 3 months has a final maturity of 5 years but a repricing maturity of 3 months — and it is bucketed (and priced) at the 3-month point, not the 5-year point, because that is the horizon over which its price actually resets. It then rolls into that same short bucket again at every reset date, for the life of the loan.

## 4. Blended FTP — How a Single Rate Gets Calculated

A loan that repays principal gradually (an amortising loan) is not one bucket — it is many. Each year's principal repayment is a slice of cash returning at a specific point in time, and each slice is priced at that bucket's own point on the curve. The loan's overall FTP charge is the principal-weighted average across every bucket its cash flow touches:

> **Blended FTP = Σ (cash flow in year t × curve rate at year t) ÷ Σ (total cash flow)**

This matters because a bullet loan (all principal back at maturity) sits 100% in the final bucket and is priced at the full headline rate for that tenor, while an otherwise-identical amortising loan is pulled toward the cheaper short-tenor buckets its early cash flow lands in. On a normal, upward-sloping curve, the amortising loan will always carry a lower blended FTP charge than the bullet loan of the same stated tenor. Charging an amortising loan the full headline rate — a common shortcut — systematically overcharges it and understates the true margin the business unit earned.

The same principal-weighted logic applies to non-maturity deposits, except the weights come from the behavioural core/volatile/surge split rather than from a real repayment schedule.

## 5. Who Gets Charged, Who Gets Credited — ALM Economics

FTP splits a bank's net interest income three ways, and the three always sum to the whole:

- **Lending margin** = customer loan rate − FTP charge
- **Deposit margin** = FTP credit − customer deposit rate
- **ALM margin** = FTP charged on assets − FTP credited on liabilities

ALM's margin is compensation for running maturity transformation — borrowing short (via deposits and short funding) and lending long. On a normal upward-sloping curve this produces a positive spread; on a flat or inverted curve it can go to zero or negative.

A well-run FTP framework aims for ALM's structural profit to sit near zero over the full interest-rate cycle. If ALM consistently posts large, steady profit quarter after quarter, that is not evidence of skill — it is usually a sign that the mismatch itself has become a standing, undisclosed bet on the curve staying upward-sloping, which reverses hard exactly when the curve flattens or inverts. FTP does not create profit; it only allocates it between business units and Treasury.

## 6. Deposit Beta — Current Accounts vs Term Deposits

Deposit beta measures how much of a market rate move gets passed on to the customer's rate. Term deposits have high beta (roughly 90%) — their cost tracks the market closely, both on new issuance and, eventually, as the back book of maturing deposits rolls into new rates. Current accounts have low beta (roughly 15%) — the customer rate barely moves even when market rates rise sharply.

This creates an asymmetry worth remembering: rising rates compress term deposit margins (cost catches up to the FTP credit) but expand current account margins quickly (the FTP credit paid on that continuously-rolling pool rises with the curve while the customer rate stays flat). It is also why banks compete hard for transactional, non-maturity balances rather than simply chasing deposit volume of any kind.

On any single existing fixed-term deposit, both sides are frozen at origination — the customer's rate and the FTP credit assigned to it don't move again until maturity. A term-deposit-funded book therefore only catches up to a new rate environment gradually, as each deposit matures and rolls into a new rate — a process that can take years.

## 7. Core / Volatile / Surge — Behavioural Tranching and Governance

Because the core/volatile/surge split is a modelled assumption rather than an observable fact, it is also the single largest lever in the entire FTP framework — moving it has far more P&L impact than any argument over the rate card. That size creates a structural incentive problem: business units benefit from a higher core assumption (bigger FTP credit, better-looking margin) and nobody inside the bank has a natural incentive to argue the number down.

Regulators address this with hard limits — under Basel's IRRBB framework, there is a cap on the average behavioural life a bank may assign to non-maturity deposits, roughly five years for retail transactional balances and shorter for wholesale and non-transactional ones. Internally, changes to the core assumption should not be made unilaterally or reactively; they go through model governance and ALCO sign-off, with a documented root-cause analysis of why the change is warranted, before taking effect.

Concentration is the sharpest version of this risk. A book of many small, independent retail balances tends to be genuinely stable, because unrelated customer decisions largely cancel out day to day. A book concentrated in a handful of large depositors carries much less of that averaging benefit — the same news event can move all of them together. This was the core failure at Silicon Valley Bank in 2023: concentrated, large, correlated deposits assumed to be far stickier than they were, funding long-duration assets. It is also a locally relevant risk in the GCC, where government and large-corporate deposits make up an outsized share of bank funding and a granular retail-style behavioural model will tend to overstate how core that concentrated money really is.

## 8. The Market Curve

The curve used for FTP — usually the swap or OIS curve — is not calculated from a formula; it is read directly off the market. Real instruments trade at every tenor, each with an observable rate, and plotting those rates together produces the curve.

A curve normally slopes upward, since lenders want more compensation for tying money up longer. It can invert — short rates above long rates — when the market expects future rate cuts, which is exactly the shape seen after aggressive hiking cycles. Curve shape matters enormously for FTP: an inverted curve can push a floating-rate loan's price above its own customer rate, and it changes which side of the maturity-transformation trade (borrow short, lend long) is actually profitable.

## 9. Fixed vs Floating Rate — and the US/GCC Difference

A fixed rate is locked at inception and never changes for the life of the deal. A floating rate resets periodically to a reference benchmark plus a spread, so its cost tracks the market throughout its life.

The benchmark itself differs by market. In the US, floating rates reference SOFR, an overnight rate built from real, observed transactions, which replaced LIBOR specifically because LIBOR was based on banks estimating their own borrowing cost. In the GCC, floating rates reference local interbank offered rates — BHIBOR in Bahrain, SAIBOR in Saudi Arabia, EIBOR in the UAE — which work more like LIBOR did, a panel of banks submitting estimated borrowing costs rather than a rate built purely from executed trades.

Because the Bahraini dinar (and most GCC currencies) is pegged to the US dollar, the Central Bank of Bahrain has to keep local rates in line with US rates to defend that peg. In practice, BHIBOR tracks the Fed's moves closely, with a local liquidity spread on top — a floating-rate loan booked in Bahrain is largely a local pass-through of US monetary policy, not an independent rate.

## 10. Why FTP Does Not Price Credit Risk

FTP prices interest-rate risk and liquidity risk only. Credit risk — the risk a specific borrower fails to repay — is priced separately, through expected-loss provisioning and a capital charge for unexpected loss, and is owned by the business unit that underwrites the loan.

The reason for the split is accountability. Rate and liquidity risk are the same for every borrower and can be centrally hedged and pooled by Treasury; credit risk is specific to the borrower and depends entirely on underwriting quality, which Treasury has no visibility into. Folding expected loss into the FTP rate would blur who is responsible when a loan goes bad — mispriced funding or weak underwriting — and would make it impossible to compare a loan's profitability on a genuinely risk-adjusted basis.

## 11. The FTP "Seesaw" — One Lever, Two Sides

FTP acts as a single pivot point that sets the economics on both sides of the balance sheet at once, and moving it does not create value — it only shifts advantage from one side to the other.

Raise the FTP rate at a given tenor and deposits at that tenor become more attractive to gather (the bank can credit depositors more while still protecting margin), while loans at that tenor become less attractive to originate (the cost of funds rises, so either the customer rate rises or the lending margin shrinks). Lower the FTP rate and the effect flips: loans become cheap to write, deposits become less rewarding to collect.

This is why the FTP rate is not set to make either side happy — it has to track the genuine market cost of funds. An FTP rate held artificially low to flatter the lending business, or artificially high to flatter the deposit-gathering business, does not change the bank's real economics; it just transfers margin from one business unit to the other while mispricing the underlying risk for both.

## 12. Breakage Cost

Breakage cost is what it costs the bank when a customer exits a fixed-term deal early — withdrawing a term deposit before maturity, or prepaying a fixed-rate loan — and it is calculated directly off the FTP curve.

The mechanism: compare the deal's original, locked-in FTP rate against the current FTP rate for its remaining tenor. For an early-withdrawn term deposit, the bank must replace that funding at today's rate for the remaining period; if rates have risen since origination, replacement funding costs more than the deposit was credited, and that gap is passed to the customer as a breakage penalty. For a prepaid fixed loan, the bank loses the future income on a loan that was earning an FTP-based margin locked in at origination; if rates have fallen since then, the bank must relend the returned principal at a lower rate than the original loan carried, and the breakage fee compensates for that reinvestment loss.

In short: breakage cost is the price of unwinding an FTP match before its scheduled maturity, sized by how far the curve has moved since the deal was struck.

## 13. Stress Testing FTP

Stress testing FTP means shocking the framework from several angles at once and checking whether it still tells the truth under pressure: parallel shifts, steepening, flattening or inversion of the base curve; a sharp widening of the liquidity premium; and, critically, a breakdown of the behavioural assumptions themselves (What if "core" deposits turn out far less sticky? What if prepayments stop entirely?).

A stress test is judged successful not by whether the numbers look fine under stress, but by whether it accurately reveals where the framework breaks and by how much. Pass/fail is measured against pre-set limits: does ALM's projected P&L stay within board-approved risk limits; does the liquidity position stay above LCR/NSFR minimums; does the IRRBB economic-value or income sensitivity stay within limits; does the test surface a concentration or cliff-edge nobody had noticed. A test that comes back saying "everything's fine" is often a failed test — it usually means the scenario wasn't severe enough.

When a stress test does breach a limit, the levers available, roughly fastest to slowest, are: repricing new business on the rate card; recalibrating the behavioural assumptions (usually the biggest lever); increasing the high-quality liquid asset buffer; and tightening ALCO-set limits on concentration and bucket exposure going forward.

## 14. Quick Reference

### Key formulas

| Concept | Formula / rule |
|---|---|
| FTP rate | Base rate + Term liquidity premium + Add-ons |
| Lending margin | Customer loan rate − FTP charge |
| Deposit margin | FTP credit − Customer deposit rate |
| ALM margin | FTP charged on assets − FTP credited on liabilities |
| Blended FTP | Σ(cash flow in year t × curve rate at t) ÷ Σ(total cash flow) |
| Average life | Σ(cash flow in year t × t) ÷ Σ(total cash flow) |

### US vs GCC benchmark reference

| | United States | Bahrain / GCC |
|---|---|---|
| Floating-rate benchmark | SOFR | BHIBOR / SAIBOR / EIBOR |
| Basis | Real overnight transactions | Panel-submitted estimates |
| Independence from Fed policy | Is the policy itself | Tracks the Fed via the USD peg |

## 15. Glossary

| Term | Meaning |
|---|---|
| ALCO | Asset & Liability Committee — governs FTP assumptions, rate card, and limits |
| ALM / Treasury | The desk that charges assets and credits liabilities, holding the residual mismatch |
| Bucket | A tenor slot on the FTP curve (e.g. 3-month, 1-year, 5-year) with its own rate |
| Bullet loan | A loan that repays 100% of principal at maturity, nothing earlier |
| Core / volatile / surge | Behavioural tranches splitting a non-maturity deposit book by assumed stability |
| Deposit beta | The share of a market rate move passed on to a deposit's customer rate |
| EIBOR / SAIBOR / BHIBOR | Interbank offered rate benchmarks in the UAE / Saudi Arabia / Bahrain |
| IRRBB | Interest Rate Risk in the Banking Book — the regulatory framework capping behavioural assumptions |
| LCR / NSFR | Liquidity Coverage Ratio / Net Stable Funding Ratio — Basel III liquidity requirements |
| Replicating portfolio | A mix of tenor buckets constructed to reproduce a deposit book's real historical behaviour |
| SOFR | Secured Overnight Financing Rate — the US floating-rate benchmark, transaction-based |

## Related archive docs

- [Funds Transfer Pricing (FTP) — Treasury Basics, Part 3](/doc/nbb/ftp-explained.html) — interactive explainer with margin-split calculator and curve builder
- [What Moves FTP — Drivers and Consequences](/doc/nbb/what-moves-ftp.html) — drivers of FTP movements with interactive scenarios
- [ALM Fundamentals — Treasury Basics, Part 4](/doc/nbb/alm-fundamentals.html) — repricing gaps, IRRBB, and the ALCO process
