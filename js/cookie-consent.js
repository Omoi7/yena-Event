'use strict';

/**
 * Bandeau de consentement aux cookies (RGPD).
 *
 * Le site lui-même ne pose aucun cookie : il n'y a de cookies/mesure
 * d'audience que si window.YENA_CONFIG.GA_MEASUREMENT_ID est renseigné
 * (voir js/config.js). Tant que l'utilisateur n'a pas cliqué sur
 * "Tout accepter", aucun script de mesure d'audience n'est chargé.
 */
(function () {
  const STORAGE_KEY = 'yena_cookie_consent';

  function readConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(status) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, ts: Date.now() }));
    } catch (e) {}
  }

  function loadAnalytics() {
    const gaId = window.YENA_CONFIG && window.YENA_CONFIG.GA_MEASUREMENT_ID;
    if (!gaId || document.getElementById('ga-gtag-script')) return;
    const s1 = document.createElement('script');
    s1.id = 'ga-gtag-script';
    s1.async = true;
    s1.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(s1);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId, { anonymize_ip: true });
  }

  function buildBanner() {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.id = 'cookieBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Gestion des cookies');
    banner.innerHTML = `
      <div class="cookie-banner-inner">
        <p>
          Nous utilisons des cookies uniquement pour mesurer l'audience du site de façon anonymisée.
          Aucun cookie n'est déposé sans votre accord. Consultez notre
          <a href="confidentialite.html">politique de confidentialité</a>.
        </p>
        <div class="cookie-banner-actions">
          <button type="button" class="btn btn-outline" id="cookieRejectBtn">Refuser</button>
          <button type="button" class="btn btn-primary" id="cookieAcceptBtn">Tout accepter</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
    document.body.classList.add('has-cookie-banner');

    document.getElementById('cookieAcceptBtn').addEventListener('click', () => {
      writeConsent('accepted');
      loadAnalytics();
      banner.remove();
      document.body.classList.remove('has-cookie-banner');
    });
    document.getElementById('cookieRejectBtn').addEventListener('click', () => {
      writeConsent('rejected');
      banner.remove();
      document.body.classList.remove('has-cookie-banner');
    });
  }

  function init() {
    const consent = readConsent();
    if (consent && consent.status === 'accepted') {
      loadAnalytics();
    } else if (!consent) {
      buildBanner();
    }
  }

  // Permet de rouvrir le bandeau depuis un lien "Gérer les cookies" du footer.
  window.yenaOpenCookieBanner = function () {
    const existing = document.getElementById('cookieBanner');
    if (existing) existing.remove();
    buildBanner();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
