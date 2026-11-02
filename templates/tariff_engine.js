/*
 * Tariff rule engine: which additional US tariffs apply to a product, from a country, on a date.
 * Rules are data (config/tariff_rules.json); this file only applies them, so a new tariff is a new rule,
 * not a code change (requirement FR-2). Used by the tracker app, the validation script and the tests.
 *
 * TariffEngine.create(rulesDoc) -> engine
 *   engine.duty({date, hs10, country, usmca, baseRate, extraRules})
 *     date      "YYYY-MM-DD" entry date
 *     hs10      HTS 10-digit code (string)
 *     country   country of origin, e.g. "Vietnam"
 *     usmca     true if the goods qualify for USMCA (Mexico, Canada)
 *     baseRate  normal duty in % (MFN plus 2018-19 Section 301 on China)
 *     extraRules  optional what-if rules, same shape as the rules file
 *     loadDate  optional "YYYY-MM-DD" date the goods were loaded for shipment (for in-transit exemptions;
 *               defaults to the entry date, i.e. no exemption)
 *
 * Rule fields beyond the basics:
 *   top_up_to          the rule tops the total up to this % (e.g. EU "15% all-in": additional = max(0, 15 - normal duty))
 *   transit_until      goods loaded before the rule's start and entered on or before this date are exempt
 *   transit_extend_to  the rule keeps applying to goods loaded on or before its end date and entered up to this date
 *   -> {total, base, lines: [{id, program, rate}], exemptions: [text]}
 *   engine.monthAverage(args with month "YYYY-MM" instead of date) -> average total over the days of the month
 */
(function (root) {
  "use strict";

  function inRange(rule, date, load) {
    load = load || date;
    var active = date >= rule.from && (!rule.to || date <= rule.to);
    // in transit when the rule started: the old treatment continues until the cut-off
    if (active && rule.transit_until && load < rule.from && date <= rule.transit_until) return false;
    // in transit when the rule ended: it keeps applying until its own cut-off
    if (!active && rule.transit_extend_to && rule.to && date > rule.to && load <= rule.to && date <= rule.transit_extend_to)
      return !(rule.transit_until && load < rule.from);   // goods loaded before the rule began are still exempt from it
    return active;
  }
  function countryMatch(rule, country) {
    if (rule.not_countries && rule.not_countries.indexOf(country) >= 0) return false;
    return rule.countries.indexOf("*") >= 0 || rule.countries.indexOf(country) >= 0;
  }
  function hsMatch(prefixes, hs10) {
    if (!prefixes) return true;
    for (var i = 0; i < prefixes.length; i++) if (hs10.indexOf(prefixes[i]) === 0) return true;
    return false;
  }

  function create(doc) {
    var base = doc.rules.slice();
    var electronics = doc.electronics_hs || [];

    function duty(a) {
      var rules = a.extraRules ? base.concat(a.extraRules) : base;
      var isElectronics = hsMatch(electronics, a.hs10);
      // Is the product under an active Section 232 tariff on this date (from this country)?
      var s232 = rules.some(function (r) {
        return r.s232 && inRange(r, a.date, a.loadDate) && countryMatch(r, a.country) && hsMatch(r.hs, a.hs10);
      });
      var lines = [], exemptions = [];
      rules.forEach(function (r) {
        if (!inRange(r, a.date, a.loadDate) || !countryMatch(r, a.country) || !hsMatch(r.hs, a.hs10)) return;
        var ex = r.exempt || [];
        if (ex.indexOf("usmca") >= 0 && a.usmca) { exemptions.push(r.program + ": USMCA goods exempt"); return; }
        if (ex.indexOf("s232") >= 0 && s232 && !r.s232) { exemptions.push(r.program + ": goods under Section 232 exempt"); return; }
        if (ex.indexOf("electronics") >= 0 && isElectronics) { exemptions.push(r.program + ": electronics exclusion"); return; }
        var rate = r.top_up_to != null ? Math.max(0, r.top_up_to - (a.baseRate || 0)) : r.rate;
        if (rate > 0) lines.push({ id: r.id, program: r.program, rate: rate, whatIf: !!r.whatIf });
      });
      var add = lines.reduce(function (s, l) { return s + l.rate; }, 0);
      var b = a.baseRate || 0;
      return { total: Math.round((b + add) * 100) / 100, base: b, lines: lines, exemptions: exemptions };
    }

    // Average over the days of a month. transitDays = [min, max] samples shipping times, so goods entering
    // early in a month after a change can still be in transit under the old rules.
    function monthAverage(a) {
      var y = +a.month.slice(0, 4), m = +a.month.slice(5, 7);
      var n = new Date(Date.UTC(y, m, 0)).getUTCDate(), sum = 0, k = 0;
      var tr = a.transitDays || [0, 0];
      for (var d = 1; d <= n; d++) {
        var date = a.month + "-" + (d < 10 ? "0" + d : d);
        for (var t = tr[0]; t <= tr[1]; t += 7) {
          var load = new Date(Date.UTC(y, m - 1, d - t)).toISOString().slice(0, 10);
          sum += duty(Object.assign({}, a, { date: date, loadDate: load })).total; k++;
        }
      }
      return sum / k;
    }

    return { duty: duty, monthAverage: monthAverage, rules: base };
  }

  var api = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TariffEngine = api;
})(this);
