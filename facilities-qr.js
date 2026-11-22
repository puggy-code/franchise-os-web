/* Facilities postcard QR (1813). twohourmaids.com/facilities?c=CODE: count the scan, show a short form. No libraries. */
(function () {
  var API = "https://isbhlmihbibdnajvicrj.supabase.co/functions/v1/postcard-scan";
  var PHONE = "(763) 230-6795", TEL = "+17632306795";
  var box = document.getElementById("fac-qr");
  if (!box || box.getAttribute("data-on")) return;
  box.setAttribute("data-on", "1");
  var raw = "";
  try { raw = new URLSearchParams(location.search).get("c") || ""; } catch (e) {}
  var code = raw.toUpperCase().replace(/[^A-Z2-9]/g, "");
  if (code.length !== 6) code = "";
  function send(o) {
    try {
      return fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o), keepalive: true }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }
  if (code) {
    var k = "fqr_" + code, seen = false;
    try { seen = sessionStorage.getItem(k) === "1"; sessionStorage.setItem(k, "1"); } catch (e) {}
    if (!seen) send({ code: code, event: "scan" });
  }
  var css = "#fac-qr{max-width:560px;margin:16px auto;padding:16px;border:1px solid #d6dce5;border-radius:12px;background:#fff;font:16px/1.4 system-ui,sans-serif;color:#10151e}" +
    "#fac-qr h2{font-size:20px;margin:0 0 6px}#fac-qr p{margin:0 0 12px}#fac-qr label{display:block;margin:0 0 10px;font-weight:600}" +
    "#fac-qr input,#fac-qr textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border:1px solid #b8c1ce;border-radius:8px;font:inherit}" +
    "#fac-qr .ck{display:flex;gap:8px;align-items:center;font-weight:400}#fac-qr .ck input{width:auto;margin:0}" +
    "#fac-qr button{width:100%;min-height:48px;border:0;border-radius:10px;background:#004aad;color:#fff;font:inherit;font-weight:700;cursor:pointer}" +
    "#fac-qr .err{color:#a11;font-weight:600}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
  box.innerHTML =
    '<h2>Book a free walkthrough</h2><p>Call or text <a href="tel:' + TEL + '">' + PHONE + '</a>, or leave your number and we will call you.</p>' +
    '<form novalidate><label>Name<input name="name" maxlength="80" autocomplete="name"></label>' +
    '<label>Phone<input name="phone" type="tel" maxlength="30" autocomplete="tel"></label>' +
    '<label>Email<input name="email" type="email" maxlength="120" autocomplete="email"></label>' +
    '<label>What do you need cleaned?<textarea name="need" rows="3" maxlength="500"></textarea></label>' +
    '<label>Walkthrough time (optional)<input name="when" type="datetime-local"></label>' +
    '<label class="ck"><input name="stop" type="checkbox">Please stop mailing us</label>' +
    '<p class="err" hidden></p><button type="submit">Send</button></form>';
  var f = box.querySelector("form"), err = box.querySelector(".err");
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = function (n) { return (f.elements[n].value || "").trim(); };
    var stop = f.elements.stop.checked, when = v("when");
    if (!v("phone") && !v("email") && !stop) {
      err.textContent = "Please add a phone number or an email.";
      err.hidden = false;
      return;
    }
    var o = { event: when ? "walkthrough" : "form", name: v("name"), phone: v("phone"), email: v("email"), need: v("need"), stop_mail: stop };
    if (code) o.code = code;
    if (when) o.walkthrough_at = when;
    f.querySelector("button").disabled = true;
    send(o).then(function () {
      var p = document.createElement("p");
      p.textContent = stop && !v("phone") && !v("email") ? "Thanks. We will stop mailing you." : "Thanks. We will call you today.";
      box.replaceChildren(p);
    });
  });
})();
