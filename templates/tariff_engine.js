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
 *   -> {total, base, lines: [{id, program, rate}], exemptions: [text]}
 *   engine.monthAverage(args with month "YYYY-MM" instead of date) -> average total over the days of the month
 */
(function (root) {
  "use strict";

  function inRange(rule, date) {
    return date >= rule.from && (!rule.to || date <= rule.to);
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
        return r.s232 && inRange(r, a.date) && countryMatch(r, a.country) && hsMatch(r.hs, a.hs10);
      });
      var lines = [], exemptions = [];
      rules.forEach(function (r) {
        if (!inRange(r, a.date) || !countryMatch(r, a.country) || !hsMatch(r.hs, a.hs10)) return;
        var ex = r.exempt || [];
        if (ex.indexOf("usmca") >= 0 && a.usmca) { exemptions.push(r.program + ": USMCA goods exempt"); return; }
        if (ex.indexOf("s232") >= 0 && s232 && !r.s232) { exemptions.push(r.program + ": goods under Section 232 exempt"); return; }
        if (ex.indexOf("electronics") >= 0 && isElectronics) { exemptions.push(r.program + ": electronics exclusion"); return; }
        lines.push({ id: r.id, program: r.program, rate: r.rate, whatIf: !!r.whatIf });
      });
      var add = lines.reduce(function (s, l) { return s + l.rate; }, 0);
      var b = a.baseRate || 0;
      return { total: Math.round((b + add) * 100) / 100, base: b, lines: lines, exemptions: exemptions };
    }

    function monthAverage(a) {
      var y = +a.month.slice(0, 4), m = +a.month.slice(5, 7);
      var n = new Date(Date.UTC(y, m, 0)).getUTCDate(), sum = 0;
      for (var d = 1; d <= n; d++) {
        var date = a.month + "-" + (d < 10 ? "0" + d : d);
        sum += duty(Object.assign({}, a, { date: date })).total;
      }
      return sum / n;
    }

    return { duty: duty, monthAverage: monthAverage, rules: base };
  }

  var api = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TariffEngine = api;
})(this);
