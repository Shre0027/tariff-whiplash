# Research notes: the rules behind the numbers

> What this is: the background research for the project, kept so every claim on the site can be traced to a source. Facts only, no opinions about the policies. Checked between 1 and 2 November 2026. Where a source is a law firm or logistics company summarizing official guidance, it says so; official CBP and USTR pages are the primary sources.

## 1. Which laws the 2025–26 tariffs used

| Law | What it allows | Used for | Status (Nov 2026) |
|---|---|---|---|
| IEEPA (International Emergency Economic Powers Act, 1977) | Presidential action in a declared national emergency | "Fentanyl" tariffs on China, Canada, Mexico (from Feb–Mar 2025); "reciprocal" tariffs on most countries (from 5 Apr 2025) | Struck down: Supreme Court, *Learning Resources v. Trump*, 20 Feb 2026. Collections stopped 24 Feb 2026. Refunds under way. |
| Section 232 (Trade Expansion Act of 1962) | Tariffs on imports that threaten national security, after a Commerce investigation | Steel, aluminum, autos and parts, copper; timber and lumber (10%) plus upholstered wooden furniture, kitchen cabinets and vanities (25%) from 14 Oct 2025; expanded to "derivative" products on 2 Apr 2026 (up to 50%) | In force. Not affected by the ruling. |
| Section 122 (Trade Act of 1974) | A temporary surcharge of up to 15% for up to 150 days, for balance-of-payments problems | Global surcharge from 24 Feb 2026 | Expired 24 Jul 2026. Not part of the IEEPA refunds; its own court challenge is on appeal. |
| Section 301 (Trade Act of 1974) | Tariffs after a USTR investigation finds unfair trade practices | Older China tariffs (2018–19, still in force); new "forced labor" tariffs on 60 economies from 24 Jul 2026 | In force. |

Sources: [C.H. Robinson: Section 232 timber, furniture and cabinets, 14 Oct 2025](https://www.chrobinson.com/en-us/resources/insights-and-advisories/client-advisories/2025q4/10-10-2025-client-advisory-cbp-issues-sec-232-tariff-guide-timber-furniture-cabinet-impo-oct-14-25/) · [Bradley: Supreme Court strikes down IEEPA tariffs](https://www.bradley.com/insights/publications/2026/02/supreme-court-strikes-down-ieepa-tariffs-key-takeaways-and-next-steps-for-businesses/) · [Brady Ware: refund FAQ (key dates incl. 2 Apr 2026 Section 232 proclamation)](https://bradyware.com/tariff-refund-faq/) · [Cleary Gottlieb: new Section 301 tariffs](https://www.clearygottlieb.com/news-and-insights/publication-listing/trump-administration-imposes-new-section-301-tariffs-on-60-trading-partners)

## 2. Section 301 "forced labor" tariffs (from 24 July 2026)

- **10% additional duty:** Argentina, Bangladesh, Cambodia, Canada, Ecuador, El Salvador, Guatemala, Honduras, India, Indonesia, Jordan, Malaysia, Mexico, Pakistan, Sri Lanka, Trinidad and Tobago, United Kingdom.
- **Capped so that the normal (MFN) duty plus the new duty is at most 10%:** European Union, Taiwan.
- **Capped at 12.5% the same way:** Japan, South Korea, Switzerland.
- **12.5% additional duty:** all other covered economies, including China, Vietnam, Hong Kong, Thailand and Singapore.
- **Exempt:** goods already under Section 232 tariffs; USMCA-qualifying goods from Canada and Mexico that enter duty-free; civil aircraft; pharmaceuticals; books and other informational materials; listed products in the annexes.
- **In transit:** ocean cargo already loaded before 24 Jul and entered by 28 Jul 2026 is exempt. Air, truck and rail cargo isn't.

Sources: [Thomson Reuters regulatory insight, 24 Jul 2026](https://www.thomsonreuters.com/en-us/help/onesource-global-trade/regulatory-insights/2026/july-24th/us-imposes-section-301-forced-labor-tariffs-60.html) · [C.H. Robinson client advisory, 24 Jul 2026](https://www.chrobinson.com/en-us/resources/insights-and-advisories/client-advisories/2026q3/07-24-26-client-advisory-new-section-301-forced-labor-tariffs-now-in-effect/)

**Why this matters for the data:** August 2026 is the first full month under these rules. That's why the latest month in the data is the baseline for the sourcing simulator.

## 3. How IEEPA refunds work (CAPE)

CBP built a new tool in its ACE portal, **CAPE**, to process refunds in bulk instead of one entry at a time.

**Who can claim:** only the importer of record (IOR) that paid the duty. A store that bought from an importer can't claim directly. A broker can receive the money only if the importer filed CBP Form 4811 beforehand.

**Before filing:** an active ACE portal account, and ACH refund enrollment (CBP isn't issuing paper checks for these refunds).

**The declaration:** a one-column CSV of 11-character entry numbers (up to 9,999 per file) whose lines carry IEEPA tariff codes 9903.01.xx or 9903.02.xx. It's validated twice: the file (format, importer and filer match), then each entry (IEEPA codes, phase timing). CAPE removes the IEEPA lines, recalculates duty and sends the entry for reliquidation. A declaration can't be edited or withdrawn after upload.

**Phases, by how "closed" an entry is:**

| Phase | Opened | Covers |
|---|---|---|
| 1 | 20 Apr 2026 | Entries not yet liquidated (customs hasn't finalized the duty), or liquidated within the last 80 days |
| 2 | 29 Jun 2026 | Reconciliation (type 09) entries and entries with antidumping or countervailing duties |
| 3 | 6 Oct 2026 (postponed from Aug 20) | Finally liquidated entries, only for importers whose own lawsuit at the Court of International Trade got a court order |

**The deadlines that decide whether an entry can still be refunded:**
- Up to 80 days after liquidation: file in CAPE.
- Up to 180 days after liquidation: file a protest to keep the entry open (19 U.S.C. § 1514).
- After that: a lawsuit at the Court of International Trade (28 U.S.C. § 1581(i)), within two years.

**Progress, as reported:**

| Date | Sent to the Treasury for payment | Source |
|---|---|---|
| 6 Mar 2026 | (starting point: about $166B collected from 330,000+ importers) | CBP, as reported |
| 10 Jul 2026 | $86.3B | CBP declaration, as reported |
| 21 Aug 2026 | $106.6B | CBP declaration, as reported |
| 11 Sep 2026 | about $122B (claims accepted: about $134.7B; 201,293 of 286,044 declarations passed validation) | CBP declaration of 15 Sep, as reported |
| 2 Oct 2026 | about $126B; about $1.1B waiting on missing ACH details | Cherry Bekaert, citing CBP |

**Still open:** the government appealed the Court of International Trade's order that refunds go to every importer, not only those who sued; a Federal Circuit ruling is expected. On 8 Oct 2026 the court certified a class in *Freestyle World v. CBP*.

Sources: [Brady Ware refund FAQ](https://bradyware.com/tariff-refund-faq/) · [Cherry Bekaert: CAPE Phase III open](https://www.cbh.com/insights/alerts/ieepa-tariff-refund-update-cape-phase-iii-open/) · [Tariff Refund Finder status page (cites CBP declarations)](https://tariffrefundfinder.com/guides/ieepa-tariff-refund-status) · [C.H. Robinson: CAPE Phase 3](https://www.chrobinson.com/en-us/resources/insights-and-advisories/client-advisories/2026q3/09-17-26-cbp-cape-phase-3-ieepa-refunds/)

## 4. Official legal texts

Every rule in `config/tariff_rules.json` lists its official source under `official`. The main ones:

| Action | Official text |
|---|---|
| Reciprocal tariffs (5 Apr 2025) | [Executive Order 14257](https://www.govinfo.gov/content/pkg/FR-2025-04-07/html/2025-06063.htm) |
| Electronics exclusion | [Presidential memorandum, 11 Apr 2025](https://www.govinfo.gov/content/pkg/DCPD-202500470/pdf/DCPD-202500470.pdf) |
| China 125% | [Executive Order 14266](https://www.federalregister.gov/documents/full_text/text/2025/04/14/2025-06378.txt) |
| China cut to 10% (Geneva) | [Executive Order 14298](https://www.govinfo.gov/content/pkg/FR-2025-05-21/html/2025-09297.htm) |
| Country rates from 7 Aug 2025 | [Executive Order 14326](https://www.govinfo.gov/content/pkg/FR-2025-08-06/html/2025-15010.htm) |
| Canada fentanyl tariff to 35% | [Executive Order 14325](https://www.govinfo.gov/content/pkg/FR-2025-08-06/html/2025-14999.htm) |
| India Russian-oil tariff: start / end | [CBP notice, 27 Aug 2025](https://www.federalregister.gov/documents/2025/08/27/2025-16419/notice-of-implementation-of-additional-duties-on-products-of-india-pursuant-to-the-presidents) / [Executive Order 14384, effective 7 Feb 2026](https://www.govinfo.gov/content/pkg/FR-2026-02-11/pdf/2026-02818.pdf) |
| China fentanyl tariff cut to 10% | [Executive Order 14357](https://www.govinfo.gov/content/pkg/FR-2025-11-07/html/2025-19825.htm) |
| Section 232 timber and furniture | [Proclamation 10976](https://www.govinfo.gov/content/pkg/DCPD-202501232/pdf/DCPD-202501232.pdf); increase postponed by [Proclamation 11000](https://www.federalregister.gov/documents/full_text/html/2026/01/09/2026-00327.html) |
| Supreme Court ruling | [Learning Resources, Inc. v. Trump, No. 24-1287](https://www.supremecourt.gov/opinions/25pdf/24-1287_4gcj.pdf) |
| Section 122 surcharge | [Proclamation, 91 FR, 25 Feb 2026](https://www.federalregister.gov/documents/2026/02/25/2026-03824/imposing-a-temporary-import-surcharge-to-address-fundamental-international-payments-problems) |
| Section 301 (2026) | [USTR findings, June 2026](https://ustr.gov/about/policy-offices/press-office/press-releases/2026/june/ustr-makes-findings-and-proposes-action-60-section-301-investigations-relating-failures-take-action); [notice of action](https://public-inspection.federalregister.gov/2026-15181.pdf) |

**Corrections made after reading the official texts:** India's Russian-oil tariff ended on 7 February 2026 (not 2 February), with an in-transit exemption until 16 September 2025 when it began. The announced cut of India's reciprocal rate to 18% was not implemented before the Supreme Court ruling.

**Still from secondary sources:** CBP's refund figures (reported from CBP court declarations) and the CAPE process details (CBP guidance as summarized by trade firms).

## 5. What the Census data can and can't tell us

- **Calculated duty** is the duty assessed when goods enter. It's an estimate of what is owed, not cash received, and it isn't reduced by later refunds. So 2025's numbers show the tariffs as charged, which is the point: the project measures what the tariffs cost importers at the time.
- **Imports for consumption** is the right base for a tariff rate (goods entering the US market). General imports also include goods going into bonded warehouses.
- **Country of origin** is where goods were made or last substantially transformed, not where they shipped from. If goods are routed through a third country without real processing, the origin should still be the first country; deliberate mislabeling ("transshipment") would not show in the data.
- **Charges** are freight and insurance to the US port, used in the simulator for the cost of getting goods to the US.
