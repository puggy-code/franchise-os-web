/* Facilities by Two Hour Maids Rewards: the rewards card of the property-manager portal (migrations 0760 and 0761, PM-LOYALTY-2.md).
   Include after the portal's own script:  <script src="pm-loyalty-card.js"></script>  and a  <div id="rewards-card"></div>.
   Then:  THMLoyalty.render(document.getElementById('rewards-card'), data.rewards_card, { checkout: function (items, delivery) { return Promise<{status, code, points, balance}>; },
                                                                                            ask: function (message) { return Promise<{ok}>; } });
   `ask` is the "Ask about it" button shown while the account is not on a 12-month agreement (points do not earn or redeem until it is).
   `data.rewards_card` is what supabase/functions/_shared/pmLoyaltyPortal.ts shapes; `items` is [{ reward_id, qty }] and `delivery` is what supabase/functions/_shared/pmRewardCheckout.ts
   validates. Relative URLs only (the portal moves to facilities.twohourmaids.com at the cutover).
   The flow (Jack, 2026-11-04): pick tech or gifts, add them to a cart, check out (review, delivery, confirm), and watch the order go requested, approved, ordered, delivered. The
   points are reserved when you confirm; if our team cannot send it they come back. Everything is built with textContent, never innerHTML, so nothing a manager or an admin types
   can run as script. */
(function () {
  'use strict';

  var CSS = '' +
    '.thm-loy{font:inherit;color:var(--ink,#15121f);--loy-line:var(--line,#ebe8f3);--loy-muted:var(--muted,#6b6880);--loy-brand:var(--brand,#004aad);--loy-soft:var(--brand-soft,#e7efff);--loy-gold:#9a6a00;--loy-gold-soft:#fff4d6;--loy-ok:#0a7a3d;--loy-bad:#b42318}' +
    '@media (prefers-color-scheme:dark){.thm-loy{--loy-gold:#f1c35a;--loy-gold-soft:#3a2f12;--loy-ok:#6ee7a0;--loy-bad:#ff8a80}}' +
    '.thm-loy *{box-sizing:border-box}' +
    '.thm-loy h3{font-size:13px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.6px;color:var(--loy-muted)}' +
    '.thm-loy h4{font-size:20px;margin:6px 0 10px}' +
    '.thm-loy .loy-top{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 24px;justify-content:space-between}' +
    '.thm-loy .loy-bal{font-size:34px;font-weight:800;letter-spacing:-.8px;line-height:1}' +
    '.thm-loy .loy-sub{color:var(--loy-muted);font-size:13px;margin-top:4px}' +
    '.thm-loy .loy-badge{display:inline-block;border-radius:999px;padding:3px 12px;font-weight:800;font-size:13px;background:var(--loy-gold-soft);color:var(--loy-gold)}' +
    '.thm-loy .loy-agree{border:2px solid var(--loy-gold);background:var(--loy-gold-soft);color:var(--loy-ink,inherit);border-radius:14px;padding:12px 14px;margin:12px 0}' +
    '.thm-loy .loy-agree b{display:block;margin-bottom:4px}' +
    '.thm-loy .loy-agree textarea{width:100%;font:inherit;color:inherit;background:transparent;border:1px solid var(--loy-line);border-radius:10px;padding:10px 12px;margin-top:8px}' +
    '.thm-loy .loy-note{background:var(--loy-gold-soft);color:var(--loy-gold);border-radius:12px;padding:10px 14px;font-weight:700;margin:12px 0}' +
    '.thm-loy ul.loy-earn{margin:0;padding-left:18px;color:var(--loy-muted)}' +
    '.thm-loy ul.loy-earn li{margin:0 0 4px}' +
    '.thm-loy .loy-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}' +
    '.thm-loy .loy-tab{border:1px solid var(--loy-line);background:transparent;color:inherit;border-radius:999px;padding:8px 14px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;min-height:44px}' +
    '.thm-loy .loy-tab[aria-selected=true]{background:var(--loy-brand);border-color:var(--loy-brand);color:#fff}' +
    '.thm-loy .loy-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}' +
    '.thm-loy .loy-item{border:1px solid var(--loy-line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:6px}' +
    '.thm-loy .loy-pic{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;background:var(--loy-soft)}' +
    '.thm-loy .loy-name{font-weight:800}' +
    '.thm-loy .loy-desc{color:var(--loy-muted);font-size:13px;flex:1}' +
    '.thm-loy .loy-cost{font-weight:800}.thm-loy .loy-cost small{font-weight:400;color:var(--loy-muted)}' +
    '.thm-loy button.loy-go{border:0;background:var(--loy-brand);color:#fff;border-radius:10px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer;min-height:44px}' +
    '.thm-loy button.loy-go[disabled]{opacity:.45;cursor:default}' +
    '.thm-loy button.loy-ghost{border:1px solid var(--loy-line);background:transparent;color:inherit;border-radius:10px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer;min-height:44px}' +
    '.thm-loy .loy-qty{display:flex;align-items:center;gap:10px}' +
    '.thm-loy .loy-qty button{width:44px;height:44px;border-radius:10px;border:1px solid var(--loy-line);background:transparent;color:inherit;font:inherit;font-size:20px;font-weight:800;cursor:pointer}' +
    '.thm-loy .loy-qty button[disabled]{opacity:.4;cursor:default}' +
    '.thm-loy .loy-qty b{min-width:24px;text-align:center}' +
    '.thm-loy .loy-cartbar{position:sticky;bottom:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-top:14px;padding:12px 14px;border-radius:14px;background:var(--loy-brand);color:#fff}' +
    '.thm-loy .loy-cartbar button.loy-go{background:#fff;color:var(--loy-brand)}' +
    '.thm-loy .loy-steps{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;padding:0;list-style:none}' +
    '.thm-loy .loy-steps li{border-radius:999px;padding:6px 12px;font-size:13px;font-weight:700;border:1px solid var(--loy-line);color:var(--loy-muted)}' +
    '.thm-loy .loy-steps li[aria-current=step]{background:var(--loy-brand);border-color:var(--loy-brand);color:#fff}' +
    '.thm-loy .loy-totals{border:1px solid var(--loy-line);border-radius:14px;padding:12px 14px;margin:12px 0}' +
    '.thm-loy .loy-totals div{display:flex;justify-content:space-between;gap:10px;padding:4px 0}' +
    '.thm-loy .loy-totals .loy-after{font-weight:800;border-top:1px solid var(--loy-line);margin-top:6px;padding-top:8px}' +
    '.thm-loy .loy-form{display:flex;flex-direction:column;gap:10px;max-width:520px}' +
    '.thm-loy .loy-form label{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:14px}' +
    '.thm-loy .loy-form label small{font-weight:400;color:var(--loy-muted)}' +
    '.thm-loy .loy-form input,.thm-loy .loy-form select,.thm-loy .loy-form textarea{font:inherit;color:inherit;background:transparent;border:1px solid var(--loy-line);border-radius:10px;padding:10px 12px;min-height:44px}' +
    '.thm-loy .loy-form .loy-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.thm-loy .loy-radio{display:flex;flex-direction:column;gap:8px}' +
    '.thm-loy .loy-radio label{flex-direction:row;align-items:center;gap:10px;border:1px solid var(--loy-line);border-radius:12px;padding:10px 12px;min-height:44px;font-weight:700}' +
    '.thm-loy .loy-radio input{min-height:0;width:20px;height:20px}' +
    '.thm-loy .loy-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}' +
    '.thm-loy .loy-msg{margin-top:6px;font-size:14px;font-weight:700;color:var(--loy-ok)}.thm-loy .loy-msg.err{color:var(--loy-bad)}' +
    '.thm-loy .loy-order{border:1px solid var(--loy-line);border-radius:14px;padding:12px 14px;margin:0 0 10px}' +
    '.thm-loy .loy-order .loy-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-weight:800}' +
    '.thm-loy .loy-order small{color:var(--loy-muted)}' +
    '.thm-loy .loy-track{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0;padding:0;list-style:none}' +
    '.thm-loy .loy-track li{font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px;border:1px solid var(--loy-line);color:var(--loy-muted)}' +
    '.thm-loy .loy-track li.on{background:var(--loy-soft);border-color:var(--loy-brand);color:var(--loy-brand)}' +
    '.thm-loy .loy-track li.now{background:var(--loy-brand);border-color:var(--loy-brand);color:#fff}' +
    '.thm-loy .loy-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--loy-line);font-size:14px}' +
    '.thm-loy .loy-row:last-child{border-bottom:0}.thm-loy .loy-row small{color:var(--loy-muted)}' +
    '.thm-loy .pos{color:var(--loy-ok);font-weight:800}' +
    '.thm-loy details{margin-top:14px}.thm-loy details summary{cursor:pointer;font-weight:700;color:var(--loy-brand)}' +
    '.thm-loy .loy-terms{white-space:pre-wrap;color:var(--loy-muted);font-size:13px;margin-top:8px}';

  var MAX_QTY = 5;
  var MAX_UNITS = 10;
  var STEPS = ['requested', 'approved', 'ordered', 'delivered'];
  var STEP_LABEL = { requested: 'Requested', approved: 'Approved', ordered: 'Ordered', delivered: 'Delivered' };
  var STATUS = {
    requested: 'We are reviewing it', approved: 'Approved: we are buying it', ordered: 'Ordered: on its way', delivered: 'Delivered',
    declined: 'Not approved, points returned', cancelled: 'Cancelled, points returned'
  };
  var KIND = { earn: 'Points earned', bonus: 'Bonus', redeem: 'Reward', refund: 'Points returned', adjust: 'Adjustment', expire: 'Expired' };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function num(n) { return Number(n || 0).toLocaleString('en-US'); }
  function usd(points) { var d = Number(points || 0) / 100; return '$' + d.toLocaleString('en-US', { minimumFractionDigits: d % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }); }
  function day(iso) { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } }
  function digits(v) { var d = String(v || '').replace(/[^0-9]/g, ''); if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1); return d; }

  function injectCss() {
    if (document.getElementById('thm-loy-css')) return;
    var s = document.createElement('style');
    s.id = 'thm-loy-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // The delivery step, checked here the way the database checks it (supabase/functions/_shared/pmRewardCheckout.ts), so a manager gets a message beside the field.
  function checkDelivery(f) {
    if (f.mode !== 'ship' && f.mode !== 'building') return 'Choose how it should be delivered.';
    if (String(f.recipient_name || '').trim().length < 2) return 'Who is it for? Enter the recipient’s name.';
    if (digits(f.phone).length !== 10) return 'Enter a 10-digit phone number for the delivery.';
    if (f.mode === 'ship') {
      if (String(f.address1 || '').trim().length < 3) return 'Enter the street address.';
      if (String(f.city || '').trim().length < 2) return 'Enter the city.';
      if (!/^[A-Za-z]{2}$/.test(String(f.state || '').trim())) return 'Enter the two-letter state, like MN.';
      if (!/^[0-9]{5}(-[0-9]{4})?$/.test(String(f.zip || '').trim())) return 'Enter a 5-digit ZIP code.';
      return null;
    }
    if (!f.building_id && String(f.building_label || '').trim().length < 2) return 'Choose the building, or type where it should go.';
    return null;
  }
  function deliveryPayload(f) {
    var base = { mode: f.mode, recipient_name: String(f.recipient_name).trim(), phone: String(f.phone).trim(), notes: String(f.notes || '').trim() };
    if (f.mode === 'ship') {
      base.address1 = String(f.address1).trim(); base.address2 = String(f.address2 || '').trim(); base.city = String(f.city).trim();
      base.state = String(f.state).trim().toUpperCase(); base.zip = String(f.zip).trim();
    } else if (f.building_id) base.building_id = f.building_id;
    else base.building_label = String(f.building_label).trim();
    return base;
  }

  function render(host, data, opts) {
    if (!host) return;
    injectCss();
    var st = {
      data: data || {}, opts: opts || {}, cart: {}, order: [], view: 'shop', step: 1, tab: null, error: '', busy: false, done: null, ask: { open: false, busy: false, sent: false, error: '', text: '' },
      f: { mode: 'ship', recipient_name: '', phone: '', address1: '', address2: '', city: '', state: 'MN', zip: '', building_id: '', building_label: '', notes: '' }
    };
    if (st.data.buildings && st.data.buildings.length) { st.f.mode = 'building'; st.f.building_id = st.data.buildings[0].id; }
    (st.data.groups || []).forEach(function (g) { g.items.forEach(function (it) { st.order.push(it.id); }); });
    host.textContent = '';
    var root = el('div', 'thm-loy');
    host.appendChild(root);

    // Points earn and redeem only on a 12-month agreement (Jack, 2026-11-04); until then the card says why, and offers a way to ask.
    function notEarning() { var e = st.data.eligibility; return !!(e && e.required && !e.eligible); }
    function drawAgreement() {
      var box = el('div', 'loy-agree');
      box.setAttribute('role', 'note');
      box.appendChild(el('b', null, 'Your points are not earning yet'));
      box.appendChild(el('div', null, st.data.agreement_notice || 'Rewards start with a 12-month agreement, after your Property Elevation Plan.'));
      box.appendChild(el('div', 'loy-sub', 'Your points start the day your 12-month agreement does.'));
      if (typeof st.opts.ask === 'function') {
        var a = st.ask;
        if (a.sent) {
          var ok = el('div', 'loy-msg', 'Thank you. We will be in touch about your agreement.');
          ok.setAttribute('role', 'status');
          box.appendChild(ok);
        } else if (!a.open) {
          var open = el('button', 'loy-go', 'Ask about it');
          open.type = 'button';
          open.addEventListener('click', function () { a.open = true; draw(); });
          box.appendChild(open);
        } else {
          var ta = el('textarea');
          ta.rows = 2; ta.maxLength = 500; ta.value = a.text;
          ta.setAttribute('aria-label', 'Your question (optional)');
          ta.addEventListener('input', function () { a.text = ta.value; });
          box.appendChild(ta);
          if (a.error) { var er = el('div', 'loy-msg err', a.error); er.setAttribute('role', 'alert'); box.appendChild(er); }
          var send = el('button', 'loy-go', a.busy ? 'Sending...' : 'Send');
          send.type = 'button';
          send.disabled = a.busy;
          send.addEventListener('click', function () {
            if (a.busy) return;
            a.busy = true; a.error = ''; draw();
            Promise.resolve(st.opts.ask(a.text.trim())).then(function () { a.busy = false; a.sent = true; draw(); })
              .catch(function (e) { a.busy = false; a.error = 'That did not go through' + (e && e.message ? ': ' + e.message : '.'); draw(); });
          });
          box.appendChild(send);
        }
      }
      root.appendChild(box);
    }

    function items() { var out = []; (st.data.groups || []).forEach(function (g) { g.items.forEach(function (it) { if (st.cart[it.id]) out.push({ item: it, qty: st.cart[it.id] }); }); }); return out; }
    function totals() {
      var p = 0, u = 0;
      items().forEach(function (l) { p += Number(l.item.points_cost) * l.qty; u += l.qty; });
      var bal = Number(st.data.balance || 0);
      return { points: p, units: u, balance: bal, remaining: bal - p, enough: p > 0 && bal >= p };
    }
    function go(view, step) { st.view = view; if (step) st.step = step; st.error = ''; draw(true); }

    function draw(focusHeading) {
      root.textContent = '';
      var brand = (st.data && st.data.brand) || 'Facilities by Two Hour Maids Rewards';
      var h = el('h3', null, brand);
      root.appendChild(h);
      if (!st.data || !st.data.enabled) {
        root.appendChild(el('p', 'loy-sub', 'Rewards for property managers and commercial accounts are launching soon. Your points will start the day the program opens.'));
        return;
      }
      if (st.view === 'shop') drawShop();
      else if (st.view === 'checkout') drawCheckout(focusHeading);
      else drawDone(focusHeading);
    }

    // ------------------------------------------------------------------------------------------------------------------------------------ shop
    function drawShop() {
      var data = st.data;
      var top = el('div', 'loy-top');
      var left = el('div');
      left.appendChild(el('div', 'loy-bal', num(data.balance)));
      left.appendChild(el('div', 'loy-sub', 'points (worth ' + usd(data.balance) + ' in rewards)'));
      top.appendChild(left);
      var right = el('div');
      if (data.tier && data.tier.name) right.appendChild(el('span', 'loy-badge', data.tier.name));
      var nt = data.next_tier && data.next_tier.tier;
      if (nt && nt.name && data.next_tier.need_cents) right.appendChild(el('div', 'loy-sub', '$' + num(Math.round(data.next_tier.need_cents / 100)) + ' more a year reaches ' + nt.name + '.'));
      top.appendChild(right);
      root.appendChild(top);
      if (notEarning()) drawAgreement();
      if (data.expiring && data.expiring.points) {
        root.appendChild(el('div', 'loy-note', num(data.expiring.points) + ' points expire on ' + day(data.expiring.on) + ' unless a statement is paid or you redeem them.'));
      }

      root.appendChild(el('h3', null, 'How you earn'));
      var ul = el('ul', 'loy-earn');
      (data.how_to_earn || []).forEach(function (t) { ul.appendChild(el('li', null, t)); });
      root.appendChild(ul);

      var groups = data.groups || [];
      root.appendChild(el('h3', null, 'Choose a reward'));
      if (!groups.length) {
        root.appendChild(el('p', 'loy-sub', 'The reward catalog is being finished. It will appear here.'));
      } else {
        if (!st.tab) st.tab = groups[0].key;
        var tabs = el('div', 'loy-tabs');
        tabs.setAttribute('role', 'tablist');
        groups.forEach(function (g) {
          var b = el('button', 'loy-tab', g.label);
          b.type = 'button';
          b.setAttribute('role', 'tab');
          b.setAttribute('aria-selected', g.key === st.tab ? 'true' : 'false');
          b.addEventListener('click', function () { st.tab = g.key; draw(); });
          tabs.appendChild(b);
        });
        root.appendChild(tabs);
        var grid = el('div', 'loy-items');
        var g0 = groups.filter(function (x) { return x.key === st.tab; })[0] || groups[0];
        g0.items.forEach(function (it) { grid.appendChild(itemCard(it)); });
        root.appendChild(grid);
        var t = totals();
        if (t.units > 0) {
          var bar = el('div', 'loy-cartbar');
          bar.appendChild(el('span', null, 'Cart: ' + t.units + (t.units === 1 ? ' item · ' : ' items · ') + num(t.points) + ' points'));
          var co = el('button', 'loy-go', 'Check out');
          co.type = 'button';
          co.disabled = typeof st.opts.checkout !== 'function';
          co.addEventListener('click', function () { go('checkout', 1); });
          bar.appendChild(co);
          root.appendChild(bar);
        }
      }
      drawOrders();
      var hist = data.history || [];
      if (hist.length) {
        root.appendChild(el('h3', null, 'Points history'));
        hist.slice(0, 20).forEach(function (h) {
          var row = el('div', 'loy-row');
          var l = el('div');
          l.appendChild(el('div', null, KIND[h.kind] || h.kind));
          l.appendChild(el('small', null, day(h.at) + (h.note ? ' · ' + h.note : '')));
          row.appendChild(l);
          row.appendChild(el('div', h.points > 0 ? 'pos' : null, (h.points > 0 ? '+' : '') + num(h.points)));
          root.appendChild(row);
        });
      }
      if (data.terms && data.terms.body) {
        var d = el('details');
        d.appendChild(el('summary', null, 'Program terms'));
        d.appendChild(el('div', 'loy-terms', data.terms.body));
        root.appendChild(d);
      }
    }

    function itemCard(it) {
      var card = el('div', 'loy-item');
      if (it.image_url && /^https:\/\//.test(it.image_url)) {
        var img = el('img', 'loy-pic');
        img.src = it.image_url;
        img.alt = '';
        img.loading = 'lazy';
        card.appendChild(img);
      }
      card.appendChild(el('div', 'loy-name', it.title));
      if (it.description) card.appendChild(el('div', 'loy-desc', it.description));
      var cost = el('div', 'loy-cost', num(it.points_cost) + ' points ');
      cost.appendChild(el('small', null, '(' + usd(it.points_cost) + ')'));
      card.appendChild(cost);
      var qty = st.cart[it.id] || 0;
      var t = totals();
      var minOk = Number(it.points_cost) >= Number(st.data.min_redeem_points || 0);
      if (qty > 0) {
        var q = el('div', 'loy-qty');
        var minus = el('button', null, '−');
        minus.type = 'button';
        minus.setAttribute('aria-label', 'One less ' + it.title);
        minus.addEventListener('click', function () { if (st.cart[it.id] <= 1) delete st.cart[it.id]; else st.cart[it.id] -= 1; draw(); });
        var plus = el('button', null, '+');
        plus.type = 'button';
        plus.setAttribute('aria-label', 'One more ' + it.title);
        plus.disabled = qty >= MAX_QTY || t.units >= MAX_UNITS || t.remaining < Number(it.points_cost);
        plus.addEventListener('click', function () { st.cart[it.id] = (st.cart[it.id] || 0) + 1; draw(); });
        q.appendChild(minus);
        q.appendChild(el('b', null, String(qty)));
        q.appendChild(plus);
        q.appendChild(el('span', 'loy-sub', 'in your cart'));
        card.appendChild(q);
        return card;
      }
      var enough = t.remaining >= Number(it.points_cost);
      var blocked = notEarning();
      var add = el('button', 'loy-go', blocked ? 'Starts with your 12-month agreement' : !minOk ? 'Below the ' + num(st.data.min_redeem_points) + ' point minimum' : enough ? 'Add to cart' : 'Need ' + num(Number(it.points_cost) - t.remaining) + ' more points');
      add.type = 'button';
      add.disabled = blocked || !(enough && minOk) || t.units >= MAX_UNITS || typeof st.opts.checkout !== 'function';
      add.addEventListener('click', function () { st.cart[it.id] = 1; draw(); });
      card.appendChild(add);
      return card;
    }

    function drawOrders() {
      var orders = st.data.orders || [];
      if (!orders.length) return;
      root.appendChild(el('h3', null, 'Your rewards'));
      orders.forEach(function (o) {
        var card = el('div', 'loy-order');
        var head = el('div', 'loy-head');
        head.appendChild(el('span', null, (o.items || []).map(function (i) { return i.title + (i.qty > 1 ? ' × ' + i.qty : ''); }).join(', ')));
        head.appendChild(el('span', null, num(o.points) + ' points'));
        card.appendChild(head);
        card.appendChild(el('small', null, day(o.at) + ' · code ' + o.code + ' · for ' + o.recipient + (o.deliver_to ? ' · to ' + o.deliver_to : '')));
        card.appendChild(el('div', 'loy-sub', STATUS[o.status] || o.status));
        var idx = STEPS.indexOf(o.status);
        if (idx >= 0) {
          var tr = el('ol', 'loy-track');
          STEPS.forEach(function (s, i) { tr.appendChild(el('li', i < idx ? 'on' : i === idx ? 'now' : '', STEP_LABEL[s])); });
          card.appendChild(tr);
        }
        if (o.tracking) card.appendChild(el('div', 'loy-sub', 'Tracking number: ' + o.tracking));
        if (o.status === 'declined' && o.decision_note) card.appendChild(el('div', 'loy-sub', 'Note from our team: ' + o.decision_note));
        root.appendChild(card);
      });
    }

    // -------------------------------------------------------------------------------------------------------------------------------- checkout
    function heading(text, focus) {
      var h = el('h4', null, text);
      h.tabIndex = -1;
      root.appendChild(h);
      if (focus) setTimeout(function () { try { h.focus(); } catch (e) { /* ignore */ } }, 0);
      return h;
    }
    function stepper() {
      var ol = el('ol', 'loy-steps');
      ['Review', 'Delivery', 'Confirm'].forEach(function (t, i) {
        var li = el('li', null, (i + 1) + '. ' + t);
        if (i + 1 === st.step) li.setAttribute('aria-current', 'step');
        ol.appendChild(li);
      });
      root.appendChild(ol);
    }
    function message(text, bad) {
      if (!text) return;
      var m = el('div', 'loy-msg' + (bad ? ' err' : ''), text);
      m.setAttribute('role', bad ? 'alert' : 'status');
      root.appendChild(m);
    }
    function totalsBox(t) {
      var box = el('div', 'loy-totals');
      var r1 = el('div'); r1.appendChild(el('span', null, 'Items (' + t.units + ')')); r1.appendChild(el('span', null, num(t.points) + ' points'));
      var r2 = el('div'); r2.appendChild(el('span', null, 'Your balance')); r2.appendChild(el('span', null, num(t.balance) + ' points'));
      var r3 = el('div', 'loy-after'); r3.appendChild(el('span', null, 'Left after this order')); r3.appendChild(el('span', null, num(t.remaining) + ' points'));
      box.appendChild(r1); box.appendChild(r2); box.appendChild(r3);
      root.appendChild(box);
    }
    function actions(back, next, nextLabel, nextDisabled) {
      var a = el('div', 'loy-actions');
      var b = el('button', 'loy-ghost', back.label);
      b.type = 'button';
      b.addEventListener('click', back.onClick);
      a.appendChild(b);
      if (next) {
        var n = el('button', 'loy-go', nextLabel);
        n.type = 'button';
        n.disabled = !!nextDisabled;
        n.addEventListener('click', next);
        a.appendChild(n);
      }
      root.appendChild(a);
    }

    function drawCheckout(focus) {
      var list = items();
      if (!list.length) { st.view = 'shop'; draw(); return; }
      heading('Checkout', focus);
      stepper();
      var t = totals();
      if (st.step === 1) {
        list.forEach(function (l) {
          var row = el('div', 'loy-row');
          var left = el('div');
          left.appendChild(el('div', 'loy-name', l.item.title));
          left.appendChild(el('small', null, num(l.item.points_cost) + ' points each'));
          row.appendChild(left);
          var q = el('div', 'loy-qty');
          var minus = el('button', null, '−'); minus.type = 'button'; minus.setAttribute('aria-label', 'One less ' + l.item.title);
          minus.addEventListener('click', function () { if (st.cart[l.item.id] <= 1) delete st.cart[l.item.id]; else st.cart[l.item.id] -= 1; draw(); });
          var plus = el('button', null, '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'One more ' + l.item.title);
          plus.disabled = l.qty >= MAX_QTY || t.units >= MAX_UNITS || t.remaining < Number(l.item.points_cost);
          plus.addEventListener('click', function () { st.cart[l.item.id] += 1; draw(); });
          q.appendChild(minus); q.appendChild(el('b', null, String(l.qty))); q.appendChild(plus);
          row.appendChild(q);
          row.appendChild(el('div', 'loy-cost', num(Number(l.item.points_cost) * l.qty)));
          root.appendChild(row);
        });
        totalsBox(t);
        if (!t.enough) message('You need ' + num(-t.remaining) + ' more points for this order. Take an item out, or keep earning.', true);
        message(st.error, true);
        actions({ label: 'Back to rewards', onClick: function () { go('shop'); } }, function () { go('checkout', 2); }, 'Continue to delivery', !t.enough);
        return;
      }
      if (st.step === 2) {
        var f = st.f;
        var form = el('div', 'loy-form');
        var field = function (label, key, attrs, hint) {
          var lab = el('label', null, label);
          if (hint) lab.appendChild(el('small', null, hint));
          var inp = el('input');
          inp.type = (attrs && attrs.type) || 'text';
          inp.value = f[key] || '';
          if (attrs) Object.keys(attrs).forEach(function (k) { if (k !== 'type') inp.setAttribute(k, attrs[k]); });
          inp.addEventListener('input', function () { f[key] = inp.value; });
          lab.appendChild(inp);
          form.appendChild(lab);
        };
        field('Who is it for?', 'recipient_name', { autocomplete: 'name', maxlength: '120' }, 'The person who will receive it.');
        field('Phone number', 'phone', { type: 'tel', autocomplete: 'tel', inputmode: 'tel', maxlength: '20' }, 'For the delivery.');
        var radio = el('div', 'loy-radio');
        radio.setAttribute('role', 'radiogroup');
        radio.setAttribute('aria-label', 'Delivery');
        [['ship', 'Ship to an address'], ['building', 'Deliver to the building']].forEach(function (m) {
          var lab = el('label');
          var r = el('input');
          r.type = 'radio'; r.name = 'loy-mode'; r.value = m[0]; r.checked = f.mode === m[0];
          r.addEventListener('change', function () { f.mode = m[0]; st.error = ''; draw(); });
          lab.appendChild(r);
          lab.appendChild(el('span', null, m[1]));
          radio.appendChild(lab);
        });
        form.appendChild(radio);
        if (f.mode === 'ship') {
          field('Street address', 'address1', { autocomplete: 'address-line1', maxlength: '120' });
          field('Apartment, suite, unit (optional)', 'address2', { autocomplete: 'address-line2', maxlength: '120' });
          field('City', 'city', { autocomplete: 'address-level2', maxlength: '80' });
          var two = el('div', 'loy-two');
          var wrap = form;
          form = two;
          field('State', 'state', { autocomplete: 'address-level1', maxlength: '2' });
          field('ZIP code', 'zip', { autocomplete: 'postal-code', inputmode: 'numeric', maxlength: '10' });
          form = wrap;
          form.appendChild(two);
        } else {
          var blds = st.data.buildings || [];
          if (blds.length) {
            var lab = el('label', null, 'Which building?');
            var sel = el('select');
            blds.forEach(function (b) { var o = el('option', null, b.label + ' (' + b.address + ')'); o.value = b.id; sel.appendChild(o); });
            var other = el('option', null, 'Somewhere else (type it)'); other.value = ''; sel.appendChild(other);
            sel.value = f.building_id || '';
            sel.addEventListener('change', function () { f.building_id = sel.value; draw(); });
            lab.appendChild(sel);
            form.appendChild(lab);
          }
          if (!f.building_id) field('Where should it go?', 'building_label', { maxlength: '160' }, 'The building name or office, for example “Elm Court leasing office”.');
        }
        var nl = el('label', null, 'Delivery notes (optional)');
        var ta = el('textarea');
        ta.rows = 2; ta.maxLength = 300; ta.value = f.notes || '';
        ta.addEventListener('input', function () { f.notes = ta.value; });
        nl.appendChild(ta);
        form.appendChild(nl);
        root.appendChild(form);
        message(st.error, true);
        actions({ label: 'Back', onClick: function () { go('checkout', 1); } }, function () {
          var problem = checkDelivery(f);
          if (problem) { st.error = problem; draw(); return; }
          go('checkout', 3);
        }, 'Continue to confirm');
        return;
      }
      // step 3: confirm
      list.forEach(function (l) {
        var row = el('div', 'loy-row');
        row.appendChild(el('div', null, l.item.title + (l.qty > 1 ? ' × ' + l.qty : '')));
        row.appendChild(el('div', 'loy-cost', num(Number(l.item.points_cost) * l.qty) + ' points'));
        root.appendChild(row);
      });
      totalsBox(t);
      var f2 = st.f;
      var where = f2.mode === 'ship'
        ? [f2.address1, f2.address2, f2.city, (f2.state || '').toUpperCase() + ' ' + f2.zip].filter(function (x) { return String(x || '').trim(); }).join(', ')
        : (st.data.buildings || []).filter(function (b) { return b.id === f2.building_id; }).map(function (b) { return b.label + ' (' + b.address + ')'; })[0] || f2.building_label;
      var sum = el('div', 'loy-totals');
      [['For', f2.recipient_name], ['Phone', f2.phone], ['Send to', where]].concat(f2.notes ? [['Notes', f2.notes]] : []).forEach(function (p) {
        var r = el('div'); r.appendChild(el('span', null, p[0])); r.appendChild(el('span', null, p[1])); sum.appendChild(r);
      });
      root.appendChild(sum);
      root.appendChild(el('p', 'loy-sub', 'We set your points aside now. Our team reviews the request, buys the item and sends it to the address above. If we cannot send it, your points come back. Rewards have no cash value.'));
      message(st.error, true);
      actions({ label: 'Back', onClick: function () { go('checkout', 2); } }, function () {
        if (st.busy) return;
        st.busy = true;
        st.error = '';
        draw();
        var payloadItems = items().map(function (l) { return { reward_id: l.item.id, qty: l.qty }; });
        Promise.resolve(st.opts.checkout(payloadItems, deliveryPayload(st.f))).then(function (res) {
          st.busy = false;
          st.done = res || {};
          if (typeof res.balance === 'number') st.data.balance = res.balance;
          st.data.orders = [{
            id: res.order_id || ('new-' + Date.now()), status: res.status || 'requested', code: res.code || '', at: new Date().toISOString(), points: res.points || t.points,
            recipient: st.f.recipient_name, deliver_to: where, decision_note: null, tracking: null,
            items: (res.items && res.items.length ? res.items : items().map(function (l) { return { title: l.item.title, qty: l.qty, points: Number(l.item.points_cost) * l.qty }; }))
          }].concat(st.data.orders || []);
          st.cart = {};
          go('done');
        }).catch(function (e) {
          st.busy = false;
          st.error = 'That did not go through' + (e && e.message ? ': ' + e.message : '.');
          draw();
        });
      }, st.busy ? 'Sending...' : 'Confirm and use ' + num(t.points) + ' points', st.busy);
    }

    function drawDone(focus) {
      heading('Your reward is requested', focus);
      var d = st.done || {};
      root.appendChild(el('p', null, 'Your code is ' + (d.code || '') + '. We set aside ' + num(d.points) + ' points' + (typeof d.balance === 'number' ? ' and you have ' + num(d.balance) + ' left' : '') + '. Our team will review it, buy it and send it. You can follow it below, and if we cannot send it your points come back.'));
      var a = el('div', 'loy-actions');
      var b = el('button', 'loy-go', 'Back to rewards');
      b.type = 'button';
      b.addEventListener('click', function () { go('shop'); });
      a.appendChild(b);
      root.appendChild(a);
      drawOrders();
    }

    draw();
  }

  window.THMLoyalty = { render: render };
})();
