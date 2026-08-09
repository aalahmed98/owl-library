---
title: Bonds
summary: >-
  I am sitting with the bonds and t-bills desk. and they will explain to me how
  the CDS works with bonds
created: '2026-08-09'
updated: '2026-08-09'
status: draft
---

## Acronyms & terms

| Term (as written in notes) | Correct term / expansion | Meaning in one line |
|---|---|---|
| "SOFA" | **SOFR** — Secured Overnight Financing Rate | The USD benchmark rate; repo rates are quoted as a spread over it. *(AI: "SOFA" in the notes is a mishearing of SOFR.)* |
| "reprueches aggrement" / repo | **Repo** — Repurchase Agreement | Sell a bond for cash now with an agreement to buy it back later; economically a secured loan against the bond. |
| Reverse repo | **Reverse Repurchase Agreement** | The other side of the same trade: you lend cash and take in the bond as collateral. |
| Haircut | **Haircut** | The discount applied to the bond's market value when setting how much cash you receive against it. |
| Repo rate | **Repo rate** | The interest charged on the cash borrowed in a repo. |
| Spread | **Spread (over SOFR)** | The extra interest charged on top of the benchmark, reflecting credit quality and the lender's cost of money. |
| "TENNER TIME" | **Tenor** | The term/maturity of the borrowing — e.g. overnight vs 30 years. *(AI: "tenner time" read as "tenor".)* |
| "b rated" / "b reated" | **B rating** | The credit rating of the borrower — a sub-investment-grade rating that widens the spread charged. |
| Margin call | **Margin call** | A demand for extra cash or collateral when market moves erode the agreed haircut cushion. |
| Secondary market | **Secondary market** | Where existing bonds trade after issuance; the price source that drives margin calls. |
| Short / shorting | **Short selling** | Selling a bond you do not own, expecting to buy it back cheaper later. |
| "cover my short" | **Covering a short** | Buying back the borrowed bond to close out the short position. |
| Credit rating desk | **Credit (rating) desk** | The desk that forms a credit view on a name and trades on it — including shorting names it dislikes. |
| ALM | **Asset–Liability Management** | The function that manages the balance sheet's funding needs — the internal party that wants to raise cash. |
| JP Morgan / "JP morgan" | **J.P. Morgan** | The counterparty bank in the examples — the cash lender / repo counterparty. |
| NBB | **NBB** | The institution the notes are written from — the bond holder and cash borrower. *(AI: expansion of the initials not given in the notes — see Open questions.)* |
| CDS | **Credit Default Swap** | Named in the session context as the topic to be explained alongside bonds. *(AI: CDS is not actually covered anywhere in the notes — see Open questions.)* |

## The repo market

### What a repo is

Repo — repurchase agreement — is the one product to understand in order to understand the repo market. A repo and a reverse repo are the two sides of the same transaction: *(AI: whether you call it a repo or a reverse repo depends on which side you are on — the cash borrower posting the bond, or the cash lender receiving it.)*

### Pricing: haircut, benchmark, spread

Two things determine what the borrowing costs us:

- **The haircut.** Our own credit standing is captured in the haircut — since we are B rated, that shows up as a larger haircut on the bond we post.
- **The repo rate**, quoted as a spread over SOFR. This is what JP Morgan will charge us for the tenor of the trade.

Every currency has a benchmark rate; for the dollar, it is SOFR. The spread over SOFR exists for two reasons: we are B rated, and the lender has its own cost of money to recover.

The tenor matters as well — borrowing can run anywhere from overnight to 30 years. In our case we are borrowing for a month.

### Who cares about what

When ALM wants money, there are two things to care about:

1. A **lower haircut** is better for us — more cash raised against the same bond.
2. A **lower SOFR** means lower interest to pay.

## Risk: who loses what when something goes wrong

The three failure cases each land differently:

- **If I default**, they get to keep the bond.
- **If the bond defaults**, I have to return the cash.
- **If JP Morgan defaults**, I lose the haircut.

## Mark-to-market and margin calls

The bond market moves in the secondary market, and the point of margining is to maintain the haircut rate throughout the life of the trade.

- If the bond price **increases**, they will give you more (a margin call in our favour).
- If the secondary market moves **down**, then to maintain the haircut, NBB will give JP Morgan money.

## How the credit desk uses repo to short

JP Morgan has credit rating desks; we do not have one. The view of a credit rating desk is simple: if they don't like a name, they'll short it.

The chain of the trade runs as follows:

1. The credit trader tells the repo trader to cover their short.
2. The credit trader sells the bond they don't own — they borrow it from the repo trader.
3. The repo trader goes looking for the bond on their behalf, and finds NBB, who wants to repo the bond to the trader.
4. After a month it matures, it goes down, and he sells.
5. He buys it back at a lower price and gives it back to the repo trader, who gives it back to NBB.

## Open questions

- **CDS was the stated topic but never appears in the notes.** The session was set up as "they will explain to me how the CDS works with bonds," yet nothing in the notes covers credit default swaps. Was the CDS discussion not reached, or is it missing from these notes?
- **"how much gp Morgan will charge me dfor the TENNER TIME"** — read as "how much JP Morgan will charge me for the tenor." Is "tenner" the tenor of the trade generally, or specifically the 10-year point?
- **"after a month, it matures, it goes down, he sells."** — the sequence is ambiguous: does "it matures" mean the one-month repo matures (rather than the bond), and is "it goes down" the bond price falling? Also, "he sells" followed by "buys it back for a lower price" seems to double up on the sale — which step is which?
- **"if oi default they get to keep the bodn"** — read as "if I default they get to keep the bond." Confirming that "I/we" here means NBB as the bond poster.
- **NBB** — what does NBB stand for, and is NBB us (the institution these notes are written from) throughout, including in the shorting example where NBB supplies the bond?
- **"credit trade tells repo trader cover my short"** — this appears before the short is described as being put on. Does the credit trader instruct the repo trader to *source* the borrow at the outset, or to *cover/close* the short at the end?
- **"capture in the hair cut"** — confirming the reading that our B rating is what gets captured in the haircut, rather than some other factor.

---

<details>
<summary>Raw notes (verbatim)</summary>

### Situation

I am sitting with the bonds and t-bills desk. and they will explain to me how the CDS works with bonds

### Notes as typed

```
one produca to undwerstand repo market
reprueches aggrement
since we are a b rated
capture in the hair cut
spread over SOFA
repo rate
how much gp Morgan will charge me dfor the TENNER TIME
EVERY CUFRRECNY HAS A BENCHMAKRK DOLLAR ITS SOFA
overnight vs 30 years
we borrowing a month
spread over sofa + spread is because we are b reated + the cost of money to them
repo vs reverse repo
if oi default they get to keep the bodn
and if the bond defaults i have to return the cash
if JP Morgan defaults i lose the haircut
the bond market moves secondy market, supposedly if the bond market increases, they will give you more (margin call) the idea is to maintain the haircut rate
if the secondry market moves down, then to maintain the haircut, NBB will give JP morgan money
credit rating desks at jp morgan. we dont have it. the view of the credit rating desk is, if they dont like it theyll short it.
credit trade tells repo trader cover my short.
credit trader sells the bond he dont own, he borrows it from repo trader, the repo trader looks for it for him, he finds nbb, that want to to repo thr trader
after a month, it matures, it goes down, he sells.
buys it back for a lower price gives it back to repo trader repo trader gives it back to nbb
when ALM wants money, i care about 2 things, lower haircut = better for me. lower SOFA = lower intrest i have to pay
```

</details>
