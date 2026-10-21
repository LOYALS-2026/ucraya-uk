// Cookie consent. Google Analytics is only loaded after the visitor accepts.
(function () {
  var banner = document.querySelector('[data-cookie]');
  if (!banner) return;
  var id = banner.getAttribute('data-ga');
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return;
  var KEY = 'ucraya-consent';
  var stored = null;
  try { stored = window.localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }

  function load() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }
  function save(v) { try { window.localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } }

  if (stored === 'accepted') { load(); return; }
  if (stored === 'declined') return;
  banner.hidden = false;
  banner.querySelector('[data-cookie-accept]').addEventListener('click', function () {
    save('accepted'); banner.hidden = true; load();
  });
  banner.querySelector('[data-cookie-decline]').addEventListener('click', function () {
    save('declined'); banner.hidden = true;
  });
})();
