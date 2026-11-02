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
- Turn Part B of the requirements into a prototype with sample entry data.
- Track **refunds by month** as CBP publishes more figures.
