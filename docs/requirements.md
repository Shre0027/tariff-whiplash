# Requirements

> **What this is:** the requirements for two things. **Part A** is this project's public site (the data story, refund route checker and cost simulator): what it must do and how each requirement was checked. **Part B** is a business requirements document for an internal tool an importer would need after 2025, a *tariff exposure and refund tracker*, written from the pain points and business rules in the [process maps](process-maps.md). Part B is a specification only; the refund route checker on the site is a working prototype of its core rule (FR-6).

---

## Part A: the public site

### A1. Problem and goal

**Problem:** news coverage reported headline tariff rates ("145% on China"), but not what importers actually paid, which goods moved, or what it cost. The official data that answers those questions (Census trade data) is public but takes API work and SQL to use.

**Goal:** let a non-specialist see, from official data, what the 2025–26 tariffs actually cost, where US buying moved, and how refunds work; and let a buyer compare countries for a product.

### A2. User stories and acceptance criteria

**US-1: See the real rate.** As a reader, I want the tariff rate actually charged each month, so that I can compare it with the headlines.
- AC-1.1: The rate is calculated duty ÷ imports for consumption, for all countries and the five largest suppliers, January 2022 to the latest month.
- AC-1.2: The main tariff events are marked on the chart, each with a source in `data/reference/timeline.json`.

**US-2: See where imports moved.** As a reader, I want to see which countries gained and lost, overall and for specific products, so that I understand trade diversion.
- AC-2.1: Compares the same months (January to the latest month) of 2024 and the latest year, so seasonality doesn't distort it.
- AC-2.2: Product-level results show China's share before and after and the country that gained most.
- AC-2.3: The page says that a gain is not proof of rerouting, with the main alternative explanation.

**US-3: Understand the refund route for a shipment.** As an importer, I want to enter a shipment's dates and type and see which refund route applies, so that I don't miss a deadline.
- AC-3.1: Implements business rules R1–R8 ([process maps](process-maps.md)).
- AC-3.2: Every boundary (80/81 days, 180/181 days, first and last IEEPA day) has a test on both sides.
- AC-3.3: Invalid input (missing dates, liquidation before entry, future dates) shows a message, not a route.
- AC-3.4: Warns when 14 days or fewer remain before the CAPE limit, and when ACH enrollment is missing.
- AC-3.5: Says it is general information, not legal advice.

**US-4: Compare countries for a product.** As a buyer, I want to compare the cost of landing the same goods from each country, so that I can see whether moving suppliers makes sense.
- AC-4.1: Compares $100 of goods (not average unit prices, which mix cheap and premium models).
- AC-4.2: Uses each country's actual freight share and the tariff rate charged in the latest month.
- AC-4.3: A "what if" control changes China's tariff and updates the ranking and the break-even price.
- AC-4.4: Lists what the comparison leaves out.

**US-5: Trust the numbers.** As a reviewer, I want every number traceable to the data, so that I can check the work.
- AC-5.1: The site and the SQL analysis use the same queries (`sql/`), and the text is filled from the data, not typed in.
- AC-5.2: The method is checked against an independent figure (US-5 check: extra duty vs CBP's reported IEEPA collections).

### A3. Non-functional requirements

| Id | Requirement | Measure |
|---|---|---|
| NFR-1 Freshness | Data updates without manual work | Monthly scheduled download; site rebuilds after each download |
| NFR-2 Reproducibility | Anyone can rerun the analysis | One command each: `fetch_census.py`, `run_sql.py`, `build_site.py` |
| NFR-3 Neutrality | No opinion on whether the tariffs are good policy | Facts and sources only; reviewed wording |
| NFR-4 Access | Usable on a phone and in dark mode | Checked at 390 px and 1280 px, light and dark; no horizontal page scroll |
| NFR-5 Accessibility | No WCAG 2 A/AA violations | axe-core scan of both pages in light and dark mode |
| NFR-6 Motion | Works without animation | Reduced-motion setting shows final values immediately |
| NFR-7 Cost | Free to run | GitHub Actions and Pages; a free Census API key stored as a repository secret |
| NFR-8 Security | No secrets in code or logs | Key read from the environment, never printed |

### A4. Traceability

| Requirement | Where it's met | How it was checked | Status |
|---|---|---|---|
| US-1 | `sql/01`, story section 01 | Rate series matches SQL results; events checked against sources | Done |
| US-2 | `sql/04`–`06`, `sql/09`, story sections 03–05 | Chart values match SQL; caveat on rerouting shown | Done |
| US-3 | `templates/refund_rules.js`, story section 07 | 20 automated tests (`tests/refund_rules.test.js`), run on every build | Done |
| US-4 | `templates/simulator.html`, `scripts/build_site.py` | Hand check: chairs from Vietnam, $100 + $21.6 freight + $25.1 tariff = $146.7 | Done |
| US-5 | `sql/03`, story section 02 | Extra duty $150B vs CBP-reported $166B | Done |
| NFR-4, 5 | Both pages | Playwright screenshots; axe-core: 0 violations | Done |

---

## Part B: tariff exposure and refund tracker (business requirements)

### B1. Business problem

A mid-sized importer faced more than a dozen tariff changes in 18 months, then a refund process with entry-level deadlines. Product, supplier, tariff and entry data sit in different systems (ERP, the broker's files, CBP's ACE portal), so nobody can quickly answer: *which of our products does this change hit, what does it cost us, and which refunds are we about to lose?*

### B2. Objectives and success measures

| Objective | Measure |
|---|---|
| Know the cost of a tariff change within a day of the announcement | Landed-cost impact report for all affected SKUs within 1 business day |
| Never lose a refund to a missed deadline | 0 entries passing the 80-day CAPE limit or the 180-day protest window without action |
| Recover refunds faster | Share of eligible refund value filed in CAPE; days from eligibility to filing |
| Make sourcing decisions on full cost | Every supplier change request includes a landed-cost comparison |

### B3. Stakeholders

| Stakeholder | Interest | Involvement |
|---|---|---|
| Trade compliance manager | Correct classification, deadlines, audit trail | Primary user, approves rules |
| Finance (cost accounting, treasury) | Landed cost, margin, refund cash | Primary user of cost and refund reports |
| Procurement | Supplier and country choices | Uses landed-cost comparison |
| Customs broker (external) | Files entries and corrections | Data provider (entry data) |
| IT / data team | Integrations with ERP and ACE reports | Builds and maintains |
| Sales / pricing | Customer price changes | Receives cost-change alerts |

### B4. Scope

**In:** product master with HTS code, country of origin and supplier; tariff rules by HTS code and country (IEEPA history, Section 232, 301, 122); landed-cost calculation; entry records from ACE reports; refund eligibility and deadlines; alerts; reports.
**Out:** filing entries or CAPE declarations (stays with the broker and ACE); classification rulings; legal advice; customer pricing decisions.

### B5. Functional requirements

| Id | Requirement | Priority | Source |
|---|---|---|---|
| FR-1 | Store each SKU with its HTS 10-digit code, country of origin and supplier, with effective dates | Must | P2 |
| FR-2 | Store tariff programs as rules by HTS code and country, with start and end dates and exclusions, so past and future rates can be calculated | Must | P3 |
| FR-3 | Calculate duty per SKU by applying each program in order, including stacking and exclusions | Must | P3 |
| FR-4 | When a rule is added or changed, recalculate landed cost for every affected SKU and list SKUs whose margin falls below a set threshold | Must | P1 |
| FR-5 | Import entry data from ACE reports (ES-003, ES-022) and the broker: entry number, date, type, liquidation status and date, duty lines | Must | Refund process |
| FR-6 | For each entry with IEEPA duty lines, assign a refund route using rules R1–R8 and show days left to each deadline | Must | R2–R5 |
| FR-7 | Alert compliance 14 days and 3 days before an entry passes the 80-day CAPE limit or the 180-day protest window | Must | R2, R4 |
| FR-8 | Produce the CAPE upload file (one column of entry numbers, at most 9,999 per file) for entries routed to a CAPE phase | Should | CAPE format |
| FR-9 | Track each declaration: submitted, accepted or rejected (with reason), refund received, amount and interest | Should | R6, R7 |
| FR-10 | Compare landed cost of a SKU from alternative countries using current rules and freight | Should | P4 |
| FR-11 | Show rate history and announced future changes next to each SKU's cost | Could | P4 |
| FR-12 | Keep an audit log of rule changes and route decisions (who, when, source document) | Must | Compliance |

### B6. Business rules

R1–R8 are listed in the [process maps](process-maps.md#2-getting-struck-down-tariffs-back-the-cape-refund-process). Additional rules for cost calculation:

| Id | Rule |
|---|---|
| C1 | Duty is calculated on customs value (the price paid, not including international freight and insurance) |
| C2 | Goods qualifying under USMCA are exempt from Section 301 (2026) tariffs; Section 232 goods are excluded from Section 301 (2026) tariffs |
| C3 | The rate in force is decided by the entry date, except for in-transit exemptions defined in each program |

### B7. Data requirements

| Entity | Key fields | Source |
|---|---|---|
| SKU | sku_id, hts10, country_of_origin, supplier_id, unit_cost, valid_from/to | ERP |
| Tariff rule | program, hts_pattern, country, rate_type (ad valorem, specific), rate, valid_from/to, exclusions, source_doc | Federal Register, CBP CSMS (entered by compliance) |
| Entry | entry_number, importer_of_record, entry_date, entry_type, liquidation_status, liquidation_date | ACE reports, broker |
| Entry line | entry_number, line, hts10, chapter99_codes, value, duty | ACE reports |
| Refund claim | declaration_id, entry_number, phase, submitted_on, status, rejection_reason, refund_amount, interest, paid_on | ACE / CAPE |

### B8. Assumptions, constraints and risks

- **Assumption:** ACE reports can be exported on a schedule; the broker shares entry data electronically.
- **Constraint:** CBP's process can change (a pending appeal could widen or narrow eligibility), so routes must be rules that compliance can update without a code release.
- **Risk:** wrong HTS codes in the product master make every downstream number wrong. Mitigation: classification review before go-live, and a report of SKUs with no or changed codes.
- **Risk:** stacking rules are complex and change often. Mitigation: test cases per program, written with compliance, run on every rule change (as for R1–R8 in this project).

### B9. Acceptance test examples

| # | Given | When | Then |
|---|---|---|---|
| T1 | Entry dated 10 Jun 2025, liquidated 75 days ago | Routes are assigned | Route = CAPE Phase 1; alert "5 days left" |
| T2 | Entry dated 10 Jun 2025, liquidated 120 days ago | Routes are assigned | Route = protest; 60 days left |
| T3 | Entry dated 1 Mar 2026 | Routes are assigned | No IEEPA refund (outside 4 Feb 2025 – 23 Feb 2026) |
| T4 | New rule: +12.5% Section 301 duty on goods from Vietnam from 24 Jul 2026, excluding Section 232 goods | Rule is saved | All Vietnam-origin SKUs not under Section 232 (e.g. cotton T-shirts, HTS 6109) recalculated; upholstered furniture (already under Section 232) unchanged; SKUs under margin threshold listed |

### B10. Prototype and traceability

Part B was built as a working prototype, **[Tariff Desk](https://shre0027.github.io/tariff-whiplash/tracker.html)**, on an invented sample company (41 SKUs, 185 entries) with the real tariff rules and real cost levels. Each requirement was accepted through the [UAT scripts](uat.md); latest run: [uat-results.md](uat-results.md).

| Requirement | Where it's met in the prototype | Accepted by | Status |
|---|---|---|---|
| FR-1 Product master with HTS code, origin, supplier | Products view; `data/sample/company.json` | UAT-01 | Done |
| FR-2 Tariff programs as dated rules with exclusions | `config/tariff_rules.json` (34 rules, each with a source; 30 linked to the official legal text), Tariff rules view | UAT-13; engine tests; [rule validation](rule-validation.md) | Done |
| FR-3 Duty per SKU, all programs in order with stacking and exclusions | `templates/tariff_engine.js`; SKU duty breakdown | UAT-02; 15 engine tests | Done |
| FR-4 Recalculate on a rule change; list SKUs below margin | What-if on the Tariff rules view; "Hit by what-if" filter | UAT-03, 04, 05 | Done |
| FR-5 Entry data | Shipments & refunds view (sample entries in place of ACE reports) | UAT-06 | Done (sample data) |
| FR-6 Refund route and days left per entry | `templates/refund_rules.js`; Refund status column | UAT-07; 20 rule tests | Done |
| FR-7 Alerts 14 and 3 days before a deadline | Deadline list (30 days), menu badge (14 days), color at 7 and 14 days | UAT-08 | Partly: shown in the app; no email alerts |
| FR-8 CAPE upload file | "Download CAPE file", one file per phase, max 9,999 per file | UAT-10 | Done |
| FR-9 Track declarations | Refund status column, entry details | UAT-09 | Done (sample claims) |
| FR-10 Compare countries | "Same product from other countries" in SKU details | UAT-11 | Done |
| FR-11 Rate history | Rate chart in SKU details | UAT-12 | Done (history; announced future changes via what-if) |
| FR-12 Audit log | Audit log view (kept in the browser) | UAT-14 | Partly: one user, one browser; a real system needs a server-side log |

**Not built (would need a real deployment):** imports from ACE reports and the broker (FR-5), email alerts (FR-7), user accounts and a shared audit log (FR-12).
