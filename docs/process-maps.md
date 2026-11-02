# Process maps

> Two processes a business analyst at an importing company would need to understand: what happens inside the company when a tariff changes, and how the company gets struck-down tariffs back. Both are drawn from the rules in the [research notes](research-notes.md). They describe a typical mid-sized importer that uses a customs broker; a real company's roles would be confirmed in stakeholder interviews.

## 1. When a tariff changes: how an importer responds

**Why it matters:** in 2025–26 tariff rates changed more than a dozen times (see the [timeline](../data/reference/timeline.json)). Each change hit goods already on the water, prices already quoted to customers and suppliers already contracted. The data shows the result: importers moved sourcing away from China within months.

```mermaid
flowchart TD
    subgraph TC["Trade compliance"]
        A([Tariff change announced:<br/>Federal Register, CBP CSMS message]) --> B[Identify affected HTS codes<br/>and countries of origin]
        B --> C[Match to our product list:<br/>which SKUs, which suppliers]
        C --> D{In transit before<br/>effective date?}
        D -- Yes --> E[Check in-transit exemption<br/>and entry deadline]
        D -- No --> F[New duty applies at entry]
    end
    subgraph FIN["Finance"]
        F --> G[Recalculate landed cost<br/>per SKU]
        E --> G
        G --> H{Margin still<br/>acceptable?}
    end
    subgraph PROC["Procurement and sales"]
        H -- Yes --> I[Keep supplier;<br/>update price list if needed]
        H -- No --> J[Compare other countries:<br/>landed cost, lead time, capacity]
        J --> K{Switch worth it after<br/>qualification cost and risk?}
        K -- Yes --> L[Qualify new supplier;<br/>check country of origin rules]
        K -- No --> M[Raise prices, absorb cost,<br/>or negotiate with supplier]
    end
    subgraph BRK["Customs broker"]
        I --> N[File entries with the new<br/>Chapter 99 tariff codes]
        L --> N
        M --> N
        N --> O([Duty paid at entry;<br/>keep records for refunds])
    end
```

**Pain points a requirements effort would target:**

| # | Pain point | Effect | Requirement it leads to |
|---|---|---|---|
| P1 | Changes announced days before they take effect | No time to recalculate thousands of SKUs by hand | Automatic landed-cost recalculation when a rate changes |
| P2 | Product lists don't store HTS code and country of origin together | Can't tell which SKUs a change hits | One product master with HTS code, origin and supplier |
| P3 | Several tariffs stack on one product (Section 232, 301, IEEPA) | Duty is underestimated | Rules that apply each program and its exclusions in order |
| P4 | Supplier switches take months (qualification, tooling, origin checks) | Decisions based on today's rate may be wrong by the time they land | Show the rate history and pending changes next to the cost |

## 2. Getting struck-down tariffs back: the CAPE refund process

**Why it matters:** about $166 billion of IEEPA tariffs were collected; about $126 billion had been sent for payment by 2 October 2026. Whether an entry can still be refunded depends on dates, so missing a deadline can forfeit money.

```mermaid
flowchart TD
    A([Supreme Court ruling,<br/>20 Feb 2026]) --> B[Pull entry list from ACE:<br/>ES-003 / ES-022 reports]
    B --> C[Keep entries with IEEPA lines<br/>9903.01.xx or 9903.02.xx]
    C --> P{ACE account and<br/>ACH refund enrollment?}
    P -- No --> P1[Set up ACE access and<br/>ACH refunds first]
    P1 --> D
    P -- Yes --> D{Entry status?}
    D -- "Not liquidated, or liquidated<br/>80 days ago or less" --> E[CAPE Phase 1]
    D -- "Reconciliation or<br/>AD/CVD entry" --> F[CAPE Phase 2]
    D -- "Liquidated 81–180<br/>days ago" --> G[File a protest to keep<br/>the entry open]
    D -- "Liquidated more than<br/>180 days ago" --> H[Lawsuit at the Court of<br/>International Trade]
    H --> I{Court orders<br/>reliquidation?}
    I -- Yes --> J[CAPE Phase 3]
    I -- No --> X([Refund depends on<br/>pending appeal])
    G --> X2([Follow CBP guidance<br/>for protested entries])
    E --> K[Upload CSV of entry numbers<br/>max 9,999 per file]
    F --> K
    J --> K
    K --> L{File-level and<br/>entry-level checks pass?}
    L -- No --> M[Fix rejected entries<br/>and resubmit]
    M --> K
    L -- Yes --> N[CBP removes IEEPA lines,<br/>recalculates duty, reliquidates]
    N --> O([Refund with interest by ACH,<br/>typically 60–90 days])
```

**Business rules the map depends on** (used by the refund-route checker on the site and its tests):

| Rule | Statement | Source |
|---|---|---|
| R1 | Only the importer of record can file; a broker gets paid only with a Form 4811 on file before the claim | Brady Ware FAQ |
| R2 | An entry qualifies for Phase 1 if it is unliquidated or was liquidated 80 days ago or less | Brady Ware FAQ |
| R3 | Reconciliation (type 09) and AD/CVD entries go through Phase 2 | Brady Ware FAQ |
| R4 | 81–180 days after liquidation, a protest keeps the entry open | 19 U.S.C. § 1514 |
| R5 | More than 180 days after liquidation, only a court action applies; Phase 3 needs a court order | 28 U.S.C. § 1581(i); CBP, as reported |
| R6 | A declaration can't be edited or withdrawn after upload | Brady Ware FAQ |
| R7 | No paper checks: refunds need ACH enrollment | Brady Ware FAQ |
| R8 | Section 122, 232 and 301 duties are not refunded through CAPE | Brady Ware FAQ |
