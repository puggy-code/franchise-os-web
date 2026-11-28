/* Back office dashboard for Channel Control (Jack 2026-11-26: "add these functions to the manager / owner dashboard with the unified
   marketing dashboard", then "full beautiful dashboard like Datarails"). Read only: nothing here moves money, files, sends or charges.

   Owner (bank data is owner-only by RLS): business cash hero, revenue / spend / net cash flow / owed tiles with 12-week sparklines,
   weekly revenue vs spend (line, crosshair), spend by category (bars), weekly set-asides (stacked columns: Tax / Profit / Owner pay /
   Operating; from cfo_buckets() once 2450 is on, an estimate with the same rules until then). Everyone (owner + managers): taxes due,
   today's exceptions, who owes us, commercial and PM, each linking to its full page.
   Chart method: dataviz skill. Categorical slots 1-4 (#2a78d6 blue, #eb6834 orange, #1baf7a aqua, #eda100 yellow) validated light-mode
   (CVD worst adjacent 9.1, normal-vision 22.9); aqua and yellow sit under 3:1 on the surface, so every chart has a legend and a table
   view. 2px lines, <=24px bars with 4px rounded data ends, 2px surface gaps, hairline solid grid, values in ink never in series color. */
(function () {
  var C = { s1: "#2a78d6", s2: "#eb6834", s3: "#1baf7a", s4: "#eda100", ink: "#0b0b0b", ink2: "#52514e", ink3: "#8a8984", grid: "#e9e8e4",
            surf: "#fcfcfb", spark: "#c3c2b7", good: "#006300", bad: "#b42c2c" };
  // Mirrors 2450's seed rules for the estimate shown before the set-aside engine is on.
  var RULES = { salesTaxShare: 0.067725 / 1.067725, incomeTax: 0.0616, profit: 0.05, ownerPay: 0.5 };
  var REVENUE = { customer_payment: 1, stripe_payout: 1 };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(c) { return c == null ? "–" : (c < 0 ? "−" : "") + "$" + (Math.abs(Math.round(c)) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function compact(c) {
    var d = Math.abs(c) / 100, s = c < 0 ? "−" : "";
    if (d >= 1e6) return s + "$" + (d / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (d >= 1e4) return s + "$" + (d / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return s + "$" + Math.round(d).toLocaleString("en-US");
  }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function monday(dateStr) { var d = new Date(dateStr + "T12:00:00Z"); var k = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - k); return iso(d); }
  function addDays(s, n) { var d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function shortDate(s) { return new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }); }
  function niceStep(max) { var raw = max / 4; if (raw <= 0) return 25; var p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  function nice(max) { if (max <= 0) return 100; var p = Math.pow(10, Math.floor(Math.log10(max))), m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }
  function pretty(cat) { return String(cat || "uncategorized").replace(/_/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }); }
  function notYet(e) { return /does not exist|Could not find the function|schema cache/i.test(String(e && e.message || e)); }
  function el(tag, attrs, kids) { var n = document.createElementNS("http://www.w3.org/2000/svg", tag); for (var k in attrs) n.setAttribute(k, attrs[k]); (kids || []).forEach(function (c) { n.appendChild(c); }); return n; }
  function txt(x, y, s, attrs) { var t = el("text", Object.assign({ x: x, y: y, fill: C.ink2, "font-size": 11 }, attrs || {})); t.textContent = s; return t; }

  function css() {
    if (document.getElementById("bo-css")) return;
    var st = document.createElement("style"); st.id = "bo-css";
    st.textContent = [
      ".bo{position:relative;color:" + C.ink + ";font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}",
      ".bo-sub{color:" + C.ink2 + ";font-size:14px;margin:0 0 14px}",
      ".bo-tiles{display:grid;grid-template-columns:1.4fr repeat(4,1fr);gap:12px;margin-bottom:12px}",
      "@media(max-width:900px){.bo-tiles{grid-template-columns:1fr 1fr}}",
      ".bo-tile,.bo-panel{background:" + C.surf + ";border:1px solid #e6e5e0;border-radius:14px;padding:16px 18px}",
      ".bo-label{font-size:13px;color:" + C.ink2 + "}",
      ".bo-hero{font-size:48px;font-weight:600;letter-spacing:-.5px;line-height:1.1;margin-top:6px}",
      ".bo-val{font-size:26px;font-weight:600;margin-top:6px;line-height:1.15}",
      ".bo-delta{font-size:12px;margin-top:4px}",
      ".bo-grid2{display:grid;grid-template-columns:1.5fr 1fr;gap:12px;margin-bottom:12px}",
      ".bo-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}",
      "@media(max-width:900px){.bo-grid2,.bo-grid3{grid-template-columns:1fr}}",
      ".bo-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}",
      ".bo-head b{font-size:15px}.bo-head a{font-size:13px;color:#0A47A8}",
      ".bo-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:" + C.ink2 + ";margin:2px 0 6px}",
      ".bo-legend i{display:inline-block;vertical-align:middle;margin-right:5px}",
      ".bo-tip{position:absolute;pointer-events:none;background:#fff;border:1px solid #dcdbd6;border-radius:8px;padding:8px 10px;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.08);z-index:5;min-width:140px}",
      ".bo-tip .v{font-weight:600;color:" + C.ink + "} .bo-tip .k{color:" + C.ink2 + "} .bo-tip .row{display:flex;align-items:center;gap:6px;margin-top:3px}",
      ".bo-tip .key{display:inline-block;width:12px;height:2px;border-radius:1px}",
      ".bo details{margin-top:8px} .bo summary{cursor:pointer;color:#0A47A8;font-size:12px}",
      ".bo table.bo-t{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;font-variant-numeric:tabular-nums} .bo-t td,.bo-t th{padding:4px 6px;border-bottom:1px solid #eeede9;text-align:right} .bo-t td:first-child,.bo-t th:first-child{text-align:left} .bo-t th{color:" + C.ink2 + ";font-weight:600}",
      ".bo-line{margin-top:7px;font-size:14px;line-height:1.35} .bo-muted{color:" + C.ink2 + ";font-size:13px;margin-top:7px}",
      ".bo-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:999px;border:1px solid #dcdbd6;color:" + C.ink2 + ";margin-left:6px}",
      ".bo-note{font-size:12px;color:" + C.ink2 + ";margin-top:4px}"
    ].join("\n");
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------- data
  function demoData() {
    var today = iso(new Date()), tx = [], seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 120; i++) {
      var d = addDays(today, -i);
      if (rnd() < 0.55) tx.push({ posted_date: d, amount_cents: Math.round(18000 + rnd() * 26000), category: rnd() < 0.6 ? "stripe_payout" : "customer_payment", counts_in_pnl: true });
      if (rnd() < 0.5) {
        var cats = ["payroll", "supplies", "marketing", "vehicle", "software", "insurance", "professional_fees"];
        var c = cats[Math.floor(rnd() * cats.length)];
        tx.push({ posted_date: d, amount_cents: -Math.round((c === "payroll" ? 30000 : 4000) + rnd() * (c === "payroll" ? 30000 : 9000)), category: c, counts_in_pnl: true });
      }
    }
    return { tx: tx, cash: 954800, today: today };
  }

  function loadBank(ctx) {
    if (ctx.demo) return Promise.resolve(demoData());
    if (!ctx.canEdit) return Promise.resolve(null);   // bank data is owner-only (RLS)
    var since = addDays(iso(new Date()), -130);
    return Promise.all([
      ctx.sb.from("bank_transactions").select("posted_date, amount_cents, category, counts_in_pnl, pending").gte("posted_date", since).limit(5000),
      ctx.sb.from("bank_accounts").select("current_balance_cents, is_business, included_in_cash")
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      var cash = (r[1].data || []).filter(function (a) { return a.is_business && a.included_in_cash; }).reduce(function (s, a) { return s + (a.current_balance_cents || 0); }, 0);
      return { tx: (r[0].data || []).filter(function (t) { return !t.pending; }), cash: r[1].error ? null : cash, today: iso(new Date()) };
    });
  }

  function weekly(bank, nWeeks) {
    var thisWeek = addDays(monday(bank.today), -7), weeks = [];   // completed weeks only (the current one is still filling)
    for (var i = nWeeks - 1; i >= 0; i--) weeks.push({ w: addDays(thisWeek, -7 * i), rev: 0, spend: 0, setTax: 0, setProfit: 0, setOwner: 0, setOps: 0 });
    var byW = {}; weeks.forEach(function (x) { byW[x.w] = x; });
    bank.tx.forEach(function (t) {
      var x = byW[monday(t.posted_date)]; if (!x) return;
      if (t.amount_cents > 0 && REVENUE[t.category]) {
        x.rev += t.amount_cents;
        var st = Math.round(t.amount_cents * RULES.salesTaxShare), real = t.amount_cents - st;
        var it = Math.round(real * RULES.incomeTax), pr = Math.round(real * RULES.profit), op = Math.round(real * RULES.ownerPay);
        x.setTax += st + it; x.setProfit += pr; x.setOwner += op; x.setOps += real - it - pr - op;
      } else if (t.amount_cents < 0 && t.counts_in_pnl !== false && !/^(transfer|credit_card_payment|loan_payment)$/.test(t.category || "")) {
        x.spend += -t.amount_cents;
      }
    });
    return weeks;
  }

  function byCategory(bank, days) {
    var since = addDays(bank.today, -days), m = {};
    bank.tx.forEach(function (t) {
      if (t.posted_date < since || t.amount_cents >= 0 || t.counts_in_pnl === false || /^(transfer|credit_card_payment|loan_payment)$/.test(t.category || "")) return;
      var k = pretty(t.category); m[k] = (m[k] || 0) - t.amount_cents;
    });
    var rows = Object.keys(m).map(function (k) { return { k: k, v: m[k] }; }).sort(function (a, b) { return b.v - a.v; });
    if (rows.length > 7) { var rest = rows.slice(6).reduce(function (s, r) { return s + r.v; }, 0); rows = rows.slice(0, 6).concat([{ k: "Other", v: rest }]); }
    return rows;
  }

  // ---------------------------------------------------------------- tooltip
  function tipOn(root, evt, rows, title) {
    var tip = root.querySelector(".bo-tip");
    tip.textContent = "";
    var h = document.createElement("div"); h.className = "k"; h.textContent = title; tip.appendChild(h);
    rows.forEach(function (r) {
      var row = document.createElement("div"); row.className = "row";
      var key = document.createElement("span"); key.className = "key"; key.style.background = r.color; row.appendChild(key);
      var v = document.createElement("span"); v.className = "v"; v.textContent = r.value; row.appendChild(v);
      var k = document.createElement("span"); k.className = "k"; k.textContent = r.label; row.appendChild(k);
      tip.appendChild(row);
    });
    tip.hidden = false;
    var box = root.getBoundingClientRect(), x = evt.clientX - box.left + 14, y = evt.clientY - box.top + 14;
    if (x + 180 > box.width) x = evt.clientX - box.left - 190;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function tipOff(root) { var t = root.querySelector(".bo-tip"); if (t) t.hidden = true; }

  // ---------------------------------------------------------------- charts
  function sparkline(values, w, h) {
    var max = Math.max.apply(null, values.concat([1])), min = Math.min.apply(null, values.concat([0]));
    var pts = values.map(function (v, i) { return [2 + i * (w - 4) / Math.max(1, values.length - 1), h - 3 - (v - min) / Math.max(1, max - min) * (h - 6)]; });
    var svg = el("svg", { width: w, height: h, viewBox: "0 0 " + w + " " + h, "aria-hidden": "true" });
    svg.appendChild(el("polyline", { points: pts.map(function (p) { return p.join(","); }).join(" "), fill: "none", stroke: C.spark, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    var last = pts[pts.length - 1];
    svg.appendChild(el("circle", { cx: last[0], cy: last[1], r: 4, fill: C.s1, stroke: C.surf, "stroke-width": 2 }));
    return svg;
  }

  function lineChart(root, host, weeks, series) {
    var W = Math.max(320, host.clientWidth || 600), H = 230, L = 52, R = 70, T = 12, B = 26;
    var max = 4 * niceStep(Math.max.apply(null, weeks.map(function (w) { return Math.max.apply(null, series.map(function (s) { return w[s.key]; })); }).concat([1])));
    var x = function (i) { return L + i * (W - L - R) / Math.max(1, weeks.length - 1); };
    var y = function (v) { return T + (1 - v / max) * (H - T - B); };
    var svg = el("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Weekly revenue and spend, last " + weeks.length + " weeks" });
    for (var g = 0; g <= 4; g++) {
      var v = max * g / 4;
      svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: C.grid, "stroke-width": 1 }));
      svg.appendChild(txt(L - 8, y(v) + 4, compact(v), { "text-anchor": "end", "font-variant-numeric": "tabular-nums" }));
    }
    weeks.forEach(function (w, i) { if (i % 2 === (weeks.length - 1) % 2) svg.appendChild(txt(x(i), H - 8, shortDate(w.w), { "text-anchor": "middle" })); });
    series.forEach(function (s) {
      var pts = weeks.map(function (w, i) { return x(i) + "," + y(w[s.key]); }).join(" ");
      if (s.area) svg.appendChild(el("polygon", { points: x(0) + "," + y(0) + " " + pts + " " + x(weeks.length - 1) + "," + y(0), fill: s.color, opacity: 0.1 }));
      svg.appendChild(el("polyline", { points: pts, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      var lv = weeks[weeks.length - 1][s.key];
      svg.appendChild(el("circle", { cx: x(weeks.length - 1), cy: y(lv), r: 4, fill: s.color, stroke: C.surf, "stroke-width": 2 }));
    });
    // end labels (values in ink), nudged apart only if they would overlap
    var ends = series.map(function (s) { return { s: s, y: y(weeks[weeks.length - 1][s.key]) }; }).sort(function (a, b) { return a.y - b.y; });
    for (var k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
    ends.forEach(function (e) { svg.appendChild(txt(W - R + 8, e.y + 4, compact(weeks[weeks.length - 1][e.s.key]), { fill: C.ink, "font-weight": 600 })); });
    var cross = el("line", { y1: T, y2: H - B, stroke: C.ink3, "stroke-width": 1, visibility: "hidden" });
    svg.appendChild(cross);
    var hit = el("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent", tabindex: 0 });
    function at(i, evt) {
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
      tipOn(root, evt, series.map(function (s) { return { color: s.color, value: money(weeks[i][s.key]), label: s.label }; }), "Week of " + shortDate(weeks[i].w));
    }
    hit.addEventListener("pointermove", function (evt) {
      var b = svg.getBoundingClientRect(), px = (evt.clientX - b.left) * W / b.width;
      at(Math.max(0, Math.min(weeks.length - 1, Math.round((px - L) / ((W - L - R) / Math.max(1, weeks.length - 1))))), evt);
    });
    hit.addEventListener("pointerleave", function () { cross.setAttribute("visibility", "hidden"); tipOff(root); });
    svg.appendChild(hit);
    host.appendChild(svg);
  }

  function barsH(root, host, rows, color) {
    var W = Math.max(300, host.clientWidth || 360), rowH = 30, L = 118, R = 64, H = rows.length * rowH + 6;
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1]));
    var svg = el("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Spend by category" });
    svg.appendChild(el("line", { x1: L, x2: L, y1: 0, y2: H, stroke: C.grid, "stroke-width": 1 }));
    rows.forEach(function (r, i) {
      var cy = i * rowH + rowH / 2 + 3, w = Math.max(2, (r.v / max) * (W - L - R)), h = 16, top = cy - h / 2, rr = Math.min(4, w);
      svg.appendChild(txt(L - 8, cy + 4, r.k.length > 17 ? r.k.slice(0, 16) + "…" : r.k, { "text-anchor": "end", fill: C.ink }));
      var path = el("path", { d: "M" + L + "," + top + " h" + (w - rr) + " a" + rr + "," + rr + " 0 0 1 " + rr + "," + rr + " v" + (h - 2 * rr) + " a" + rr + "," + rr + " 0 0 1 -" + rr + "," + rr + " h-" + (w - rr) + " z", fill: color });
      svg.appendChild(path);
      svg.appendChild(txt(L + w + 6, cy + 4, compact(r.v), { fill: C.ink, "font-weight": 600 }));
      var hit = el("rect", { x: 0, y: i * rowH, width: W, height: rowH, fill: "transparent" });
      hit.addEventListener("pointermove", function (evt) { path.setAttribute("opacity", 0.82); tipOn(root, evt, [{ color: color, value: money(r.v), label: "spent, last 90 days" }], r.k); });
      hit.addEventListener("pointerleave", function () { path.setAttribute("opacity", 1); tipOff(root); });
      svg.appendChild(hit);
    });
    host.appendChild(svg);
  }

  function stacked(root, host, weeks, parts) {
    var W = Math.max(320, host.clientWidth || 600), H = 220, L = 52, R = 8, T = 10, B = 26;
    var totals = weeks.map(function (w) { return parts.reduce(function (s, p) { return s + Math.max(0, w[p.key]); }, 0); });
    var max = 4 * niceStep(Math.max.apply(null, totals.concat([1]))), band = (W - L - R) / weeks.length, bw = Math.min(24, band * 0.55);
    var y = function (v) { return T + (1 - v / max) * (H - T - B); };
    var svg = el("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Weekly set-asides" });
    for (var g = 0; g <= 4; g++) {
      var v = max * g / 4;
      svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: C.grid, "stroke-width": 1 }));
      svg.appendChild(txt(L - 8, y(v) + 4, compact(v), { "text-anchor": "end" }));
    }
    weeks.forEach(function (w, i) {
      var cx = L + band * i + band / 2, x0 = cx - bw / 2, acc = 0;
      svg.appendChild(txt(cx, H - 8, shortDate(w.w), { "text-anchor": "middle" }));
      var live = parts.filter(function (p) { return w[p.key] > 0; });
      live.forEach(function (p, j) {
        var v = w[p.key], yb = y(acc), yt = y(acc + v), top = j === live.length - 1, h = Math.max(0, yb - yt - (j > 0 ? 2 : 0));
        var yy = yb - (j > 0 ? 2 : 0) - h, r = top ? Math.min(4, h) : 0;
        var d = "M" + x0 + "," + (yy + h) + " v-" + (h - r) + (r ? " a" + r + "," + r + " 0 0 1 " + r + ",-" + r + " h" + (bw - 2 * r) + " a" + r + "," + r + " 0 0 1 " + r + "," + r : " h" + bw) + " v" + (h - r) + " z";
        var seg = el("path", { d: d, fill: p.color });
        seg.addEventListener("pointermove", function (evt) { seg.setAttribute("opacity", 0.82);
          tipOn(root, evt, parts.map(function (q) { return { color: q.color, value: money(w[q.key]), label: q.label }; }), "Week of " + shortDate(w.w)); });
        seg.addEventListener("pointerleave", function () { seg.setAttribute("opacity", 1); tipOff(root); });
        svg.appendChild(seg);
        acc += v;
      });
    });
    host.appendChild(svg);
  }

  function legend(items, kind) {
    return '<div class="bo-legend">' + items.map(function (s) {
      var key = kind === "line" ? '<i style="width:14px;height:2px;border-radius:1px;background:' + s.color + '"></i>' : '<i style="width:10px;height:10px;border-radius:3px;background:' + s.color + '"></i>';
      return "<span>" + key + esc(s.label) + "</span>";
    }).join("") + "</div>";
  }
  function table(head, rows) {
    return "<details><summary>Show as table</summary><table class=bo-t><tr>" + head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr>" +
      rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table></details>";
  }
  function tile(label, value, delta, upGood, spark) {
    var d = "";
    if (delta != null && isFinite(delta)) {
      var up = delta >= 0, good = up === upGood;
      d = '<div class="bo-delta" style="color:' + (good ? C.good : C.ink2) + '">' + (up ? "▲ " : "▼ ") + Math.abs(Math.round(delta * 100)) + "% vs the 4 weeks before</div>";   // no red (Jack: encouraging, never punishing)
    }
    return '<div class="bo-tile"><div class="bo-label">' + esc(label) + '</div><div class="bo-val">' + esc(value) + "</div>" + d + '<div class="bo-spark" data-spark="' + esc(spark || "") + '"></div></div>';
  }

  // ---------------------------------------------------------------- render
  function call(ctx, fn, args, demo) {
    if (ctx.demo) return Promise.resolve(demo);
    return ctx.sb.rpc(fn, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function soft(p) { return p.then(function (d) { return { ok: true, d: d }; }, function (e) { return { ok: false, notYet: notYet(e), e: e }; }); }
  function off(r) { return '<div class="bo-muted">' + (r.notYet ? "Not switched on yet (waiting on Jack's yes)." : "Could not load: " + esc(r.e && r.e.message || r.e)) + "</div>"; }
  function panel(title, href, body) {
    return '<div class="bo-panel"><div class="bo-head"><b>' + esc(title) + "</b>" + (href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">Open</a>' : "") + "</div>" + body + "</div>";
  }

  function render(pane, ctx) {
    css();
    pane.innerHTML = '<div class="bo"><p class="bo-sub">Money, taxes and commercial accounts. Read only: you tap transfers in Mercury, and you or the CPA file and pay.</p>' +
      '<div class="bo-main"><div class="bo-panel">Loading…</div></div><div class="bo-tip" hidden></div></div>';
    var root = pane.querySelector(".bo"), main = root.querySelector(".bo-main");
    var DEMO = {
      today: { since: "2026-12-01", transfer_week: { week_start: "2026-11-30" }, tax_due: [{ title: "Federal payroll tax deposit for November 2026", due: "2026-12-15", cents: 3900 }], exceptions: [{ label: "Purchases over $75 with no receipt", count: 1 }] },
      cal: [{ title: "Federal payroll tax deposit for November 2026", due: "2026-12-15", amount_cents: 3900, status: "open", days: 6 }, { title: "MN sales tax for November 2026", due: "2026-12-21", amount_cents: 10159, status: "open", days: 12 }],
      owe: [{ amount_due_cents: 23703, held: false }, { amount_due_cents: 20180, held: true }]
    };
    Promise.all([
      soft(loadBank(ctx)), soft(call(ctx, "cfo_buckets", { p_weeks: 8 }, null)),
      soft(call(ctx, "back_office_today", null, DEMO.today)), soft(call(ctx, "compliance_calendar", { p_days: 45 }, DEMO.cal)),
      soft(call(ctx, "who_owes_us", { p_days: 120 }, DEMO.owe)), soft(call(ctx, "commercial_renewals_due", { p_days: 90 }, [])),
      soft(call(ctx, "pm_turnover_price_check", { p_back: 60, p_ahead: 30 }, []))
    ]).then(function (r) {
      var bank = r[0].ok ? r[0].d : null, html = [];
      var owe = r[4].ok ? (r[4].d || []).filter(function (x) { return !x.held; }) : null;
      var oweTotal = owe ? owe.reduce(function (s, x) { return s + (x.amount_due_cents || 0); }, 0) : null;
      var wk = bank ? weekly(bank, 13) : null;
      if (wk) {
        var sum = function (a, b, k) { return wk.slice(a, b).reduce(function (s, w) { return s + w[k]; }, 0); };
        var rev4 = sum(9, 13, "rev"), revP = sum(5, 9, "rev"), sp4 = sum(9, 13, "spend"), spP = sum(5, 9, "spend");
        html.push('<div class="bo-tiles">' +
          '<div class="bo-tile"><div class="bo-label">Business cash</div><div class="bo-hero">' + esc(bank.cash == null ? "–" : money(bank.cash)) + '</div><div class="bo-note">Checking and savings in the bank feed, as of the last sync</div></div>' +
          tile("Revenue, last 4 weeks", money(rev4), revP ? (rev4 - revP) / revP : null, true, "rev") +
          tile("Spend, last 4 weeks", money(sp4), spP ? (sp4 - spP) / spP : null, false, "spend") +
          tile("Net cash flow, 4 weeks", money(rev4 - sp4), null, true, "net") +
          tile("Owed to us", oweTotal == null ? "–" : money(oweTotal), null, false, "") + "</div>");
        html.push('<div class="bo-grid2"><div class="bo-panel"><div class="bo-head"><b>Weekly revenue and spend</b><span class="bo-label">last 13 full weeks</span></div>' +
          legend([{ color: C.s1, label: "Revenue (deposits)" }, { color: C.s2, label: "Spend" }], "line") + '<div class="bo-c-line"></div>' +
          table(["Week of", "Revenue", "Spend", "Net"], wk.map(function (w) { return [w.w, money(w.rev), money(w.spend), money(w.rev - w.spend)]; })) + "</div>" +
          '<div class="bo-panel"><div class="bo-head"><b>Spend by category</b><span class="bo-label">last 90 days</span></div><div class="bo-c-cat"></div>' +
          table(["Category", "Spent"], byCategory(bank, 90).map(function (x) { return [x.k, money(x.v)]; })) + "</div></div>");
        var cfo = r[1].ok && r[1].d && r[1].d.weeks ? r[1].d : null;
        var sw = wk.slice(5).map(function (w) {
          var c = cfo && (cfo.weeks || []).filter(function (x) { return x.week_start === w.w; })[0];
          return c ? { w: w.w, setTax: c.tax.want, setProfit: c.profit.want, setOwner: c.owner_pay.want, setOps: Math.max(0, c.real_revenue_cents - c.tax.want - c.profit.want - c.owner_pay.want) } : w;
        });
        var parts = [{ key: "setTax", label: "Tax", color: C.s1 }, { key: "setProfit", label: "Profit", color: C.s2 }, { key: "setOwner", label: "Owner pay", color: C.s3 }, { key: "setOps", label: "Operating", color: C.s4 }];
        html.push('<div class="bo-panel" style="margin-bottom:12px"><div class="bo-head"><b>Where each week\'s deposits go</b><a href="cfo.html" target="_blank" rel="noopener">Open</a></div>' +
          legend(parts, "rect") + '<div class="bo-c-stack"></div>' +
          '<div class="bo-note">' + (cfo ? "From the set-aside engine." : "Estimate with your rules (all taxes, Profit 5%, Owner pay 50%, the rest Operating) until the set-aside engine is switched on.") + "</div>" +
          table(["Week of", "Tax", "Profit", "Owner pay", "Operating"], sw.map(function (w) { return [w.w, money(w.setTax), money(w.setProfit), money(w.setOwner), money(w.setOps)]; })) + "</div>");
        main._charts = { wk: wk, cat: byCategory(bank, 90), sw: sw, parts: parts };
      } else if (!ctx.canEdit) {
        html.push('<div class="bo-tiles" style="grid-template-columns:repeat(2,1fr)">' + tile("Owed to us", oweTotal == null ? "–" : money(oweTotal), null, false, "") +
          '<div class="bo-tile"><div class="bo-label">Cash and charts</div><div class="bo-muted">Bank numbers are owner only.</div></div></div>');
      } else {
        html.push('<div class="bo-panel" style="margin-bottom:12px">' + off(r[0]) + "</div>");
      }
      var t = r[2], c = r[3], rn = r[5], tv = r[6];
      html.push('<div class="bo-grid3">' +
        panel("Taxes and filings", "back-office.html", !c.ok ? off(c) : ((c.d || []).filter(function (x) { return x.status === "open"; }).slice(0, 6).map(function (x) {
          return '<div class="bo-line">' + esc(x.title) + '<span class="bo-chip">' + esc(x.days < 0 ? "late" : x.days === 0 ? "today" : "in " + x.days + "d") + "</span>" +
            '<div class="bo-note">' + esc(shortDate(x.due)) + (x.amount_cents != null ? " · " + esc(money(x.amount_cents)) : "") + "</div></div>"; }).join("") || '<div class="bo-line">Nothing due in 45 days.</div>')) +
        panel("Today", "back-office.html", !t.ok ? off(t) : (function (d) {
          var lines = [];
          if (d.transfer_week) lines.push("Transfers for the week of " + shortDate(d.transfer_week.week_start) + " are still open");
          (d.exceptions || []).forEach(function (e) { lines.push(e.label + ": " + e.count); });
          return lines.length ? lines.map(function (l) { return '<div class="bo-line">' + esc(l) + "</div>"; }).join("") : '<div class="bo-line" style="color:' + C.good + ';font-weight:600">✓ Nothing to look at</div>';
        })(t.d || {})) +
        panel("Who owes us · Commercial", "money-desk.html",
          (owe == null ? off(r[4]) : '<div class="bo-line"><b>' + esc(money(oweTotal)) + "</b> from " + owe.length + (owe.length === 1 ? " finished visit" : " finished visits") + "</div>") +
          (!rn.ok ? off(rn) : '<div class="bo-line">' + (rn.d || []).length + ' yearly reviews in 90 days <a href="commercial-desk.html" target="_blank" rel="noopener" style="font-size:12px">desk</a></div>') +
          (!tv.ok ? "" : '<div class="bo-line">' + (tv.d || []).length + " turnovers under the price floor</div>") +
          (ctx.canEdit ? '<div class="bo-muted"><a href="access-codes.html" target="_blank" rel="noopener">Access codes</a> (owner only)</div>' : "")) + "</div>");
      main.innerHTML = html.join("");
      var ch = main._charts;
      if (ch) {
        lineChart(root, main.querySelector(".bo-c-line"), ch.wk, [{ key: "rev", label: "Revenue", color: C.s1, area: true }, { key: "spend", label: "Spend", color: C.s2 }]);
        barsH(root, main.querySelector(".bo-c-cat"), ch.cat, C.s1);
        stacked(root, main.querySelector(".bo-c-stack"), ch.sw, ch.parts);
        main.querySelectorAll("[data-spark]").forEach(function (n) {
          var k = n.getAttribute("data-spark"); if (!k) return;
          var vals = ch.wk.map(function (w) { return k === "net" ? w.rev - w.spend : w[k]; }).slice(1);
          n.appendChild(sparkline(vals, 120, 30));
        });
      }
    });
  }
  window.BackOfficeTab = { render: render };
})();
