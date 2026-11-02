# Case study: Tariff Whiplash

## The question

In 2025 the US announced more tariff changes than in any year in decades: headline rates of 10%, 25%, 50%, 145%. In February 2026 the Supreme Court struck most of them down, and in July 2026 new ones replaced part of them. Coverage reported the announcements. Three questions were left unanswered:

1. What did importers **actually pay**, after exemptions and stacking?
2. **Where did the buying go**, and for which products?
3. What does a company do now, **to get refunds back and decide where to buy**?

## What I built

| Deliverable | What it is | Skill it shows |
|---|---|---|
| Data pipeline | Monthly download of four layers of Census trade data (countries, product groups, 5,000+ products, 10-digit products with quantities) on GitHub Actions | Working with APIs, automation, handling secrets |
| SQL analysis | Nine documented queries in DuckDB, each with its question, why it matters and its method | SQL (CTEs, FILTER, window and ROLLUP), analysis |
| Data story | A scroll-driven page where every number is filled from the data | Communicating findings |
| Refund route checker | Business rules R1–R8 as code, with 20 tests on both sides of every deadline | Business rules, acceptance testing |
| Cost simulator | Landed cost of $100 of goods from each country, with a "what if" on China's tariff | Decision support |
| Process maps | How an importer reacts to a tariff change; how refunds work | Process analysis |
| Requirements | For the site (with traceability) and a full BRD for an internal tariff and refund tracker | Requirements writing |
| Decision log, data dictionary, research notes | Every choice and source written down | Documentation |

## Part two: building the tool the requirements describe

A requirements document on its own shows planning, not delivery. So I built Part B of the [requirements](requirements.md) as **[Tariff Desk](https://shre0027.github.io/tariff-whiplash/tracker.html)**, a working prototype for an invented importer (41 products, 185 shipments). Everything that isn't about the company is real: product codes, countries, cost levels and every tariff rule.

**How it was built, in order:**
1. **Research:** each tariff program's rates, dates and exemptions, from legal and trade sources ([research notes](research-notes.md)).
2. **Rules as data:** 34 dated rules, each with a source (30 linked to the official legal text), in [`config/tariff_rules.json`](../config/tariff_rules.json). One engine applies them for the app, the tests and the validation.
3. **Validate against reality:** for 19 products × countries × months, I compared the rate the rules predict with the rate Census shows was actually charged. The first run got 72% of checks within 2 points. The gaps pointed to missing rules: goods already shipped when a tariff started kept the old rate for weeks (in-transit exemptions), and the EU, Japan and Switzerland deals cap the total at 15%. After fixing them, **82% within 2 points, median error 0.3 points** ([rule validation](rule-validation.md)). What can't be modeled (the tariff on steel content) is written down, not hidden.
4. **Build the app:** overview, products with landed cost and margin, a "what if a new tariff is announced?" tool, shipments with refund routes and deadlines, the CAPE upload file, and an audit log.
5. **UAT:** 15 test scripts, one or more per requirement, with actions and expected results kept separate. They ran automated against expected values worked out from the data, not from the page: **15/15 passed** after fixing the defects UAT found ([uat.md](uat.md), [results](uat-results.md)).

**The defect I'd talk about in an interview:** UAT flagged shipments shown as "No IEEPA duty" that the refund rules said should be refunded. It looked like an app bug. In fact, the test was missing a business rule: a shipment entered during the tariff period but made up only of exempt electronics never paid the tariff, so there's nothing to refund. Fixing the test exposed a real data defect: the sample data had refund claims on exactly those shipments, which customs would reject.

## Findings (January–August of each year unless stated)

- **The real rate:** the effective US tariff rate went from 2.2% (January 2025) to a peak of 10.8% (October 2025), then 6.9% in August 2026. Goods from China peaked at 47.9% in May 2025, a third of the 145% headline.
- **The bill:** duty charged rose from $50 billion (2024) to $150 billion (2025) and $174 billion (2026), while imports grew 12%.
- **The check:** extra duty in product groups mainly hit by the struck-down tariffs comes to $150 billion, against CBP's reported $166 billion collected. Close, from an independent source.
- **Where it went:** China's share of US imports fell from 12.9% to 7.4%. Taiwan (+4.0 points), Vietnam (+3.3), Thailand (+2.0) and Mexico (+1.9) gained. Much of Taiwan's gain is computers and servers.
- **Products:** laptops from China went from 67% to 7% of US imports (Vietnam +$17 billion); India now supplies 49% of US smartphones (17% in early 2024). Toys moved much less (76% → 64%).
- **Now:** steel products pay 43% (Section 232), clothing 22–23%; electronics like phones and laptops pay under 1%.
- **Refunds:** about $126 billion sent for payment by 2 October 2026, through a process where each shipment's route depends on deadlines.

## Decisions that mattered

The full list is in the [decision log](decision-log.md). The three that changed the answers most:

- **Effective rate, not announced rates (D2).** Announced rates overstate the burden on China by about three times at the peak, because of exemptions.
- **The same $100 of goods, not unit prices (D8).** The first version of the simulator compared average unit prices and made China look four times cheaper for consoles. That was product mix, not price. Rebuilding on "$100 of goods" removed the distortion.
- **Saying what the data can't show (D13).** A country's gain isn't proof of rerouting. Writing that down, with the evidence (Taiwan's server boom), keeps the story honest.

## Problems along the way

- **API key took a day to activate:** the first runs failed with "invalid key" even though the stored secret was correct (checked by comparing fingerprints, without printing the key). It started working the next morning.
- **An undocumented API behavior:** asking for country names together with a product level returns nothing. Found by testing each part separately, then restructured the queries (D4).
- **Quantities were all zero** at 6-digit level, because those totals mix units. Added a 10-digit download (D7).
- **Rule wording vs reality:** the first draft of an acceptance test applied the new Section 301 tariff to upholstered chairs. The data showed chairs at 25% from every country, which led to the Section 232 furniture tariff (October 2025) and the rule that Section 232 goods are excluded from the new Section 301 tariffs. Fixed the test, the rules and the research notes.

## What I'd do next

- Add **district (port) data**, to show which US ports' traffic shifted.
- Let users **enter their own supplier price** in the simulator.
- Track **refunds by month** as CBP publishes more figures.
