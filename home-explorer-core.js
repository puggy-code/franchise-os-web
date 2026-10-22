/* Home explorer core (Jack, 2026-10-22): the pure math behind "describe your home, see what two cleaners can do in the time you have".
   Works in the browser (window.HomeExplorer) and in Node (module.exports) so the same numbers are unit tested. Person-minutes follow the Four Hour Home Detailing benchmark in the booking widget:
   kitchen 40, full bathroom 30, half bath 15, bedroom or side room 25 (two technicians finish the standard checklist of an average home in two hours). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.HomeExplorer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var ROOMS = [
    { key: 'kitchen', label: 'Kitchen', min: 40, max: 1, start: 1, match: /kitchen/i, priority: 1 },
    { key: 'bath', label: 'Bathrooms', min: 30, max: 6, start: 1, match: /bath/i, priority: 2, plural: 'bathrooms' },
    { key: 'half', label: 'Half bath', min: 15, max: 3, start: 0, match: /half|powder/i, priority: 3 },
    { key: 'bed', label: 'Bedrooms', min: 25, max: 6, start: 2, match: /bedroom|primary|guest|kid/i, priority: 4 },
    { key: 'living', label: 'Living room', min: 25, max: 3, start: 1, match: /living|family|great room|den/i, priority: 5 },
    { key: 'entry', label: 'Entry and hall', min: 10, max: 2, start: 1, match: /entry|hall|foyer|mud/i, priority: 6 },
    { key: 'dining', label: 'Dining room', min: 15, max: 2, start: 0, match: /dining/i, priority: 7 },
    { key: 'laundry', label: 'Laundry room', min: 15, max: 2, start: 0, match: /laundry/i, priority: 8 },
    { key: 'office', label: 'Home office', min: 20, max: 3, start: 0, match: /office|study/i, priority: 9 },
    { key: 'stairs', label: 'Stairs', min: 10, max: 3, start: 0, match: /stair/i, priority: 10 },
    { key: 'basement', label: 'Basement', min: 35, max: 2, start: 0, match: /basement|lower level/i, priority: 11 },
  ];
  var LEVELS = [
    { key: 'basic', name: 'Basic', tag: 'Every room, done in detail', factor: 1.0 },
    { key: 'extra', name: 'Extra', tag: 'Basic plus extra detail in a few rooms', factor: 1.25 },
    { key: 'deluxe', name: 'Deluxe', tag: 'Extra plus detail in every room', factor: 1.5 },
  ];
  var CREW = 2;
  var DETAILING_FACTOR_LIMIT_HOURS = 3.5; // past this the Four Hour Home Detailing is the right product

  function conditionFactor(last, pets) {
    var f = last === 'never' || last === 'over6' ? 1.35 : last === '1to6' ? 1.15 : 1.0;
    return pets ? f * 1.08 : f;
  }
  function quarter(h) { return Math.ceil(h * 4) / 4; }

  /** counts: { kitchen:1, bath:2, ... }. opts: { last: 'never'|'over6'|'1to6'|'recent', pets: bool, kids: bool, isNew: bool }. */
  function compute(counts, opts) {
    opts = opts || {};
    var cond = conditionFactor(opts.last || '1to6', !!opts.pets);
    var lines = [];
    ROOMS.forEach(function (r) {
      var n = Math.max(0, Math.min(r.max, Math.round(Number(counts && counts[r.key]) || 0)));
      if (n > 0) lines.push({ key: r.key, label: r.label, count: n, base: n * r.min, priority: r.priority });
    });
    var basePerson = lines.reduce(function (a, l) { return a + l.base; }, 0);
    var levels = LEVELS.map(function (L) {
      var person = basePerson * L.factor * cond;
      return { key: L.key, name: L.name, tag: L.tag, factor: L.factor, person_minutes: Math.round(person), clock_hours: quarter(person / CREW / 60) };
    });
    var rec;
    var reason;
    var bigHome = levels[0].clock_hours > DETAILING_FACTOR_LIMIT_HOURS || levels[1].clock_hours > 4.5;
    if (opts.isNew) {
      rec = 'basic';
      reason = 'Your first clean is always Basic: the team learns your home. Extra and Deluxe open after your first visit.';
    } else if (opts.last === 'never' || opts.last === 'over6' || (opts.pets && opts.kids)) {
      rec = 'deluxe'; reason = 'It has been a while or the home works hard (pets and kids), so detail in every room will make the difference.';
    } else if (opts.last === '1to6') {
      rec = 'extra'; reason = 'A professional clean in the last few months means Extra detail in a few rooms keeps it fresh.';
    } else { rec = 'basic'; reason = 'A recent clean means Basic keeps everything on track.'; }
    var recLevel = levels.filter(function (l) { return l.key === rec; })[0];
    var detailing = bigHome || (recLevel && recLevel.clock_hours > 4);
    return { lines: lines, levels: levels, recommended: rec, reason: reason, detailing: !!detailing, detailing_note: detailing ? 'A home this size, or this much detail, is better served by the Four Hour Home Detailing: two cleaners for four hours.' : null, condition_factor: cond };
  }

  /** What fits in `hours` for two cleaners at a level. Greedy by room priority; a room that does not fit whole is reported as needing more time. */
  function fit(result, levelKey, hours) {
    var L = result.levels.filter(function (l) { return l.key === levelKey; })[0] || result.levels[0];
    var scale = L.factor * result.condition_factor;
    var budget = hours * 60 * CREW;
    var done = [], later = [];
    result.lines.slice().sort(function (a, b) { return a.priority - b.priority; }).forEach(function (l) {
      var need = l.base * scale;
      if (need <= budget) { budget -= need; done.push(l); } else later.push(l);
    });
    return { done: done, later: later, hours: hours, level: L.key, left_minutes: Math.round(budget) };
  }

  return { ROOMS: ROOMS, LEVELS: LEVELS, compute: compute, fit: fit };
});
