// "What will it cost me?" on the pricing page: one-to-one price times lessons a week times 4.33 weeks.
// The prices come from the page (data-price on each choice), so there is one place to change them. A guide only.
(function () {
  'use strict';
  var box = document.querySelector('[data-estimator]');
  if (!box) return;
  var weeks = parseFloat(box.getAttribute('data-weeks')) || 4.33;
  var total = box.querySelector('[data-est-total]');
  var detail = box.querySelector('[data-est-detail]');
  var shown = '';
  function fill(t, v) { return t.replace(/\{(\w+)\}/g, function (m, k) { return k in v ? v[k] : m; }); }
  function update() {
    var type = box.querySelector('input[name="est-type"]:checked');
    var n = box.querySelector('input[name="est-n"]:checked');
    if (!type || !n) return;
    var price = parseFloat(type.getAttribute('data-price'));
    var lessons = parseInt(n.value, 10);
    var amount = Math.round(price * lessons * weeks);
    var text = fill(box.getAttribute('data-result'), { amount: String(amount) });
    if (text === shown) return;
    shown = text;
    total.textContent = text;
    detail.textContent = fill(box.getAttribute('data-detail'), { n: String(lessons), price: String(price) });
    total.classList.remove('is-new');
    void total.offsetWidth;
    total.classList.add('is-new');
  }
  box.addEventListener('change', update);
  update();
})();
