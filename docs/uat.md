# UAT scripts: Tariff Desk tracker

> User acceptance tests for the tracker prototype, one or more per functional requirement in the [BRD (Part B of the requirements)](requirements.md#part-b-tariff-exposure-and-refund-tracker-business-requirements). Each script lists the actions and the expected results separately, so a tester can run it by hand. The same scripts are automated in [`tests/uat_tracker.js`](../tests/uat_tracker.js); the latest run is in [uat-results.md](uat-results.md).
>
> **Test data:** the sample company in `data/sample/company.json` (41 SKUs, 185 entries), tariff rules in `config/tariff_rules.json`, as-of date 2 November 2026. Expected values are calculated from that data, independently of the page.

## Preconditions
- Open the tracker (`site/tracker.html` or the published page) in a desktop browser at least 1280 px wide.
- Start with a cleared audit log (browser storage cleared).

---

### UAT-01 · FR-1 · Every SKU is listed with its HTS code and country of origin
**Actions**
1. Open **Products**.
2. Count the rows.
3. For each SKU, compare the HTS code and origin with the product master.

**Expected results**
- There are 41 rows, one per SKU.
- Each row's HTS code (shown as 0000.00.0000) and origin match the product master.

### UAT-02 · FR-3 · Duty rate per SKU matches the rules, and the breakdown adds up
**Actions**
1. Open **Products** and read the "Duty rate now" column.
2. Open the China-made linen accent chair.
3. Read the duty breakdown.

**Expected results**
- Every SKU's rate equals normal duty plus the rules in force on the as-of date (within 0.05 points).
- The breakdown lines (normal duty, Section 232 furniture, …) add up to the total shown.

### UAT-03 · FR-4 · A what-if tariff recalculates every affected SKU
**Actions**
1. Open **Tariff rules**.
2. Enter: country Vietnam, HTS prefix blank, rate 15%, start 1 Dec 2026, Section 232 goods exempt = Yes.
3. Select **Run what-if**.
4. Select **See affected SKUs**.

**Expected results**
- "SKUs affected" equals the number of Vietnam SKUs whose rate changes under the rule.
- Vietnam chairs and sofas (under Section 232) are not affected.
- The product list, filtered to "Hit by what-if", shows the same number of SKUs, each with the rate increase marked.

### UAT-04 · FR-4 · Clearing the what-if restores today's costs
**Actions**
1. On **Tariff rules**, select **Clear**.
2. Open **Products**.

**Expected results**
- No SKU shows a what-if increase.

### UAT-05 · FR-4 · Invalid what-if input is rejected
**Actions**
1. Enter rate 0 and select **Run what-if**.
2. Enter rate 10 and HTS prefix "61ab", then select **Run what-if**.

**Expected results**
- Step 1 shows a message asking for a valid rate, and nothing is recalculated.
- Step 2 shows a message that the HTS code must be 2–10 digits.

### UAT-06 · FR-5 · Every entry is listed
**Actions**
1. Open **Shipments & refunds** with the filter on **All**.

**Expected results**
- All 185 entries are listed, each with entry date, origin, goods value and liquidation status.

### UAT-07 · FR-6 · Each entry's refund route follows rules R1–R8
**Actions**
1. Open **Shipments & refunds**.
2. For each entry without a filed claim, read the refund status.

**Expected results**
- The status matches the refund rules for the entry's dates and type on the as-of date: "To file · Phase 1/2", "Protest needed", "Court action only", or "No IEEPA duty".
- An entry dated inside the IEEPA period whose goods were all exempt (for example, monitors under the electronics exclusion) shows "No IEEPA duty".

### UAT-08 · FR-7 · Deadline alerts
**Actions**
1. Open **Overview** and read "Deadlines in the next 30 days".
2. Read the number on the **Shipments & refunds** menu item.

**Expected results**
- Only entries 30 days or fewer from a deadline are listed, sorted most urgent first.
- The menu number counts the entries 14 days or fewer from a deadline.

### UAT-09 · FR-9 · Filed claims show their status
**Actions**
1. On **Shipments & refunds**, find each entry with a CAPE declaration.
2. Open the entry whose claim was rejected.

**Expected results**
- Paid claims show "Refund paid", accepted claims show "Filed · accepted", and rejected claims show "Rejected · fix and refile".
- The rejected entry's detail shows the rejection reason.

### UAT-10 · FR-8 · CAPE upload file
**Actions**
1. Filter **To file**.
2. Select three entries.
3. Select **Download CAPE file**.

**Expected results**
- A CSV file named `CAPE_phase<phase>_<date>.csv` downloads.
- It has one column and three lines: exactly the selected entry numbers, each 11 characters, with no header.

### UAT-11 · FR-10 · Compare a SKU across countries
**Actions**
1. Open any SKU.
2. Read "Same product from other countries".

**Expected results**
- At least two countries are listed, cheapest first by cost to land $100 of goods.

### UAT-12 · FR-11 · Rate history
**Actions**
1. Open any SKU.

**Expected results**
- A chart shows the SKU's duty rate from January 2025 to the as-of date.

### UAT-13 · FR-2 · Rules are data with sources
**Actions**
1. Open **Tariff rules** and read the rules table.

**Expected results**
- Every rule in `config/tariff_rules.json` is listed, with its dates and a source link.

### UAT-14 · FR-12 · Audit log
**Actions**
1. After UAT-03, UAT-04 and UAT-10, open **Audit log**.

**Expected results**
- The log has entries for the what-if run (with its parameters and impact), for clearing it, and for the CAPE file (number of entries and duty).

### UAT-15 · NFR · Works on a phone, no errors
**Actions**
1. Open each view at 390 px wide.

**Expected results**
- No view scrolls sideways (tables scroll inside their frame).
- No script errors occur.

---

## Defects found during UAT

| # | Found by | Defect | Fix |
|---|---|---|---|
| DF-1 | Rule validation | Goods loaded before a tariff started were charged the new rate (no in-transit exemption) | Added in-transit dates to the rules and the engine (D18) |
| DF-2 | Rule validation | EU, Japan, Switzerland "15% all-in" and the July 2026 caps were missing; Brazil's 40% was missing | Added "top-up" rules and country rules (D19) |
| DF-3 | Engine test | Goods loaded before 5 Apr 2025 still got 10% while in transit | Engine fix: in-transit goods are exempt from the whole rule |
| DF-4 | UAT-07/09 | Sample data had refund claims on entries with no IEEPA duty (exempt electronics) | Claims are only generated for entries with IEEPA lines (D22) |
| DF-5 | Screenshot review | Opening a view by link didn't switch views after the page had loaded | Listen for link changes (hashchange) |
| DF-6 | Accessibility scan | Five text colors below 4.5:1 contrast; a scrolling region not reachable by keyboard | Darker colors; region made focusable |
