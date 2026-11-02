# Tariff Whiplash

**What did US tariffs actually cost in 2025–26, and where did the buying go?**

👉 **[Read the data story](https://shre0027.github.io/tariff-whiplash/)** · [Cost simulator](https://shre0027.github.io/tariff-whiplash/simulator.html) · **[Tariff Desk: tracker prototype](https://shre0027.github.io/tariff-whiplash/tracker.html)** · [Case study](docs/case-study.md) · [SQL analysis](analysis/README.md) · [Process maps](docs/process-maps.md) · [Requirements](docs/requirements.md) · [Decision log](docs/decision-log.md) · [Data dictionary](docs/data-dictionary.md) · [Research notes](docs/research-notes.md) · [UAT](docs/uat.md) · [Rule validation](docs/rule-validation.md) · [Stakeholder interviews](docs/stakeholder-interviews.md)

![The data story: the effective US tariff rate went from 2.2% to 10.8% to 6.9%](docs/img/story.png)

## The 2-minute tour
1. **[The story](https://shre0027.github.io/tariff-whiplash/)** (60 seconds): scroll the first chart. It's the tariff rate importers actually paid each month, against the headlines.
2. **[Product by product](https://shre0027.github.io/tariff-whiplash/#moved)**: laptops from China went from 67% of US imports to 7% in two years.
3. **[Tariff Desk](https://shre0027.github.io/tariff-whiplash/tracker.html#rules)** (60 seconds): run the "what if a new tariff is announced?" tool, then open **Shipments & refunds** to see each shipment's refund deadline.
4. **How it was checked:** [rule validation](docs/rule-validation.md) (the rules match the duty actually charged: median error 0.3 points) and [UAT results](docs/uat-results.md) (15/15).

<table><tr>
<td width="33%"><img src="docs/img/story-products.png" alt="China's share of US imports by product, 2024 to 2026"><br><sub>Which products left China</sub></td>
<td width="33%"><img src="docs/img/simulator.png" alt="Cost to land $100 of upholstered chairs from each country"><br><sub>Sourcing cost simulator</sub></td>
<td width="33%"><img src="docs/img/tracker.png" alt="Tariff Desk overview: refunds to recover, deadlines, duty by program"><br><sub>Tariff Desk tracker (sample company)</sub></td>
</tr></table>

In 2025 the tariff rate US importers actually paid more than quadrupled. In February 2026 the Supreme Court struck most of the new tariffs down, and in July 2026 new ones replaced part of them. This project uses the Census Bureau's own trade data to show what importers really paid, which countries and products gained and lost, and how the refunds work, plus a simulator to compare where to buy from today.

Facts only: no view on whether the tariffs are good policy.

## Key findings
*(January–August of each year; Census data through August 2026)*

- **Headline vs reality:** the effective US tariff rate rose from 2.2% (Jan 2025) to 10.8% (Oct 2025), and was 6.9% in Aug 2026. Goods from China peaked at 47.9%, a third of the 145% headline.
- **The bill:** duty charged went from $50B (2024) to $150B (2025) and $174B (2026), while imports grew 12%.
- **Where it went:** China's share of US imports fell from 12.9% to 7.4%. Taiwan, Vietnam, Thailand and Mexico gained the most.
- **Fastest moves:** laptops from China went from 67% to 7% of US imports; India now supplies 49% of US smartphones (17% in early 2024).
- **Today:** steel products pay 43%, clothing about 23%; phones and laptops under 1%.
- **Rules check:** the tracker's 34 tariff rules reproduce the duty Census recorded to a median of 0.3 points (82% of 2,000 checks within 2 points).
- **Method check:** extra duty in goods mainly hit by the struck-down tariffs is $150B in the data, against CBP's reported $166B collected.

## What's in it
1. **Data pipeline:** monthly download from the Census international trade API (country, product group, 6- and 10-digit product), on GitHub Actions
2. **SQL analysis:** nine documented DuckDB queries, results in [`analysis/`](analysis/README.md)
3. **Data story:** scroll-driven page; every number is filled from the data
4. **Refund route checker:** IEEPA refund rules R1–R8 as code, with 20 tests
5. **Sourcing cost simulator:** cost to land $100 of goods from each country, with a "what if" on China's tariff
6. **Tariff Desk, a working tracker prototype:** the internal tool the business requirements describe, for an invented importer: landed cost and margin per SKU under every tariff, a "what if a new tariff is announced?" tool, refund routes and deadlines for every shipment, the CAPE upload file, and an audit log
7. **Tariff rules as data, checked against reality:** 34 dated rules, 30 linked to the official legal text; predicted vs actual duty for 2,000 product-country-months: median error 0.3 points
8. **BA documents:** process maps, requirements with traceability, a BRD, UAT scripts and results (15/15), decision log, data dictionary, case study

## How it works

```mermaid
flowchart LR
    A["Census trade API<br/>(key in GitHub secret)"] -->|fetch_census.py<br/>monthly| B["data/raw/<br/>countries · chapters · products"]
    R["Research<br/>timeline · refunds"] --> C
    B --> C["DuckDB SQL<br/>9 queries"]
    C --> D["analysis/README.md"]
    C --> E["build_site.py"]
    T["refund + tariff rules<br/>35 tests"] --> E
    B --> V["Rule validation<br/>vs Census duty"]
    T --> V
    S["Sample company<br/>(invented)"] --> E
    E --> F["GitHub Pages<br/>story · simulator · tracker"]
```

| Step | File | What it does |
|---|---|---|
| Download | `scripts/fetch_census.py`, `.github/workflows/fetch.yml` | Pulls monthly data on the 12th; the API key is a repository secret and is never printed |
| Analyze | `sql/*.sql`, `scripts/run_sql.py` | Runs every query and writes results to `analysis/` |
| Rules | `templates/refund_rules.js`, `templates/tariff_engine.js`, `config/tariff_rules.json`, `tests/` | Refund routes and tariff rules; 35 tests run on every build (`node --test tests/*.test.js`) |
| Validate | `scripts/validate_rules.js` | Checks the tariff rules against the duty Census recorded, monthly → [`docs/rule-validation.md`](docs/rule-validation.md) |
| Tracker | `scripts/make_sample_company.py`, `templates/tracker.html`, `tests/uat_tracker.js` | Sample company, the Tariff Desk app, and the automated UAT run |
| Publish | `scripts/build_site.py`, `templates/`, `.github/workflows/pages.yml` | Builds the two pages with the data embedded and publishes them |

Run it yourself:
```bash
export CENSUS_API_KEY=...   # free key from api.census.gov/data/key_signup.html
python scripts/fetch_census.py
pip install duckdb && python scripts/run_sql.py && python scripts/build_site.py
```

## Data source
US Census Bureau, international trade data (imports by HS code): imports for consumption, calculated duty, freight and insurance charges. Tariff events and refund figures come from published legal and trade sources, listed in the [research notes](docs/research-notes.md).

*Calculated duty is assessed at entry; refunds paid later are not subtracted. Not legal advice.*

Built by Shreyas Tayde with Claude.
