/*
 * Refund route rules for IEEPA tariffs (business rules R1-R8 in docs/process-maps.md).
 * Used by the refund-route checker on the site and by tests/refund_rules.test.js.
 *
 * refundRoute({entryDate, entryType, liquidated, liquidationDate, courtOrder, achEnrolled, today})
 *   entryDate        "YYYY-MM-DD" date the goods entered the US
 *   entryType        "regular" | "reconciliation" (type 09) | "adcvd" (antidumping/countervailing duty)
 *   liquidated       true if CBP has liquidated (finalized) the entry
 *   liquidationDate  "YYYY-MM-DD", required when liquidated
 *   courtOrder       true if the importer has a Court of International Trade order to reliquidate
 *   achEnrolled      true if the importer is enrolled for ACH refunds
 *   today            "YYYY-MM-DD" (defaults to the current date)
 * Returns {route, phase, title, steps[], rule, warnings[]}
 *
 * General information about a published process, not legal advice.
 */
(function (root) {
  "use strict";

  var IEEPA_FIRST = "2025-02-04";  // first IEEPA ("fentanyl") tariffs
  var IEEPA_LAST = "2026-02-23";   // last day before collection stopped (24 Feb 2026)
  var CAPE_DAYS = 80;              // CAPE accepts entries liquidated within this many days (R2)
  var PROTEST_DAYS = 180;          // protest window under 19 U.S.C. 1514 (R4)

  function days(from, to) {
    var a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
    var b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
    return Math.round((b - a) / 86400000);
  }

  function isDate(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
  }

  function refundRoute(input) {
    var i = input || {};
    var today = i.today || new Date().toISOString().slice(0, 10);
    var warnings = [];

    if (!isDate(i.entryDate)) {
      return { route: "invalid", title: "Enter the date the goods entered the US.", steps: [], rule: "", warnings: [] };
    }
    if (i.entryDate > today) {
      return { route: "invalid", title: "The entry date is in the future.", steps: [], rule: "", warnings: [] };
    }
    if (i.entryDate < IEEPA_FIRST || i.entryDate > IEEPA_LAST) {
      return {
        route: "not_ieepa", title: "No IEEPA tariffs on this entry",
        steps: ["IEEPA tariffs applied to goods entered from 4 February 2025 to 23 February 2026. Duties outside that window (including Section 122, 232 and 301 tariffs) are not refunded through CAPE."],
        rule: "R8", warnings: []
      };
    }
    if (i.liquidated) {
      if (!isDate(i.liquidationDate)) {
        return { route: "invalid", title: "Enter the liquidation date.", steps: [], rule: "", warnings: [] };
      }
      if (i.liquidationDate < i.entryDate) {
        return { route: "invalid", title: "The liquidation date is before the entry date.", steps: [], rule: "", warnings: [] };
      }
      if (i.liquidationDate > today) {
        return { route: "invalid", title: "The liquidation date is in the future.", steps: [], rule: "", warnings: [] };
      }
    }
    if (!i.achEnrolled) {
      warnings.push("Enroll in ACH refunds in the ACE portal first: CBP is not issuing paper checks, and refunds without bank details are held (R7).");
    }

    var since = i.liquidated ? days(i.liquidationDate, today) : null;
    var special = i.entryType === "reconciliation" || i.entryType === "adcvd";

    if (!i.liquidated || since <= CAPE_DAYS) {
      var phase = special ? 2 : 1;
      var left = i.liquidated ? CAPE_DAYS - since : null;
      if (left !== null && left <= 14) {
        warnings.push("Only " + left + " day" + (left === 1 ? "" : "s") + " left before this entry passes the 80-day CAPE limit.");
      }
      return {
        route: "cape", phase: phase, title: "File in CAPE Phase " + phase,
        steps: [
          "Add the 11-character entry number to a one-column CSV (up to 9,999 entries per file).",
          "Upload it in the CAPE tab of the ACE portal as the importer of record (R1).",
          "CBP checks the file, removes the IEEPA tariff lines, recalculates duty and reliquidates the entry.",
          "Refund with interest by ACH, typically within 60–90 days of acceptance."
        ],
        rule: special ? "R3" : "R2", warnings: warnings
      };
    }
    if (since <= PROTEST_DAYS) {
      return {
        route: "protest", title: "File a protest to keep the entry open",
        steps: [
          "The entry is past the 80-day CAPE limit but still inside the 180-day protest window (" + (PROTEST_DAYS - since) + " days left).",
          "File a protest with CBP (19 U.S.C. § 1514) to keep the entry open.",
          "Then follow CBP guidance for protested entries."
        ],
        rule: "R4", warnings: warnings
      };
    }
    if (i.courtOrder) {
      return {
        route: "cape", phase: 3, title: "File in CAPE Phase 3",
        steps: [
          "Phase 3 covers finally liquidated entries that the Court of International Trade ordered reliquidated.",
          "Upload the entry numbers in CAPE as for Phases 1 and 2.",
          "Expect a manual review before payment."
        ],
        rule: "R5", warnings: warnings
      };
    }
    return {
      route: "court", title: "Only a court action applies",
      steps: [
        "The entry was liquidated more than 180 days ago, so CAPE and protests no longer apply.",
        "A refund needs an action at the Court of International Trade (28 U.S.C. § 1581(i)), within two years.",
        "A pending appeal and a class action (Freestyle World v. CBP) may change this; ask a customs lawyer."
      ],
      rule: "R5", warnings: warnings
    };
  }

  var api = { refundRoute: refundRoute, days: days, IEEPA_FIRST: IEEPA_FIRST, IEEPA_LAST: IEEPA_LAST };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RefundRules = api;
})(this);
