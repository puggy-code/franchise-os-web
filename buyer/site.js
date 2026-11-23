/* Buyer-brand pages (Jack, 2026-10-22). One script for every page. It reads the offer from the server (so every number on a page always matches the settings the attorney reviewed),
   fills {tokens} in the page text, renders the footer with the REQUIRED "operated by" line, and sends the contact form. If the offer is not approved yet the pages stay closed. */
(function () {
  var FN = 'https://isbhlmihbibdnajvicrj.supabase.co/functions/v1/owner-inquiry';
  var root = document.getElementById('app');
  if (!root) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fill(html, c) {
    var buys = c.buys === 'lead_list' ? 'your lead list' : c.buys === 'client_list' ? 'your client list' : 'your client list or lead list';
    var phone = c.contact_phone ? esc(c.contact_phone) : '';
    return html.replace(/\{brand\}/g, esc(c.brand_name)).replace(/\{royalty\}/g, esc(c.royalty_pct)).replace(/\{buys\}/g, esc(buys)).replace(/\{term\}/g, esc(c.term_text))
      .replace(/\{phone\}/g, phone).replace(/\{sender\}/g, esc(c.sender_name)).replace(/\{domain\}/g, esc(c.brand_domain || ''));
  }
  function closed() { root.innerHTML = '<main><h1>Coming soon</h1><p class="muted">This site is not open yet.</p></main>'; }
  fetch(FN + '?brand=1').then(function (r) { return r.json(); }).then(function (c) {
    if (!c || !c.ready || !c.brand_name || !c.operator_disclosure) { closed(); return; }
    document.title = (document.getElementById('page-title') ? document.getElementById('page-title').textContent + ' | ' : '') + c.brand_name;
    var tpl = document.getElementById('content');
    var body = fill(tpl.innerHTML, c);
    var vid = '';
    if (c.video_url) vid = /\.(mp4|mov|webm)(\?|$)/i.test(c.video_url) ? '<video controls preload="metadata" src="' + esc(c.video_url) + '"></video>' : '<iframe src="' + esc(c.video_url) + '" allowfullscreen></iframe>';
    body = body.replace('<!--VIDEO-->', vid ? '<div class="card"><h2>See how it works</h2>' + vid + '</div>' : '');
    var nav = '<nav><a class="brand" href="index.html">' + esc(c.brand_name) + '</a><span><a href="retire.html">Retiring?</a><a href="lead-list.html">Lead lists</a><a href="how-it-works.html">How it works</a><a href="calculator.html">Estimate</a></span></nav>';
    var foot = '<footer><p>' + esc(c.brand_name) + ' is operated by ' + esc(c.operator_disclosure) + '.' + (c.contact_phone ? ' Call or text ' + esc(c.contact_phone) + '.' : '') + '</p>' +
      '<p>This site is an invitation to talk, not an offer that binds anyone. Any real agreement is put in writing and reviewed by your own attorney first. <a href="privacy.html">Privacy</a></p></footer>';
    root.innerHTML = nav + '<main>' + body + '</main>' + foot;
    var f = document.getElementById('f');
    if (f) {
      var go = document.getElementById('go'), msg = document.getElementById('msg');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!f.phone.value.trim() && !f.email.value.trim()) { msg.className = 'err'; msg.textContent = 'Please give a phone number or an email.'; return; }
        go.disabled = true; msg.className = 'muted'; msg.textContent = 'Sending…';
        fetch(FN, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: f.name.value, company: f.company.value, phone: f.phone.value, email: f.email.value, message: f.message.value, website: f.website.value }) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) { if (res.ok && res.j.ok) { f.innerHTML = '<p class="ok">Thank you. I will call you personally.</p>'; } else { go.disabled = false; msg.className = 'err'; msg.textContent = res.j && res.j.error === 'rate_limited' ? 'Please try again in a little while.' : 'That did not send. Please call the number on this page.'; } })
          .catch(function () { go.disabled = false; msg.className = 'err'; msg.textContent = 'That did not send. Please call the number on this page.'; });
      });
    }
    var calc = document.getElementById('calc');
    if (calc) {
      var n = document.getElementById('cn'), r = document.getElementById('cr'), out = document.getElementById('co');
      function run() {
        var cust = Math.max(0, Number(n.value) || 0), rev = Math.max(0, Number(r.value) || 0), pct = Number(c.royalty_pct) || 0;
        var month = cust * rev * pct / 100;
        out.innerHTML = '<div class="big">$' + Math.round(month).toLocaleString('en-US') + ' a month</div><p>About $' + Math.round(month * 12).toLocaleString('en-US') + ' a year, if those ' + cust + ' customers keep paying about $' + Math.round(rev).toLocaleString('en-US') + ' a month each. ' +
          'This is an illustration of the share only (' + esc(pct) + ' percent of what the customers pay). Customers come and go, and your real terms are whatever is written in a signed agreement.</p>';
      }
      n.addEventListener('input', run); r.addEventListener('input', run); run();
    }
  }).catch(closed);
})();
